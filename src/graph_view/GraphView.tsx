import { App, MarkdownView, Notice, Platform } from "obsidian";
import { useCallback, useContext, useEffect, useRef, useState } from "react";
import { InfraNodus } from "src/infranodus";
import { GraphViewOverlay } from "./components/GraphViewOverlay";
import { ErrorHandler, PossibleError } from "./components/ErrorHandler";
import { AnswerInfraNodusTopics } from "src/types/messaging";
import { arraysAreEqual } from "src/utils/arrays";
import { encodeInfraNodusGraphName } from "src/utils/graph";
import {
	findLineEntryInLeaf,
	focusOrOpenFile,
	getContentsFromFilePath,
	getMentionsOfFile,
	unhighlightStatements,
	findFileFromName,
	findFileFromPath,
	openLeafWithPath,
} from "src/utils/files";
import {
	AdviceMode,
	GraphInitialData,
	GraphViewContext,
	GraphViewStateRef,
	LoadingState,
	PluginGraphContext,
} from "./types";
import { InfraNodusExtractedGraphData } from "src/infranodus/types";
import { getPureTextFromMarkdown } from "src/utils/line";
import { filterStatements } from "src/utils/statements";
import { StatementsObject } from "src/types/general";
import {
	getStatementToJumpTo,
	jumpToStatementAndOpenFile,
} from "./lib/jumpToStatement";
import { INTERNAL_SETTINGS, SETTINGS } from "src/settings";
import { generateTextForContext } from "./lib/generateTextForContext";
import { unObserveElementAttributes } from "src/utils/observer";
import { GraphViewOverlaySettings } from "./components/GraphViewOverlaySettings";
import { InfoTooltip } from "src/components/InfoTootip";
import { IconButton } from "src/components/IconButton";
import {
	GearIcon,
	SyncIcon,
	PlayIcon,
	RepoPullIcon,
	CheckIcon,
	CrossReferenceIcon,
} from "@primer/octicons-react";
import {
	handleGraphDataError,
	INFRANODUS_API_ERROR_PREFIX,
} from "./lib/handleErrors";
import { LoadingView } from "./components/LoadingView";
import { clearInterval } from "timers";

import { TFile } from "obsidian";

import { TopicsObject } from "src/types/general";

import { jwtDecode } from "jwt-decode";

import { GraphNameModal } from "../components/GraphNameModal";

import { GraphPanel } from "./types";

enum EventTypes {
	LOAD = "LOAD_JSON",
	REMOVED_NODES = "UPDATE_REMOVED_NODES",
	SELECTED_NODES = "UPDATE_SELECTED_NODES",
	GROUPS = "UPDATE_GROUPS",
	GROUPS_PRESELECT = "GROUPS_PRESELECT",
	GAPS = "GAPS",
	READY = "READY",
	RECALCULATION = "RECALCULATION",
	TOPICS_UPDATE = "TOPICS_UPDATE",
	EXTERNAL_ACTION = "EXTERNAL_ACTION",
}

