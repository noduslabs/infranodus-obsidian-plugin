import {
	App,
	FileView,
	MarkdownView,
	Notice,
	TAbstractFile,
	TFile,
	TFolder,
	Workspace,
	WorkspaceLeaf,
} from "obsidian";
import { getPureTextFromMarkdown } from "./line";
import { observerElementAttributes } from "./observer";
import markdownToTxt from "markdown-to-txt";
import { SETTINGS } from "src/settings";

async function getMentionsOfFile(
	app: App,
	filePath: string,
	searchWords: string[]
) {
	const file = app.vault.getAbstractFileByPath(filePath);
	if (!file) return;
	const isFolder = file instanceof TFolder;
	if (!isFolder) await focusOrOpenFile(app, file.path);
	if (searchWords.length === 0) return;

	// Use searchWords instead of filePath
	// const name = file.name.slice(0, -3);
	searchWords = searchWords.map((word) => {
		if (word.startsWith("[[") && word.endsWith("]]")) {
			word = word.slice(2, -2);
			word = word.replace("_", " ");
		}
		return word;
	});
	const name = searchWords.join(" ");

	// Open search
	const elements = document.querySelectorAll(
		'.workspace-tab-header[data-type="search"]'
	);
	if (elements.length !== 1)
		return console.error("Could not find search button");
	const searchButton = elements[0] as HTMLElement;
	searchButton.click();

	// Search for the name
	const searchInput = document.querySelector(
		'input[type="search"][placeholder="Search..."]'
	) as HTMLInputElement;
	// console.log("searchInput", searchInput, `${name}`);
	searchInput.value = `${name}`;
	searchInput.dispatchEvent(new Event("input", { bubbles: true }));
	setTimeout(async () => {
		const el = document.createElement("div");
		el.style.position = "absolute";
		el.style.display = "none";
		document.body.appendChild(el);
		searchInput.blur();
		el.focus();
		el.click();
		await new Promise((r) => setTimeout(r, 0));
		document.body.removeChild(el);
	}, 0); // to complete blur

	// Wait for search results
	await new Promise((r) => setTimeout(r, 500));

	// Collapse first entry if it is from same file
	// const searchResultsContainer = document.querySelector(
	// 	`.search-result-container.mod-global-search.node-insert-event`
	// );
	// if (!searchResultsContainer)
	// 	return console.error("Could not find search results container");
	// const searchResults: NodeListOf<HTMLElement> =
	// 	searchResultsContainer.querySelectorAll(".search-result.tree-item");

	// for (const result of Array.from(searchResults)) {
	// 	const firstTextElement = result?.querySelector(".tree-item-inner");
	// 	let text = firstTextElement?.firstChild
	// 		? firstTextElement.firstChild.textContent || ""
	// 		: firstTextElement?.textContent || "";

	// 	console.log(
	// 		"text",
	// 		text,
	// 		name,
	// 		firstTextElement,
	// 		firstTextElement?.firstChild
	// 	);
	// 	if (text === name) {
	// 		const icon = result?.querySelector(
	// 			".tree-item-icon"
	// 		) as HTMLElement;
	// 		if (icon && !icon?.classList.contains("is-collapsed")) {
	// 			icon?.click();
	// 			break;
	// 		}
	// 	}
	// }

	// Highlight mentions
	// if (leaf) {
	// 	console.log("highlighting words for context", searchWords);
	// 	for (const word of searchWords) {
	// 		const textContent = getPureTextFromMarkdown(word).toLowerCase();
	// 		findLineEntryInLeaf(leaf, {
	// 			textContent,
	// 			dontScroll: true,
	// 			filePath: file.path,
	// 			app,
	// 		});
	// 	}
	// }
}

async function openLeafWithPath(file: TFile, workspace: Workspace) {
	let leaf: WorkspaceLeaf | undefined;

	workspace.iterateAllLeaves((openLeaf: WorkspaceLeaf) => {
		const isMarkdownView = openLeaf.view instanceof MarkdownView;
		const isInMainPane = openLeaf.getRoot() === workspace.rootSplit;
		if (
			openLeaf.view instanceof FileView &&
			openLeaf.view.file?.path === file.path &&
			isMarkdownView &&
			isInMainPane
		) {
			leaf = openLeaf;
			return true;
		}
	});

	if (leaf) {
		workspace.setActiveLeaf(leaf, { focus: true });
		workspace.setActiveLeaf(leaf);
		workspace.revealLeaf(leaf);
	} else {
		// Get the current active leaf before opening the new file
		const currentLeaf = workspace.getLeaf();

		// Open the file in the current leaf
		await currentLeaf.openFile(file, { active: true });
		leaf = currentLeaf;
	}
	// Wait for the file to be loaded (searching - there does not seem to be a way provided by obsidian for this?)
	await new Promise((r) => setTimeout(r, 250));
	return leaf;
}

