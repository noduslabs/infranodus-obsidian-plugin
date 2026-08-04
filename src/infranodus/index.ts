import {
	GraphAndStatementProcessingType,
	INTERNAL_SETTINGS,
	SETTINGS,
} from "src/settings";

import { requestUrl } from "obsidian";

import { AnswerInfraNodusTopics } from "src/types/messaging";
import { InfraNodusExtractedGraphData } from "./types";
import { StatementsObject, TopicsObject } from "src/types/general";
import { AdviceMode } from "src/graph_view/types";
import { replaceAtWithBrackets } from "src/utils/statements";

import { PossibleError } from "src/graph_view/components/ErrorHandler";
import { INFRANODUS_API_ERROR_PREFIX } from "src/graph_view/lib/handleErrors";
import { GraphPanel } from "src/graph_view/types";

const MAX_CONTEXT_SIZE = 54000;

const AI_MODELS_FALLBACK = ["gpt-5.4", "gpt-5.4-mini"];

class InfraNodus {
	public static async fetchAiModels(): Promise<string[]> {
		try {
			const auth_token = SETTINGS.INFRANODUS_API_KEY;
			const headers: Record<string, string> = {};
			if (auth_token) headers.Authorization = `Bearer ${auth_token}`;
			const response = await requestUrl({
				method: "GET",
				url: `${SETTINGS.INFRANODUS_API_URL}/api/v1/aiModels`,
				headers,
			});
			const data = response.json;
			const models = Array.isArray(data)
				? data
				: data?.ai_models ?? data?.aiModels ?? data?.models;
			if (Array.isArray(models) && models.length > 0) return models;
			return AI_MODELS_FALLBACK;
		} catch (e) {
			console.log("Error fetching AI models, falling back on default", e);
			return AI_MODELS_FALLBACK;
		}
	}

	public static async genericPost(url: string, body: any, moreFields?: any) {
		const auth_token = SETTINGS.INFRANODUS_API_KEY;

		if (url.startsWith("/")) url = url.slice(1);

		const response = await requestUrl({
			method: "POST",
			url: `${SETTINGS.INFRANODUS_API_URL}/${url}`,
			headers: {
				"Content-Type": "application/json",
				Authorization: `Bearer ${auth_token}`,
			},
			body: JSON.stringify(body),
			...moreFields,
		});

		try {
			const data = await response.json;
			return { data };
		} catch (e) {
			console.error(e);
			throw e;
		}
	}

	public static async generateRelatedStatements(params: {
		query: any;
		text: any;
		similarityThreshold: any;
	}) {
		const infraNodusInquiryMode = "aiSearch";

		const queryToSearch = params.query;
		const textToProcess = params.text;
		const similarityThreshold = params.similarityThreshold
			? parseFloat(params.similarityThreshold)
			: 0.3;

		// console.log("gettting ai search with,", {
		// 	mode: infraNodusInquiryMode,
		// 	embeddingType: "query",
		// 	text: textToProcess,
		// 	searchQuery: queryToSearch,
		// 	numberOfResults: 10,
		// 	similarityThreshold: similarityThreshold,
		// });
		const response = await this.genericPost("api/v1/aiSearch", {
			mode: infraNodusInquiryMode,
			embeddingType: "query",
			text: textToProcess,
			searchQuery: queryToSearch,
			numberOfResults: 10,
			similarityThreshold: similarityThreshold,
		});
		// console.log(
		// 	"RESPONSE FROM AI SEARCH",
		// 	JSON.stringify(response, null, 2)
		// );
		return response;
	}

