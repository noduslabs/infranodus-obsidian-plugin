import { App } from "obsidian";

async function editStatementsOfFile(params: {
	app: App;
	filePath: string;
	statementMappings: { [key: string]: string };
}) {
	// console.log("[editStatementsOfFile] params", params);
}

export { editStatementsOfFile };
