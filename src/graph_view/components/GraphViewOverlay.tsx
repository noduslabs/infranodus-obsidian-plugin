import { useEffect, useRef, useState } from "react";
import {
	CheckIcon,
	CopyIcon,
	CrossReferenceIcon,
	SyncIcon,
	XCircleIcon,
	SparkleFillIcon,
	CommentDiscussionIcon,
	PlayIcon,
	ChevronLeftIcon,
	ChevronRightIcon,
	BookIcon,
	LinkIcon,
	RepoPullIcon,
} from "@primer/octicons-react";
import { copyToClipboard } from "src/utils/clipboard";
import { INTERNAL_SETTINGS, SETTINGS } from "src/settings";
import {
	AdviceMode,
	ChatHistory,
	GraphViewContext,
	PluginGraphContext,
} from "../types";
import { generateAiAdvice } from "../lib/generateAiAdvice";
import { StatementsObject, TopicsObject } from "src/types/general";
import { GraphViewOverlayChat } from "./GraphViewOverlayChat";
import { IconButton } from "src/components/IconButton";
import { ToggleButton } from "src/components/ToggleButton";
import { InfoTooltip } from "src/components/InfoTootip";
import { MarkdownText } from "src/components/MarkdownText";
import { getPureTextFromMarkdown } from "src/utils/line";
import { encodeInfraNodusGraphName } from "src/utils/graph";
import { App, Notice, TFile, Platform, Modal, Setting } from "obsidian";
import { GraphNameModal } from "../../components/GraphNameModal";
import {
	findFileFromName,
	findFileFromPath,
	findLineEntryInLeaf,
	focusOrOpenFile,
	openLeafWithPath,
} from "src/utils/files";
import {
	getStatementToJumpTo,
	jumpToStatementAndOpenFile,
} from "../lib/jumpToStatement";
import { editStatementsOfFile } from "src/utils/editFile";
import { addLinksToStatementsForFilePath } from "../lib/addLinksToStatement";

import { InfraNodus } from "../../infranodus";

enum EventTypes {
	LOAD = "LOAD_JSON",
	REMOVED_NODES = "UPDATE_REMOVED_NODES",
	SELECTED_NODES = "UPDATE_SELECTED_NODES",
	GROUPS = "UPDATE_GROUPS",
	GROUPS_PRESELECT = "GROUPS_PRESELECT",
	GAPS = "GAPS",
	GAPS_SHOW = "GAPS_SHOW",
	READY = "READY",
	RECALCULATION = "RECALCULATION",
	TOPICS_UPDATE = "TOPICS_UPDATE",
	EXTERNAL_ACTION = "EXTERNAL_ACTION",
}

