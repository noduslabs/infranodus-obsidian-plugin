import {
	FileView,
	MarkdownRenderer,
	MarkdownView,
	Notice,
	Platform,
	Plugin,
	TFile,
	Workspace,
	WorkspaceLeaf,
	setIcon,
	addIcon,
	Menu,
	SearchResult,
} from "obsidian";
import { InfraNodusSettingTab } from "./settings/settingsTab";
import {
	INFRANODUS_GRAPH_SIDE_VIEW_ID,
	INFRANODUS_GRAPH_VIEW_TYPE,
	InfraNodusGraphView,
} from "./graph_view";
import {
	INTERNAL_SETTINGS,
	PluginSettings,
	PluginInternalSettings,
	SETTINGS,
} from "./settings";
import "./styles.css";
import {
	EVENT_SAVE_SETTINGS,
	EVENT_SETTINGS_SAVED,
} from "./graph_view/lib/saveSettings";

import { observerElementVisibility, unObserveAll } from "./utils/observer";
import {
	graphContainerSidebarIsHidden,
	openGraphSideView,
} from "./graph_view/lib/openGraphSideView";
import { findFileFromName, openLeafWithPath } from "./utils/files";
import { focusOrOpenGraphTab } from "./graph_view/lib/openGraphNewTab";

export const LEAF_VIEW_BUTTON_CLASS = "infranodus-leaf-view-button";

import { extractObsidianSearchResults } from "./utils/searchResults";

export default class InfraNodusPlugin extends Plugin {
	settings: PluginSettings = SETTINGS;
	infraNodusSideView: InfraNodusGraphView;

	// public globalThis = this;
	// public static plugin: InfraNodusPlugin;

	// set in variable instead of function to bind "this"
	// Settings save listener, is outside to be able to remove it on unload
	onSettingsSaveEvent = (async (event: Event) => {
		const newSettings = (event as CustomEvent).detail;
		// console.log(
		// 	`2. Listen to "${EVENT_SAVE_SETTINGS}" event with settings:`,
		// 	newSettings
		// );

		if (!newSettings) {
			document.dispatchEvent(new CustomEvent(EVENT_SETTINGS_SAVED));
			return;
		}
		if (!this.settings) this.settings = SETTINGS;
		// Object.assign(this.settings, newSettings);
		await this.saveSettings(newSettings);
		// console.log(`3. Dispatch "${EVENT_SETTINGS_SAVED}" event`);
		const dispatchedStatus = document.dispatchEvent(
			new CustomEvent(EVENT_SETTINGS_SAVED)
		);
	}).bind(this);

	// async quickScrollRender(view: MarkdownView) {
	// 	const previewMode = view.getMode() === "preview";
	// 	const contentEl = previewMode
	// 		? view.previewMode.containerEl
	// 		: view.contentEl;

	// 	// Store the current scroll position
	// 	const originalScrollTop = contentEl.scrollTop;

	// 	// Scroll to the bottom instantly
	// 	contentEl.scrollTop = contentEl.scrollHeight;

	// 	// Wait a tiny bit for the render to trigger
	// 	await new Promise((resolve) => setTimeout(resolve, 50));

	// 	// Scroll back to the original position instantly
	// 	contentEl.scrollTop = originalScrollTop;

	// 	// Wait a bit more for any final rendering to complete
	// 	await new Promise((resolve) => setTimeout(resolve, 50));
	// }

	private bookmarksLoaded = false;

	private currentLeafViewed = "";