async function fileWithText(params: {
	app: App;
	textToFind: string;
	file: TAbstractFile;
}): Promise<TFile | null> {
	const { app, textToFind, file } = params;

	if (file instanceof TFile) {
		const content = await app.vault.read(file);
		if (content.contains(textToFind!)) {
			return file;
		}
		return null;
	} else if (file instanceof TFolder) {
		for (const child of file.children) {
			const found = await fileWithText({ file: child, app, textToFind });
			if (found) return found;
		}
	}
	return null;
}

async function findFileWithText(params: {
	app: App;
	filePath: string;
	textToFind: string;
}): Promise<TFile | null> {
	try {
		let abstractFile = params.app.vault.getAbstractFileByPath(
			params.filePath
		);
		if (!abstractFile) abstractFile = params.app.vault.getRoot();
		const foundFileWithText = await fileWithText({
			app: params.app,
			textToFind: params.textToFind,
			file: abstractFile,
		});
		if (foundFileWithText) return foundFileWithText;
		if (abstractFile.path === "/") return null;

		abstractFile = params.app.vault.getRoot();
		const newFileFound = await fileWithText({
			app: params.app,
			textToFind: params.textToFind,
			file: abstractFile,
		});
		if (newFileFound) return newFileFound;
		return null;
	} catch (err) {
		console.error("[findFileWithText]", err);
		return null;
	}
	return null;
}

async function focusOrOpenFile(
	app: App,
	filePath: string,
	textToFind?: string
): Promise<WorkspaceLeaf | undefined> {
	// if (!filePath.endsWith(".md")) return;

	// console.log("focusOrOpenFile", filePath);
	const workspace = app.workspace;
	const file = app.vault.getAbstractFileByPath(filePath);

	if (file instanceof TFile) {
		return await openLeafWithPath(file, workspace);
	} else if (file instanceof TFolder && textToFind) {
		async function fileWithText(
			file: TAbstractFile
		): Promise<TFile | null> {
			if (file instanceof TFile) {
				// console.log("Searching text in", file.path);
				const content = (await app.vault.read(file)).toLowerCase();
				if (content.contains(textToFind!)) {
					// console.log("Found text in", file.path, content);
					return file;
				}
				return null;
			} else if (file instanceof TFolder) {
				for (const child of file.children) {
					const found = await fileWithText(child);
					if (found) return found;
				}
			}
			return null;
		}

		textToFind = textToFind.toLowerCase().trim();
		// console.log("Searching for text", textToFind);
		const fileFound = await fileWithText(file);
		if (!fileFound) return;
		return await openLeafWithPath(fileFound, workspace);
	} else {
		console.error(`File not found: ${filePath}`);
	}
}

async function unhighlightStatements(app: App, statements: string[]) {
	const workspace = app.workspace;
	const elementsUnhighlighted: HTMLElement[] = [];
	workspace.iterateAllLeaves((openLeaf: WorkspaceLeaf) => {
		if (!(openLeaf.view instanceof FileView)) return;
		const html = openLeaf.view.containerEl.querySelectorAll(
			".infranodus-plugin-yellow-highlight"
		);
		for (const element of Array.from(html)) {
			for (const st of statements) {
				const statement = condenseText(st, true);
				const textContent = condenseText(
					element.textContent || "",
					true
				);
				if (!textContent.contains(statement)) continue;
				element.classList.remove("infranodus-plugin-yellow-highlight");
				elementsUnhighlighted.push(element as HTMLElement);
			}
		}
	});
	return elementsUnhighlighted;
}

