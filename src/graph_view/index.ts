import {
	FileView,
	ItemView,
	MarkdownView,
	Notice,
	TFile,
	TFolder,
	ViewStateResult,
	WorkspaceLeaf,
	setIcon,
	Platform,
} from "obsidian";
import { InfraNodus } from "src/infranodus";
import { Root, createRoot } from "react-dom/client";
import * as React from "react";
import { GraphView } from "./GraphView";
import { EmptyGraphView } from "./EmptyGraphView";
import { guidGenerator } from "src/utils/guid";
import { ReloadGraphParams } from "./types";
import { graphContainerSidebarIsHidden } from "./lib/openGraphSideView";
import { unObserveElementAttributes } from "src/utils/observer";
import { INTERNAL_SETTINGS, SETTINGS } from "src/settings";
import { getMarkdownViewOfPath } from "src/utils/view";

export const INFRANODUS_GRAPH_VIEW_TYPE = "infranodus-graph-view";
export const INFRANODUS_GRAPH_SIDE_VIEW_ID = "infranodus-graph-side-view";
export const INFRANODUS_GRAPH_BUTTON_ID = "infranodus-graph-button";

function onError(a: any, b: any, c: any, d: any, e: any) {
	new Notice(`message: ${a}`, 20000);
	new Notice(`source: ${b}`, 20000);

	new Notice(`error: ${e}`, 20000);

	return true;
}

const currentPlatform =
	Platform.isMobileApp || Platform.isMobile ? "mobile" : "desktop";

export class InfraNodusGraphView extends ItemView {
	private root: Root;
	private shadowEl: HTMLElement;
	private shadowElRect: DOMRect;
	private id: string = guidGenerator();
	private isFolder = false;
	private isRoot = false;
	private workspaceLayoutReady = false;
	private previousCorrespondingViewDataMode = "";

