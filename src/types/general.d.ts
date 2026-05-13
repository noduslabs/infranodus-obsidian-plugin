export interface TopicsObject {
	id: string;
	sortId: number;
	numberRatio: string;
	bcRatio: string;
	words: string[];
	aiName?: string;
	aiDescription?: string;
}

export interface StatementsObject {
	id: number;
	sortId: number;
	categories: string[];
	content: string;
	contextId: number;
	statementCommunities: string[];
	statementHashtags: string[];
	topStatementCommunity: string;
	topStatementOfCommunity?: string;
}

export interface SiteConfig {
	inputQuery: string[];
	sidebarContainerQuery: string[];
	appendContainerQuery: string[];
	stopwords?: string[] | undefined;
	divToAnalyze: string;
	watchRouteChange?: ((callback: () => void) => void) | undefined;
	siteName: string;
}

export type ViewType = "view_content" | "edit_content" | "graph_visualization";

export interface TextResponse {
	text: string;
}
