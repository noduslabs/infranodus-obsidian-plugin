import { App, Modal, Setting } from "obsidian";

export interface ExportGraphChoice {
	graphName: string;
	saveToManifest: boolean;
}

/**
 * Confirmation dialog shown before exporting the whole analyzed graph /
 * text to InfraNodus: lets the user edit the graph name and — when the
 * vault has an `infranodus/manifest.json` — choose whether to register the
 * exported graph there.
 */
export class ExportGraphModal extends Modal {
	private graphName: string;
	private saveToManifest: boolean;
	private showManifestOption: boolean;
	private onSubmit: (result: ExportGraphChoice | null) => void;
	private submitted = false;

	constructor(
		app: App,
		initialGraphName: string,
		showManifestOption: boolean,
		onSubmit: (result: ExportGraphChoice | null) => void
	) {
		super(app);
		this.graphName = initialGraphName;
		this.showManifestOption = showManifestOption;
		this.saveToManifest = showManifestOption;
		this.onSubmit = onSubmit;
	}

	onOpen() {
		const { contentEl } = this;

		contentEl.createEl("h2", { text: "Export the Data to InfraNodus" });

		new Setting(contentEl)
			.setName("Confirm the InfraNodus graph name")
			.addText((text) =>
				text.setValue(this.graphName).onChange((value) => {
					this.graphName = value;
				})
			);

		if (this.showManifestOption) {
			new Setting(contentEl)
				.setName("Register in infranodus/manifest.json")
				.setDesc(
					"Add this graph to the vault's InfraNodus manifest so AI agents can find and query it."
				)
				.addToggle((toggle) =>
					toggle.setValue(this.saveToManifest).onChange((value) => {
						this.saveToManifest = value;
					})
				);
		}

		new Setting(contentEl)
			.addButton((btn) =>
				btn
					.setButtonText("Export")
					.setCta()
					.onClick(() => {
						this.submitted = true;
						this.close();
						this.onSubmit(
							this.graphName.trim()
								? {
										graphName: this.graphName.trim(),
										saveToManifest:
											this.showManifestOption &&
											this.saveToManifest,
								  }
								: null
						);
					})
			)
			.addButton((btn) =>
				btn.setButtonText("Cancel").onClick(() => {
					this.submitted = true;
					this.close();
					this.onSubmit(null);
				})
			);
	}

	onClose() {
		const { contentEl } = this;
		contentEl.empty();
		// Closing with Esc / click-outside must still resolve the promise
		if (!this.submitted) this.onSubmit(null);
	}
}
