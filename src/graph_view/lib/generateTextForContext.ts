import { InfraNodusExtractedGraphData } from "src/infranodus/types";
import { StatementsObject, TopicsObject } from "src/types/general";
import { extractIndexToUse } from "src/utils/arrays";

function generateTextForContext(
	params: {
		wordsToSearch: string[];
		filteredStatements: StatementsObject[];
		currentContextShown: number;
		topicsFiltered: string[];
		extractedGraphData: InfraNodusExtractedGraphData;
	},
	source: "back" | "next" | "gap"
): {
	contentToShow: string;
	currentContextShown: number;
	statementsToShow: string[];
} | null {
	
	// console.log('params', params)
	const currentStatementShown = params.currentContextShown;

	let contentToShow = "";

	if (params.wordsToSearch.length > 0) {
		const statementsToShow = params.filteredStatements;
		
		const statementsTextToShow = statementsToShow.map(
			(statement) => statement.content
		);

		const indexToUse = extractIndexToUse({direction: source, currentElementNumber: currentStatementShown, arrayLength: statementsTextToShow.length});

		const contentToShow = statementsTextToShow[indexToUse];


		return {
			contentToShow: `${contentToShow}`,

			currentContextShown: indexToUse + 1,
			statementsToShow: statementsTextToShow,
		};
	}

	// console.log("generating TEXT FOR CONTENT", params);
	if (params.topicsFiltered.length > 0) {
	

		const statementsOfSelectedTopics = params.extractedGraphData
			.all_statements_with_top
			? params.extractedGraphData.all_statements_with_top.filter(
					(statement) =>
						params.topicsFiltered.includes(
							statement.topStatementCommunity
						)
			  )
			: [];

		const topCommunityStatements =
			params.extractedGraphData.all_statements_with_top.filter(
				(statement: any) =>
					params.topicsFiltered.includes(
						statement.topStatementOfCommunity
					)
			).sort(
				(a: any, b: any) => a.id - b.id
		);


		const statementsTextToShow: string[] = []
		

		statementsOfSelectedTopics.forEach(
			(statement) => {
				if (statementsTextToShow.includes(statement.content)) return;
				statementsTextToShow.push(statement.content)
			}
		)

		if (
			!statementsOfSelectedTopics || statementsOfSelectedTopics.length == 0
		) return null 
		

		const indexToUse = extractIndexToUse({direction: source, currentElementNumber: currentStatementShown, arrayLength: statementsOfSelectedTopics.length});

		const contentToShow = source == 'gap' ? topCommunityStatements.map((statement: any) => statement.content).join('\n\nand\n\n') : statementsTextToShow[indexToUse];

		return {
			contentToShow: `${contentToShow}`,
			currentContextShown: indexToUse + 1 ,
			statementsToShow: statementsTextToShow,
		};
	}

	if (params.topicsFiltered.length == 0 && params.wordsToSearch.length == 0) {
	
		const allStatements = params.extractedGraphData.all_statements_with_top;

		if (!allStatements || allStatements.length == 0) return null;

		const statementsTextToShow: string[] = []
		
		allStatements.forEach(
			(statement) => {
				if (statementsTextToShow.includes(statement.content)) return;
				statementsTextToShow.push(statement.content)
			}
		)

		const indexToUse = extractIndexToUse({direction: source, currentElementNumber: currentStatementShown, arrayLength: allStatements.length});

		const contentToShow = statementsTextToShow[indexToUse];

		return {
			contentToShow: `${contentToShow}`, 
			currentContextShown: indexToUse + 1,
			statementsToShow: statementsTextToShow,
		};
	}
	return null;
}

export { generateTextForContext };
