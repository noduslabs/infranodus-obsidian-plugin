import { Platform } from "obsidian";

type GraphAndStatementProcessingType =
	| "[[Wiki Links]] and Concepts"
	| "[[Wiki Links]] Only"
	| "[[Wiki Links]] Prioritized"
	| "Concepts only";

interface PluginSettings {
	INFRANODUS_API_KEY: string;
	AI_MODEL: string;
	SINGLE_PAGE_GRAPH_PROCESSING: GraphAndStatementProcessingType;
	MULTI_PAGE_GRAPH_PROCESSING: GraphAndStatementProcessingType;
	COLOR_SCHEME: "auto" | "light" | "dark";
	LINK_PAGE_TO_MENTIONS:
		| "paragraph"
		| "parent_and_paragraph"
		| "parent_only"
		| "false"
		| "true";
	DEFAULT_GRAPH_MODE: "graph" | "topics" | "concepts" | "gaps" | "trends";
	INCLUDE_LINKED_MENTIONS: "For empty pages only" | "For all pages" | "Never";
	INCLUDE_UNLINKED_MENTIONS:
		| "For empty pages only"
		| "For all pages"
		| "Never";
	USE_OWN_UNLINKED_SEARCH: "no" | "yes";
	RELOADING_GRAPH: "automatic" | "manual" | "into reading";
	ADD_LINKS: "End of statement" | "Lemmatization" | "Only exact words";
	EXPORT_TYPE: "manual" | "auto";
	EXPORT_GRAPH: string;
	CONTEXT_NAME: string;
	WHEN_USING_LOCATE: "Do not force to Edit Mode" | "Force to Edit Mode";
	// RELOAD_WHEN_TO_READING: boolean;

	MOBILE_OPEN_GRAPH_IN: "Side view" | "New tab";
	INFRANODUS_API_URL: string;
	INFRANODUS_GRAPH_URL: string;
}

interface PluginInternalSettings {
	INFRANODUS_API_URL: string;
	INFRANODUS_GRAPH_URL: string;
}

const SETTINGS: PluginSettings = {
	INFRANODUS_API_KEY: "",
	AI_MODEL: "gpt-5.4",
	SINGLE_PAGE_GRAPH_PROCESSING: "[[Wiki Links]] and Concepts",
	MULTI_PAGE_GRAPH_PROCESSING: "[[Wiki Links]] and Concepts",
	COLOR_SCHEME: "auto",
	LINK_PAGE_TO_MENTIONS: "paragraph",
	INCLUDE_LINKED_MENTIONS: "For empty pages only",
	INCLUDE_UNLINKED_MENTIONS: "For empty pages only",
	USE_OWN_UNLINKED_SEARCH: "no",
	DEFAULT_GRAPH_MODE: "graph",
	RELOADING_GRAPH: "manual",
	ADD_LINKS: "End of statement",
	EXPORT_TYPE: "manual",
	EXPORT_GRAPH: "from_obsidian_*",
	CONTEXT_NAME: "from_obsidian_ai",
	WHEN_USING_LOCATE: "Do not force to Edit Mode",
	// RELOAD_WHEN_TO_READING: true,

	// Mobile Only
	MOBILE_OPEN_GRAPH_IN: "New tab",
	INFRANODUS_API_URL: "https://infranodus.com",
	INFRANODUS_GRAPH_URL: "https://graph.infranodus.com",
};

const INTERNAL_SETTINGS: PluginInternalSettings = {
	INFRANODUS_API_URL: "https://infranodus.com",
	INFRANODUS_GRAPH_URL: "https://graph.infranodus.com",
};

export { INTERNAL_SETTINGS, SETTINGS };
export type {
	PluginSettings,
	PluginInternalSettings,
	GraphAndStatementProcessingType,
};