	public graphContainer: Element;
	public filePath = "";
	public contentString = "";
	public sourcePath = "";
	public static ribbonIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="svg-icon dice"><path d="M19 3H5C3.89543 3 3 3.89543 3 5V19C3 20.1046 3.89543 21 5 21H19C20.1046 21 21 20.1046 21 19V5C21 3.89543 20.1046 3 19 3Z"></path><path d="M17 16C17 16.5523 16.5523 17 16 17C15.4477 17 15 16.5523 15 16C15 15.4477 15.4477 15 16 15C16.5523 15 17 15.4477 17 16Z"></path><path d="M13 12C13 12.5523 12.5523 13 12 13C11.4477 13 11 12.5523 11 12C11 11.4477 11.4477 11 12 11C12.5523 11 13 11.4477 13 12Z"></path><path d="M9 8C9 8.55228 8.55228 9 8 9C7.44772 9 7 8.55228 7 8C7 7.44772 7.44772 7 8 7C8.55228 7 9 7.44772 9 8Z"></path></svg>`;

	constructor(params: { leaf: WorkspaceLeaf; filePath?: string }) {
		// console.log("Loading InfraNodus Plugin");
		super(params.leaf);
		// params.leaf.setPinned(true);

		this.filePath = params.filePath ?? "";

		if (this.filePath) {
			const abstractFile = this.app.vault.getAbstractFileByPath(
				this.filePath
			)!;
			if (abstractFile instanceof TFolder) {
				this.isRoot = abstractFile.isRoot();
				this.isFolder = true;
			}
		}

		this.setTabTitle("InfraNodus Graph");

		// Check for layout change that may result in reload
		this.registerEvent(
			this.app.workspace.on("layout-change", () => {
				if (currentPlatform === "mobile") return;
				if (SETTINGS.RELOADING_GRAPH === "manual") return;

				this.app.workspace.iterateAllLeaves((leaf) => {
					if (!(leaf.view instanceof InfraNodusGraphView)) return;
					if (leaf.view.id !== this.id) return;

					const toCheck = ["width", "left", "top", "right"] as const;

					const rect = this.shadowElRect;
					const newRect = this.shadowEl.getBoundingClientRect();
					let newRectAllZero = true;
					for (const key of toCheck) {
						if (newRect[key] !== 0) {
							newRectAllZero = false;
							break;
						}
					}
					if (newRectAllZero) return;

					for (const key of toCheck) {
						if (rect[key] === newRect[key]) continue;

						// console.log("InfraNodus - Key is different", key);
						this.shadowElRect = newRect;
						// this.onLayoutChange();

						this.reloadGraphWithBuffer({
							leaf,
							filePath: this.filePath,
							fromLayoutChange: true,
						});
						return;
					}
				});
			})
		);

		// Check for edit mode -> reading mode change
		this.registerEvent(
			this.app.workspace.on("layout-change", () => {
				const correspondingView = getMarkdownViewOfPath({
					app: this.app,
					filePath: this.filePath,
				});
				if (!correspondingView) return;
				const mode =
					correspondingView.containerEl.getAttribute("data-mode");
				if (!mode) return;
				if (mode === this.previousCorrespondingViewDataMode) return;
				this.previousCorrespondingViewDataMode = mode;

				if (mode === "preview") {
					if (
						SETTINGS.RELOADING_GRAPH === "into reading" ||
						SETTINGS.RELOADING_GRAPH === "automatic"
					) {
						// console.log(
						// 	"[mode change to preview]",
						// 	this.filePath,
						// 	mode
						// );
						this.reloadGraph(
							{ leaf: this.leaf, filePath: this.filePath },
							true
						);
					}
				}
			})
		);

		this.app.workspace.onLayoutReady(() => {
			this.workspaceLayoutReady = true;
		});

		try {
			window.onerror = onError;
		} catch (err) {
			new Notice("Error setting error handler");
			new Notice(err.message);
		}
	}

	private timeOut: number;
	async reloadGraphWithBuffer(
		params: {
			leaf?: WorkspaceLeaf;
			filePath: string;
			fromLayoutChange?: boolean;
		},
		forceReload = false
	) {
		if (this.timeOut) window.clearTimeout(this.timeOut);
		this.timeOut = window.setTimeout(() => {
			this.reloadGraph(params, forceReload);
		}, 1000);
	}

	private isReloadingGraph = false;
	private lastReloadFilePath = "";

	// Serializes reloadGraph calls: two overlapping reloads (e.g. a
	// layout-change and a mode-change firing together) would otherwise both
	// unmount and createRoot on the same element, leaving a blank pane
	private reloadQueue: Promise<void> = Promise.resolve();

	// Variable used in src/main.ts > onload() > observerElementVisibility
	// Used to reload the graph when the side view is made visible, from invisible
	public lastFilePathWhileHidden: string | null = null;
	async reloadGraph(
		params: ReloadGraphParams = {
			leaf: this.leaf,
			filePath: this.filePath,
			fromLayoutChange: false,
			contentString: this.contentString,
			sourcePath: this.sourcePath,
		},
		forceReload = true
	) {
		this.reloadQueue = this.reloadQueue.then(() =>
			this._reloadGraph(params, forceReload).catch((err) =>
				console.error("InfraNodus: error reloading graph", err)
			)
		);
		return this.reloadQueue;
	}

	private async _reloadGraph(params: ReloadGraphParams, forceReload = true) {
		if (!this.workspaceLayoutReady) return;
		this.contentString = params.contentString || "";
		this.sourcePath = params.sourcePath || "";
		const isHidden = graphContainerSidebarIsHidden();
		if (isHidden) {
			this.lastFilePathWhileHidden = params.filePath || "";
			// console.log(
			// 	"Graph container is hidden, not reloading graph with",
			// 	params.filePath
			// );
			return;
		}
		this.lastFilePathWhileHidden = null;

		// if (params.leaf) this.leaf = params.leaf;s
		this.filePath = params.filePath || "";

		if (
			this.filePath &&
			!params.fromLayoutChange &&
			this.lastReloadFilePath === this.filePath &&
			!forceReload
		) {
			return;
		}

		this.lastReloadFilePath = this.filePath;

		// console.log("Reload InfraNodus graph", this.filePath);
		if (!params.dontRemoveHighlights) {
			const elementsRemoved: HTMLElement[] = [];
			const hlclass = "infranodus-plugin-yellow-highlight";
			this.app.workspace.iterateAllLeaves((openLeaf: WorkspaceLeaf) => {
				if (!(openLeaf.view instanceof FileView)) return;
				const html = openLeaf.view.containerEl.querySelectorAll(
					`.${hlclass}`
				);
				for (const element of Array.from(html)) {
					element.classList.remove(hlclass);
					elementsRemoved.push(element as HTMLElement);
				}
			});

			// console.log("Removed", elementsRemoved.length, "highlights");
			unObserveElementAttributes(elementsRemoved);
			elementsRemoved.forEach((el) =>
				el.classList.remove("infranodus-plugin-yellow-highlight")
			);
		}

		if (!this.root || !this.shadowEl) return;
		this.root.unmount();
		await new Promise((resolve) => setTimeout(resolve, 0));
		this.root = createRoot(this.shadowEl);

		if (this.filePath) {
			this.root.render(
				React.createElement(GraphView, {
					initialData: params.initialData,
					graphContext: {
						app: this.app,
						filePath: this.filePath,
						isRoot: this.isRoot,
						isFolder: this.isFolder,
						reloadGraph: this.reloadGraph.bind(this),
						infraNodusGraphView: this,
						maxHeight: this.graphContainer.clientHeight,
						maxWidth: this.graphContainer.clientWidth - 24,
					},
				})
			);
		} else if (this.contentString) {
			this.root.render(
				React.createElement(GraphView, {
					initialData: params.initialData,
					graphContext: {
						app: this.app,
						contentString: this.contentString,
						sourcePath: this.sourcePath,
						isRoot: this.isRoot,
						isFolder: this.isFolder,
						reloadGraph: this.reloadGraph.bind(this),
						infraNodusGraphView: this,
						maxHeight: this.graphContainer.clientHeight,
						maxWidth: this.graphContainer.clientWidth - 24,
					},
				})
			);
		} else {
			this.root.render(React.createElement(EmptyGraphView, {}));
		}
		this.setTabTitle("InfraNodus Graph");

		// Prevent rapid reloads
		// setTimeout(() => (this.isReloadingGraph = false), 250);
	}

	setTabTitle(title: string) {
		const header = (this.leaf as any)?.tabHeaderEl as HTMLElement;
		if (header) {
			const headerTitle = header.querySelector(
				".workspace-tab-header-inner-title"
			) as HTMLElement;
			if (headerTitle) headerTitle.innerText = title;

			header.setAttribute("aria-label", title);
			header.id = INFRANODUS_GRAPH_BUTTON_ID;

			// Set icon
			const headerIcon = header.querySelector(
				".workspace-tab-header-inner-icon"
			) as HTMLElement;
			setTimeout(() => {
				if (!headerIcon) return;

				setIcon(headerIcon, "infranodus-icon");
			}, 100);
		}
	}

	getViewType(): string {
		return INFRANODUS_GRAPH_VIEW_TYPE;
	}

	getDisplayText(): string {
		if (currentPlatform === "desktop") {
			if (this.isRoot) return `[ROOT] ${this.filePath}`;
			if (this.isFolder) return `[FOLDER] ${this.filePath}`;
			return this.filePath;
		}

		const isInMainPane =
			this.leaf.getRoot() === this.app.workspace.rootSplit;
		if (!isInMainPane) return "InfraNodus Graph";

		const file = this.app.vault.getAbstractFileByPath(this.filePath);
		return file?.name ?? "InfraNodus Graph";
	}

	getIcon(): string {
		return "infranodus-icon";
	}

	async onOpen(): Promise<void> {
		const container = this.containerEl.children[1];
		container.id = INFRANODUS_GRAPH_SIDE_VIEW_ID;
		this.graphContainer = container;
		const shadowRoot = container.attachShadow({ mode: "open" });

		this.root?.unmount();
		this.shadowEl = shadowRoot.createEl("div", {
			cls: "infranodus-graph-content",
		});
		this.root = createRoot(this.shadowEl);
		30;
		if (this.filePath) {
			this.root.render(
				React.createElement(GraphView, {
					graphContext: {
						app: this.app,
						filePath: this.filePath,
						isRoot: this.isRoot,
						isFolder: this.isFolder,
						reloadGraph: this.reloadGraph.bind(this),
						infraNodusGraphView: this,
						maxHeight: this.graphContainer.clientHeight,
						maxWidth: this.graphContainer.clientWidth - 24,
					},
				})
			);
		} else {
			this.root.render(React.createElement(EmptyGraphView, {}));
		}

		const sheet = new CSSStyleSheet();
		sheet.replaceSync(`/* INJECTED_CSS */`);
		shadowRoot.adoptedStyleSheets = [sheet];
		await new Promise((resolve) => setTimeout(resolve, 0));
		this.shadowElRect = this.shadowEl.getBoundingClientRect();
	}

	async onClose(): Promise<void> {
		window.onerror = null;
		this.root?.unmount();
	}
}