	public static async getGraphAndStatements(params: {
		name: string;
		text: string;
		contextSettings: GraphAndStatementProcessingType;
		stopwords?: string[];
		statements?: string[];
		categories?: string[][];
		linkPageToMentions?: string;
		// partOfSpeechToProcess?: "HASHTAGS_ONLY" | "HASHTAGS_AND_WORDS";
	}): Promise<{ data: AnswerInfraNodusTopics }> {
		// console.log("PARAMS", params);
		const body: { [key: string]: any } = {
			name: params.name,
			text:
				params.statements && params.statements.length > 0
					? ""
					: params.text,
		};

		if (params.statements) {
			body.statements = params.statements;
		}

		if (params.contextSettings === "[[Wiki Links]] and Concepts") {
			body.contextSettings = {
				partOfSpeechToProcess: "HASHTAGS_AND_WORDS",
				doubleSquarebracketsProcessing: "PROCESS_AS_HASHTAGS",
			};
		}

		if (params.contextSettings === "[[Wiki Links]] Only") {
			body.contextSettings = {
				partOfSpeechToProcess: "HASHTAGS_ONLY",
				doubleSquarebracketsProcessing: "PROCESS_AS_HASHTAGS",
			};
		}

		if (params.contextSettings === "[[Wiki Links]] Prioritized") {
			body.contextSettings = {
				partOfSpeechToProcess: "WORDS_IF_NO_HASHTAGS",
				doubleSquarebracketsProcessing: "PROCESS_AS_HASHTAGS",
			};
		}

		if (params.contextSettings === "Concepts only") {
			body.contextSettings = {
				partOfSpeechToProcess: "HASHTAGS_AND_WORDS",
				doubleSquarebracketsProcessing: "EXCLUDE",
			};
		}

		if (params.stopwords && params.stopwords.length > 0) {
			body.contextSettings = {
				...body.contextSettings,
				lemmatizeHashtags: true,
				stopwords: params.stopwords,
			};
		}

		if (params.categories && params.categories.length > 0) {
			body.categories = params.categories;
			body.contextSettings = {
				...body.contextSettings,
				categoriesAsMentions: true,
				mentionsProcessing: "CONNECT_TO_ALL_CONCEPTS",
				squareBracketsProcessing: "IGNORE_BRACKETS",
			};
		}

		if (params.linkPageToMentions == "parent_only") {
			body.contextSettings = {
				...body.contextSettings,
				mentionsProcessing: "CONNECT_TO_CONCEPTS_ONLY",
			};
		}
		// TODO ability to send statements with categories, so we can also tag actual files they belong to on the graph

		// console.log("body", body);
		const response: { data: AnswerInfraNodusTopics } =
			await this.genericPost(
				"api/v1/graphAndStatements?doNotSave=true&addStats=true&dotGraph=true&optimize=develop",
				body
			);

		return replaceAtWithBrackets(response);
	}

	public static async getGraphAiAdvice(params: {
		nodes: [];
		edges: [];
		graph: {
			top_nodes: [];
			top_clusters: [];
			gaps: [];
			statementHashtags: [];
		};
	}) {
		return await this.genericPost("api/v1/graphAiAdvice", {
			nodes: params.nodes,
			edges: params.edges,
			graph: params.graph,
		});
	}