	async onload() {
		await this.loadSettings();

		this.addSettingTab(new InfraNodusSettingTab(this.app, this));
		document.addEventListener(
			EVENT_SAVE_SETTINGS,
			this.onSettingsSaveEvent
		);

		// Listen for when the bookmarks view becomes active
		this.registerEvent(
			this.app.workspace.on("active-leaf-change", (leaf) => {
				if (leaf?.view?.getViewType() === "bookmarks") {
					if (this.bookmarksLoaded) return;

					// Only set up once when bookmarks becomes active
					this.loadBookmarksContextMenu();
					this.bookmarksLoaded = true;
					// Unregister this event listener since we only need it once
					this.app.workspace.off("active-leaf-change", () => {});
				}
			})
		);

		const currentPlatform =
			Platform.isMobileApp || Platform.isMobile ? "mobile" : "desktop";

		addIcon(
			"infranodus-icon",
			`<svg xmlns="http://www.w3.org/2000/svg" version="1.1" width="100%" height="100%" viewBox="0 0 128 128" style="shape-rendering:geometricPrecision; text-rendering:geometricPrecision; image-rendering:optimizeQuality; fill-rule:evenodd; clip-rule:evenodd" xmlns:xlink="http://www.w3.org/1999/xlink">
<g><path style="opacity:0.899" fill="currentColor" d="M 127.5,26.5 C 127.5,30.1667 127.5,33.8333 127.5,37.5C 122.206,56.7764 109.539,65.4431 89.5,63.5C 87.7075,69.5442 85.7075,75.5442 83.5,81.5C 95.7823,92.6566 97.6156,105.323 89,119.5C 85.1134,123.354 80.6134,126.021 75.5,127.5C 71.8333,127.5 68.1667,127.5 64.5,127.5C 48.1828,120.516 43.0162,108.516 49,91.5C 55.2151,82.4192 63.8818,78.0859 75,78.5C 76.7784,72.4955 78.945,66.6622 81.5,61C 73.277,56.583 67.6103,49.9163 64.5,41C 61.5458,41.3157 58.5458,41.8157 55.5,42.5C 55.8696,58.2719 48.5363,68.4386 33.5,73C 16.049,75.1253 4.7157,67.9586 -0.5,51.5C -0.5,47.5 -0.5,43.5 -0.5,39.5C 7.22426,19.5245 21.2243,13.3578 41.5,21C 46.8015,24.2975 50.6348,28.7975 53,34.5C 55.7367,33.4396 58.57,32.6063 61.5,32C 63.6267,21.7553 68.6267,13.0886 76.5,6C 93.683,-3.39902 108.85,-0.89902 122,13.5C 124.349,17.7415 126.182,22.0748 127.5,26.5 Z M 89.5,9.5 C 103.594,7.62495 113.094,13.2916 118,26.5C 119.395,42.9504 111.895,52.6171 95.5,55.5C 76.099,51.6932 69.2656,40.3599 75,21.5C 78.5405,15.78 83.3739,11.78 89.5,9.5 Z M 24.5,26.5 C 39.479,26.9763 46.6456,34.643 46,49.5C 40.8709,63.5452 31.3709,67.7119 17.5,62C 7.9873,54.4205 6.15396,45.2539 12,34.5C 15.5789,30.724 19.7456,28.0573 24.5,26.5 Z M 65.5,88.5 C 79.4397,87.2736 85.9397,93.6069 85,107.5C 80.2071,117.652 72.7071,120.485 62.5,116C 55.1379,110.099 53.6379,102.932 58,94.5C 60.1141,91.8792 62.6141,89.8792 65.5,88.5 Z"/></g>
<g><path style="opacity:0.769" fill="currentColor" d="M 107.5,18.5 C 112.912,21.9 114.912,26.7334 113.5,33C 112.216,33.6838 111.049,33.5171 110,32.5C 108.978,28.5925 107.478,24.9259 105.5,21.5C 105.942,20.2613 106.609,19.2613 107.5,18.5 Z"/></g>
<g><path style="opacity:0.793" fill="currentColor" d="M 35.5,32.5 C 40.7318,35.6429 42.7318,40.3096 41.5,46.5C 39.8561,46.7135 38.3561,46.3802 37,45.5C 36.6628,41.836 35.4962,38.5027 33.5,35.5C 33.9424,34.2613 34.6091,33.2613 35.5,32.5 Z"/></g>
<g><path style="opacity:0.765" fill="currentColor" d="M 75.5,95.5 C 77.3904,95.2965 78.8904,95.9632 80,97.5C 81.7534,101.219 81.7534,104.886 80,108.5C 77.5237,110.063 76.0237,109.396 75.5,106.5C 75.9086,102.93 75.9086,99.2635 75.5,95.5 Z"/></g>
</svg>`
		);

		// could be #4bb6ff

		// console.log("currentPlatform", currentPlatform);
		// Ribbon Icon, the "Universal" view

		const ribbonIconEl = this.addRibbonIcon(
			"infranodus-icon",
			"InfraNodus Graph View",
			async (evt: MouseEvent) => {
				const workspace = this.app.workspace;

				// TODO a rather hacky way to understand which panel is open
				let currentlyOpenPanel = "file-explorer";
				const openViews: string[] = [];
				workspace.iterateAllLeaves((openLeaf: any) => {
					if (openLeaf.height == 0) return;
					const viewState = openLeaf.getViewState();
					const viewType = viewState.type;
					switch (viewType) {
						case "search":
						case "file-explorer":
						case "bookmarks":
							openViews.push(viewType);
							break;
						default:
							break;
					}
				});

				if (openViews.length == 1) {
					currentlyOpenPanel = openViews[0];
				}

				const leaf = this.app.workspace.getLeaf();
				let file = this.app.workspace.getActiveFile();

				const searchResults = await extractObsidianSearchResults(
					this.app
				);

				let searchQuery = "";
				const currentContent = searchResults
					?.map((result) => {
						searchQuery = result.searchQuery;
						return result.content;
					})
					.join("\n\n");

				if (!file) {
					workspace.iterateAllLeaves((openLeaf: WorkspaceLeaf) => {
						if (file) return;
						const isMarkdownView =
							openLeaf.view instanceof MarkdownView;
						const isInMainPane =
							openLeaf.getRoot() === workspace.rootSplit;
						if (
							openLeaf.view instanceof FileView &&
							isMarkdownView &&
							isInMainPane
						) {
							file = openLeaf.view.file;
						}
					});
				}
				if (!file && currentlyOpenPanel == "file-explorer")
					return new Notice("No file to open graph for");

				// console.log("Reloading graph with file", file.path);
				const parent = file?.parent;
				const filePath = parent ? parent.path : "/";

				if (currentlyOpenPanel == "file-explorer") {
					new Notice(
						"Generating a new InfraNodus graph for " + filePath
					);
				} else {
					new Notice(
						"Generating a new InfraNodus graph for the files found in the search results."
					);
				}

				await openGraphSideView(this.app);

				const currentLeaf = this.app.workspace.getLeavesOfType(
					INFRANODUS_GRAPH_VIEW_TYPE
				);

				const graphView = currentLeaf[0]?.view as InfraNodusGraphView;

				if (!graphView) {
					// console.log("No InfraNodus graph view");
					return;
				}

				switch (currentlyOpenPanel) {
					case "search":
						graphView.reloadGraph({
							leaf: leaf,
							contentString: currentContent,
							sourcePath: ` pages for search query: "${searchQuery}"`,
						});
						break;
					default:
						graphView.reloadGraph({ leaf: leaf, filePath });
						break;
				}

				// this.app.workspace.revealLeaf(leaf);
			}
		);
		// ribbonIconEl.addClass("my-plugin-ribbon-class");
		this.loadContextMenu();

		// Listen to active leaf changes, for the "Side" pane / view
		this.registerEvent(
			this.app.workspace.on("active-leaf-change", async (leaf) => {
				// if (!leaf) return;
				// if (leaf && !(leaf.view instanceof FileView)) return;
				// if (!leaf.view.file) return;
				const viewType = leaf?.view.getViewType();
				if (viewType !== "empty" && viewType !== "markdown") return;

				const file = (leaf?.view ?? ({} as any)).file as
					| TFile
					| undefined;
				if (!file) return;

				// Do not reload if the file is the same as the current one
				if (file?.path == this.currentLeafViewed) return;

				// Update the side view

				const currentLeaf = this.app.workspace.getLeavesOfType(
					INFRANODUS_GRAPH_VIEW_TYPE
				);

				const sideView = currentLeaf[0]?.view as InfraNodusGraphView;

				if (!sideView) return; // console.log("No InfraNodus side view");

				// await this.quickScrollRender(leaf!.view as any);

				if (SETTINGS.RELOADING_GRAPH != "automatic") return;

				this.currentLeafViewed = file?.path;

				sideView.reloadGraphWithBuffer({
					leaf: leaf ?? undefined,
					filePath: file?.path ?? "",
				});
			})
		);

		// Adapted from https://github.com/liamcain/obsidian-calendar-plugin/blob/master/src/main.ts
		// Register side-views
		this.registerView(INFRANODUS_GRAPH_VIEW_TYPE, (leaf: WorkspaceLeaf) => {
			return new InfraNodusGraphView({ leaf });
		});

		// Reloading of sideview based on visibility
		setTimeout(() => {
			const element = document.getElementById(
				INFRANODUS_GRAPH_SIDE_VIEW_ID
			);
			if (!element) return;

			observerElementVisibility({
				element,
				onVisibilityChange: (visible) => {
					if (!visible) return;
					const currentLeaf = this.app.workspace.getLeavesOfType(
						INFRANODUS_GRAPH_VIEW_TYPE
					);
					const sideView = currentLeaf[0]
						?.view as InfraNodusGraphView;

					const filePath = sideView.lastFilePathWhileHidden;

					if (!filePath) return;
					if (sideView && filePath == sideView.filePath) return;

					if (!sideView) return; // console.log("No side view");
					// console.log(
					// 	"Side view turned visible. Reloading with",
					// 	filePath
					// );
					sideView.reloadGraphWithBuffer({ filePath });
				},
			});
		}, 250);

		// initialize on layout ready
		this.app.workspace.onLayoutReady(() => {
			// ===================================================
			// GRAPH VIEW ========================================

			const leaves = this.app.workspace.getLeavesOfType(
				INFRANODUS_GRAPH_VIEW_TYPE
			);
			if (leaves.length === 0) {
				const leaf = this.app.workspace.getRightLeaf(false);
				leaf?.setViewState({ type: INFRANODUS_GRAPH_VIEW_TYPE });
			}
			setTimeout(() => {
				if (this.infraNodusSideView && this.infraNodusSideView.filePath)
					return;

				const filePath = this.app.workspace.getActiveFile()?.path;
				const activeLeaf =
					this.app.workspace.getActiveViewOfType(FileView)?.leaf;

				if (!filePath) return;
				// console.log("Initial load when no path", filePath);
				if (!this.infraNodusSideView) return;

				this.infraNodusSideView.reloadGraph(
					{ filePath: filePath, leaf: activeLeaf },
					false
				);
			}, 1000);

			// ===================================================
			// Add Graph Buttons =================================
			const app = this.app;
			const _parentThis = this; // only used in following function
			function addGraphButton(containerEl: HTMLElement) {
				if (containerEl.querySelector(`.${LEAF_VIEW_BUTTON_CLASS}`)) {
					return;
				}

				const viewActionsContainer =
					containerEl.querySelector(".view-actions");
				if (!viewActionsContainer) return;
				// console.log("containerEl", containerEl, viewActionsContainer);
				const button = document.createElement("button");
				button.classList.add(
					"clickable-icon",
					"view-action",
					LEAF_VIEW_BUTTON_CLASS
				);

				button.addEventListener("click", async () => {
					if (currentPlatform === "desktop") {
						const isHidden = graphContainerSidebarIsHidden();
						if (isHidden) {
							openGraphSideView(app);
							return;
						}
					}

					const wks = app.workspace;
					const filePath = wks.getActiveFile()?.path;
					const activeLeaf = wks.getActiveViewOfType(FileView)?.leaf;
					if (!filePath) return;

					try {
						const abstractFile =
							app.vault.getAbstractFileByPath(filePath)!;
						if (!(abstractFile instanceof TFile)) return;
						new Notice("Opening Graph...");
						await focusOrOpenGraphTab({ app, filePath });
					} catch (e) {
						if (e.message) new Notice("Error: " + e.message);
					}

					// the above was for currentPlatform == "mobile" but it works well for both
					// if (currentPlatform === "desktop") {
					// 	// Parent this only used here

					// 	if (
					// 		_parentThis.infraNodusSideView &&
					// 		!_parentThis.infraNodusSideView.reloadGraph
					// 	)
					// 		return;
					// 	_parentThis.infraNodusSideView.reloadGraph(
					// 		{ filePath: filePath, leaf: activeLeaf },
					// 		true
					// 	);
					// }
				});

				viewActionsContainer.prepend(button);
				setIcon(button, "infranodus-icon");
			}

			// Add button to all existing leaves
			this.app.workspace.iterateAllLeaves((leaf) => {
				if (!(leaf.view instanceof MarkdownView)) return;
				if (!leaf.view.file) return;

				const viewType = leaf?.view.getViewType();
				if (viewType !== "markdown") return;
				addGraphButton(leaf.view.containerEl);
			});

			// Add button to active leaf
			this.registerEvent(
				this.app.workspace.on("active-leaf-change", (leaf) => {
					if (!leaf) return;
					if (!(leaf.view instanceof MarkdownView)) return;
					if (!leaf.view.file) return;

					const viewType = leaf?.view.getViewType();
					if (viewType !== "markdown") return;

					const containerEl = leaf.view.containerEl;
					addGraphButton(containerEl);
				})
			);

			// Add option to the search results

			this.registerEvent(
				this.app.workspace.on(
					// @ts-ignore
					"search:results-menu",
					(menu: Menu, result: SearchResult) => {
						menu.addItem((item) => {
							item.setTitle(
								"Visualize search snippets with InfraNodus graph"
							)
								.setIcon("infranodus-icon")
								.onClick(async () => {
									const searchResults =
										await extractObsidianSearchResults(
											this.app
										);
									let searchQuery = "";

									// console.log("searchResults", searchResults);
									const currentContent = searchResults
										?.map((result) => {
											searchQuery = result.searchQuery;
											return result.snippetsFound.join(
												"\n"
											);
										})
										.join("\n\n");

									this.openPageInGraph({
										contentString: currentContent,
										sourcePath: ` search result snippets for query: "${searchQuery}"`,
									});
								});
						});
						menu.addItem((item) => {
							item.setTitle(
								"Visualize all the pages found with InfraNodus graph"
							)
								.setIcon("infranodus-icon")
								.onClick(async () => {
									const searchResults =
										await extractObsidianSearchResults(
											this.app
										);

									let searchQuery = "";
									const currentContent = searchResults
										?.map((result) => {
											searchQuery = result.searchQuery;
											return result.content;
										})
										.join("\n\n");

									this.openPageInGraph({
										contentString: currentContent,
										sourcePath: ` pages for search query: "${searchQuery}"`,
									});
								});
						});
					}
				)
			);
		});
	}

