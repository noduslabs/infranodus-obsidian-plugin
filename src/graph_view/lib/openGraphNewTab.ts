import { App, Notice, WorkspaceLeaf, Platform } from "obsidian";
import { INFRANODUS_GRAPH_VIEW_TYPE, InfraNodusGraphView } from "..";
import { INTERNAL_SETTINGS, SETTINGS } from "src/settings";

const currentPlatform =
	Platform.isMobileApp || Platform.isMobile ? "mobile" : "desktop";

async function focusOrOpenGraphTab(params: {
	app: App;
	filePath?: string;
	contentString?: string;
	sourcePath?: string;
}) {
	let leaf: WorkspaceLeaf | undefined;
	new Notice("Open: " + SETTINGS.MOBILE_OPEN_GRAPH_IN);
	params.app.workspace.iterateAllLeaves((openLeaf: WorkspaceLeaf) => {
		if (!(openLeaf.view instanceof InfraNodusGraphView)) return;

		if (currentPlatform === "mobile") {
			const isInMainPane =
				openLeaf.getRoot() === params.app.workspace.rootSplit;

			if (SETTINGS.MOBILE_OPEN_GRAPH_IN === "Side view") {
				if (isInMainPane) return;
			}
			if (SETTINGS.MOBILE_OPEN_GRAPH_IN === "New tab") {
				if (!isInMainPane) return;
			}
		}

		leaf = openLeaf;
	});

	if (!leaf) {
		leaf = params.app.workspace.getLeaf(true);
		leaf.setViewState({ type: INFRANODUS_GRAPH_VIEW_TYPE });
	}

	params.app.workspace.setActiveLeaf(leaf, { focus: true });
	params.app.workspace.revealLeaf(leaf);

	// Wait for leaf to fully initialize
	await new Promise((resolve) => setTimeout(resolve, 250));

	const view: InfraNodusGraphView = leaf.view as any;
	if (view)
		await view.reloadGraph(
			{
				leaf: leaf,
				filePath: params.filePath,
				contentString: params.contentString,
				sourcePath: params.sourcePath,
			},
			true
		);

	if (currentPlatform === "mobile") {
		if (SETTINGS.MOBILE_OPEN_GRAPH_IN === "Side view") {
			view.setTabTitle("InfraNodus Graph");
		} else if (SETTINGS.MOBILE_OPEN_GRAPH_IN === "New tab") {
			const file = params.filePath
				? params.app.vault.getAbstractFileByPath(params.filePath)
				: { name: "" };

			let tabTitle = "InfraNodus Graph";

			if (file?.name) {
				tabTitle = file.name;
			} else if (params.sourcePath) {
				tabTitle = params.sourcePath;
			}
			view.setTabTitle(tabTitle);
		}
	}
}

export { focusOrOpenGraphTab };
