import { App, Notice } from "obsidian";
import { InfraNodus } from "src/infranodus";
import { SETTINGS } from "src/settings";
import {
	ExportGraphModal,
	ExportGraphChoice,
} from "src/components/ExportGraphModal";
import {
	registerExportInManifest,
	vaultHasManifest,
} from "src/utils/manifest";

/**
 * Export the whole analyzed graph / text to InfraNodus with a direct API
 * POST (works for big texts, unlike the /import/editor URL which hits the
 * URL length limit). Confirms the graph name with the user first and — if
 * the vault has an `infranodus/manifest.json` — offers to register the
 * exported graph there so agents can query it.
 */
export async function exportGraphToInfraNodus(params: {
	app: App;
	text: string;
	defaultGraphName: string;
	/** Vault-relative path of the analyzed page/folder, for provenance */
	sourceFile?: string;
}): Promise<void> {
	const { app, text, defaultGraphName, sourceFile } = params;

	if (!text || text === "ai generating...") return;

	if (!SETTINGS.INFRANODUS_API_KEY) {
		new Notice(
			"InfraNodus: add your API key in the plugin settings to export graphs."
		);
		return;
	}

	const hasManifest = await vaultHasManifest(app);

	const choice = await new Promise<ExportGraphChoice | null>((resolve) => {
		new ExportGraphModal(app, defaultGraphName, hasManifest, resolve).open();
	});

	if (!choice) return;

	const { graphName, saveToManifest } = choice;

	const progressNotice = new Notice(
		`Exporting to the "${graphName}" graph in InfraNodus...`,
		0
	);

	const exportStatus = await InfraNodus.exportText({
		contextName: graphName,
		text,
		tags: [`context: ${graphName}`],
		extendedSummary: saveToManifest,
	});

	progressNotice.hide();

	if (exportStatus.error) {
		new Notice(
			`There was an error saving to the "${graphName}" graph in InfraNodus. Check your API key and try again.`,
			8000
		);
		return;
	}

	// Best-effort: never let manifest bookkeeping fail an export that
	// already succeeded server-side
	const registered = saveToManifest
		? await registerExportInManifest({
				app,
				graphName,
				responseData: exportStatus.data,
				sourceFile,
		  })
		: false;

	new Notice(
		registered
			? `Saved to the "${graphName}" graph in InfraNodus and registered in infranodus/manifest.json`
			: `Saved to the "${graphName}" graph in InfraNodus`
	);
}