	async loadBookmarksContextMenu() {
		// First ensure bookmarks plugin is enabled
		// @ts-ignore
		const bookmarksPlugin = this.app.internalPlugins.plugins.bookmarks;

		if (!bookmarksPlugin?.enabled) {
			await bookmarksPlugin?.enable();
			// Give it a moment to initialize
			await new Promise((resolve) => setTimeout(resolve, 100));
		}

		const leaves = this.app.workspace.getLeavesOfType("bookmarks");
		if (!leaves || leaves.length === 0) {
			// console.log('No leaves detected')
			return; // Silently return if bookmarks not available yet
		}

		const leaf = leaves[0];
		const view = leaf.view;
		if (!view) {
			// console.log('No view detected')
			return; // Silently return if view not ready
		}

		// @ts-ignore
		const bookmarkItems = view.plugin?.items;
		if (!bookmarkItems) {
			// console.log('No bookmark items detected')
			return; // Silently return if items not available
		}

		// @ts-ignore
		const bookmarkItemsToUse: any = {};
		bookmarkItems.forEach((bookmarkItem: any, index: number) => {
			if (bookmarkItem.type == "group") {
				if (!bookmarkItemsToUse["group"]) {
					bookmarkItemsToUse["group"] = bookmarkItem;
				}
			}
			if (bookmarkItem.type == "file") {
				if (!bookmarkItemsToUse["file"]) {
					bookmarkItemsToUse["file"] = bookmarkItem;
				}
			}
		});

		Object.keys(bookmarkItemsToUse).forEach((key) => {
			const bookmarkItemToUse = bookmarkItemsToUse[key];

			// @ts-ignore
			const dom = view.getItemDom(bookmarkItemToUse);
			const domProto = Object.getPrototypeOf(dom);
			const originalOnContextMenu = domProto.onContextMenu;

			const self = this;

			if (domProto._hasContextMenu) return;

			domProto.onContextMenu = function (evt: any) {
				domProto._hasContextMenu = true;

				const originalShowAtMouseEvent =
					Menu.prototype.showAtMouseEvent;

				// @ts-ignore
				Menu.prototype.showAtMouseEvent = function (evt) {
					self.app.workspace.trigger("bookmarks:menu", {
						menu: this,
						type: bookmarkItemToUse.type,
						groupTitle:
							bookmarkItemToUse.type == "group"
								? bookmarkItemToUse.title
								: "",
					});
					originalShowAtMouseEvent.call(this, evt);
				};
				try {
					originalOnContextMenu.call(this, evt);
				} finally {
					Menu.prototype.showAtMouseEvent = originalShowAtMouseEvent;
				}
			};
		});

		// @ts-ignore
		bookmarksPlugin.disable();
		await bookmarksPlugin.enable();
	}