	public static extractDataFromGraphData(params: {
		graph_data: any;
		setError: (error: PossibleError) => void;
	}): InfraNodusExtractedGraphData {
		if (!params.graph_data) {
			throw new Error(
				"Could not retrieve data from InfraNodus. Please, check connection or your API key."
			);
		}

		// Topics Answer
		const topics_answer = params.graph_data;
		const error = params.graph_data?.error;

		if (error && error.includes("login")) {
			throw new Error(
				"Please, update your API key in the InfraNodus graph view settings."
			);
		} else if (
			typeof error === "string" &&
			error.length > 0 &&
			!params.graph_data.entriesAndGraphOfContext
		) {
			// Show the actual error reported by the API
			throw new Error(INFRANODUS_API_ERROR_PREFIX + error);
		} else if (!params.graph_data.entriesAndGraphOfContext) {
			throw new Error(
				"Could not parse the response from InfraNodus topics identifier. Please, check if there is any content on this page, check your text processing settings, and make sure your API key is up to date."
			);
		}

		// Top clusters, gaps, and top statements
		const top_clusters =
			topics_answer?.entriesAndGraphOfContext?.graph?.graphologyGraph?.attributes?.top_clusters?.map(
				(cluster: any) => {
					cluster.words = cluster.nodes.map(
						(node: any) => node?.nodeName
					);
					cluster.id = cluster.community;
					return cluster;
				}
			) || [];

		const top_words: string[] =
			topics_answer?.entriesAndGraphOfContext?.graph?.graphologyGraph
				?.attributes?.top_nodes ?? [];

		const gaps_extracted =
			topics_answer?.entriesAndGraphOfContext?.graph?.graphologyGraph
				?.attributes?.gaps || [];

		const dot_graph =
			topics_answer?.entriesAndGraphOfContext?.graph?.graphologyGraph
				?.attributes?.dotGraph || "";

		const bigrams =
			topics_answer?.entriesAndGraphOfContext?.graph?.graphologyGraph
				?.attributes?.bigrams || [];

		const dot_graph_clusters =
			topics_answer?.entriesAndGraphOfContext?.graph?.graphologyGraph
				?.attributes?.dotGraphByCluster || {};

		const all_statements =
			topics_answer?.entriesAndGraphOfContext?.statements || [];

		const top_statements_for_topics_extracted = top_clusters
			? top_clusters.map((topic: any) => {
					const topStatementId = topic.topStatementId;
					const topStatement = all_statements.find(
						(statement: any) =>
							statement.id == topStatementId ||
							parseInt(statement.id) == topStatementId
					);
					return {
						...topStatement,
						topStatementOfCommunity: topic.community,
					};
			  })
			: [];

		// Statements

		const top_statements = top_statements_for_topics_extracted;

		const all_statements_with_top: any[] = [];

		let statements_as_string = "";
		all_statements?.forEach((statement: any) => {
			const topStatements = top_statements_for_topics_extracted.filter(
				(topStatement: any) => topStatement.id == statement.id
			);

			if (topStatements.length > 0) {
				topStatements.forEach((topStatement: any) => {
					all_statements_with_top.push({
						...statement,
						topStatementOfCommunity:
							topStatement.topStatementOfCommunity,
					});
				});
				return;
			}

			statements_as_string += statement.content + "\n";
			all_statements_with_top.push(statement);
		});

		// Node Relations
		const all_relations =
			topics_answer &&
			topics_answer.entriesAndGraphOfContext &&
			topics_answer.entriesAndGraphOfContext.graph.graphologyGraph &&
			topics_answer.entriesAndGraphOfContext.graph.graphologyGraph.edges
				? topics_answer.entriesAndGraphOfContext.graph.graphologyGraph
						.edges
				: [];

		const contentExistsButNoAnalysis =
			!top_clusters.length && statements_as_string ? true : false;

		if (contentExistsButNoAnalysis) {
			params.setError("content-empty");
			throw new Error(
				`Could not convert the content of the page into a graph. `
			);
		}
		return {
			top_clusters,
			gaps_extracted,
			all_statements_with_top,
			top_statements,
			all_relations,
			statements_as_string,
			top_words,
			dot_graph,
			dot_graph_clusters,
			bigrams,
		};
	}

	public static extractTopicsArrayFromTopicsAnswer(params: {
		topics_answer: any;
		top_clusters: any[];
	}) {
		const newTopicsArray = params.top_clusters
			.map(
				(
					cluster: {
						community: string;
						nodes: any[];
						numberRatio: string;
						bcRatio: string;
					},
					index
				) => {
					const words = cluster.nodes.map((node) => node.nodeName);

					//   const tempTopicArray =
					//   aiTopicsAnswer && aiTopicsAnswer[index] ? aiTopicsAnswer[index].split('. ') : []

					// const aiWithDescription = tempTopicArray[1] ? tempTopicArray[1] : ''

					// let aiName = aiWithDescription
					// let aiDescription = ''

					// const aiWithDescriptionArray = aiWithDescription.split(' - ')

					// if (aiWithDescriptionArray && aiWithDescriptionArray.length > 1) {
					//   aiName = aiWithDescriptionArray[0]
					//   aiDescription = ` - ${aiWithDescriptionArray[1]}`
					// }

					// arrayOfTopicsAsText.push(`${aiWithDescription}\n${words.slice(0, 9).join(' ')}`)

					return {
						id: cluster.community,
						sortId: index,
						numberRatio: cluster.numberRatio,
						bcRatio: cluster.bcRatio,
						words,
						// aiName,
						// aiDescription,
					};
				}
			)
			.filter((topic) => topic !== null);
	}

