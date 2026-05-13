import {
	ArrowUpIcon,
	CheckIcon,
	CopyIcon,
	CrossReferenceIcon,
	IterationsIcon,
	PlusCircleIcon,
	XIcon,
	QuoteIcon,
} from "@primer/octicons-react";

import { Platform } from "obsidian";

import { jwtDecode } from "jwt-decode";

import type { ChatHistory, GraphViewStateRef } from "../types";
import type { InfraNodusExtractedGraphData } from "../../infranodus/types";
import { useCallback, useEffect, useRef, useState } from "react";
import { InfraNodus } from "../../infranodus";
import { INTERNAL_SETTINGS, SETTINGS } from "../../settings";
import { GraphNameModal } from "../../components/GraphNameModal";

import { encodeInfraNodusGraphName } from "src/utils/graph";

import { ToggleButton } from "src/components/ToggleButton";
import { InfoTooltip } from "src/components/InfoTootip";
import { MarkdownText } from "src/components/MarkdownText";
import { StatementsObject } from "src/types/general";

interface TopicCluster {
	id: string;
	words: string[];
}

interface DotGraphByCluster {
	[topicId: string]: string[];
}

interface DotGraphByClusterWithCodes {
	[topicId: string]: { bcRatio: number; clusters: string[] }[];
}

let _lastId = 0;
const generateId = () => `chatmessage-${++_lastId}`;

async function processInput(
	search: any,
	similarityThreshold: string,
	statements: any
) {
	// console.log("InfraNodus Processing Input");
	const extractedStatements = await InfraNodus.generateRelatedStatements({
		query: search,
		similarityThreshold,
		text: statements,
	});
	// console.log("InfraNodus Response from AI Search", extractedStatements.data);

	return extractedStatements.data;
}

const AiChatTextContext = (params: any) => {
	const { aiChatClusters, toggleChatContext, navigator, beyondContext } =
		params;

	const filteredTopics =
		aiChatClusters?.filtered_topics &&
		aiChatClusters?.filtered_topics.length > 0
			? aiChatClusters?.filtered_topics
			: [];
	const allTopics =
		aiChatClusters?.all_topics && aiChatClusters?.all_topics.length > 0
			? aiChatClusters?.all_topics
			: [];
	const concepts =
		aiChatClusters?.concepts && aiChatClusters?.concepts.length > 0
			? aiChatClusters?.concepts
			: [];

	const [copied, setCopied] = useState<boolean>(false);

	useEffect(() => {
		if (!copied) return;
		const timer = setTimeout(() => setCopied(false), 500);
		return () => clearTimeout(timer);
	}, [copied]);

	return (
		<div className="relative flex w-full">
			<div className="relative flex w-full ">
				{beyondContext && (
					<div className="flex flex-col mt-0">
						<p className="text-sm font-bold">
							AI will not take the context into account
						</p>
						<div
							id="chatContext"
							className="flex flex-col gap-1 max-h-[30vh] overflow-y-scroll mb-2"
						>
							<div
								key={"no-context"}
								className="flex items-center"
							>
								<div className="text-sm">
									You have "go beyond this context" switch
									enabled, so the AI will not take the graph
									into account.
								</div>
							</div>
						</div>
					</div>
				)}
				{!beyondContext && filteredTopics.length > 0 && (
					<div className="flex flex-col mt-0">
						<p className="text-sm font-bold">
							AI will focus on selected topics:
						</p>
						<div
							id="chatContext"
							className="flex flex-col gap-1 max-h-[30vh] overflow-y-scroll mb-2"
						>
							{filteredTopics.map((topic: any, index: number) => (
								<div key={index} className="flex items-center">
									<div className="text-sm">
										<span className="font-semibold">
											{topic.aiName}:
										</span>{" "}
										{`(${topic.words
											.slice(0, 9)
											.join(", ")})`}
									</div>
								</div>
							))}
						</div>
					</div>
				)}

				{!beyondContext && allTopics.length > 0 && (
					<div className="flex flex-col mt-0">
						<p className="text-sm font-bold">
							AI will focus on all topics:
						</p>
						<div
							id="chatContext"
							className="flex flex-col gap-1 max-h-[30vh] overflow-y-scroll mb-2"
						>
							{allTopics.map((topic: any, index: number) => (
								<div key={index} className="flex items-center">
									<div className="text-sm">
										<span className="font-semibold">
											{topic.aiName}:
										</span>{" "}
										{`(${topic.words
											.slice(0, 9)
											.join(", ")})`}
									</div>
								</div>
							))}
						</div>
					</div>
				)}

				{!beyondContext && concepts.length > 0 && (
					<div className="flex flex-col mt-0">
						<p className="text-sm font-bold">
							AI will focus on these concepts:
						</p>
						<div
							id="chatContext"
							className="flex flex-col gap-1 max-h-[30vh] overflow-y-scroll mb-2"
						>
							{concepts.join(", ")}
						</div>
					</div>
				)}
			</div>

			<div className="flex flex-row absolute top-0 right-0 gap-1">
				{!beyondContext && (
					<div
						className="bg-gray-350 hover:bg-gray-400 dark:bg-gray-900 dark:hover:bg-gray-800 rounded px-1 flex flex-row gap-2 items-center h-7 transition-colors cursor-pointer"
						onClick={() => {
							const shadowRoot = document.querySelector(
								"div#infranodus-shadowroot-container"
							)?.shadowRoot;

							const contextContent =
								shadowRoot?.querySelector("div#chatContext")
									?.innerHTML || "";

							navigator.clipboard.writeText(contextContent);

							setCopied(true);
						}}
					>
						{copied ? (
							<CheckIcon size={16} className="px-0.5" />
						) : (
							<CopyIcon size={16} className="px-1" />
						)}
					</div>
				)}
				<div
					className="bg-gray-350 hover:bg-gray-400 dark:bg-gray-900 dark:hover:bg-gray-800 rounded px-1 flex flex-row gap-2 items-center h-7 transition-colors cursor-pointer"
					onClick={() => {
						toggleChatContext();
					}}
				>
					<XIcon size={16} className="px-0.5" />
				</div>
			</div>
		</div>
	);
};