const GraphView = (params: {
	initialData?: GraphInitialData;
	graphContext: PluginGraphContext;
}) => {
	// console.log("initialData", params.initialData);
	// console.log("graphContext", params.graphContext);

	const GRAPH_BASE_URL = SETTINGS.INFRANODUS_GRAPH_URL;
	const GRAPH_URL = `${GRAPH_BASE_URL}?iframe=true&action=true&app=obsidian`;

	const { filePath, app, contentString, sourcePath } = params.graphContext;
	const cleanFilePath =
		filePath && filePath.endsWith(".md") ? filePath.slice(0, -3) : filePath;
	const isFolder = filePath && !filePath.endsWith(".md") ? true : false;

	const vaultName = app.vault.getName();
	const [colorScheme, setColorScheme] = useState(SETTINGS.COLOR_SCHEME);

	const [useOwnUnlinkedSearch, setUseOwnUnlinkedSearch] = useState(
		SETTINGS.USE_OWN_UNLINKED_SEARCH
	);

	const graphLink = SETTINGS.DEFAULT_GRAPH_MODE
		? `${GRAPH_URL}&mode=${SETTINGS.DEFAULT_GRAPH_MODE}`
		: GRAPH_URL;

	const obsidianColorSchemeRef = useRef<"dark" | "light">("light");

	const [graphData, setGraphData] = useState<AnswerInfraNodusTopics>();
	const [isSearchingWords, setIsSearchingWords] = useState(false);
	const [wordsToSearch, setWordsToSearch] = useState<string[]>(
		params.initialData?.wordsToSearch ?? []
	);
	const [connectedWords, setConnectedWords] = useState<string[]>([]);
	const [wordsToHide, setWordsToHide] = useState<string[]>([]);
	const [isHidingWords, setIsHidingWords] = useState(false);
	const [gapShown, setGapShown] = useState(false);
	const [topicsFiltered, setTopicsFiltered] = useState<any[]>([]);
	const [adviceMode, setAdviceMode] = useState<AdviceMode>("none");
	const [overlayShowMode, setOverlayShowMode] = useState<
		"ai" | "aiChat" | "context" | null
	>(null);
	// const [textToShow, setTextToShow] = useState("ai generating...");

	const [showIframe, setShowIframe] = useState(true);
	const [isLoadingIframe, setIsLoadingIframe] = useState(false);
	const [error, setError] = useState<PossibleError>();
	const [errorText, setErrorText] = useState("");
	const [loadingState, setLoadingState] =
		useState<LoadingState>("initializing");

	// Extracted / filtered / fetched data
	const contentRef = useRef<string>();
	const pageNamesRef = useRef<string[][]>([]);
	const statementsRef = useRef<string[]>([]);
	const loadedIframeRef = useRef(false);
	const iframIsReadyRef = useRef(false);
	const filteredStatementsRef = useRef<StatementsObject[]>([]);
	const extractedGraphDataRef = useRef<InfraNodusExtractedGraphData>();
	const lastSelectedWordRef = useRef<string | null>(
		params.initialData?.wordsToSearch?.[0] ?? null
	);
	const [currentContextShown, setCurrentContextShown] = useState(0);
	const [textToShow, setTextToShow] = useState("");
	const [statementsToShow, setStatementsToShow] = useState<string[]>([]);

	const [showingSettings, setShowingSettings] = useState(false);
	const [showingReloadButton, setShowingReloadButton] = useState(true);

	const [currentGraphPanel, setCurrentGraphPanel] = useState<GraphPanel>(
		SETTINGS.DEFAULT_GRAPH_MODE as GraphPanel
	);

	const auth_token = SETTINGS.INFRANODUS_API_KEY;

	const exportToInfraNodus = {
		type: SETTINGS.EXPORT_TYPE,
		graphName: SETTINGS.EXPORT_GRAPH,
	};

	const [currentUser, setCurrentUser] = useState<string>("");

	const [iframeGraphUser, setIframeGraphUser] = useState<string>("");

	useEffect(() => {
		const fetchUserId = async () => {
			if (auth_token) {
				try {
					const userResponse = await InfraNodus.getUserId({
						headerToken: auth_token,
					});
					console.log("userResponse", userResponse);

					// Assuming userResponse.data contains the userId
					if (userResponse?.userId) {
						setCurrentUser(userResponse.userId);
					} else {
						// Fallback to decoding JWT if needed
						const decoded: any = jwtDecode(auth_token);
						setCurrentUser(decoded?.user?.id || "");
					}
				} catch (error) {
					console.error("Error getting user ID:", error);
					setCurrentUser("");
				}
			}
		};
		fetchUserId();
	}, []);

	useEffect(() => {
		if (currentUser) {
			setIframeGraphUser(`&user=${currentUser}`);
		}
	}, [currentUser]);

	// For "context"
	// const [currentContextShown, setCurrentContextShown] = useState(0);

	// For "Jump to Statement" / "Locate"
	const statementToJumpToRef = useRef<Record<string, number>>({});
	const previousStatementToJumpToRef = useRef<string>("");

	const graph_iframe: React.MutableRefObject<HTMLIFrameElement> =
		useRef() as React.MutableRefObject<HTMLIFrameElement>;

	const graph_top_text: React.MutableRefObject<HTMLIFrameElement> =
		useRef() as React.MutableRefObject<HTMLIFrameElement>;

	// Separate state, for handling message from the iframe
	const stateForMessagesRef: GraphViewStateRef = useRef(undefined as any);
	useEffect(() => {
		stateForMessagesRef.current = {
			wordsToSearch,
			wordsToHide,
			topicsFiltered,
			graphData,
			filteredStatements: filteredStatementsRef.current,
			lastSelectedWord: lastSelectedWordRef.current,
			extractedGraphData: extractedGraphDataRef.current!,
		};
	}, [
		wordsToHide,
		wordsToSearch,
		topicsFiltered,
		graphData,
		filteredStatementsRef.current,
		lastSelectedWordRef.current,
		extractedGraphDataRef.current,
	]);

	// Graph View Context
	const [graphViewContext, setGraphViewContext] =
		useState<GraphViewContext>();
	useEffect(() => {
		// console.log("InfraNodus setting graph's viewContext");

		setGraphViewContext({
			stateRef: stateForMessagesRef,

			graphData: graphData!,
			adviceMode,
			wordsToSearch,
			wordsToHide,
			gapShown,
			loadingState,
			currentUser,

			setAdviceMode,
			setWordsToSearch,
			setWordsToHide,
			setGapShown,
			setLoadingState,
		});
	}, [
		stateForMessagesRef.current,
		graphData,
		adviceMode,
		wordsToSearch,
		wordsToHide,
		gapShown,
		loadingState,
		currentUser,
	]);

	const currentPlatform =
		Platform.isMobileApp || Platform.isMobile ? "mobile" : "desktop";

	// Initialize the color scheme — follow Obsidian's theme, not the OS preference.
	// Obsidian toggles `theme-dark` / `theme-light` on <body> independently of the OS.
	useEffect(() => {
		const detectObsidianScheme = (): "dark" | "light" =>
			document.body.classList.contains("theme-dark") ? "dark" : "light";

		obsidianColorSchemeRef.current = detectObsidianScheme();
		if (colorScheme === "auto") {
			setColorScheme(obsidianColorSchemeRef.current);
		}

		const observer = new MutationObserver(() => {
			const next = detectObsidianScheme();
			if (next === obsidianColorSchemeRef.current) return;
			obsidianColorSchemeRef.current = next;
			if (colorScheme === "auto") {
				setColorScheme(next);
			}
		});
		observer.observe(document.body, {
			attributes: true,
			attributeFilter: ["class"],
		});

		return () => {
			observer.disconnect();
		};
	}, []);

	// Adjust filteredStatements
	useEffect(() => {
		const allStatements =
			extractedGraphDataRef.current?.all_statements_with_top;
		const filteredStatements = filterStatements({
			statements: allStatements ?? [],
			wordsToSearch,
			wordsToHide,
			topicsFiltered,
			connectedWords,
		});

		filteredStatementsRef.current =
			filteredStatements && filteredStatements.length > 0
				? filteredStatements
				: [];
	}, [wordsToHide, wordsToSearch, topicsFiltered, graphData, connectedWords]);

	function diff(a: Date) {
		return (new Date().valueOf() - a.valueOf()) / 1000;
	}

	// Initialize the graph
	useEffect(() => {
		// console.log("wordsToHide", wordsToHide);
		async function fetchGraphData() {
			if (loadingState != "complete") setLoadingState("initializing");

			const start1 = new Date();
			// console.log("fetching graph data for InfraNodus stopwords");
			if (!filePath && !contentString) {
				new Notice("No files or content provided for analysis");
				return console.log("No file path");
			}

			let content:
				| {
						content: string;
						pageNames?: string[][];
						files?: { path: string; content: string }[];
						statements?: string[];
				  }
				| undefined;

			let contentStatements: string[] = [];

			if (!contentRef.current && filePath) {
				// console.log("InfraNodus Error: no content obtained");
				setLoadingState("getting-content");
				content = await getContentsFromFilePath({
					app,
					filePath: filePath || "",
				});

				contentRef.current = content?.content;
				if (!content?.content) {
					setError("no-content");
					throw new Error("No content in the file");
				}

				pageNamesRef.current = content?.pageNames || [];
			}

			if (!contentRef.current && contentString) {
				contentRef.current = contentString;
			}

			if (!contentRef.current) return;
			if (!showIframe) return;

			// Check the size

			const contentSize = contentRef.current.length;

			if (contentSize > 50000000) {
				new Notice(
					"The content is too large for analysis. Please, reduce the size or try with a different folder, bookmark group, or file."
				);
				return;
			}

			if (loadingState != "complete") setIsLoadingIframe(true);

			// Push to statements
			const statementsBefore = statementsRef.current;
			statementsRef.current = [];

			const regex = /\[\[([^\]]+)\]\]/g;

			contentStatements = content?.statements || [];

			if (contentStatements.length > 0) {
				contentStatements.forEach((statement) => {
					statementsRef.current.push(statement);
				});
			} else {
				contentRef.current.split("\n").forEach((line) => {
					line = line.trim();
					if (!line) return;
					statementsRef.current.push(line);
				});
			}

			// If the statements are the same, don't update
			// if (arraysAreEqual(statementsBefore, statementsRef.current)) return;
			// console.log("statements: ", statementsRef.current);
			// console.log("[time] for statements", diff(start1));
			const start2 = new Date();
			if (loadingState != "complete") setLoadingState("generating-graph");

			const presetContextSettings = isFolder
				? SETTINGS.MULTI_PAGE_GRAPH_PROCESSING
				: SETTINGS.SINGLE_PAGE_GRAPH_PROCESSING;

			// TODO design another API path to send arrays with statements and tags
			// TODO then add category filters and statements view

			const linkPageToMentions =
				SETTINGS.LINK_PAGE_TO_MENTIONS == "true" ||
				SETTINGS.LINK_PAGE_TO_MENTIONS == "parent_and_paragraph"
					? "parent_and_paragraph"
					: SETTINGS.LINK_PAGE_TO_MENTIONS == "false" ||
					  SETTINGS.LINK_PAGE_TO_MENTIONS == "paragraph"
					? "paragraph"
					: "parent_only";

			const response = await InfraNodus.getGraphAndStatements({
				name: "Obsidian Plugin",
				text: statementsRef.current.join("\n"),
				statements:
					linkPageToMentions != "paragraph" &&
					contentStatements &&
					contentStatements.length > 0
						? contentStatements
						: [],
				contextSettings: presetContextSettings,
				stopwords: wordsToHide,
				categories:
					pageNamesRef.current &&
					pageNamesRef.current.length > 0 &&
					linkPageToMentions != "paragraph"
						? pageNamesRef.current
						: [],
				linkPageToMentions,
			});
			const graphData: AnswerInfraNodusTopics = response.data;

			// console.log("graphData", graphData);
			if (graphData.error) {
				handleGraphDataError({
					graphDataResponse: graphData,
					statements: statementsRef.current,
					setError,
					isFolder,
				});
			}

			const extracted = InfraNodus.extractDataFromGraphData({
				graph_data: graphData,
				setError,
			});
			extractedGraphDataRef.current = extracted;

			// Update the state
			setGraphData(graphData);

			const topicNames = extractedGraphDataRef.current?.top_clusters.map(
				(topic: any) => ({
					id: topic.community,
					name: topic.nodes
						.map((node: any) => node.nodeName)
						.slice(0, 3)
						.join(" "),
				})
			);
			// console.log("Obtained names for the Topics", topicNames);
			// console.log("[time] all graph data", diff(start2));
			if (loadingState != "complete") setLoadingState("waiting-iframe");

			const start3 = new Date();

			if (!loadedIframeRef.current) {
				const iframeReadyDeadline = Date.now() + 20000;
				while (!iframIsReadyRef.current) {
					if (Date.now() > iframeReadyDeadline) {
						throw new Error(
							"Could not load the InfraNodus graph viewer. Please check your connection and try reloading the graph."
						);
					}
					await new Promise((resolve) => setTimeout(resolve, 50));
				}
				// sendDataToIframe("LOAD", {
				// 	infraNodusAnswer: graphData,
				// 	topicNames,
				// });
				sendDataToIframe("LOAD_JSON", {
					entriesAndGraphOfContext:
						graphData?.entriesAndGraphOfContext,
					topicNames,
				});
				loadedIframeRef.current = true;
				// console.log("[time] waiting load and sending", diff(start3));

				await new Promise((resolve) => setTimeout(resolve, 250));
				// console.log("INITIAL DATA", params.initialData);
				if (wordsToSearch.length > 0) {
					sendDataToIframe(EventTypes.SELECTED_NODES, wordsToSearch);
				}
				if (wordsToHide.length > 0) {
					sendDataToIframe(EventTypes.REMOVED_NODES, wordsToHide);
				}
			} else {
				// setShowIframe(false);
				// console.log("Hide iframe, reloading...");
				// iframIsReadyRef.current = false;
				// await new Promise((resolve) => setTimeout(resolve, 250));
				// setShowIframe(true);

				// while (!iframIsReadyRef.current) {
				// 	await new Promise((resolve) => setTimeout(resolve, 50));
				// }

				// console.log(
				// 	"Reloading Iframe with",
				// 	wordsToSearch,
				// 	wordsToHide
				// );

				sendDataToIframe("RECALCULATION", {
					entriesAndGraphOfContext:
						graphData?.entriesAndGraphOfContext,
				});
				// sendDataToIframe("LOAD", {
				// 	infraNodusAnswer: graphData,
				// 	topicNames,
				// });
				// sendDataToIframe("LOAD_JSON", {
				// 	entriesAndGraphOfContext:
				// 		graphData?.entriesAndGraphOfContext,
				// 	topicNames,
				// });
				// await new Promise((resolve) => setTimeout(resolve, 250));
				// sendDataToIframe(EventTypes.SELECTED_NODES, wordsToSearch);
				// sendDataToIframe(EventTypes.REMOVED_NODES, wordsToHide);
				// new Notice("Graph reloaded");
			}
			if (loadingState != "complete") setIsLoadingIframe(false);
			setLoadingState("complete");
			new Notice("Graph loaded");

			// Try to generate ai topic names
			try {
				const aiTopics = await InfraNodus.generateAiNamesForTopics({
					graph_data: graphData,
					top_clusters: extractedGraphDataRef.current?.top_clusters,
					language: "USER",
					top_statements:
						extractedGraphDataRef.current?.top_statements,
				});
				sendDataToIframe(EventTypes.TOPICS_UPDATE, aiTopics);
				// console.log("AI Topics", aiTopics);

				// Match ai topics to extracted data
				for (const aiTopic of aiTopics) {
					const topic =
						extractedGraphDataRef.current?.top_clusters.find(
							(topic: any) => topic.community == aiTopic.id
						);
					if (topic) {
						topic.aiName = aiTopic.name;
						topic.aiDescription = aiTopic.description;
					}
				}
			} catch (err) {
				console.log("Error generating AI topics", err.message, err);
			}
		}

		fetchGraphData().catch((err) => {
			setError((currentError) => {
				if (currentError) return currentError;

				const message = err.message || "An unknown error occurred";
				if (message.startsWith(INFRANODUS_API_ERROR_PREFIX)) {
					setErrorText(
						message.slice(INFRANODUS_API_ERROR_PREFIX.length)
					);
					return "api-error";
				}
				setErrorText(message);
				return "generic-error";
			});
		});
	}, [wordsToHide]);

	function showGraphContextAdvice(params: {
		wordsToSearch: string[];
		topicsFiltered: string[];
		source?: "next" | "back" | "gap";
	}) {
		setOverlayShowMode("context");
		setAdviceMode("context");

		const data = generateTextForContext(
			{
				wordsToSearch: params.wordsToSearch,
				filteredStatements:
					stateForMessagesRef.current.filteredStatements,
				currentContextShown: currentContextShown,
				extractedGraphData: extractedGraphDataRef.current!,
				topicsFiltered: params.topicsFiltered,
			},
			params.source || "next"
		);

		if (data) {
			setTextToShow(data.contentToShow);
			setCurrentContextShown(data.currentContextShown);
			setStatementsToShow(data.statementsToShow);
		}
	}

	// Handle messages from the iframe
	useEffect(() => {
		const onMessage = async (message: any) => {
			if (message.source !== graph_iframe.current?.contentWindow) return;

			const type = message.data.type;
			let payload = message.data.payload;
			// console.log(
			// 	"InfraNodus received message from iframe",
			// 	type,
			// 	payload
			// );

			const { wordsToSearch, wordsToHide, topicsFiltered, graphData } =
				stateForMessagesRef.current;

			switch (type) {
				case EventTypes.READY:
					iframIsReadyRef.current = true;
					break;
				case EventTypes.SELECTED_NODES:
					if (!payload) payload = [];

					setIsSearchingWords(payload.length > 0);
					setCurrentGraphPanel("concepts");
					if (!arraysAreEqual(wordsToSearch, payload)) {
						const newWordsToSearch: string[] = Array.from(
							new Set(payload)
						);
						const wordsUnselected = wordsToSearch.filter(
							(word: string) => {
								if (newWordsToSearch.includes(word))
									return false;
								if (lastSelectedWordRef.current === word) {
									lastSelectedWordRef.current =
										newWordsToSearch[0];
								}
								return true;
							}
						);

						const _connectedWords =
							message.data.connectedNodes ?? [];

						try {
							const allStatements =
								extractedGraphDataRef.current
									?.all_statements_with_top;
							const filteredStatements = filterStatements({
								statements: allStatements ?? [],
								wordsToSearch: wordsUnselected,
								wordsToHide,
								connectedWords: _connectedWords,
							}).map((statement) => statement.content ?? "");

							const elements = await unhighlightStatements(
								app,
								filteredStatements
							);

							unObserveElementAttributes(elements);

							elements.forEach((el) =>
								el.classList.remove(
									"infranodus-plugin-yellow-highlight"
								)
							);
						} catch (err) {}

						const newWordsSelected = newWordsToSearch.filter(
							(word: string) => {
								if (wordsToSearch.includes(word)) return false;
								return true;
							}
						);
						if (newWordsSelected.length > 0) {
							lastSelectedWordRef.current = newWordsSelected[0];
						}

						setConnectedWords(_connectedWords);

						setWordsToSearch(newWordsToSearch);
					}
					break;
				case EventTypes.REMOVED_NODES:
					if (!payload) payload = [];
					setIsHidingWords(payload.length > 0);
					// console.log("palette", payload, wordsToHide);
					if (!arraysAreEqual(wordsToHide, payload)) {
						const newWordsToHide = Array.from(
							new Set(payload)
						) as string[];
						// console.log(
						// 	"setting new words to hide",
						// 	newWordsToHide
						// );
						setWordsToHide(newWordsToHide);
					}

					break;
				case EventTypes.GROUPS:
					setCurrentGraphPanel("topics");
					if (!arraysAreEqual(topicsFiltered, payload)) {
						setTopicsFiltered(payload);
					}

					break;
				case EventTypes.GAPS:
					setCurrentGraphPanel("gaps");
					if (gapShown !== payload) {
						setGapShown(payload);
					}
					break;
				case EventTypes.EXTERNAL_ACTION: {
					const meta = (message.data as any).meta;
					// Dual-shape contract — when the graph emits the v1+ meta
					// envelope we route on meta.action directly. Selection has
					// already propagated via SELECTED_NODES/GROUPS messages
					// before this dispatch arrives, so wordsToSearch and
					// topicsFiltered reflect any auto-selection from the
					// Concepts/Trends layers.
					if (meta && meta.version >= 1) {
						switch (meta.action) {
							case "question":
							case "develop":
							case "transcend":
								setAdviceMode("none");
								setTimeout(() => {
									setAdviceMode(meta.action);
								}, 100);
								break;
							case "summarize":
								setAdviceMode("none");
								setTimeout(() => {
									setAdviceMode("summary");
								}, 100);
								break;
							case "chat":
								setOverlayShowMode("aiChat");
								break;
							case "context":
							case "context_gap":
								setAdviceMode("context");
								setOverlayShowMode("context");
								showGraphContextAdvice({
									wordsToSearch,
									source: meta.action === "context_gap" ? "gap" : "next",
									topicsFiltered,
								});
								if (!Platform.isMobileApp && !Platform.isMobile)
									getMentionsOfFile(
										app,
										filePath || "",
										wordsToSearch
									);
								break;
						}
						break;
					}
					if (!payload) payload = [];
					if (payload.length > 0) {
						switch (payload) {
							case "question":
								setAdviceMode("none");
								setTimeout(() => {
									setAdviceMode("question");
								}, 100);

								break;
							case "develop":
								setAdviceMode("none");
								setTimeout(() => {
									setAdviceMode("develop");
								}, 100);

								break;
							case "transcend":
								setAdviceMode("none");
								setTimeout(() => {
									setAdviceMode("transcend");
								}, 100);

								break;
							case "summary":
							case "summarize":
								setAdviceMode("none");
								setTimeout(() => {
									setAdviceMode("summary");
								}, 100);

								break;
							case "chat":
								setOverlayShowMode("aiChat");
								break;
							case "context_gap":
								setAdviceMode("context");
								setOverlayShowMode("context");
								showGraphContextAdvice({
									wordsToSearch,
									source: "gap",
									topicsFiltered,
								});
								if (!Platform.isMobileApp && !Platform.isMobile)
									getMentionsOfFile(
										app,
										filePath || "",
										wordsToSearch
									);

								break;
							case "context":
								setAdviceMode("context");
								setOverlayShowMode("context");
								showGraphContextAdvice({
									wordsToSearch,
									source: "next",
									topicsFiltered,
								});
								if (!Platform.isMobileApp && !Platform.isMobile)
									getMentionsOfFile(
										app,
										filePath || "",
										wordsToSearch
									);

								break;
							case "topics":
								setCurrentGraphPanel("topics");
								break;
							case "graph":
								setCurrentGraphPanel("graph");
								break;
							case "gap":
								setCurrentGraphPanel("gaps");
								break;
							case "trends":
								setCurrentGraphPanel("trends");
								break;
							case "concepts":
								setCurrentGraphPanel("concepts");
								break;
						}
					}
					if (payload.type) {
						if (
							payload.type == "statement" &&
							payload.nodes &&
							filteredStatementsRef.current &&
							filteredStatementsRef.current.length > 0
						) {
							setAdviceMode("context");
							setOverlayShowMode("context");
							showGraphContextAdvice({
								wordsToSearch,
								source: "next",
								topicsFiltered,
							});
							if (!Platform.isMobileApp && !Platform.isMobile)
								getMentionsOfFile(
									app,
									filePath || "",
									wordsToSearch
								);
							// const receivedNodes = payload.nodes;
							// const clusterIndex = receivedNodes.join("_");

							// const statementToJumpTo = getStatementToJumpTo({
							// 	clusterIndex,
							// 	filteredStatementsRef,
							// 	previousStatementToJumpToRef,
							// 	statementToJumpToRef,
							// });

							// await jumpToStatementAndOpenFile({
							// 	app,
							// 	filePath,
							// 	statementToJumpTo,
							// });
						}

						if (payload.clusters) {
							setAdviceMode("context");
							setOverlayShowMode("context");

							const sourceType =
								payload.mode == "locate_gaps" ? "gap" : "next";

							showGraphContextAdvice({
								wordsToSearch,
								source: sourceType,
								topicsFiltered,
							});
							if (!Platform.isMobileApp && !Platform.isMobile)
								getMentionsOfFile(
									app,
									filePath || "",
									wordsToSearch
								);
						}

						if (payload.type == "click") {
							const receivedNodes = payload.nodes;

							navigateToStatement({
								app,
								filePath: filePath || "",
								filteredStatements: [],
								wordsToSearch: [
									receivedNodes[receivedNodes.length - 1],
								],
								graphContext: params.graphContext,
							});
						}

						if (payload.type == "search") {
							const receivedNodes = payload.nodes;
							if (
								Array.isArray(receivedNodes) &&
								receivedNodes.length > 0
							) {
								const query = receivedNodes
									.map((rawNode: string) => {
										const node = String(rawNode);
										const wikilink = node.match(
											/^\[\[(.+)\]\]$/
										);
										if (wikilink) {
											const inner = wikilink[1]
												.replace(/_/g, " ")
												.trim();
											return inner.length > 0
												? `"${inner}"`
												: "";
										}
										return node.trim();
									})
									.filter((n: string) => n.length > 0)
									.join(" ");
								if (query.length > 0) {
									const searchPlugin = (
										app as any
									).internalPlugins?.getPluginById?.(
										"global-search"
									);
									searchPlugin?.instance?.openGlobalSearch?.(
										query
									);
								}
							}
						}
					}

					if (!payload || (payload && payload.length == 0)) {
						setCurrentGraphPanel("graph");
					}
					break;
				}
				default:
					break;
			}
		};
		window?.addEventListener("message", onMessage);
		return () => {
			window?.removeEventListener("message", onMessage);
		};
	}, []);

	// Check for changes in text, but only for manual
	useEffect(() => {
		if (SETTINGS.RELOADING_GRAPH === "manual") {
			setShowingReloadButton(true);
			return;
		}
		// let originalText: string | undefined;
		let textCheck: number;

		let cleared = false;
		(async () => {
			const oldText =
				(
					await getContentsFromFilePath({
						app,
						filePath: filePath || "",
						ignoreLinkedUnlinked: true,
					})
				)?.content.trim() ?? "";

			textCheck = window.setInterval(async () => {
				if (cleared) {
					window.clearInterval(textCheck);
					return;
				}

				const newText =
					(
						await getContentsFromFilePath({
							app,
							filePath: filePath || "",
							ignoreLinkedUnlinked: true,
						})
					)?.content.trim() ?? "";
				if (cleared) return;
				if (newText !== oldText) {
					cleared = true;
					if (SETTINGS.RELOADING_GRAPH === "manual") {
						// console.log("[manual] showing reload button");
						// setShowingReloadButton(true);
						window.clearInterval(textCheck);
					} else if (SETTINGS.RELOADING_GRAPH === "automatic") {
						// console.log("[automatic] reloading graph");
						cleared = true;
						// params.graphContext.reloadGraph().catch((_) => {});
						window.clearInterval(textCheck);
						return;
					} else if (SETTINGS.RELOADING_GRAPH === "into reading") {
						window.clearInterval(textCheck);
					}
					window.clearInterval(textCheck);
				}
			}, 3000);
		})();
		return () => {
			cleared = true;
			window.clearInterval(textCheck);
		};
	}, []);

	function sendDataToIframe(type: string, payload: any) {
		// console.log("InfraNodus Sending data to iframe", type, payload);
		graph_iframe.current?.contentWindow?.postMessage(
			{ type, payload },
			"*"
		);
	}

	const graphHeight = getGraphHeight({
		topTextElement: graph_top_text.current,
		maxHeight: params.graphContext.maxHeight,
		currentPlatform,
	});

	const [exportedGraph, setExportedGraph] = useState(false);

	return (
		<>
			<div
				className="flex flex-col items-center pb-2"
				ref={graph_top_text}
			>
				{filePath &&
					(params.graphContext.isRoot
						? `[ROOT] ${cleanFilePath}`
						: isFolder
						? `[FOLDER] ${cleanFilePath}`
						: cleanFilePath)}
				{contentString && sourcePath}
			</div>
			<div className={`relative ${colorScheme} @container/main`}>
				{graphData && (
					<GraphViewOverlay
						graphViewContext={graphViewContext!}
						graphContext={params.graphContext}
						overlayShowMode={overlayShowMode}
						setOverlayShowMode={setOverlayShowMode}
						showGraphContextAdvice={(source) =>
							showGraphContextAdvice({
								wordsToSearch,
								topicsFiltered,
								source,
							})
						}
						setTextToShow={setTextToShow}
						textToShow={textToShow}
						statementsToShow={statementsToShow}
						filteredStatements={filteredStatementsRef.current}
						topicsFiltered={topicsFiltered}
						navigateToStatement={navigateToStatement}
						sendDataToIframe={sendDataToIframe}
						currentGraphPanel={currentGraphPanel}
						// showingGraphAdvice={showingGraphAdvice}
						// adviceMode="question"
					/>
				)}

				{/* Bottom right settings */}
				{showingSettings && (
					<GraphViewOverlaySettings
						graphContext={params.graphContext}
						closeSettings={() => setShowingSettings(false)}
						isFolder={isFolder}
						reloadGraph={params.graphContext.reloadGraph}
					/>
				)}

				<div className="absolute bottom-4 left-2 z-50 space-y-2">
					{/* Reloading graph button */}
					{((showingReloadButton && !showingSettings) || error) && (
						<InfoTooltip text="Reload graph" direction="right">
							<IconButton
								icon={SyncIcon}
								onClick={params.graphContext.reloadGraph}
							/>
						</InfoTooltip>
					)}

					{!showingSettings && (
						<InfoTooltip
							text="Export content to InfraNodus"
							direction="right"
						>
							<IconButton
								icon={
									exportedGraph
										? CheckIcon
										: CrossReferenceIcon
								}
								onClick={() => {
									if (exportedGraph) return;
									setExportedGraph(true);
									const statementsArray =
										extractedGraphDataRef?.current
											?.all_statements_with_top || [];
									const contentToCopy = statementsArray
										.map((statement) => statement.content)
										.join("\n");

									goToInfraNodus({
										textToShow: contentToCopy,
										contextName: filePath,
										exportToInfraNodus,
										vaultName,
									});

									setTimeout(
										() => setExportedGraph(false),
										2000
									);
								}}
							/>
						</InfoTooltip>
					)}

					{!showingSettings && (
						<InfoTooltip text="Plugin settings" direction="right">
							<IconButton
								icon={GearIcon}
								onClick={() => {
									setShowingSettings(true);
								}}
							/>
						</InfoTooltip>
					)}
				</div>

				<div id="graph-container" className="relative h-min mr-2">
					{showIframe && (
						<iframe
							id="graph-iframe"
							ref={graph_iframe}
							src={
								graphLink +
								`&theme=${
									colorScheme === "auto"
										? obsidianColorSchemeRef.current
										: colorScheme
								}` +
								iframeGraphUser
							}
							width="100%"
							height={`${graphHeight}px`}
							title="Infranodus 3D"
							allowFullScreen
							className="relative bg-gray-200 border-0 outline-none dark:bg-[#0d1117] px-1 py-1 rounded"
							scrolling="no"
							allow="clipboard-write"
							style={{ overflow: "hidden" }}
							onError={() => {
								setError((current) => {
									if (current) return current;
									setErrorText(
										"Could not load the InfraNodus graph viewer iframe."
									);
									return "generic-error";
								});
							}}
						></iframe>
					)}
					{!showIframe && !error && (
						<div
							className="w-full bg-gray-300 dark:bg-gray-800"
							style={{ height: `${graphHeight}px` }}
						></div>
					)}
					{isLoadingIframe && !error && (
						<LoadingView loadingState={loadingState} />
					)}
					{!filePath && !contentString && !error && (
						<div className="absolute inset-0 z-[5] flex flex-col items-center justify-center dark:bg-black bg-opacity-50 bg-white">
							<span className="text-lg text-gray-600 dark:text-gray-200 animate-pulse">
								No file or content to analyze. Please, choose a
								specific file, folder, or search results.
							</span>
						</div>
					)}
					{error && (
						<ErrorHandler
							graphContext={params.graphContext}
							error={error}
							errorText={errorText}
							setError={setError}
							context={{
								setShowingSettings,
							}}
						/>
					)}
				</div>
			</div>
		</>
	);
};