	public static async generateAiNamesForTopics(params: {
		graph_data: any;
		top_clusters: any[];
		language: string;
		top_statements: any[];
	}) {
		const { prompt, promptContext } = InfraNodus.generatePromptForAiTopics({
			topics_answer: params.graph_data,
			top_statements: params.top_statements,
		});

		// console.log(
		// 	"Prompt for AI names for topics",
		// 	prompt,
		// 	SETTINGS.AI_MODEL
		// );
		const topicsText = await this.genericPost("api/v1/aiAdvice", {
			mode: "topics",
			prompt: "",
			promptGraph: "",
			promptContext: promptContext,
			language: params.language == "USER" ? "" : params.language,
			topicalClusters: prompt ?? [],
		});

		const aiTopicsLines = topicsText.data.choices[0].text.split("\n");

		const topics: { id: string; name: string; description: string }[] =
			params.top_clusters.map((topic: any, index: number) => {
				const tempTopicArray =
					aiTopicsLines && aiTopicsLines[index]
						? aiTopicsLines[index].split(". ")
						: [];

				let aiName = tempTopicArray[1]
					? tempTopicArray[1]
					: aiTopicsLines[index]
					? aiTopicsLines[index]
					: "";

				if (aiName && aiName.startsWith('"')) aiName = aiName.slice(1);
				if (aiName && aiName.endsWith('"'))
					aiName = aiName.slice(0, -1);

				return {
					id: topic.id || topic.community,
					name: aiName,
					description: "",
				};
			});

		return topics;
	}

