import { StatementsObject } from "src/types/general";

function replaceAtWithBrackets(object: any) {
	if (Array.isArray(object)) {
		for (const i in object) {
			object[i] = replaceAtWithBrackets(object[i]);
		}
	} else if (typeof object === "object") {
		for (const key in object) {
			// @ts-ignore
			object[key] = replaceAtWithBrackets(object[key]);
		}
	} else if (typeof object === "string") {
		object = replaceAtWords(object);
	}

	return object;
}

function replaceAtWords(input: string): string {
	return input.replace(/@(\w+)/g, "[[$1]]");
}

function filterStatements(params: {
	statements: StatementsObject[];
	wordsToSearch?: string[];
	wordsToHide?: string[];
	topicsFiltered?: string[];
	connectedWords?: string[];
}) {
	const wordsToSearch =
		params.wordsToSearch?.map((word) => {
			// if (word.startsWith("[[") && word.endsWith("]]")) {
			// 	return word.slice(2, -2);
			// }
			return word;
		}) || [];

	const wordsToHide =
		params.wordsToHide?.map((word) => {
			// if (word.startsWith("[[") && word.endsWith("]]")) {
			// 	return word.slice(2, -2);
			// }
			return word;
		}) || [];

	const topicIdsToFilter = params.topicsFiltered || [];

	const connectedWords = params.connectedWords || [];

	let filteredStatements = params.statements?.filter((statement) => {
		const hashtags = statement.statementHashtags;

		if (wordsToHide.some((word) => hashtags.includes(word))) return false;

		if (wordsToSearch.every((word) => hashtags.includes(word))) return true;

		if (topicIdsToFilter && topicIdsToFilter.length > 0) {
			if (topicIdsToFilter.includes(statement.topStatementCommunity))
				return true;
		}
	});

	if (filteredStatements.length === 0 && wordsToSearch.length > 0) {
		filteredStatements = params.statements?.filter((statement) => {
			const hashtags = statement.statementHashtags;
			if (wordsToSearch.some((word) => hashtags.includes(word)))
				return true;
		});
	}

	if (
		filteredStatements.length === 0 &&
		wordsToSearch.length > 0 &&
		connectedWords.length > 0
	) {
		filteredStatements = params.statements?.filter((statement) => {
			const hashtags = statement.statementHashtags;
			if (connectedWords.some((word) => hashtags.includes(word)))
				return true;
		});
	}

	// if (filteredStatements.length === 0) {
	// 	console.log('NO STATEMENTS ASSUMING "_" is a space, trying with given');
	// 	const { statements, wordsToSearch, wordsToHide } = params;
	// 	const filteredStatements = statements.filter((statement) => {
	// 		const hashtags = statement.statementHashtags;
	// 		if (wordsToHide.some((word) => hashtags.includes(word)))
	// 			return false;
	// 		return wordsToSearch.some((word) => hashtags.includes(word));
	// 	});
	// }

	// console.log("FILTERED STATEMENTS: ", filteredStatements);
	// console.log("STATEMENTS: ", params.statements);
	return filteredStatements;
}

export { filterStatements, replaceAtWithBrackets };
