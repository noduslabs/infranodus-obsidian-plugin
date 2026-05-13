import { App, MarkdownView, Notice } from "obsidian";
import { SETTINGS } from "src/settings";
import { StatementsObject } from "src/types/general";
import {
	findFileWithText,
	findLineEntryInLeaf,
	focusOrOpenFile,
	openLeafWithPath,
} from "src/utils/files";
import { getPureTextFromMarkdown } from "src/utils/line";
import { setLeafMode } from "src/utils/view";

function getStatementToJumpTo(params: {
	filteredStatementsRef: React.MutableRefObject<StatementsObject[]>;
	statementToJumpToRef: React.MutableRefObject<Record<string, number>>;
	clusterIndex: string;
	previousStatementToJumpToRef: React.MutableRefObject<string>;
}) {
	const {
		filteredStatementsRef,
		statementToJumpToRef,
		clusterIndex,
		previousStatementToJumpToRef,
	} = params;

	let statementToJumpTo = "";
	let statementIndex = 0;

	const totalStatements = filteredStatementsRef.current.length;
	statementIndex = (statementToJumpToRef.current as Record<string, number>)[
		clusterIndex
	]
		? (statementToJumpToRef.current as Record<string, number>)[
				clusterIndex
		  ] + 1
		: 0;
	if (statementIndex > totalStatements - 1) {
		statementIndex = 0;
	}

	statementToJumpTo = filteredStatementsRef.current[statementIndex].content;

	if (statementToJumpTo == previousStatementToJumpToRef.current) {
		statementIndex++;
		if (statementIndex > totalStatements - 1) {
			statementIndex = 0;
		}
		statementToJumpTo =
			filteredStatementsRef.current[statementIndex].content;
	}

	previousStatementToJumpToRef.current = statementToJumpTo;

	statementToJumpToRef.current = {
		...statementToJumpToRef.current,
		[clusterIndex]: statementIndex,
	};

	// console.log("[getStatementToJumpTo]", {
	// 	statementToJumpTo,
	// 	statementIndex,
	// 	clusterIndex,
	// 	statementToJumpToRef: statementToJumpToRef.current,
	// 	previousStatementToJumpToRef: previousStatementToJumpToRef.current,
	// });
	return statementToJumpTo;
}

async function jumpToStatementAndOpenFile(params: {
	app: App;
	filePath: string;
	statementToJumpTo: string;
	statementsToShow?: string[];
	iteration?: number;
}) {
	try {
		let textToJumpTo = "";
		let file = await findFileWithText({
			app: params.app,
			filePath: params.filePath,
			textToFind: params.statementToJumpTo,
		});

		if (
			!file &&
			params.statementsToShow &&
			params.statementsToShow.length > 0
		) {
			const fileToJumpTo = params.iteration
				? params.iteration % params.statementsToShow.length
				: 0;
			textToJumpTo = params.statementsToShow[fileToJumpTo];

			file = await findFileWithText({
				app: params.app,
				filePath: params.filePath,
				textToFind: textToJumpTo,
			});
		}

		if (!file) {
			new Notice("Cannot find the statement in the original content.");
			throw new Error("File not found with statement");
		}

		const leaf = await openLeafWithPath(file, params.app.workspace);
		if (!leaf) {
			new Notice("Cannot find the page with the original content.");
			throw new Error("Leaf not found");
		}

		const noticeText = `Jumping to statement - ${
			textToJumpTo || params.statementToJumpTo
		}`;

		// console.log("[jumpToStatementAndOpenFile]", noticeText);

		new Notice(noticeText);

		if (SETTINGS.WHEN_USING_LOCATE === "Force to Edit Mode") {
			await setLeafMode({ leaf, mode: "source" });
		}
		await findLineEntryInLeaf(leaf, {
			textContent: textToJumpTo || params.statementToJumpTo,
			filePath: file.path ?? params.filePath,
			app: params.app,
		});
	} catch (error) {
		console.error("[jumpToStatementAndOpenFile]", error);
	}
}

export { getStatementToJumpTo, jumpToStatementAndOpenFile };