function findElementWithText(node: Node, text: string): HTMLElement | null {
	if (node.nodeType === Node.TEXT_NODE) {
		if (node.textContent?.toLowerCase().includes(text)) {
			return node.parentElement;
		}
	}

	if (node.nodeType === Node.ELEMENT_NODE) {
		const nodeClasslist = (node as HTMLElement).classList;
		if (
			nodeClasslist.contains("view-header") ||
			nodeClasslist.contains("inline-title")
		) {
			return null;
		}
		for (const childNode of Array.from(node.childNodes)) {
			const element = findElementWithText(childNode, text);
			if (element) {
				return element;
			}
		}
	}

	return null;
}

function condenseText(text: string, all = false) {
	// Change obsidian links to markdown links
	// Change markdown to plain text
	// const modifiedText = text.replace(/\[\[(.+?)\]\]/g, "[$1]()");
	const modifiedText = text.replace(/\[{2,}([^\[\]]+)\]{2,}/g, "$1");
	let m = markdownToTxt(modifiedText).toLowerCase().trim();
	if (all) {
		m = stripLatex(m);
		m = stripImages(m);
		m = stripMarkdownTable(m);
	}
	return m;
}

function stripLatex(text: string) {
	// Remove LaTeX content enclosed in $...$
	return text.replace(/\$[^$]+\$/g, "");
}

function stripImages(text: string): string {
	const imagePattern = /\S+\.(png|jpg|jpeg|gif|svg)/gi;
	return text.replace(imagePattern, "");
}

function stripMarkdownTable(text: string) {
	text = text.replace(/\s/g, "");
	text = text.replace(/\|/g, "");
	text = text.toLowerCase();
	return text;
}

function findLowestElementWithText(
	element: HTMLElement,
	text: string
): HTMLElement | null {
	function _findLowestElementWithText(
		element: HTMLElement,
		text: string,
		options: {
			all: boolean;
			haveTitle?: boolean;
		} = { all: false, haveTitle: false }
	): HTMLElement | null {
		if (element.classList.contains("inline-title") && options.haveTitle)
			return null;

		const textContent = condenseText(element.innerText ?? "", options.all);

		if (!textContent) return null;
		if (!textContent.contains(text)) return null;

		for (const child of Array.from(element.children)) {
			const foundElement = _findLowestElementWithText(
				child as HTMLElement,
				text,
				options
			);
			if (foundElement) return foundElement;
		}

		return element;
	}

	const fElBase = _findLowestElementWithText(element, text);
	if (fElBase) return fElBase;

	const fElAll = _findLowestElementWithText(
		element,
		condenseText(text, true),
		{ all: true }
	);
	if (fElAll) return fElAll;

	const title = element.querySelector(".inline-title");
	const fElTitle = _findLowestElementWithText(title as HTMLElement, text, {
		all: true,
		haveTitle: true,
	});
	if (fElTitle) return fElTitle;
	return null;
}

