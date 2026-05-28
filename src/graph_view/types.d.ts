import { App, WorkspaceLeaf } from "obsidian";
import InfraNodusPlugin from "src/main";
import { InfraNodusGraphView } from ".";
import { AnswerInfraNodusTopics } from "src/types/messaging";
import { StatementsObject } from "src/types/general";
import { InfraNodusExtractedGraphData } from "src/infranodus/types";
import * as React from "react";

type AdviceMode =
	| "question"
	| "develop"
	| "transcend"
	| "summary"
	| "context"
	| "context_gap"
	| "none";

interface ChatHistory {
	id: string;
	type: "user" | "ai" | "ref";
	status?: "loading" | "error";
	references?: string[];
	message: string;
}

interface GraphInitialData {
	wordsToSearch?: string[];
}

interface ReloadGraphParams {
	leaf?: WorkspaceLeaf;
	filePath?: string;
	fromLayoutChange?: boolean;
	dontRemoveHighlights?: boolean;
	initialData?: GraphInitialData;
	contentString?: string;
	sourcePath?: string;
}

interface PluginGraphContext {
	filePath?: string;
	isRoot: boolean;
	isFolder: boolean;
	app: App;
	reloadGraph: (
		params?: ReloadGraphParams,
		forceReload?: boolean
	) => Promise<void>;
	infraNodusGraphView: InfraNodusGraphView;
	maxHeight: number;
	maxWidth: number;
	contentString?: string;
	sourcePath?: string;
}

type GraphViewStateRef = React.MutableRefObject<{
	wordsToSearch: string[];
	wordsToHide: string[];
	topicsFiltered: string[];
	graphData?: AnswerInfraNodusTopics;
	filteredStatements: StatementsObject[];
	lastSelectedWord: string | null;
	extractedGraphData: InfraNodusExtractedGraphData;
}>;

interface GraphViewContext {
	// State ref
	stateRef: GraphViewStateRef;

	// State
	graphData: AnswerInfraNodusTopics;
	adviceMode: AdviceMode;
	wordsToSearch: string[];
	wordsToHide: string[];
	gapShown: boolean;
	loadingState: LoadingState;
	currentUser: string;

	// Functions
	setAdviceMode: (mode: AdviceMode) => void;
	setWordsToSearch: (words: string[]) => void;
	setWordsToHide: (words: string[]) => void;
	setGapShown: (shown: boolean) => void;
	setLoadingState: (state: LoadingState) => void;
}

type LoadingState =
	| "initializing"
	| "getting-content"
	| "generating-graph"
	| "waiting-iframe"
	| "complete"
	| "error";

type GraphPanel = "graph" | "topics" | "gaps" | "trends" | "concepts";

export type {
	AdviceMode,
	ChatHistory,
	PluginGraphContext,
	ReloadGraphParams,
	GraphInitialData,
	GraphViewContext,
	GraphViewStateRef,
	LoadingState,
	GraphPanel,
};
