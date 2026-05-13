import { App, Modal, Setting } from "obsidian";

export class GraphNameModal extends Modal {
    private graphName: string;
    private onSubmit: (result: string | null) => void;

    constructor(app: App, initialGraphName: string, onSubmit: (result: string | null) => void) {
        super(app);
        this.graphName = initialGraphName;
        this.onSubmit = onSubmit;
    }

    onOpen() {
        const { contentEl } = this;

        contentEl.createEl("h2", { text: "Export the Data to InfraNodus" });

        new Setting(contentEl)
            .setName("Confirm the InfraNodus graph name")
            .addText((text) =>
                text
                    .setValue(this.graphName)
                    .onChange((value) => {
                        this.graphName = value;
                    })
            );

        new Setting(contentEl)
            .addButton((btn) =>
                btn
                    .setButtonText("Submit")
                    .setCta()
                    .onClick(() => {
                        this.close();
                        this.onSubmit(this.graphName);
                    })
            )
            .addButton((btn) =>
                btn
                    .setButtonText("Cancel")
                    .onClick(() => {
                        this.close();
                        this.onSubmit(null);
                    })
            );
    }

    onClose() {
        const { contentEl } = this;
        contentEl.empty();
    }
}