async function findLineEntryInLeaf(
	leaf: WorkspaceLeaf,
	options: {
		textContent: string;
		dontScroll?: boolean;
		filePath: string;
		app: App;
	}
) {
	const view = leaf.view as MarkdownView;
	const viewMode = view.getMode();
	const htmlContent = view.containerEl.querySelector(
		viewMode === "source"
			? ".markdown-source-view"
			: ".markdown-reading-view"
	) as HTMLElement;
	if (!htmlContent) return console.error("No html content found");

	try {
		const editor = view.editor;
		const content = editor.getValue();
		const offset = content.indexOf(options.textContent);
		if (offset === -1) {
			console.error("Text content not found in the file");
			return;
		}

		// console.log("offset", offset);
		const pos = editor.offsetToPos(offset);
		// console.log("[pos]", pos);

		editor.setCursor(pos);
	} catch (err) {
		console.error("[no]", err);
	}

	let element = findLowestElementWithText(htmlContent, options.textContent);
	// console.log("Found element for search", element);

	element?.setAttribute("data-infranodus-highlight", "true");
	const scrollView = view.containerEl.querySelector(
		viewMode === "source" ? ".cm-scroller" : ".markdown-preview-view"
	) as HTMLElement | null;
	if (!element) {
		// console.log("Element not found initially for ", options.textContent);
		if (!scrollView) {
			// console.log("HTMLContent", htmlContent);
			throw new Error("NO SCROLL VIEW");
		} else {
			// console.log("[scrollview]", scrollView);
		}

		scrollView.scrollTo({
			top: 0,
			behavior: "instant",
		});

		const originalScrollHeight = scrollView.scrollTop;
		let lastScrollHeight = originalScrollHeight + 50;
		let attempts = 0;
		const maxAttempts = 1000; // Adjust as needed

		while (!element && attempts < maxAttempts) {
			// console.log("[try]", {
			// 	attempts,
			// 	lastScrollHeight,
			// 	scrollHeight: scrollView.scrollHeight,
			// });
			scrollView.scrollTo({
				top: lastScrollHeight,
				behavior: "instant",
			}); // Scroll down by 100px
			await new Promise((resolve) => setTimeout(resolve, 100)); // Wait for content to load

			element = findLowestElementWithText(
				scrollView,
				options.textContent
			);
			if (element) {
				// console.log("InfraNodus: Element found after scrolling");
				break;
			}

			lastScrollHeight += 100;
			attempts++;

			// Check if we've reached the bottom
			if (
				scrollView.scrollHeight - scrollView.scrollTop <=
				scrollView.clientHeight + 1
			) {
				// console.log("InfraNodus: Reached bottom of scrollable area");
				break;
			}
		}

		if (!element) {
			// console.log("InfraNodus: Element not found after scrolling");
			scrollView.scrollTo(0, 0); // Scroll back to top
			return;
		}
	}

	if (!options.dontScroll && element) {
		element.scrollIntoView({
			behavior: "smooth",
			block: "center",
			inline: "center",
		});
		if (scrollView) {
			const rect = element.getBoundingClientRect();
			const containerRect = scrollView.getBoundingClientRect();

			let scrollAmount = 0;

			if (rect.top < containerRect.top) {
				scrollAmount = rect.top - containerRect.top;
			} else if (rect.bottom > containerRect.bottom) {
				scrollAmount = rect.bottom - containerRect.bottom;
			}

			if (scrollAmount !== 0) {
				const newScrollTop = scrollView.scrollTop + scrollAmount + 100;

				scrollView.scrollTo({
					top: newScrollTop,
					behavior: "instant",
				});
			}
		}
	}
	if (element) {
		const hclass = "infranodus-plugin-yellow-highlight";
		element.classList.add(hclass);
		observerElementAttributes({
			element: element as HTMLElement,
			onAttributeChange: (mutation) => {
				if (element.classList.contains(hclass)) return;
				element.classList.add(hclass);
			},
		});
	}
}

async function readActiveFile(app: App): Promise<string | undefined> {
	const leaf = this.app.workspace.getMostRecentLeaf();
	if (!leaf) return;
	const file = leaf.view.file;
	if (!file) return;
	const content = await app.vault.read(file);
	return content;

	// const activeFile = app.workspace.getActiveFile();
	// if (!activeFile) return;

	// const content = await app.vault.read(activeFile);
	// return content;
}

async function getLinkedUnlinkedMentionsOfFile(params: {
	app: App;
	file: TFile;
	excludePaths: string[];
	includeLinked: boolean;
	includeUnlinked: boolean;
	useOwnUnlinkedSearch: boolean;
}) {
	if (!params.includeLinked && !params.includeUnlinked) return [];

	const regex = /\[\[([^\]]+)\]\]/g;
	const filePath = params.file.path;
	const filepathSanitized = sanitizeNavigateLinkFromName(filePath);

	const title = params.file.basename;
	const titleLink = `[[${title}]]`;
	const titleLower = title.toLowerCase();
	const titleSanitized = sanitizeNavigateLinkFromName(title);

	const statementMentions: string[] = [];
	let linkedCount = 0;
	let unlinkedCount = 0;
	let filesRead = 0;

	const activeFile = this.app.workspace.getActiveFile();

	if (params.includeLinked) {
		const backlinks = activeFile
			? this.app.metadataCache.getBacklinksForFile(activeFile)
			: {};

		const backlinksData = backlinks.data;

		if (backlinksData && backlinksData.size > 0) {
			for (const [file, fileBacklinks] of backlinksData.entries()) {
				if (file == filePath) continue;

				const fileToOpen = this.app.vault.getAbstractFileByPath(file);

				if (!fileToOpen) continue;

				const fileContent = await this.app.vault.read(fileToOpen);

				fileBacklinks.forEach((fileBacklink: any) => {
					const { start, end } = fileBacklink.position;

					const surroundingText = extractSurroundingText(
						fileContent,
						start.offset,
						end.offset
					);

					if (surroundingText) {
						statementMentions.push(surroundingText);
					}
				});
			}
		}
	}

	if (params.includeUnlinked) {
		const root = params.app.vault.getRoot();

		await addUnlinkedToStatementMentions(root, params.useOwnUnlinkedSearch);
	}

	return statementMentions || [];

	async function addUnlinkedToStatementMentions(
		file: TAbstractFile,
		useOwnUnlinkedSearch = false
	) {
		if (file instanceof TFile) {
			if (!file.path.endsWith(".md")) return; // handle only md files
			if (params.excludePaths.includes(file.path)) return;
			filesRead++;

			const contentToAdd = await params.app.vault.read(file);

			const statements = contentToAdd.split("\n");

			for (const statement of statements) {
				if (!statement) continue;
				const wordInStatement = useOwnUnlinkedSearch
					? statement.toLowerCase().includes(titleLower)
					: new RegExp(`\\b${titleLower}\\b`, "gi").test(
							statement.toLowerCase()
					  );

				if (
					wordInStatement &&
					statementMentions.indexOf(statement) == -1
				) {
					statementMentions.push(statement);
				}
			}
		} else if (file instanceof TFolder) {
			const promises = file.children.map((child) =>
				addUnlinkedToStatementMentions(child, useOwnUnlinkedSearch)
			);
			await Promise.all(promises);
		}
	}
}