function getGraphHeight(params: {
	topTextElement?: HTMLElement;
	maxHeight: number;
	currentPlatform: string;
}) {
	const topTextElement = params.topTextElement;
	const maxHeight = params.maxHeight;

	if (!topTextElement) return 700;
	const topTextHeight = topTextElement.getBoundingClientRect().height;

	// Accomodate for bottom bar, 70 for mobile, 50 for desktop
	const toRemoveBottom = params.currentPlatform === "mobile" ? 80 : 50;
	const graphHeight = maxHeight - topTextHeight - toRemoveBottom;
	return graphHeight;
}

export { GraphView };

async function navigateToStatement(params: {
	filteredStatements: StatementsObject[];
	filePath: string;
	app: App;
	wordsToSearch: string[];
	graphContext: PluginGraphContext;
}) {
	if (params.wordsToSearch.length === 0) return;
	// const file = params.app.vault.getAbstractFileByPath(params.filePath);
	// if (file?.parent) params.filePath = file.parent.path;
	const wordToSearch = params.wordsToSearch[0];

	// ===================================================================
	// Navigate to file with link ========================================

	let link = wordToSearch;
	if (wordToSearch.startsWith("[[") && wordToSearch.endsWith("]]")) {
		link = wordToSearch.slice(2, -2);
	}

	new Notice(`Navigating to file - ${link}`);
	let file: TFile | null = null;

	if (link.contains("|")) {
		let linkpath = link.split("|")[0];
		if (!linkpath.endsWith(".md")) linkpath += ".md";

		const abstractFile = findFileFromPath(params.app, linkpath);
		if (abstractFile) file = abstractFile;
		// console.log("Find file from path", file, linkpath);
	} else {
		let linkpath = link;
		// if (!linkpath.endsWith(".md")) linkpath += ".md";

		const abstractFile = findFileFromName(params.app, linkpath);
		if (abstractFile) file = abstractFile;
		// file = params.app.metadataCache.getFirstLinkpathDest(
		// 	getLinkpath(link),
		// 	link
		// );
	}

	// ===================================================================
	// Create file ===================================
	if (!file) {
		const newLink = link.replace(/_/g, " ");

		const abstractFile = findFileFromName(params.app, link);
		if (abstractFile) file = abstractFile;

		if (!file) {
			// console.log("File not found, creating");
			new Notice("File not found, creating");

			// Create a new file
			// const newFile = await params.app.vault.create(link + ".md", "");
			let linkPath = newLink;
			if (linkPath.contains("|")) linkPath = newLink.split("|")[0];
			if (!linkPath.endsWith(".md")) linkPath += ".md";

			const newFile = await params.app.vault.create(linkPath, "");
			// console.log("New File!", newFile.path, newFile);
			file = newFile;
		}
	}

	if (file) {
		const leaf = await openLeafWithPath(file, params.app.workspace);
		// console.log("Leaf", leaf);
		if (leaf) {
			const file = ((leaf?.view ?? ({} as any)) as any).file;
			await params.graphContext.reloadGraph(
				{
					leaf,
					filePath: file?.path ?? params.filePath,
					fromLayoutChange: true,
					initialData: { wordsToSearch: params.wordsToSearch },
				},
				true
			);
		}
		return;
	}
}