	public static generatePromptForAdvice(params: {
		adviceMode: AdviceMode;
		topics: TopicsObject[]; // this parameter will be always specific to selections
		topStatementsForTopics: StatementsObject[];
		allStatements: StatementsObject[];
		dotGraph: string;
		dotGraphClusters: any[];
		userSettings: any;
		currentGraphPanel: GraphPanel;
		wordsToSearch: string[];
		bigrams: string[];
	}) {
		let currentContextSize = 0;

		const { topics, topStatementsForTopics, allStatements } = params;

		const topicIdsToUse = topics.map(
			(topic: any) => topic.community || topic.id
		);

		const dotGraphClusters = params.dotGraphClusters;

		const { dotGraphByTopic, dotGraphConnectors } =
			InfraNodus.generateDotGraphByTopic({
				topicsFiltered: topicIdsToUse,
				topicsExtracted: topics,
				wordsToSearch: params.wordsToSearch,
				dotGraphByCluster: dotGraphClusters,
			});

		const dotGraphPrompt = dotGraphByTopic
			? Object.keys(dotGraphByTopic)
					.map((clusterId: any): string | undefined => {
						return dotGraphByTopic[clusterId].join("; ");
					})
					.filter((x): x is string => x !== undefined)
					.join("; \n") +
			  (dotGraphConnectors ? `\n${dotGraphConnectors}` : "")
			: "";

		const chronologicalTopStatements = topStatementsForTopics
			.sort((a: any, b: any) => {
				return a.id - b.id;
			})
			.filter((statement: any) =>
				topicIdsToUse.includes(statement.topStatementOfCommunity)
			)
			.map((statement: any) => statement.content)
			.join("\n\n");

		const typeOfSummaryToGenerate =
			params.currentGraphPanel == "topics" && topics && topics.length > 2
				? "graph summary"
				: "summary";

		const dotGraphClustersPrompt = topics
			.map((topic: any) => {
				if (!dotGraphClusters[topic.id]) return "";
				const statementToAdd = topStatementsForTopics
					.filter(
						(statement: any) =>
							statement.topStatementOfCommunity == topic.id
					)
					.map((statement: any) => statement.content)
					.join("\n\n");
				return `[cluster ${topic.id}]: ${
					topic.aiName
				} ${dotGraphClusters[topic.id].join("; ")} ${
					statementToAdd ? `\n${statementToAdd}` : ""
				}`;
			})
			.filter((n) => n)
			.join("\n");

		const bigramsWithWeight = params?.bigrams || [];

		const bigramsThatContainKeywords =
			bigramsWithWeight && bigramsWithWeight.length > 0
				? bigramsWithWeight.filter((bigram) =>
						params.wordsToSearch.some((word) =>
							bigram
								.split(" [weight")[0]
								.toLowerCase()
								.includes(word.toLowerCase())
						)
				  )
				: [];

		const bigramsForKeywords =
			bigramsThatContainKeywords
				?.slice(0, 10)
				.map((bigram: any) => bigram.split(" [weight")[0]) || [];

		const userPromptToUse =
			typeOfSummaryToGenerate == "summary"
				? params.wordsToSearch && params.wordsToSearch.length > 0
					? params.wordsToSearch.join(" ") +
					  "\n" +
					  bigramsForKeywords.join("\n ") +
					  "\n " +
					  chronologicalTopStatements
					: chronologicalTopStatements
				: typeOfSummaryToGenerate == "graph summary"
				? dotGraphClustersPrompt
				: params.wordsToSearch && params.wordsToSearch.length > 0
				? params.wordsToSearch.join(" ") +
				  "\n" +
				  bigramsForKeywords.join("")
				: topics
						.map(
							(topic: any) =>
								`"[cluster ${topic.id}]: ${
									topic.aiName ? topic.aiName + " — " : ""
								}${topic.words.slice(0, 9).join(", ")}"`
						)
						.join(" and ");

		currentContextSize += userPromptToUse.length;

		const totalTopicsNumber = topics.length;

		const topStatementsToAddToContext = {} as any;
		const allStatementsOfTopics = {} as any;

		allStatements.forEach((statement: any) => {
			topicIdsToUse.forEach((topicId: string) => {
				// what is the single top statement for this topic?
				// DO NOT ADD for summary mode as we have them in the main prompt
				if (
					statement.topStatementOfCommunity == topicId &&
					params.adviceMode != "summary"
				) {
					if (!topStatementsToAddToContext[topicId])
						topStatementsToAddToContext[topicId] = [];
					topStatementsToAddToContext[topicId].push(
						statement.content
					);
				}
				// which statements are in this topic?
				if (statement.topStatementCommunity == topicId) {
					if (!allStatementsOfTopics[topicId])
						allStatementsOfTopics[topicId] = [];
					allStatementsOfTopics[topicId].push(statement.content);
				}
			});
		});

		const conceptsInTopics = topics
			.map(
				(topic: any) =>
					`{topic: ${topic.id}${
						topic.aiName ? `, name: "${topic.aiName}"` : ""
					}, concepts: "${topic.words.slice(0, 9).join(", ")}"}`
			)
			.join(" | ");

		const dotGraph = dotGraphPrompt || conceptsInTopics;

		currentContextSize += dotGraph.length;

		const maxPromptSizeForModel = SETTINGS?.AI_MODEL.includes("gpt-3")
			? Math.floor(MAX_CONTEXT_SIZE / 4)
			: MAX_CONTEXT_SIZE;

		const defaultSizePerTopic =
			params.adviceMode == "summary" ? 5000 : 1500;

		const maxSizePerTopic = Math.min(
			Math.floor(
				(maxPromptSizeForModel - currentContextSize) / totalTopicsNumber
			),
			defaultSizePerTopic
		);

		const additionalPromptContext = topics
			.map((topic: any, index) => {
				let cumulativeLengthOfTopic = 0;

				const topStatements = topStatementsToAddToContext[topic.id]
					? topStatementsToAddToContext[topic.id].filter(
							(statement: any) => {
								cumulativeLengthOfTopic += statement.length;
								if (cumulativeLengthOfTopic > maxSizePerTopic)
									return false;
								return true;
							}
					  )
					: [];

				const additionalStatements = allStatementsOfTopics[topic.id]
					? allStatementsOfTopics[topic.id].filter(
							(statement: any) => {
								cumulativeLengthOfTopic += statement.length;
								if (cumulativeLengthOfTopic > maxSizePerTopic)
									return false;
								return true;
							}
					  )
					: [];

				const statements = [...topStatements, ...additionalStatements];

				return (
					"[cluster " +
					topic.id +
					"]" +
					(topic.aiName ? ' "' + topic.aiName + '"' : "") +
					':"\n' +
					topic.words.slice(0, 9).join(", ") +
					'":\n ' +
					statements.join(" ") +
					'"'
				);
			})
			.join("\n<---->\n");

		return {
			prompt: userPromptToUse,
			promptGraph: dotGraph,
			promptContext: additionalPromptContext,
		};
	}