async function getContentsFromFilePath(params: {
	app: App;
	filePath: string;
	ignoreLinkedUnlinked?: boolean;
}): Promise<
	| {
			content: string;
			pageNames?: string[][];
			files?: { path: string; content: string }[];
			statements?: string[];
	  }
	| undefined
> {
	const { filePath, app } = params;

	if (!filePath || !app) return;
	const abstractFile = app.vault.getAbstractFileByPath(filePath);
	if (!abstractFile) return;
	if (abstractFile instanceof TFile) {
		let content = await app.vault.read(abstractFile);
		// =================================================
		// LINKED AND UNLINKED =============================

		// TODO check this logic for folders also

		if (!params.ignoreLinkedUnlinked) {
			const statementMentions =
				(await getLinkedUnlinkedMentionsOfFile({
					app,
					file: abstractFile,
					excludePaths: [filePath],
					includeLinked:
						SETTINGS.INCLUDE_LINKED_MENTIONS === "For all pages" ||
						(SETTINGS.INCLUDE_LINKED_MENTIONS ===
							"For empty pages only" &&
							!content.trim()),
					includeUnlinked:
						SETTINGS.INCLUDE_UNLINKED_MENTIONS ===
							"For all pages" ||
						(SETTINGS.INCLUDE_UNLINKED_MENTIONS ===
							"For empty pages only" &&
							!content.trim()),
					useOwnUnlinkedSearch:
						SETTINGS.USE_OWN_UNLINKED_SEARCH === "yes",
				})) || [];

			statementMentions.forEach(
				(statement) => (content += statement + "\n")
			);
		}

		const pageNames = [[abstractFile.basename]];

		return { content, pageNames };
	} else if (abstractFile instanceof TFolder) {
		const files: { path: string; content: string }[] = [];
		let content = "";
		const statements: string[] = [];
		const pageNames: string[][] = [];
		async function readAbstractFile(file: TAbstractFile) {
			if (file instanceof TFile) {
				if (!file.path.endsWith(".md")) return; // handle only md files
				const contentToAdd = await app.vault.read(file);
				content += contentToAdd + "\n\n";
				files.push({ path: file.path, content: contentToAdd });
				statements.push(contentToAdd);
				pageNames.push([file.basename]);
			} else if (file instanceof TFolder) {
				const promises = file.children.map((child) =>
					readAbstractFile(child)
				);
				await Promise.all(promises);
			}
		}
		await readAbstractFile(abstractFile);
		return { content, files, statements, pageNames };
	}
	return;
}

async function readFile(
	app: App,
	filePath: string
): Promise<string | undefined> {
	if (!filePath) return;
	const file = app.vault.getFileByPath(filePath);
	if (!file) return;
	const content = await app.vault.read(file);
	return content;
}