function searchGoogleText(params: {
	topicsExtracted: TopicsObject[];
	topicsFiltered: string[];
	wordsToSearch: string[];
}) {
	const graphText = convertGraphToText({ noCodes: true, ...params });
	const encodedText = encodeURIComponent(graphText);
	const linkToOpen = `https://google.com/search?q=${encodedText}`;
	window.open(linkToOpen, "_blank");
}

function convertGraphToText(params: {
	noCodes?: boolean;
	topicsExtracted: TopicsObject[];
	topicsFiltered: string[];
	wordsToSearch: string[];
}) {
	const { noCodes, topicsExtracted, topicsFiltered, wordsToSearch } = params;

	let graphText = "";

	if (wordsToSearch && wordsToSearch.length > 0) {
		graphText = wordsToSearch.join(", ");
	} else if (topicsFiltered && topicsFiltered.length > 0) {
		const topicsToUse = topicsExtracted.filter((topic: any) =>
			topicsFiltered.includes(topic.id)
		);

		graphText = topicsToUse
			.map(
				(topic: any) =>
					`${noCodes ? "" : `[${topic.id}]: `}${
						topic.aiName ?? ""
					} (${topic.words.slice(0, 8).join(" ")})`
			)
			.join(", ");
	} else {
		graphText = topicsExtracted
			.map(
				(topic: any) =>
					`${noCodes ? "" : `[${topic.id}]: `}${
						topic.aiName ?? ""
					} (${topic.words.slice(0, 8).join(" ")})`
			)
			.join(", ");
	}
	return graphText;
}