	public static generatePromptForAiTopics(params: {
		topics_answer: any;
		top_statements: any[];
	}) {
		const dotGraphByCluster =
			params.topics_answer?.entriesAndGraphOfContext?.graph
				?.graphologyGraph?.attributes?.dotGraphByCluster || {};

		const topClusters =
			params.topics_answer?.entriesAndGraphOfContext?.graph
				.graphologyGraph.attributes.top_clusters || [];

		const topStatements = params.top_statements;

		const promptContext = topStatements
			.map((statement: any) => {
				return `[cluster ${statement.topStatementOfCommunity}]: ${statement.content}`;
			})
			.join("\n");

		const topClustersPrompt = topClusters.map((topic: any) => {
			return {
				text: `"${topic.nodes
					.map((node: any) => node.nodeName)
					.slice(0, 9)
					.join(", ")}"`,
				id: topic.id,
				community: topic.id,
				dotGraph: dotGraphByCluster[topic.id] || "",
			};
		});

		return {
			prompt: topClustersPrompt,
			promptContext: promptContext,
		};
	}

	private static generateDotGraphByTopic({
		topicsFiltered,
		topicsExtracted,
		wordsToSearch,
		dotGraphByCluster,
	}: {
		topicsFiltered: string[];
		topicsExtracted: any[];
		wordsToSearch: string[];
		dotGraphByCluster: any;
	}) {
		const dotGraphByTopic =
			topicsFiltered && topicsFiltered.length > 0
				? topicsFiltered.map((id: string) => dotGraphByCluster[id])
				: topicsExtracted
						.map((topic: any) => {
							const topicClusters =
								dotGraphByCluster[topic.id] || [];

							const clustersToReturn = topicClusters
								.map((cluster: any) => {
									if (
										!wordsToSearch ||
										(wordsToSearch &&
											wordsToSearch.length === 0)
									) {
										return cluster;
									}

									if (
										wordsToSearch &&
										wordsToSearch.length > 0 &&
										wordsToSearch.some((word: string) =>
											cluster.includes(word)
										)
									) {
										return cluster;
									}
								})
								.filter((cluster: any) => cluster)
								.join("; ");

							return clustersToReturn;
						})
						.filter((cluster: any) => cluster);

		const dotGraphConnectors = Object.keys(dotGraphByCluster)
			.map((id: string) => {
				if (id != "inter_cluster" && id != "top_nodes") {
					return null;
				}

				const extraClusters = dotGraphByCluster[id].slice(0, 4);

				const clustersToReturn = extraClusters
					.map((cluster: any) => {
						if (
							(!wordsToSearch ||
								(wordsToSearch &&
									wordsToSearch.length === 0)) &&
							(!topicsFiltered ||
								(topicsFiltered && topicsFiltered.length === 0))
						) {
							return cluster;
						}

						if (
							wordsToSearch &&
							wordsToSearch.length > 0 &&
							wordsToSearch.some((word: string) =>
								cluster.includes(word)
							)
						) {
							return cluster;
						}

						if (topicsFiltered && topicsFiltered.length > 0) {
							let clusterToReturn = "";
							topicsExtracted.forEach((topic: any) => {
								if (!topicsFiltered.includes(topic.id)) return;

								if (
									topic.words.some((word: string) =>
										cluster.includes(word)
									)
								) {
									clusterToReturn = cluster;
								}
							});
							return clusterToReturn;
						}
					})
					.filter((cluster: any) => cluster)
					.join(", ");

				return clustersToReturn;
			})
			.filter((cluster: any) => cluster)
			.join("\n\n");

		return {
			dotGraphByTopic,
			dotGraphConnectors,
		};
	}