const GraphViewOverlay = (params: {
	graphViewContext: GraphViewContext;
	overlayShowMode: "ai" | "aiChat" | "context" | null;
	setOverlayShowMode: (mode: "ai" | "aiChat" | "context" | null) => void;
	graphContext: PluginGraphContext;
	showGraphContextAdvice: (source?: "next" | "back" | "gap") => void;
	textToShow: string;
	setTextToShow: (text: string) => void;
	statementsToShow: string[];
	filteredStatements: StatementsObject[];
	topicsFiltered: string[];
	navigateToStatement: any;
	sendDataToIframe: (type: string, payload: any) => void;
	currentGraphPanel: "graph" | "topics" | "gaps" | "trends" | "concepts";
}) => {
	let adviceMode = params.graphViewContext.adviceMode;

	let stateRef = params.graphViewContext.stateRef;
	let graphViewContext = params.graphViewContext;

	const { textToShow, setTextToShow } = params;
	const { showGraphContextAdvice } = params;
	const { filePath, app } = params.graphContext;
	const { overlayShowMode, setOverlayShowMode } = params;

	const vaultName = app.vault.getName();

	const isFolder = filePath && !filePath.endsWith(".md");
	const topicsFiltered = params.topicsFiltered;

	const [isLoading, setIsLoading] = useState(false);
	const [copied, setCopied] = useState(false);
	const [copiedGraphText, setCopiedGraphText] = useState(false);
	const [exportedGraph, setExportedGraph] = useState(false);
	const [error, setError] = useState("");
	const [beyondContext, setBeyondContext] = useState(false);
	// const [showMode, setShowMode] = useState<"ai" | "aiChat" | null>("ai");

	const navigateToStatement = params.navigateToStatement;

	const aiQuestionsList = useRef<string[]>([]);
	const aiQuestionsIndex = useRef<number>(0);

	const chatHistoryRef = useRef<ChatHistory[]>([]);

	const [showingSettings, setShowingSettings] = useState(false);

	const [jumpIteration, setJumpIteration] = useState(0);

	const exportToInfraNodus = {
		type: SETTINGS.EXPORT_TYPE,
		graphName: SETTINGS.EXPORT_GRAPH,
	};

	const [currentUser, setCurrentUser] = useState<string>(
		graphViewContext.currentUser ? graphViewContext.currentUser : ""
	);

	// console.log("InfraNodus currentUser", currentUser);

	const currentPlatform =
		Platform.isMobileApp || Platform.isMobile ? "mobile" : "desktop";

	useEffect(() => {
		if (overlayShowMode === "ai")
			showGraphAiAdvice({ modal: "graph_advice_button" });
	}, [overlayShowMode]);

	useEffect(() => {
		if (!adviceMode) return;
		if (adviceMode === "none") return;

		// console.log("Advice mode changed to", adviceMode);

		if (overlayShowMode === "ai") {
			showGraphAiAdvice({ modal: "graph_advice_button" });
		} else if (overlayShowMode === "context" && adviceMode === "context") {
			// console.log("show graph context");
		} else setOverlayShowMode("ai");
	}, [adviceMode]);

	const toggleBeyondContext = () => {
		setBeyondContext((prev) => !prev);
	};

	useEffect(() => {
		if (overlayShowMode == "ai") {
			showGraphAiAdvice({
				modal: "beyond_context",
			});
		}
	}, [beyondContext]);

	useEffect(() => {
		if (error) setTimeout(() => setError(""), 5000);
	}, [error]);

	async function showGraphAiAdvice({ modal }: { modal: string }) {
		if (isLoading) return;

		setTextToShow("ai generating...");
		setIsLoading(true);

		// console.log("InfraNodus adviceMode", adviceMode);
		if (adviceMode === "context") {
			graphViewContext.setAdviceMode("question");
			adviceMode = "question"; // update before useEffect from setAdviceMode
		}

		try {
			if (adviceMode === "none")
				graphViewContext.setAdviceMode("question");

			const choicesText = await generateAiAdvice({
				extractedGraphData: stateRef.current.extractedGraphData,
				beyondContext,
				adviceMode: adviceMode === "none" ? "question" : adviceMode,
				modal: modal,
				stateRef: stateRef,
				wordsToSearch: graphViewContext.wordsToSearch,
				userSettings: SETTINGS,
				currentGraphPanel: params.currentGraphPanel,
				setTextToShow,
			});

			if (!choicesText) {
				new Notice(
					"No AI advice could be generated. Please, try again later or with another file.",
					0
				);
				setIsLoading(false);
				setOverlayShowMode(null);
				return;
			}

			aiQuestionsList.current = choicesText;
			aiQuestionsIndex.current = 0;
			setTextToShow(choicesText[0]);
		} catch (e) {
			console.error(e);
			new Notice(e, 0);
			setIsLoading(false);
			setOverlayShowMode(null);
		}
		setIsLoading(false);
	}

	return (
		<>
			{error && <p className="text-sm font-bold">{error}</p>}
			{/* Top left buttons */}
			<div className="relative flex flex-col gap-4 pr-2">
				<div className="absolute z-10 flex flex-col items-start justify-start gap-2 mt-2 ml-2 text-black rounded w-fit dark:text-white">
					{/* Graph Advice */}
					<InfoTooltip text="Generate AI Advice" direction="right">
						<IconButton
							icon={SparkleFillIcon}
							className={`text-violet-700 dark:text-violet-400`}
							onClick={() => {
								setOverlayShowMode("ai");

								if (!topicsFiltered && !graphViewContext) {
									params.sendDataToIframe(EventTypes.GAPS, 1);
									params.sendDataToIframe(
										EventTypes.GAPS_SHOW,
										1
									);
								}
								if (
									topicsFiltered &&
									topicsFiltered.length == 0 &&
									graphViewContext?.wordsToSearch &&
									graphViewContext?.wordsToSearch.length == 0
								) {
									params.sendDataToIframe(EventTypes.GAPS, 1);
									params.sendDataToIframe(
										EventTypes.GAPS_SHOW,
										1
									);
								}
							}}
							label={`${
								currentPlatform == "mobile" || overlayShowMode
									? ""
									: "insights"
							}`}
						/>
					</InfoTooltip>

					{/* Ai Chat */}
					<InfoTooltip text="Open AI Chat" direction="right">
						<IconButton
							icon={CommentDiscussionIcon}
							onClick={() => {
								setOverlayShowMode("aiChat");
							}}
							label={`${
								currentPlatform == "mobile" || overlayShowMode
									? ""
									: "ai chat"
							}`}
						/>
					</InfoTooltip>

					{!overlayShowMode ||
						(overlayShowMode && (
							<>
								{/* Copy */}
								{/* <InfoTooltip text="Copy Graph Data" direction="right">
							<IconButton
								icon={copiedGraphText ? CheckIcon : CopyIcon}
								onClick={() => {
									if (copiedGraphText) return;
									const graphText = convertGraphToText({
										topicsExtracted:
											stateRef.current.extractedGraphData
												.top_clusters,
										topicsFiltered,
										wordsToSearch:
											graphViewContext.wordsToSearch,
										graphViewContext: graphViewContext,
									});
									copyToClipboard({ text: graphText });
									setCopiedGraphText(true);
									setTimeout(
										() => setCopiedGraphText(false),
										2000
									);
								}}
							/>
						</InfoTooltip> */}

								{/* Navigate to file */}
								{/* {graphViewContext &&
							graphViewContext.wordsToSearch.length > 0 && (
						<InfoTooltip
							text="Navigate to Selected File"
							direction="right"
							isAbsolute={true}
						>
							
								<IconButton
									icon={RepoPullIcon}
									onClick={
										() => {
											navigateToStatement({
												app,
												filePath: filePath || "",
												filteredStatements:
													params.filteredStatements,
												wordsToSearch: [
													graphViewContext.wordsToSearch && graphViewContext.wordsToSearch.length ? graphViewContext.wordsToSearch[
														graphViewContext.wordsToSearch.length - 1
													] : '',
												],
												graphContext:
													params.graphContext,
											});
										}
										// searchGoogleText({
										// 	topicsExtracted:
										// 		params.extractedGraphData
										// 			.top_clusters,
										// 	topicsFiltered,
										// 	wordsToSearch: params.wordsToSearch,
										// })
									}
								/>
							
						</InfoTooltip>
					)} */}

								{/* Lemmatization
						{graphViewContext.wordsToSearch.length > 0 && (
							<InfoTooltip
								text="Add links to statements of selected words"
								direction="right"
							>
								<IconButton
									icon={LinkIcon}
									onClick={() => {
										addLinksToStatementsForFilePath({
											app: params.graphContext.app,
											filePath,
											allStatements:
												stateRef.current
													.extractedGraphData
													.all_statements_with_top,
											wordsToLink:
												graphViewContext.wordsToSearch,
										}).catch((err: any) => {
											new Notice(
												"ERROR adding links: " +
													err.message,
												30000
											);
										});
									}}
								></IconButton>
							</InfoTooltip>
						)} */}
							</>
						))}
				</div>

				{(overlayShowMode === "ai" ||
					overlayShowMode === "context") && (
					<div className="absolute z-10 top-2 left-12 @[420px]/main:w-[376px] flex flex-col items-stretch text-black dark:text-white bg-gray-300 dark:bg-gray-800 pt-2 rounded">
						{/* Top buttons */}
						<div className="flex flex-row items-center justify-start gap-3 pl-4 pr-2">
							{/* Copy text */}
							<InfoTooltip text="Copy to clipboard">
								<span
									className="cursor-pointer"
									onClick={() => {
										if (copied) return;
										if (textToShow === "ai generating...")
											return;
										copyToClipboard({
											text: textToShow,
										});
										setCopied(true);
										setTimeout(
											() => setCopied(false),
											2000
										);
									}}
								>
									{copied ? (
										<CheckIcon size={16} />
									) : (
										<CopyIcon size={16} />
									)}
								</span>
							</InfoTooltip>

							{adviceMode == "context" && <></>}

							{/* Sync icon --> get next entry */}
							{adviceMode == "summary" && (
								<InfoTooltip text="Regenerate summary">
									<span
										className="ml-4 cursor-pointer"
										onClick={() => {
											showGraphAiAdvice({
												modal: "reload",
											});
										}}
									>
										<SyncIcon size={16} />
									</span>
								</InfoTooltip>
							)}
							{(adviceMode == "question" ||
								adviceMode == "develop") && (
								<InfoTooltip text="Cycle through AI responses">
									<span
										className="ml-4 cursor-pointer"
										onClick={() => {
											if (
												aiQuestionsList.current
													.length === 0
											) {
												// console.log(
												// 	"no questions to show"
												// );
												return;
											}
											// console.log("stuff");
											let newIndex =
												aiQuestionsIndex.current + 1;
											if (
												newIndex >=
												aiQuestionsList.current.length
											) {
												showGraphAiAdvice({
													modal: "reload",
												});
												aiQuestionsIndex.current = 0;
												return;
											}
											// setAiQuestionsIndex(newIndex);
											aiQuestionsIndex.current = newIndex;
											setTextToShow(
												aiQuestionsList.current[
													newIndex
												]
											);
										}}
									>
										<SyncIcon size={16} />
									</span>
								</InfoTooltip>
							)}

							{adviceMode == "context" && (
								<>
									<span
										className={`cursor-pointer`}
										onClick={() => {
											showGraphContextAdvice("back");
										}}
									>
										<ChevronLeftIcon size={16} />
									</span>

									<span
										className={`cursor-pointer -ml-2`}
										onClick={() => {
											showGraphContextAdvice("next");
										}}
									>
										<ChevronRightIcon size={16} />
									</span>

									<span
										className="flex flex-row items-center gap-1 ml-4 text-sm font-bold cursor-pointer"
										onClick={async () => {
											await jumpToStatementAndOpenFile({
												app,
												filePath: filePath || "",
												statementToJumpTo: textToShow,
												statementsToShow:
													params.statementsToShow,
												iteration: jumpIteration,
											});

											setJumpIteration(jumpIteration + 1);
										}}
									>
										<RepoPullIcon
											className="mt-1"
											size={16}
										/>
										<span className="ml-1">
											open in context
										</span>
									</span>
								</>
							)}

							<InfoTooltip text="Paste to AI chat">
								<span
									className="flex flex-row items-center gap-1 ml-4 text-sm font-bold cursor-pointer"
									onClick={() => {
										setOverlayShowMode("aiChat");
									}}
								>
									<CommentDiscussionIcon size={16} />
									{[
										"summary",
										"question",
										"develop",
									].includes(adviceMode) && (
										<span>to chat</span>
									)}
								</span>
							</InfoTooltip>

							{/* Go to InfraNodus */}
							<InfoTooltip text="Save this to InfraNodus">
								<span
									className="flex flex-row items-center gap-1 ml-4 text-sm font-bold cursor-pointer"
									onClick={() => {
										goToInfraNodus({
											textToShow,
											contextName: filePath,
											exportToInfraNodus,
											adviceMode,
											vaultName,
											app,
										});
									}}
								>
									<CrossReferenceIcon size={16} />
									{adviceMode === "context" ? (
										<span>save</span>
									) : (
										<span>save clip</span>
									)}
								</span>
							</InfoTooltip>

							{/* Close overlay */}
							<span
								className="flex flex-row items-center gap-1 ml-auto text-sm font-bold cursor-pointer"
								onClick={() => setOverlayShowMode(null)}
							>
								<XCircleIcon size={16} />
							</span>
						</div>

						{/* Text to be shown */}
						<div
							className={`max-h-64 m-4 overflow-y-auto text-base ${
								isLoading && "animate-pulse"
							}`}
						>
							{isLoading || textToShow === "ai generating..." ? (
								<span className="whitespace-pre-wrap font-semibold">
									{textToShow}
								</span>
							) : (
								<MarkdownText text={textToShow} />
							)}
						</div>

						{/* Transcend this context */}
						{(adviceMode == "question" ||
							adviceMode == "develop") && (
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
						)}
					</div>
				)}
				{overlayShowMode === "aiChat" && (
					<GraphViewOverlayChat
						currentUser={currentUser}
						startingChat={
							textToShow === "ai generating..." ? "" : textToShow
						}
						closeChat={() => setOverlayShowMode(null)}
						stateRef={stateRef}
						chatHistory={chatHistoryRef.current}
						wordsToSearch={graphViewContext.wordsToSearch}
						topicsFiltered={topicsFiltered}
						filteredStatements={params.filteredStatements}
						app={app}
					/>
				)}
			</div>
			{/* <div
				className="absolute z-10 flex flex-row items-center justify-end visible gap-3 px-2 pt-2 pb-2 mb-2 bg-gray-300 rounded opacity-100 cursor-pointer bottom-3 right-2 dark:bg-gray-800"
				onClick={() => setShowingGraphAdvice(true)}
			>
				<span className="flex flex-row items-center justify-end gap-1 text-sm font-bold">
					<GearIcon size={16} />
				</span>
			</div> */}
		</>
	);
};

