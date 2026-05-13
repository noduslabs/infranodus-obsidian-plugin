import { StatementsObject, TopicsObject } from "src/types/general";

interface InfraNodusExtractedGraphData {
	top_clusters: TopicsObject[];
	gaps_extracted: any[];
	all_statements_with_top: StatementsObject[];
	top_statements: StatementsObject[];
	all_relations: any[];
	statements_as_string: string;
	top_words: string[];
	dot_graph?: string;
	bigrams?: string[];
	dot_graph_clusters?: any;
}

export type { InfraNodusExtractedGraphData };
