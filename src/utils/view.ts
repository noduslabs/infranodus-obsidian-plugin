import { App, MarkdownView, WorkspaceLeaf } from "obsidian";

function getMarkdownViewOfPath(params: {
	app: App;
	filePath: string;
}): MarkdownView | null {
	try {
		let view: MarkdownView | null = null;
		params.app.workspace.iterateAllLeaves((leaf) => {
			if (view) return;
			if (!(leaf.view instanceof MarkdownView)) return;
			const file = leaf.view.file;
			if (!file) return;
			if (file.path !== params.filePath) return;

			view = leaf.view;
		});
		return view;
	} catch (err) {
		console.error("Error getting markdown view of path", err);
		return null;
	}
}

async function setLeafMode(params: {
	leaf: WorkspaceLeaf;
	mode: "source" | "preview";
}) {
	try {
		const viewState = params.leaf.getViewState();
		viewState.state.mode = params.mode;
		await params.leaf.setViewState(viewState);
	} catch (err) {
		console.error("Error setting leaf mode", err);
	}
}

export { getMarkdownViewOfPath, setLeafMode };