const GraphViewOverlayChat = (params: {
	currentUser?: string;
	startingChat?: string;
	chatHistory?: ChatHistory[];
	closeChat: () => void;
	stateRef: GraphViewStateRef;
	wordsToSearch: string[];
	topicsFiltered: string[];
	filteredStatements: StatementsObject[];
	app: any;
}) => {
	let extractedGraphData = params.stateRef.current.extractedGraphData;

	const globalChatHistory = params.chatHistory ?? [];
	const allStatements = extractedGraphData.all_statements_with_top;
	const topicsExtracted = extractedGraphData.top_clusters;
	const topicsFiltered = params.topicsFiltered;
	const wordsToSearch = params.wordsToSearch;
	const statementsFilteredFromSearch = params.filteredStatements;

	const dotGraphByCluster: DotGraphByCluster =
		extractedGraphData.dot_graph_clusters ?? { none: [] as string[] };

	const bigrams = extractedGraphData.bigrams;
	const topWords = extractedGraphData.top_words;

	const containerRef = useRef<HTMLDivElement>(null);
	const chatMessagesContainerRef = useRef<HTMLDivElement>(null);

	const vaultName = params.app.vault.getName();

	let similarityThreshold = "0.3";

	const defaultChatTextString = params.startingChat ?? "";

	const currentPlatform =
		Platform.isMobileApp || Platform.isMobile ? "mobile" : "desktop";

	const [chatHistory, setChatHistory] = useState(globalChatHistory);
	const [isLoadingAiMessage, setIsLoadingAiMessage] = useState(false);
	const [inputValue, setInputValue] = useState(defaultChatTextString.trim());
	const [chatResponse, setChatResponse] = useState<any>();
	const [graphContext, setGraphContext] = useState<string>("");
	const [conceptualContext, setConceptualContext] = useState<string | null>(
		""
	);
	const [aiChatClusters, setAiChatClusters] = useState<any | null>({});

	const [foundStatements, setFoundStatements] = useState<any[]>([]);
	const [shownReferences, setShownReferences] = useState<string[]>([]);
	const [copied, setCopied] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [exporting, setExporting] = useState(false);

	const [beyondContext, setBeyondContext] = useState(false);

	const [showSubprompt, setShowSubprompt] = useState(false);
	const [subpromptValue, setSubpromptValue] = useState("");

	const [subpromptOptions, setSubpromptOptions] = useState<string[]>([]);

	const [showDropdown, setShowDropdown] = useState(false);
	const dropdownRef = useRef<HTMLDivElement>(null);

	const toggleBeyondContext = () => {
		setBeyondContext((prev) => !prev);
	};

	const exportToInfraNodus = {
		type: SETTINGS.EXPORT_TYPE,
		graphName: SETTINGS.CONTEXT_NAME,
	};

	const [currentUser, setCurrentUser] = useState<string>(
		params.currentUser ?? ""
	);

	useEffect(() => {
		globalChatHistory.forEach(({ id }) => animateChatMessageIn(id));

		if (localStorage.getItem("chatBeyondContext") == "true") {
			setBeyondContext(true);
		}

		if (
			localStorage.getItem("chatSubpromptOptions") &&
			localStorage.getItem("chatSubpromptOptions") !== "null"
		) {
			setSubpromptOptions(
				JSON.parse(localStorage.getItem("chatSubpromptOptions")!)
			);
		} else {
			setSubpromptOptions([
				"elaborate on this statement:",
				"challege this idea:",
				"generate an interesting question:",
				"summarize it:",
				"check if it's true:",
			]);
		}
	}, []);

	useEffect(() => {
		localStorage.setItem(
			"chatBeyondContext",
			JSON.stringify(beyondContext)
		);
	}, [beyondContext]);

	useEffect(() => {
		localStorage.setItem(
			"chatSubpromptOptions",
			JSON.stringify(subpromptOptions)
		);
	}, [subpromptOptions]);

	const animateChatMessageIn = useCallback(
		async (id: string) => {
			await new Promise((resolve) => setTimeout(resolve, 0));
			const chatMessage = containerRef.current?.querySelector("#" + id);
			chatMessage?.classList.remove("-translate-y-[10px]");
			chatMessage?.classList.remove("opacity-0");
		},
		[containerRef.current]
	);

	useEffect(() => {
		generateGraphContext();
	}, [wordsToSearch, topicsFiltered, topicsExtracted, dotGraphByCluster]);

	function generateGraphContext() {
		const chatClusters = {
			filtered_topics: [] as any[],
			concepts: [] as any[],
			all_topics: [] as any[],
		};

		const conceptsInTopics =
			topicsFiltered && topicsFiltered.length > 0 && topicsExtracted
				? topicsFiltered
						.map(
							(id: string) =>
								`{topic: ${id}, concepts: "${topicsExtracted
									.find((topic: any) => {
										if (topic.id === id) {
											chatClusters[
												"filtered_topics"
											].push(topic);
											return true;
										}
									})
									?.words.slice(0, 9)
									.join(", ")}"}`
						)
						.join(";\n")
				: wordsToSearch && wordsToSearch.length > 0
				? `${wordsToSearch
						.map((word: string) => {
							chatClusters["concepts"].push(word);
							return word;
						})
						.join(", ")}`
				: `${topicsExtracted
						.map((topic: TopicCluster) => {
							chatClusters["all_topics"].push(topic);
							return `{topic: ${
								topic.id
							}, concepts: "${topic.words
								.slice(0, 9)
								.join(", ")}"}`;
						})
						.join(";\n")}`;

		const dotGraphByTopic =
			topicsFiltered && topicsFiltered.length > 0
				? topicsFiltered
						.map((id: string) => dotGraphByCluster[id])
						.join("\n")
				: topicsExtracted
						.map((topic: TopicCluster) => {
							const topicClusters = dotGraphByCluster[topic.id];

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
								.join(", ");

							return clustersToReturn;
						})
						.filter((cluster: any) => cluster)
						.join("\n");

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
							topicsExtracted.forEach((topic: TopicCluster) => {
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
			.join("\n");

		const dotGraph = dotGraphByTopic + dotGraphConnectors;
		const contextToUse = dotGraph || conceptsInTopics;

		setAiChatClusters(chatClusters);
		setConceptualContext(conceptsInTopics);
		setGraphContext(contextToUse);
	}

	async function addChatMessage() {
		if (isLoadingAiMessage) return;
		if (!inputValue || inputValue.length == 0) return;

		setIsLoadingAiMessage(true);

		const id1 = generateId();
		const id2 = generateId();

		const chatMessageToAdd = subpromptValue
			? `${subpromptValue}\n${inputValue}`
			: inputValue;

		if (showSubprompt) setShowSubprompt(false);

		globalChatHistory.push({
			type: "user",
			message: chatMessageToAdd,
			id: id1,
		});
		globalChatHistory.push({
			type: "ai",
			status: "loading",
			message: "searching text and generating answer...",
			id: id2,
		});
		setInputValue("");
		setChatHistory([...globalChatHistory]);

		// console.log("globalChatHistory", globalChatHistory);

		animateChatMessageIn(id1);
		setTimeout(() => animateChatMessageIn(id2), 100);

		const statementsArray = allStatements.map(
			(statement: any) => statement.content
		);

		try {
			let extractedStatements = beyondContext
				? []
				: await processInput(
						inputValue,
						similarityThreshold,
						statementsArray
				  );

			// console.log("extractedStatements", extractedStatements);

			// Recursion check not necessary now, but might in the future,
			// when there are more conditions / stuff
			const maxRecursion = 5;
			const currentRecursion = 0;
			while (currentRecursion < maxRecursion) {
				if (extractedStatements.length !== 0) break;
				// if (similarityThreshold === "0.01") {
				// 	globalChatHistory.pop();
				// 	const id = generateId();
				// 	globalChatHistory.push({
				// 		type: "ai",
				// 		status: "error",
				// 		message: "Please, reformulate your question to be more specific to the context.",
				// 		id: id,
				// 	});

				// 	console.log("globalChatHistory", globalChatHistory);
				// 	setChatHistory([...globalChatHistory]);
				// 	throw "Please, reformulate your question";
				// }

				const newSimilarityThreshold = "0.01";
				similarityThreshold = newSimilarityThreshold;
				extractedStatements = await processInput(
					inputValue,
					newSimilarityThreshold,
					statementsArray
				);
			}

			const listOfStatements = extractedStatements
				.map((statement: any) => statement.matchedContent)
				.join(" \n ");

			let lastStatementId = 0;
			const statementsWithIds = extractedStatements.map(
				(statement: any, index: number) => {
					lastStatementId = index + 1;
					return {
						id: index + 1,
						content: statement.matchedContent,
						similarity: statement.similarity.toFixed(2),
					};
				}
			);

			// console.log("statementsWithIds", statementsWithIds);

			// const topStatements = topStatementsForTopics.map(
			// 	(statement: any, index: number) => {
			// 		return {
			// 			id: lastStatementId + index + 1,
			// 			content: statement.content,
			// 			similarity: 0,
			// 		};
			// 	}
			// );

			// const extractedWasSparse =
			// 	extractedStatements &&
			// 	extractedStatements.length > 1 &&
			// 	listOfStatements.length < 500
			// 		? true
			// 		: false;

			// const allStatementsForChat = extractedWasSparse
			//   ? [...statementsWithIds, ...topStatements]
			//   : [...statementsWithIds]

			const filteredStatements = statementsFilteredFromSearch.map(
				(statement: any, index: number) => {
					return {
						id: lastStatementId + index + 1,
						content: statement.content,
						similarity: 1,
					};
				}
			);

			const allStatementsForChat = [
				...filteredStatements,
				...statementsWithIds,
			];

			const chatHistoryToAdd = globalChatHistory.map((obj, index) => {
				return { type: obj.type, message: obj.message };
			});
			chatHistoryToAdd.pop(); // The question itself
			chatHistoryToAdd.pop(); // The "searching text and generating answer..." message

			setFoundStatements(allStatementsForChat);
			setShownReferences([]);

			const existingContextPrompt = !beyondContext
				? " \n\n <--- answer the question above considering the context & previous conversation we had below ---> \n " +
				  " \n <--- context as a json list, containing the corresponding id for each statement ---> \n " +
				  JSON.stringify(allStatementsForChat)
				: " \n\n <--- answer the question above considering the previous conversation we had below ---> \n ";

			const addLinksPrompt = !beyondContext
				? " \n <--- each response you provide should be followed with the separator |||| and the ids of the context statements above where you got the information from in square brackets each, e.g.   \n" +
				  " \n first response text |||| [2]\n" +
				  " \n second response text |||| [7][9]\n" +
				  " \n third response text |||| [3][6]\n" +
				  " \n\n"
				: "";

			const metaPrompt = subpromptValue ? `${subpromptValue}\n` : "";

			const previousConversationPrompt =
				" \n <--- previous conversation as a json list, in order (first message is first element in list) ---> \n\n" +
				JSON.stringify(chatHistoryToAdd) +
				"\n\n";

			const promptToGenerate =
				metaPrompt +
				inputValue +
				existingContextPrompt +
				previousConversationPrompt +
				addLinksPrompt;

			const promptForGraph = beyondContext ? "" : graphContext;

			// console.log("promptToGenerate", promptToGenerate)

			const response = await InfraNodus.generateAdvice({
				prompt: promptToGenerate,
				promptGraph: promptForGraph,
				promptContext: "",
				type: "chatResponse",
				source: "ai_chat",
				modal: "submit",
			});

			// console.log("RESPONSE FROM CHAT GPT", response.data);
			setChatResponse(response.data);
		} catch (error) {
			// console.log("InfraNodus Error: error processing RAG search", error);
		}

		setIsLoadingAiMessage(false);
	}

	function clearChatHistory() {
		globalChatHistory.length = 0;
		setChatHistory([]);
	}

	function toggleReference(
		ref: string,
		e: React.MouseEvent<HTMLAnchorElement>
	) {
		e.preventDefault();

		if (!ref || ref == "0") return;
		if (shownReferences.includes(ref)) {
			setShownReferences(shownReferences.filter((r) => r !== ref));
		} else {
			setShownReferences([ref]);
		}
	}

	function onTextAreaKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
		if (e.key === "Enter" && !e.shiftKey) {
			e.preventDefault();
			addChatMessage();
		}
	}

	useEffect(() => {
		if (chatHistory.length === 0) return;

		const textResponse =
			chatResponse && chatResponse.choices && chatResponse.choices[0]
				? chatResponse.choices[0].message.content
				: "";
		setIsLoadingAiMessage(false);
		if (!textResponse) return;

		// setAiAdviceShown(textResponse) TODO why this here?
		globalChatHistory.pop();
		const id = generateId();
		const chatMessageContent =
			textResponse.split("||||")[0] || textResponse;
		const chatMessageReferences =
			textResponse && textResponse.length > 1
				? textResponse.split("||||")[1]
				: "";

		const referenceRegex = /\[(\d+)\]/g;

		const chatMessageReferancesArray = chatMessageReferences
			? Array.from(
					chatMessageReferences.matchAll(referenceRegex),
					(m: string[]) => m[1]
			  )
			: [];

		const updatedChatHistory = [...globalChatHistory];

		globalChatHistory.push({
			type: "ai",
			message: chatMessageContent,
			id: id,
		});

		updatedChatHistory.push({
			type: "ai",
			message: chatMessageContent,
			references: chatMessageReferancesArray,
			id: id,
		});

		setChatHistory(updatedChatHistory);
		setTimeout(() => animateChatMessageIn(id), 100);
	}, [chatResponse]);

	useEffect(() => {
		if (shownReferences.length === 0) {
			const updatedChatHistory = [...chatHistory];
			const newChatHistory = updatedChatHistory.filter(
				(message) => message.type !== "ref"
			);
			setChatHistory(newChatHistory);
			return;
		}

		const updatedChatHistory = [...chatHistory];
		const updatedRefs: string[] = [];

		shownReferences.forEach((ref) => {
			const matchedStatement = foundStatements.find(
				(statement) => statement.id === parseInt(ref)
			);
			const refId = generateId();
			updatedRefs.push(refId);
			updatedChatHistory.push({
				type: "ref",
				message: matchedStatement.content,
				id: refId,
			});
		});

		setChatHistory(updatedChatHistory);
		setTimeout(
			() => updatedRefs.forEach((ref) => animateChatMessageIn(ref)),
			100
		);
	}, [shownReferences]);

	useEffect(() => {
		const chatContainer = chatMessagesContainerRef.current;
		if (!chatContainer) return;
		chatContainer.scrollTop = chatContainer.scrollHeight;
	}, [chatHistory]);

	useEffect(() => {
		if (!copied) return;
		const timer = setTimeout(() => setCopied(false), 500);
		return () => clearTimeout(timer);
	}, [copied]);

	const [showChatContext, setShowChatContext] = useState(false);

	function toggleChatContext() {
		setShowChatContext(!showChatContext);
	}

	return (
		<>
			{error && <p className="text-sm font-bold">{error}</p>}
			<div
				className="absolute p-2 z-10 top-2 left-12 right-3 @[420px]/main:w-[376px] flex flex-col items-stretch text-black dark:text-white bg-gray-300 dark:bg-gray-800 pt-2 rounded "
				ref={containerRef}
			>
				{/* <div
				className="flex flex-col gap-4 p-2 text-base text-black bg-gray-300 rounded dark:bg-gray-800 dark:text-white"
				ref={containerRef}
			> */}
				{/* Top Buttons */}
				<div className="flex flex-row gap-2 ml-auto mb-2">
					<div
						className="bg-gray-350 hover:bg-gray-400 dark:bg-gray-950 dark:hover:bg-[#101722] rounded px-2 flex flex-row gap-2 items-center h-7 transition-colors cursor-pointer"
						onClick={() => toggleChatContext()}
					>
						<QuoteIcon size={16} />
						<span className="text-[13px] -ml-1 font-semibold">
							Context
						</span>
					</div>
					<div
						className="bg-gray-350 hover:bg-gray-400 dark:bg-gray-950 dark:hover:bg-[#101722] rounded px-2 flex flex-row gap-2 items-center h-7 transition-colors cursor-pointer"
						onClick={() => clearChatHistory()}
					>
						<IterationsIcon size={16} />
						<span className="text-[13px] -ml-1 font-semibold">
							Clear
						</span>
					</div>
					<div
						className="bg-gray-350 hover:bg-gray-400 dark:bg-gray-950 dark:hover:bg-[#101722] rounded px-2 flex flex-row gap-2 items-center h-7 transition-colors cursor-pointer"
						onClick={() => {
							const chatHistoryText = chatHistory.reduce(
								(acc, { message, type }) => {
									return acc + type + ": " + message + "\n\n";
								},
								""
							);
							navigator.clipboard.writeText(chatHistoryText);
							setCopied(true);
						}}
					>
						{copied ? (
							<CheckIcon size={16} />
						) : (
							<CopyIcon size={16} />
						)}
						<span className="text-[13px] -ml-1  font-semibold">
							Copy
						</span>
					</div>
					<div
						className="bg-gray-350 hover:bg-gray-400 dark:bg-gray-950 dark:hover:bg-[#101722] rounded px-2 flex flex-row gap-2 items-center h-7 transition-colors cursor-pointer"
						onClick={() => params.closeChat()}
					>
						<XIcon size={16} />
						<span className="text-[13px] -ml-1 font-semibold">
							Close
						</span>
					</div>
				</div>

				{/* Chat Context */}
				{showChatContext && (
					<div className="flex flex-row gap-1">
						<div
							className={`relative flex w-full flex-col gap-1 rounded px-2 py-2 mt-0 bg-gray-400 dark:bg-gray-950 border border-gray-600 dark:border-gray-900 text-black dark:text-white text-sm overflow-hidden`}
						>
							<AiChatTextContext
								aiChatClusters={aiChatClusters}
								toggleChatContext={toggleChatContext}
								navigator={navigator}
								beyondContext={beyondContext}
							/>
						</div>
					</div>
				)}

				{/* Chats */}
				<div
					className="min-h-[30vh] max-h-[40vh] overflow-y-auto flex flex-col gap-4 w-full mt-auto py-2"
					ref={chatMessagesContainerRef}
				>
					{chatHistory.map(
						({ id, type, message, references, status }, index) => (
							<div
								id={id.toString()}
								key={id}
								className={`group transition-all transform duration-500 -translate-y-[10px] opacity-0 flex flex-row items-center gap-2 max-w-[280px] text-black dark:text-white ${
									type === "user" ? "ml-auto" : "mr-auto"
								}`}
							>
								{type != "ai" &&
									type != "ref" &&
									status !== "loading" && (
										<div className="flex flex-col items-center gap-1 transition-opacity opacity-0 group-hover:opacity-100">
											<div
												className="cursor-pointer"
												onClick={() => {
													navigator.clipboard.writeText(
														message
													);
													setCopied(true);
												}}
											>
												{copied ? (
													<CheckIcon size={16} />
												) : (
													<CopyIcon size={16} />
												)}
											</div>
											<div
												className="cursor-pointer"
												onClick={() => {
													goToInfraNodus({
														text: message,
														previousMessage: "",
														graphContext,
														currentUser,
														exportToInfraNodus,
														setExporting,
														vaultName,
													});
												}}
											>
												{exporting ? (
													<CheckIcon size={16} />
												) : (
													<CrossReferenceIcon
														size={14}
													/>
												)}
											</div>
										</div>
									)}
								<span
									className={`rounded ${
										currentPlatform == "mobile"
											? "text-sm"
											: "text-base"
									}  p-2 px-4 bg-gray-400 dark:bg-gray-900 relative ${
										status === "loading" && "animate-pulse"
									}`}
								>
									<span>
										{status === "loading" ? (
											<span>{message}</span>
										) : (
											<MarkdownText
												text={message}
												className={
													type == "ref"
														? "cursor-pointer"
														: ""
												}
												onClick={() => {
													if (type == "ref")
														scrollToText(message);
												}}
											/>
										)}
										{references?.map((ref, index) => (
											<span key={index}>
												<a
													href="#/"
													onClick={(e) =>
														toggleReference(ref, e)
													}
												>
													[{ref}]
												</a>
											</span>
										))}
									</span>
									{type === "ai" && (
										<span
											className={`absolute bottom-[1px] right-1 text-sm text-gray-700 dark:text-gray-400`}
										>
											ai
										</span>
									)}
									{type === "ref" && (
										<span
											className={`absolute bottom-[1px] right-1 text-sm text-gray-700 dark:text-gray-400`}
										>
											ref
										</span>
									)}
								</span>
								{type === "ai" && status !== "loading" && (
									<div className="flex flex-col items-center gap-1 transition-opacity opacity-0 group-hover:opacity-100">
										<div
											className="cursor-pointer"
											onClick={() => {
												navigator.clipboard.writeText(
													message
												);
												setCopied(true);
											}}
										>
											{copied ? (
												<CheckIcon size={16} />
											) : (
												<CopyIcon size={16} />
											)}
										</div>
										<div
											className="cursor-pointer"
											onClick={() => {
												goToInfraNodus({
													text: message,
													previousMessage:
														chatHistory[index - 1]
															.message,
													graphContext,
													currentUser,
													exportToInfraNodus,
													setExporting,
													vaultName,
												});
											}}
										>
											{exporting ? (
												<CheckIcon size={16} />
											) : (
												<CrossReferenceIcon size={14} />
											)}
										</div>
									</div>
								)}
								{type === "ref" && (
									<div className="flex flex-col items-center gap-1 transition-opacity opacity-0 group-hover:opacity-100">
										<div
											className="cursor-pointer"
											onClick={() => {
												navigator.clipboard.writeText(
													message
												);
												setCopied(true);
											}}
										>
											{copied ? (
												<CheckIcon size={16} />
											) : (
												<CopyIcon size={16} />
											)}
										</div>
										<div
											className="cursor-pointer"
											onClick={() =>
												goToInfraNodus({
													text: message,
													currentUser,
													exportToInfraNodus,
													setExporting,
													vaultName,
												})
											}
										>
											<CrossReferenceIcon size={14} />
										</div>
									</div>
								)}
							</div>
						)
					)}
				</div>
				{/* Input */}
				<div className="relative w-full flex flex-col">
					{showSubprompt && (
						<div className="relative w-full flex items-center gap-2 pt-2 mb-2">
							<div className="relative w-full" ref={dropdownRef}>
								<input
									className="relative w-full rounded-md px-4 py-1.5 text-base text-black dark:text-white font-normal bg-gray-350 dark:bg-gray-900 border-0 border-b border-gray-300 dark:border-gray-600 focus:border-gray-400 dark:focus:border-gray-500 focus:outline-none transition-colors placeholder:text-gray-400 dark:placeholder:text-gray-500"
									value={subpromptValue}
									onChange={(e) =>
										setSubpromptValue(e.target.value)
									}
									onFocus={() => setShowDropdown(true)}
									onBlur={() => {
										subpromptValue &&
											setSubpromptOptions((prev) => [
												...new Set([
													...prev,
													subpromptValue,
												]),
											]);
										setShowDropdown(false);
									}}
									placeholder="add an instruction to the prompt below"
									style={{
										fontWeight: "normal",
										boxSizing: "border-box",
									}}
								/>
								{showDropdown && (
									<div className="absolute z-50 w-fit mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md shadow-lg max-h-60 overflow-auto">
										{subpromptOptions.map((option) => (
											<div
												key={option}
												className={`px-3 py-2 text-base cursor-pointer bg-white dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 text-black dark:text-white font-normal flex justify-between items-center ${
													option
														.toLowerCase()
														.includes(
															subpromptValue.toLowerCase()
														)
														? "bg-gray-50 dark:bg-gray-750"
														: ""
												}`}
												onMouseDown={(e) => {
													e.preventDefault();
													e.stopPropagation();
													setSubpromptValue(option);
													setShowDropdown(false);
												}}
											>
												<span>{option}</span>
												<div
													className="ml-2 px-1 text-gray-700 hover:text-black bg-white dark:bg-gray-800 dark:text-gray-200 dark:hover:text-white"
													onMouseDown={(e) => {
														e.preventDefault();
														e.stopPropagation();
														setSubpromptOptions(
															(prev) =>
																prev.filter(
																	(item) =>
																		item !==
																		option
																)
														);
													}}
												>
													×
												</div>
											</div>
										))}
									</div>
								)}
							</div>
						</div>
					)}
					<form
						className="relative flex flex-row items-end w-full gap-1 rounded bg-gray-350 dark:bg-gray-900"
						onSubmit={(e) => {
							e.preventDefault();
							addChatMessage();
						}}
					>
						<button
							className={`absolute top-2 right-2 px-1 py-1 rounded bg-gray-400 hover:bg-gray-500 dark:hover:bg-gray-700 dark:bg-gray-600 outline-none border-0 transition-colors cursor-pointer  ${
								isLoadingAiMessage && "cursor-not-allowed"
							}`}
							onClick={(e) => {
								e.preventDefault();
								setShowSubprompt(!showSubprompt);
							}}
						>
							<PlusCircleIcon size={14} fill="white" />
						</button>

						<textarea
							className="w-full p-2 m-2 text-base text-black bg-transparent border-0 outline-none resize-none dark:text-white"
							placeholder="Enter your question to chat with this content"
							rows={4}
							value={inputValue}
							onChange={(e) => {
								setInputValue(e.target.value);
							}}
							disabled={isLoadingAiMessage}
							onKeyDown={onTextAreaKeyDown}
							style={{
								fontFamily:
									'-apple-system, BlinkMacSystemFont, Segoe UI, Helvetica, Arial, sans-serif, "Apple Color Emoji", "Segoe UI Emoji"',
							}}
						>
							{defaultChatTextString}
						</textarea>
						<button
							className={`p-3 rounded bg-gray-400 hover:bg-gray-500 dark:hover:bg-gray-700 dark:bg-gray-600 outline-none border-0 transition-colors cursor-pointer mb-2 mr-2 ${
								isLoadingAiMessage && "cursor-not-allowed"
							}`}
							type="submit"
						>
							{/* onClick={addChatMessage} */}
							<ArrowUpIcon size={18} fill="white" />
						</button>
					</form>

					<div className="flex flex-row items-center gap-2 p-2 border-t-[1px] border-solid border-transparent border-t-black">
						<InfoTooltip text="Generate ideas beyond the context of this graph">
							<ToggleButton
								toggle={beyondContext}
								onClick={() => {
									toggleBeyondContext();
								}}
							/>
						</InfoTooltip>
						<span className="text-[13px]">
							go beyond this context
						</span>
					</div>
				</div>
			</div>
		</>
	);
};

function jumpToYouTubeTimecode(timestamp: number) {
	const videoPlayer = document.querySelector("video");
	if (videoPlayer) videoPlayer.currentTime = timestamp;
}

function extractLinkOrTimestampAndFollow(inputString: string) {
	const urlRegex = /(https?:\/\/[^\s]+)/g;
	const urlMatch = inputString.match(urlRegex);

	if (!urlMatch) return null;

	let tParam: string | null = null;
	for (const url of urlMatch) {
		if (url.includes("youtube.com") || url.includes("youtu.be")) {
			const parsedUrl = new URL(url);
			tParam = parsedUrl.pathname.split("t=")[1];
			if (tParam) {
				const timeMatch = tParam.match(/(\d+)/);
				if (timeMatch) {
					jumpToYouTubeTimecode(parseInt(timeMatch[0], 10));
				}
			}
		}
	}

	if (!tParam && urlMatch[0]) {
		window.open(urlMatch[0], "_blank");
	}
}

function scrollToText(text: string) {
	// Check if the text is provided
	if (!text) {
		console.error("No text provided");
		return;
	}

	const walker = document.createTreeWalker(
		document.body,
		NodeFilter.SHOW_TEXT,
		null
	);

	let node;
	while ((node = walker.nextNode())) {
		if (
			node &&
			node.parentElement &&
			node.parentElement.closest("#infranodus-shadowroot-container")
		) {
			continue;
		}

		if (
			node &&
			node.nodeValue &&
			node.parentElement &&
			node.nodeValue.includes(text.slice(0, 100))
		) {
			const rect = node.parentElement.getBoundingClientRect();

			const topPosition = rect.top + window.pageYOffset - 100;

			window.scrollTo({ top: topPosition, behavior: "smooth" });

			return;
		}
	}

	// If the text was not found
	// console.log("InfraNodus Error: Selected text not found in the document");
}

async function goToInfraNodus({
	text,
	previousMessage = undefined,
	graphContext = null,
	currentUser = undefined,
	exportToInfraNodus = undefined,
	setExporting,
	vaultName = "",
}: {
	text: string;
	previousMessage?: string;
	graphContext?: any;
	currentUser?: string;
	exportToInfraNodus?: any;
	setExporting: any;
	vaultName: string;
}): Promise<void> {
	const contextName = SETTINGS.CONTEXT_NAME;
	const linkToOpen = `${
		SETTINGS.INFRANODUS_API_URL
	}/import/editor?text=${encodeURIComponent(
		text
	)}&context=${encodeURIComponent(contextName)}`;

	if (exportToInfraNodus && exportToInfraNodus.type === "auto") {
		// Change the context name to just be the page title?
		const graphTags = [
			`context: ${SETTINGS.CONTEXT_NAME}`,
			`source: chat respose`,
		];

		let graphName = encodeInfraNodusGraphName(
			exportToInfraNodus.graphName,
			SETTINGS.CONTEXT_NAME,
			vaultName
		);

		// Show dialog to confirm/edit graph name
		graphName =
			(await new Promise<string | null>((resolve) => {
				new GraphNameModal(app, graphName, resolve).open();
			})) || "";

		if (!graphName) {
			return;
		}

		setExporting(true);

		// console.log("exporting text to InfraNodus");
		const exportStatus = await InfraNodus.exportText({
			contextName: graphName,
			text,
			tags: graphTags,
		});
		// const exportStatus = await exportTextToInfraNodus(
		// 	graphName,
		// 	text,
		// 	graphTags
		// );
		// console.log("InfraNodus export status", exportStatus);
		if (exportStatus.error) {
			alert(
				`There was an error saving to the ${graphName} graph in InfraNodus. Reload the page and try again or change your extension setting.`
			);
		} else {
			alert(`Saved to the ${graphName} graph in InfraNodus`);
		}

		setExporting(false);
	} else {
		window.open(linkToOpen, "_blank");
	}
}

export { GraphViewOverlayChat };