async function goToInfraNodus({
	textToShow = "",
	contextName = "",
	exportToInfraNodus = { type: "manual", graphName: "" },
	vaultName = "",
}) {
	if (!textToShow || textToShow === "ai generating...") {
		// console.log("no data to send to InfraNodus");
		return;
	}

	const encodedText = encodeURIComponent(textToShow);
	const encodedContext = encodeInfraNodusGraphName(
		contextName,
		SETTINGS.EXPORT_GRAPH,
		vaultName
	);

	const linkToOpen = `${SETTINGS.INFRANODUS_API_URL}/import/editor?text=${encodedText}&context=${encodedContext}`;

	if (exportToInfraNodus && exportToInfraNodus.type === "auto") {
		// Change the context name to just be the page title?
		const graphTags = [`context: ${encodedContext}`];
		let graphName = encodedContext;

		// Show dialog to confirm/edit graph name
		graphName =
			(await new Promise<string | null>((resolve) => {
				new GraphNameModal(app, graphName, resolve).open();
			})) || "";

		if (!graphName) {
			return;
		}

		const dataToSave = {
			contextName: graphName,
			text: textToShow,
			tags: graphTags,
		};

		const exportStatus = await InfraNodus.exportText(dataToSave);

		// console.log("InfraNodus export status", exportStatus);
		if (exportStatus.error) {
			alert(
				`There was an error saving to the ${graphName} graph in InfraNodus. Reload the page and try again or change your extension setting.`
			);
		} else {
			alert(`Saved to the ${graphName} graph in InfraNodus`);
		}
	} else {
		window.open(linkToOpen, "_blank");
	}
}
