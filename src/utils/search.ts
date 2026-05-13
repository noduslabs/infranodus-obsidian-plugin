import { App, TFile } from "obsidian";

export async function extractSearchResults(
	app: App
): Promise<{ file: TFile; content: string }[]> {
	const results: any = [];

	// Get the search leaves (panes) in the workspace
	const searchLeaves = app.workspace.getLeavesOfType("search");

	// console.log("searchLeaves", searchLeaves);

	if (searchLeaves.length === 0) {
		console.log("No search pane is open.");
		return results;
	}

	for (const leaf of searchLeaves) {
		const state = leaf.getViewState();

		// Try to get the search query
		const query = state.state.query || (leaf.view as any).getQuery();
		console.log("Search query:", query);

		if (!query) {
			console.log("Search query is empty.");
			continue;
		}

		// Handle tag search queries
		if (query.startsWith("tag:")) {
			const tagsToSearch = query.substring(4).trim().split(" ");

			tagsToSearch.forEach(async (tag: string) => {
				const tagName = tag.substring(4).trim();

				const cleanTagName = tagName.startsWith("#")
					? tagName.slice(1)
					: tagName;

				const matchingFiles = getFilesWithTag(app, cleanTagName);

				for (const file of matchingFiles) {
					const content = await app.vault.cachedRead(file);
					results.push({ file, content });
				}
			});
		} else {
			// Handle simple text search
			const files = app.vault.getMarkdownFiles();
			for (const file of files) {
				const content = await app.vault.cachedRead(file);

				if (content.includes(query)) {
					results.push({ file, content });
				}
			}
		}
	}

	return results;
}

// Helper function to get files with a specific tag
function getFilesWithTag(app: App, tag: string): TFile[] {
	const filesWithTag: TFile[] = [];
	const files = app.vault.getMarkdownFiles();

	for (const file of files) {
		const cache = app.metadataCache.getFileCache(file);
		if (!cache) continue;

		const tags = getTagsFromCache(cache);

		if (tags.includes(tag)) {
			filesWithTag.push(file);
		}
	}

	return filesWithTag;
}

// Helper function to extract tags from the cache
function getTagsFromCache(cache: any): string[] {
	const tags: string[] = [];

	if (cache.tags) {
		tags.push(...cache.tags.map((tag: any) => tag.tag.replace("#", "")));
	}

	if (cache.frontmatter && cache.frontmatter.tags) {
		const frontmatterTags = cache.frontmatter.tags;
		if (typeof frontmatterTags === "string") {
			tags.push(
				...frontmatterTags
					.split(",")
					.map((tag: string) => tag.trim().replace("#", ""))
			);
		} else if (Array.isArray(frontmatterTags)) {
			tags.push(
				...frontmatterTags.map((tag: string) => tag.replace("#", ""))
			);
		}
	}

	return tags;
}