	loadContextMenu() {
		this.registerEvent(
			this.app.workspace.on("file-menu", (menu, file) => {
				menu.addItem((item) => {
					item.setTitle("Open in InfraNodus Graph")
						.setIcon("infranodus-icon")
						.onClick(async () => {
							this.openPageInGraph({ file });
						});
				});
			})
		);

		this.registerEvent(
			this.app.workspace.on("files-menu", (menu, files) => {
				menu.addItem((item) => {
					item.setTitle("Open in InfraNodus Graph")
						.setIcon("infranodus-icon")
						.onClick(async () => {
							if (!files || files.length === 0) {
								new Notice(
									"No files selected, so there's nothing to process."
								);
								return;
							}
							const contentToAnalyze = [];
							const fileNames = [];
							for (const file of files) {
								if (file instanceof TFile) {
									const content =
										await this.app.vault.cachedRead(file);
									fileNames.push(file.name);
									contentToAnalyze.push(content);
								}
							}
							if (contentToAnalyze.length === 0) {
								new Notice(
									"Could not extract any content from files."
								);
								return;
							}

							this.openPageInGraph({
								contentString: contentToAnalyze.join("\n\n"),
								sourcePath: ` selected files: ${
									fileNames.length <= 2
										? fileNames.join(" and ")
										: fileNames.slice(0, 3).join(", ") +
										  " and " +
										  (fileNames.length - 2) +
										  " more"
								}`,
							});
						});
				});
			})
		);

		this.registerEvent(
			this.app.workspace.on(
				// @ts-ignore
				"bookmarks:menu",
				// @ts-ignore
				({ menu, type, groupTitle }) => {
					menu.addItem((item: any) => {
						item.setTitle("Open in InfraNodus Graph")
							.setIcon("infranodus-icon")
							.onClick(async () => {
								const leaf =
									this.app.workspace.getLeavesOfType(
										"bookmarks"
									)[0];
								if (!leaf) {
									new Notice(
										"Bookmarks Plugin is not initialized"
									);
									return;
								}
								const view = leaf.view;

								// @ts-ignore
								const bookmarkItems = view.plugin.items;

								const fileItems: any = [];

								bookmarkItems.forEach((bookmarkItem: any) => {
									if (
										bookmarkItem.type == "file" &&
										type == "file"
									)
										fileItems.push(bookmarkItem);
									if (bookmarkItem.type == "group") {
										if (
											(type == "group" &&
												groupTitle ==
													bookmarkItem.title) ||
											type == "file"
										) {
											bookmarkItem.items.forEach(
												(item: any) => {
													if (item.type == "file")
														fileItems.push(item);
												}
											);
										}
									}
								});

								const selectedArray: number[] = [];

								fileItems.forEach(
									(fileItem: any, index: number) => {
										if (type == "group") {
											selectedArray.push(index);
											return;
										}
										// @ts-ignore
										const dom = view.getItemDom(fileItem);

										const domEl = dom.el as HTMLElement;

										const hasSelectedChild =
											domEl.querySelector(
												"div.is-selected"
											) !== null;

										const hasActiveChild =
											domEl.querySelector(
												"div.is-active"
											) !== null;

										if (
											hasSelectedChild ||
											hasActiveChild
										) {
											selectedArray.push(index);
										}
									}
								);

								const selectedFiles = selectedArray.map(
									(index) => fileItems[index]
								);

								const fileNames = [];

								const contentToAnalyze = [];

								for (const selectedFile of selectedFiles) {
									const file: any =
										this.app.vault.getAbstractFileByPath(
											selectedFile.path
										);

									const content =
										await this.app.vault.cachedRead(file);

									fileNames.push(file.name);
									contentToAnalyze.push(content);
								}
								if (contentToAnalyze.length === 0) {
									new Notice(
										"Could not extract any content from files."
									);
									return;
								}

								const pathPrefix =
									type == "group"
										? `group (${groupTitle})`
										: "files";
								this.openPageInGraph({
									contentString:
										contentToAnalyze.join("\n\n"),
									sourcePath: ` selected ${pathPrefix}: ${
										fileNames.length <= 2
											? fileNames.join(" and ")
											: fileNames.slice(0, 3).join(", ") +
											  " and " +
											  (fileNames.length - 2) +
											  " more"
									}`,
								});
							});
					});
				}
			)
		);
	}