	// Code got from `src/background/providers/infranodus.ts - (from extension code)
	// Use the `sendDataToPort` function - (from extension code)
	public static async generateAdvice(params: {
		prompt: string;
		language?: string;
		promptGraph?: string;
		promptContext?: string;
		type?: string;
		source?: string;
		modal?: string;
		requestMode?: string;
	}) {
		if (!params.language) params.language = "en";

		const infraNodusInquiryMode =
			params.type === "chatResponse" ? "response" : params.type;

		const simplePrompt = params.prompt;

		const chatPrompt = [];
		if (infraNodusInquiryMode == "response") {
			chatPrompt.push({ role: "user", content: simplePrompt });
		}
		// console.log("Generate advice with", SETTINGS.AI_MODEL);
		const body: any = {
			mode: infraNodusInquiryMode ?? "",
			type: params.type ?? "",
			prompt: chatPrompt.length > 0 ? chatPrompt : simplePrompt,
			promptGraph: params.promptGraph ?? "",
			promptContext: params.promptContext ?? "",
			language: params.language == "USER" ? "" : params.language,
			modelToUse: SETTINGS.AI_MODEL,
			extendedMode: "true",
			app: "obsidian_plugin",
			source: params.source ?? "",
			modal: params.modal ?? "",
		};
		if (params.requestMode) body.requestMode = params.requestMode;
		return await this.genericPost("api/v1/aiAdvice", body);
	}

	// public static async generateTopics(text: string) {
	// 	const response1 = await InfraNodus.getGraphAndStatements({
	// 		name: "Obsidian Plugin",
	// 		text: text,
	// 	});

	// 	const graph_data = response1.data;
	// 	const topics_answer = graph_data;

	// 	const prompt = InfraNodus.generatePromptForAiTopics({ topics_answer });
	// 	const response = await InfraNodus.generateAdvice({
	// 		prompt,
	// 		language: "en",
	// 	});

	// 	const topics: string = (response as any).data.choices[0].text;
	// 	return { topics, graph_data };
	// }

	public static async exportText(params: {
		contextName: string;
		text: string;
		tags: string[];
	}) {
		try {
			const postResult = await this.genericPost(
				"api/v1/graphAndStatements?doNotSave=false&addStats=true",
				{
					name: params.contextName,
					text: params.text,
					categories: params.tags,
				},
				{ credentials: "include" }
			);

			// console.log("infranodus post result", postResult);

			return { success: true };
		} catch (err) {
			console.error("Error when submitting content to InfraNodus", err);
			return { error: true };
		}
	}

	// Cached InfraNodus user id, keyed by the API key it was fetched with —
	// the id never changes for a given key, so one fetch per session is
	// enough. Keeping the iframe URL stable from the first render also
	// prevents the graph viewer from rebooting mid-load when the id arrives
	private static userIdCache: { apiKey: string; userId: string } | null =
		null;
	private static userIdInFlight: {
		apiKey: string;
		promise: Promise<{ userId?: string; error?: boolean }>;
	} | null = null;

	public static getCachedUserId(): string | null {
		const apiKey = SETTINGS.INFRANODUS_API_KEY;
		return apiKey && InfraNodus.userIdCache?.apiKey === apiKey
			? InfraNodus.userIdCache.userId
			: null;
	}

	public static async getUserId(params: {
		headerToken: string;
	}): Promise<{ userId?: string; error?: boolean }> {
		const apiKey = params.headerToken;

		if (InfraNodus.userIdCache?.apiKey === apiKey) {
			return { userId: InfraNodus.userIdCache.userId };
		}
		if (InfraNodus.userIdInFlight?.apiKey === apiKey) {
			return InfraNodus.userIdInFlight.promise;
		}

		const promise = (async () => {
			try {
				const postResult = await this.genericPost(
					"api/v1/userId",
					{
						headerToken: apiKey,
					},
					{ credentials: "include" }
				);

				const userId = postResult.data.userId;
				if (userId) InfraNodus.userIdCache = { apiKey, userId };

				return { userId };
			} catch (err) {
				console.error(
					"Error when getting the user id from InfraNodus",
					err
				);
				return { error: true };
			} finally {
				if (InfraNodus.userIdInFlight?.apiKey === apiKey)
					InfraNodus.userIdInFlight = null;
			}
		})();

		InfraNodus.userIdInFlight = { apiKey, promise };
		return promise;
	}
}

export { InfraNodus };
