import { App, TFile, Notice } from "obsidian";

export async function extractObsidianSearchResults(app: App): Promise<
	| {
			file: TFile;
			content: string;
			searchQuery: string;
			snippetsFound: string[];
	  }[]
	| undefined
> {
	try {
		let results: any = [];
		const searchLeaves = this.app.workspace.getLeavesOfType("search");

		if (searchLeaves.length === 0) {
			new Notice("No search results were found.");
			return;
		}

		const searchView = app.workspace.getLeavesOfType("search")[0]?.view;
		if (searchView === undefined) {
			new Notice("The core search plugin is not enabled");
			return;
		}

		for (const leaf of searchLeaves) {
			const searchView = leaf.view as any;

			// Get the current search query
			const searchQuery = searchView.getQuery();

			// Access search results
			// From https://forum.obsidian.md/t/select-and-manipulate-multiple-flies-in-search-pane-like-file-explorer/41410
			const searchResultItems = searchView.dom.getFiles();

			if (!searchResultItems || searchResultItems.size === 0) {
				new Notice("No search results were found.");
				continue;
			}

			const searchSnippets = searchView.dom.resultDomLookup;

			const filePathToSearchSnippet: any = {};

			for (const [key, value] of searchSnippets.entries()) {
				const resultFilePath: string = key.path;
				filePathToSearchSnippet[resultFilePath] = [];
				const containerEl = value.containerEl as HTMLElement;

				// const searchResultChildren =
				// 	containerEl.querySelectorAll(".search-result");

				// searchResultChildren.forEach((child: Element) => {
				// 	filePathToSearchSnippet[resultFilePath].push(
				// 		child.textContent || ""
				// 	);
				// });

				const textSnippetsExtracted = extractText(containerEl) || [];
				textSnippetsExtracted.forEach((snippet) => {
					filePathToSearchSnippet[resultFilePath].push(snippet);
				});
			}

			// Function to extract text according to your specifications
			function extractText(containerEl: HTMLElement): string[] {
				const texts: string[] = [];

				// Remove unwanted elements globally
				containerEl
					.querySelectorAll("svg, .search-result-hover-button")
					.forEach((el) => {
						el.remove();
					});

				// Find all divs with class 'search-result-file-match'
				const matchDivs = containerEl.querySelectorAll(
					"div.search-result-file-match"
				);

				matchDivs.forEach((matchDiv) => {
					// Replace <a class="internal-link"> with [[text content]]
					const internalLinks =
						matchDiv.querySelectorAll("a.internal-link");
					internalLinks.forEach((link) => {
						const textContent = link.textContent || "";
						const replacementText = `[[${textContent}]]`;
						const textNode =
							document.createTextNode(replacementText);
						link.parentNode?.replaceChild(textNode, link);
					});
					// For each matchDiv, extract all text content, regardless of child elements
					const textContent = matchDiv.textContent?.trim() || "";
					if (textContent) {
						texts.push(textContent);
					}
				});

				return texts;
			}

			// const resultDomHtmlEl = searchView.dom.el; // as HTMLElement;

			// const contentArray: string[] = [];

			// const searchResultChildren =
			// 	resultDomHtmlEl.querySelectorAll(".search-result");
			// searchResultChildren.forEach((child: Element) => {
			// 	contentArray.push(child.textContent || "");
			// });

			// function extractTextFromElement(element: HTMLElement): string {
			// 	let textContent = "";

			// 	function traverse(node: Node) {
			// 		if (node.nodeType === Node.TEXT_NODE) {
			// 			textContent += node.textContent + " ";
			// 		} else {
			// 			node.childNodes.forEach(traverse);
			// 		}
			// 	}

			// 	traverse(element);
			// 	return textContent;
			// }

			for (const searchResultItem of searchResultItems) {
				const path = searchResultItem.path;
				const file = this.app.vault.getAbstractFileByPath(path);
				if (file instanceof TFile) {
					const content = await this.app.vault.cachedRead(file);
					const snippetsFound = filePathToSearchSnippet[path];
					results.push({
						file,
						content,
						searchQuery,
						snippetsFound: snippetsFound,
					});
				}
			}

			// console.log("Search results:", results);
			// Process the results as needed
			// results = [...this.handleSearchResults(results)];

			return results;
		}
	} catch (error) {
		console.error("Error extracting search results:", error);
		return [];
	}

	function handleSearchResults(results: { file: TFile; content: string }[]) {
		// Implement your logic to process the search results
		results.forEach((result) => {
			console.log("Matched File:", result.file.path);
		});
		return results;
	}
}