	onunload() {
		// console.log("[InfraNodus] [settings] remove event listener");
		document.removeEventListener(
			EVENT_SAVE_SETTINGS,
			this.onSettingsSaveEvent
		);
		// console.log("[InfraNodus] remove observers");
		unObserveAll();

		const buttons = document.querySelectorAll(`.${LEAF_VIEW_BUTTON_CLASS}`);
		// console.log("[InfraNodus] remove existing buttons", buttons.length);
		buttons.forEach((button) => button.remove());
	}

	async loadSettings() {
		const settings = (await this.loadData()) ?? {};
		// this.settings = settings;
		Object.assign(this.settings, settings);
		Object.assign(SETTINGS, this.settings);
	}

	async saveSettings(settings: any) {
		Object.assign(this.settings, settings);
		Object.assign(SETTINGS, this.settings);
		await this.saveData(this.settings);
		// console.log("Settings saved");
	}

	async openPageInGraph({
		file,
		contentString,
		sourcePath,
	}: {
		file?: any;
		contentString?: string;
		sourcePath?: string;
	}) {
		new Notice("Generating InfraNodus Graph...");
		const currentPlatform =
			Platform.isMobileApp || Platform.isMobile ? "mobile" : "desktop";

		const plat = currentPlatform;
		if (plat === "desktop") {
			await openGraphSideView(this.app);
			const currentLeaf = this.app.workspace.getLeavesOfType(
				INFRANODUS_GRAPH_VIEW_TYPE
			);

			const graphView = currentLeaf[0]?.view as InfraNodusGraphView;

			if (!graphView) {
				// console.log("No InfraNodus graph view");
				return;
			}

			graphView.reloadGraph({
				leaf: this.app.workspace.getLeaf(),
				filePath: file ? file.path : "",
				contentString,
				sourcePath,
			});
		}

		if (plat === "mobile") {
			await focusOrOpenGraphTab({
				app: this.app,
				filePath: file?.path,
				contentString,
			});
		}
		// const leaf = this.app.workspace.getLeaf("split");
		// leaf.open(
		// 	new InfraNodusGraphView({
		// 		leaf,
		// 		filePath: file?.path,
		// 	})
		// );
		// this.app.workspace.revealLeaf(leaf);
	}
}
