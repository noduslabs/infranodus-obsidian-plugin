import { InfraNodus } from "src/infranodus";
import { InfraNodusExtractedGraphData } from "src/infranodus/types";
import { AdviceMode, GraphPanel } from "../types";

import { Notice } from "obsidian";

function getTopicsForAdviceMode(params: {
	adviceMode: AdviceMode;
	extractedGraphData: InfraNodusExtractedGraphData;
	stateRef: React.MutableRefObject<any>;
	wordsToSearch: string[];
}) {
	const gaps = params.extractedGraphData.gaps_extracted;
	const gapsMap = gaps.map((gap: any, index: number) => {
		return {
			id: index + 1,
			communities: [gap.from.community, gap.to.community],
		};
	});

	const topicsFiltered = params.stateRef.current.topicsFiltered;
	const topicsExtracted = params.extractedGraphData.top_clusters;

	const wordsToSearch = params.wordsToSearch;

	if (params.adviceMode === "question") {
		if (topicsFiltered.length == 0) {
			return genericTopics(wordsToSearch);
		} else if (topicsFiltered.length > 0) {
			return topicsExtracted.filter((topic: any) =>
				topicsFiltered.includes(topic.id)
			);
		}
	} else if (
		params.adviceMode === "develop" ||
		params.adviceMode === "transcend"
	) {
		if (topicsFiltered.length == 0) {
			return genericTopics(wordsToSearch);
		} else if (topicsFiltered.length > 0) {
			return topicsExtracted.filter((topic: any) =>
				topicsFiltered.includes(topic.id)
			);
		}
	} else if (params.adviceMode === "summary") {
		if (topicsFiltered.length == 0) {
			if (wordsToSearch && wordsToSearch.length > 0) {
				const topicsWithWordsToSearch = topicsExtracted.filter(
					(topic: any) =>
						wordsToSearch.some((word) =>
							topic.words?.includes(word.toLowerCase())
						)
				);
				return topicsWithWordsToSearch;
			}
			return topicsExtracted;
		} else if (topicsFiltered.length > 0) {
			return topicsExtracted.filter((topic: any) =>
				topicsFiltered.includes(topic.id)
			);
		}
	}

	return [];

	function genericTopics(wordsToSearch: string[]) {
		return params.extractedGraphData.top_clusters.filter(
			(topic: any, index: number) => {
				if (wordsToSearch && wordsToSearch.length > 0) {
					const wordExists = wordsToSearch.find((word: string) =>
						topic.words?.includes(word.toLowerCase())
					);
					if (wordExists) return true;
				}
				if (gapsMap && gapsMap.length === 0 && index <= 4) return true;
				const gapExists = gapsMap.find((gap: any) =>
					gap.communities.includes(topic.community)
				);
				if (gapExists) return true;
			}
		);
	}
}

async function generateAiAdvice(params: {
	extractedGraphData: InfraNodusExtractedGraphData;
	beyondContext: boolean;
	adviceMode: AdviceMode;
	modal: string;
	stateRef: React.MutableRefObject<any>;
	wordsToSearch: string[];
	userSettings: any;
	currentGraphPanel: GraphPanel;
	setTextToShow: (text: string) => void;
}) {
	if (params.adviceMode === "none") params.adviceMode = "question";

	// TODO here use topics when selected

	const topicsToUse = getTopicsForAdviceMode(params);

	if (!topicsToUse || topicsToUse.length === 0) {
		throw new Error(
			"Could not retrieve topics to analyze. Please, check your settings or try with another document."
		);
	}

	const topicsFiltered = params.stateRef.current.topicsFiltered;

	const prompt = InfraNodus.generatePromptForAdvice({
		adviceMode: params.adviceMode,
		topics: topicsToUse,
		allStatements: params.extractedGraphData.all_statements_with_top,
		topStatementsForTopics: params.extractedGraphData.top_statements || [],
		dotGraph: params.extractedGraphData.dot_graph || "",
		dotGraphClusters: params.extractedGraphData.dot_graph_clusters || [],
		userSettings: params.userSettings,
		currentGraphPanel: params.currentGraphPanel,
		wordsToSearch: params.wordsToSearch,
		bigrams: params.extractedGraphData.bigrams || [],
	});

	const aiAdviceMode =
		(params.currentGraphPanel == "topics" &&
			!topicsFiltered &&
			!params.wordsToSearch.length) ||
		(topicsFiltered &&
			topicsFiltered.length == 0 &&
			!params.wordsToSearch.length &&
			params.currentGraphPanel == "topics" &&
			params.adviceMode == "summary")
			? "graph summary"
			: params.adviceMode;

	if (aiAdviceMode == "graph summary")
		params.setTextToShow(
			"ai generating summary for each topic...\n(switch to concepts view or select topics for faster, shorter results)"
		);

	if (aiAdviceMode == "summary" && topicsToUse.length > 2)
		params.setTextToShow("ai generating summary...");

	if (aiAdviceMode == "develop")
		params.setTextToShow("ai generating idea...");

	if (aiAdviceMode == "transcend")
		params.setTextToShow("ai generating idea beyond the discourse...");

	if (aiAdviceMode == "question")
		params.setTextToShow("ai generating question...");

	const adviceParameters = {
		prompt: prompt.prompt,
		promptGraph: prompt.promptGraph,
		promptContext:
			params.adviceMode != "summary" && params.beyondContext
				? ""
				: prompt.promptContext,
		type: aiAdviceMode,
		language: "USER",
		source: aiAdviceMode,
		modal: params.modal,
		requestMode: aiAdviceMode == "transcend" ? "transcend" : undefined,
	};

	// console.log("adviceParameters", adviceParameters);

	const adviceResponse = await InfraNodus.generateAdvice(adviceParameters);

	const adviceData = adviceResponse.data;

	if (adviceData.error) {
		const error =
			adviceData.errorCode == "prompt_too_long"
				? "Sorry, the the prompt was too long for the AI model selected. Please, change the model or try again with another text."
				: adviceData.error;
		throw new Error(error);
	}

	const choices = adviceData?.choices;

	if (!choices || (choices && choices.length == 0)) {
		throw new Error(
			"Could not generate any AI advice. Please, try again later or try with another text."
		);
	}

	const choicesText: string[] = choices.map((choice: any) => choice.text);
	return choicesText;
}

export { generateAiAdvice };
