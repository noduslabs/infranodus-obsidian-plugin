import { App, Notice, TFile, TFolder } from "obsidian";
import { SETTINGS } from "src/settings";
import { StatementsObject } from "src/types/general";
import "./lemmatize";
import { lemmatizeWord } from "./lemmatize";

function escapeRegExp(string: string) {
	return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

async function addLinksToStatementsForFilePath(params: {
	app: App;
	filePath: string;
	allStatements: StatementsObject[];
	wordsToLink: string[];
}) {
	// console.log("[addLinksToStatementsForFilePath] params", params);
	const abstractFile = params.app.vault.getAbstractFileByPath(
		params.filePath
	);
	if (!abstractFile || !(abstractFile instanceof TFile)) {
		return console.error("add links folder not implemented yet");
	}

	const originalStatements: StatementsObject[] &
		{ linksToAdd?: string[]; newContent?: string }[] = JSON.parse(
		JSON.stringify(params.allStatements)
	);

	for (const statement of originalStatements) {
		if (statement.statementHashtags.length === 0) continue;
		for (let word of params.wordsToLink) {
			word = word.trim().toLowerCase();
			if (word.startsWith("[[") && word.endsWith("]]")) {
				word = word.slice(2, -2);
			}

			if (!statement.statementHashtags.includes(word)) continue;
			statement.linksToAdd ??= [];
			statement.linksToAdd.push(word);
		}
	}

	if (SETTINGS.ADD_LINKS === "End of statement") {
		for (const statement of originalStatements) {
			if (!statement.linksToAdd) continue;
			statement.newContent = statement.content;
			for (const link of statement.linksToAdd) {
				statement.newContent += ` [[${link}]]`;
			}
		}

		const edited = originalStatements.filter((s: any) => s.newContent);
		// console.log("[End of statement] edited", edited);
		new Notice(`Added links to ${edited.length} statements`);
	}

	if (SETTINGS.ADD_LINKS === "Only exact words") {
		// console.log("Adding links to exact words");
		for (const statement of originalStatements) {
			if (!statement.linksToAdd) continue;

			// Split the content into parts: outside links and inside links
			const parts = statement.content.split(/(\[\[.*?\]\])/g);

			statement.newContent = parts
				.map((part, index) => {
					if (index % 2 !== 0) return part;

					for (const word of statement.linksToAdd ?? []) {
						const regex = new RegExp(
							`\\b${escapeRegExp(word)}\\b`,
							"g"
						);
						part = part.replace(regex, `[[${word}]]`);
					}
					return part;
				})
				.join("");
		}
		const edited = originalStatements.filter((s: any) => s.newContent);
		// console.log("[Only exact words] edited", edited);
		new Notice(`Added links to ${edited.length} statements`);
	}

	if (SETTINGS.ADD_LINKS === "Lemmatization") {
		// console.log("Adding links to lemmatization");
		for (const statement of originalStatements) {
			if (!statement.linksToAdd) continue;

			const tempLink: Set<string> = new Set();
			for (const word of statement.linksToAdd) {
				tempLink.add(word);
				const lemmatizedWords = lemmatizeWord(word);
				for (const lemma of lemmatizedWords) {
					tempLink.add(lemma);
				}
			}
			statement.linksToAdd = Array.from(tempLink);
			// console.log("New links to add", statement.linksToAdd);

			// Split the content into parts: outside links and inside links
			const parts = statement.content.split(/(\[\[.*?\]\])/g);

			statement.newContent = parts
				.map((part, index) => {
					if (index % 2 !== 0) return part;

					for (const word of statement.linksToAdd ?? []) {
						const regex = new RegExp(
							`\\b${escapeRegExp(word)}\\b`,
							"g"
						);
						part = part.replace(regex, `[[${word}]]`);
					}
					return part;
				})
				.join("");
		}

		const edited = originalStatements.filter((s: any) => s.newContent);
		// console.log("[Lemmatization] edited", edited);
		new Notice(`Added links to ${edited.length} statements`);
	}
	const originalStatementsMap = new Map(
		originalStatements.map((os) => [os.content.trim(), os])
	);

	const fileStatements = (await params.app.vault.read(abstractFile))
		.split("\n")
		.map((text) => {
			const textTrimmed = text.trim();
			if (originalStatementsMap.has(textTrimmed)) {
				const matchedStatement: any =
					originalStatementsMap.get(textTrimmed);
				return { content: matchedStatement.newContent ?? text };
			}

			return { content: text };
		});

	// Set original statements to the new statements
	for (const statement of params.allStatements) {
		const textTrimmed = statement.content.trim();
		const matchedStatement: any = originalStatementsMap.get(textTrimmed);
		if (!matchedStatement) continue;

		statement.content = matchedStatement.newContent ?? statement.content;
	}

	const newText = fileStatements
		.map((statement) => statement.content)
		.join("\n");

	await params.app.vault.modify(abstractFile, newText);
}

export { addLinksToStatementsForFilePath };