async function goToInfraNodus({
	textToShow = "",
	contextName = "",
	exportToInfraNodus = { type: "manual", graphName: "" },
	adviceMode = "",
	vaultName = "",
	//@ts-ignore
	app,
}) {
	if (!textToShow || textToShow === "ai generating...") {
		// console.log("no data to send to InfraNodus");
		return;
	}

	const encodedText = encodeURIComponent(textToShow);
	const encodedContext =
		adviceMode != "context"
			? encodeInfraNodusGraphName(
					contextName,
					SETTINGS.CONTEXT_NAME,
					vaultName
			  )
			: encodeInfraNodusGraphName(
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

export { GraphViewOverlay };

function convertGraphToText(params: {
	noCodes?: boolean;
	topicsExtracted: TopicsObject[];
	topicsFiltered: string[];
	wordsToSearch: string[];
	graphViewContext: GraphViewContext;
}) {
	const { noCodes, topicsExtracted, topicsFiltered, wordsToSearch } = params;

	const bigrams =
		params.graphViewContext?.stateRef?.current?.extractedGraphData?.bigrams;

	const dotGraphByCluster =
		params.graphViewContext?.stateRef?.current?.extractedGraphData
			?.dot_graph_clusters;

	const topKeywords =
		params.graphViewContext?.stateRef?.current?.extractedGraphData
			?.top_words;

	let graphText = "";

	if (wordsToSearch && wordsToSearch.length > 0) {
		const bigramsForKeywords =
			bigrams && bigrams.length > 0
				? bigrams.filter((bigram) =>
						wordsToSearch.some((word) =>
							bigram.toLowerCase().includes(word.toLowerCase())
						)
				  )
				: [];

		const bigramsString =
			bigramsForKeywords && bigramsForKeywords.length > 0
				? `;\n${bigramsForKeywords
						.map((bigram) => bigram.split(" [weight")[0])
						.join(", ")}`
				: "";

		graphText = wordsToSearch.join(", ") + `${bigramsString}`;
	} else if (topicsFiltered && topicsFiltered.length > 0) {
		const topicsToUse = topicsExtracted.filter((topic: any) =>
			topicsFiltered.includes(topic.id)
		);

		const topicsToKeep: any = [];

		topicsToUse.forEach((topic: any) => {
			const topicalCluster =
				dotGraphByCluster && dotGraphByCluster[topic.id];

			const topicText =
				`${noCodes ? "" : `[${Math.floor(topic.bcRatio * 100)}%]:`} ${
					topic.aiName
				} (${topic.words.slice(0, 8).join(", ")})` +
				topicalCluster.join("; ");

			topicsToKeep.push(topicText);
		});

		graphText = topicsToKeep.join(";\n");
	} else {
		const keywordsTruncated =
			topKeywords && topKeywords.length > 0
				? topKeywords.slice(0, 12)
				: [];

		const topKeywordsString =
			keywordsTruncated && keywordsTruncated.length > 0
				? `\n\nTop keywords:\n${keywordsTruncated.join(", ")}`
				: "";

		const topBigrams =
			bigrams && bigrams.length > 0 ? bigrams.slice(0, 12) : [];

		const topBigramsString =
			topBigrams && topBigrams.length > 0
				? `\n\nTop relations:\n${topBigrams
						.map((bigram) => bigram.split(" [weight")[0])
						.join(", ")}`
				: "";

		const allTopics =
			`Top topics:\n` +
			topicsExtracted
				.map(
					(topic: any) =>
						`${
							noCodes
								? ""
								: `[${Math.floor(topic.bcRatio * 100)}%]:`
						} ${topic.aiName ? topic.aiName : ""} (${topic.words
							.slice(0, 8)
							.join(", ")})`
				)
				.join(";\n");

		graphText = allTopics + topKeywordsString + topBigramsString;
	}
	return graphText;
}