function sanitizeNavigateLinkFromName(link: string) {
	if (link.startsWith("[[") && link.endsWith("]]")) {
		link = link.slice(2, -2);
	}

	link = link.replace(/_/g, "");
	link = link.replace(/ /g, "");
	return link.toLowerCase().trim();
}

function findFileFromName(app: App, name: string) {
	// cannot use getFirstLinkpathDest as it does not handle all cases

	const filesFound: {
		base: null | TFile;
		lower: null | TFile;
		sanitized: null | TFile;
	} = {
		base: null,
		lower: null,
		sanitized: null,
	};

	// Generate variations with different word separators
	const generateVariations = (str: string) => {
		// Split by any separator
		const words = str.split(/[_\s-]+/);
		if (words.length <= 1) return [str];

		// Separators we'll use
		const separators = [" ", "-", "_"];
		const results = new Set<string>([str]);

		// Helper function to generate all combinations
		const generateCombinations = (
			wordArray: string[],
			currentStr: string,
			position: number
		) => {
			if (position >= wordArray.length - 1) {
				results.add(currentStr);
				return;
			}

			for (const separator of separators) {
				generateCombinations(
					wordArray,
					currentStr + separator + wordArray[position + 1],
					position + 1
				);
			}
		};

		// Start the combination generation with the first word
		for (const separator of separators) {
			generateCombinations(words, words[0], 0);
		}

		return Array.from(results);
	};

	const variations = generateVariations(name);
	const fNames = variations.flatMap((v) => [v, v + ".md"]);
	const fNamesLow = fNames.map((n) => n.toLowerCase());
	const fNamesSanitized = fNames.map((n) => sanitizeNavigateLinkFromName(n));

	let count: number = 0;
	function findFile(file: TAbstractFile) {
		if (file instanceof TFile) {
			count++;
			const fn = file.name;
			// Check exact matches
			if (fNames.includes(fn)) {
				filesFound.base = file;
				return;
			}

			// Check case-insensitive matches
			const fnLow = fn.toLowerCase();
			if (fNamesLow.includes(fnLow)) {
				filesFound.lower = file;
				return;
			}

			// Check sanitized matches
			const fnSan = sanitizeNavigateLinkFromName(fn);
			if (fNamesSanitized.includes(fnSan)) {
				filesFound.sanitized = file;
				return;
			}
		} else if (file instanceof TFolder) {
			for (const child of file.children) {
				findFile(child);
				if (filesFound.base) return;
			}
		}
	}
	findFile(app.vault.getRoot());

	// 	console.log("InfraNodus Looked at", count, "files");
	if (filesFound.base) {
		// console.log("[findFileFromName] base");
		return filesFound.base;
	}
	if (filesFound.lower) {
		// console.log("[findFileFromName] lower");
		return filesFound.lower;
	}
	if (filesFound.sanitized) {
		// console.log("[findFileFromName] sanitized");
		return filesFound.sanitized;
	}

	// console.log("[findFileFromName] null");
	return null;
}

function findFileFromPath(app: App, path: string) {
	const root = app.vault.getRoot();
	function findFile(file: TAbstractFile): TFile | null {
		if (file instanceof TFile) {
			if (file.path.toLowerCase() === path) return file;
			return null;
		} else if (file instanceof TFolder) {
			for (const child of file.children) {
				const found = findFile(child);
				if (found) return found;
			}
		}
		return null;
	}
	return findFile(root);
}

function extractSurroundingText(
	content: string,
	start: number,
	end: number
): string {
	const beforeBacklink = content.slice(0, start);
	const afterBacklink = content.slice(end);

	// Use simple regex to find the boundaries of the sentence (can customize as needed)
	const sentenceStart =
		beforeBacklink.lastIndexOf("\n") !== -1
			? beforeBacklink.lastIndexOf("\n") + 1
			: 0;
	const sentenceEnd =
		afterBacklink.indexOf("\n") !== -1
			? end + afterBacklink.indexOf("\n") + 1
			: content.length;

	// Extract the full sentence containing the backlink
	return content.slice(sentenceStart, sentenceEnd).trim();
}

export {
	readActiveFile,
	focusOrOpenFile,
	findLineEntryInLeaf,
	getContentsFromFilePath,
	getMentionsOfFile,
	unhighlightStatements,
	openLeafWithPath,
	findFileFromName,
	findFileFromPath,
	findFileWithText,
};
