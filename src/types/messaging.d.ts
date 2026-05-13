export interface AnswerAi {
	text: string;
	messageId: string;
	conversationId: string;
}

export interface AnswerInfraNodus {
	text: string;
}

export interface AnswerInfraNodusTopics {
	entriesAndGraphOfContext: {
		graph: {
			graphologyGraph: {
				attributes: {
					top_nodes: any[];
					top_clusters: any[];
					gaps: any[];
					modularity: number;
					nodes_to_statements_map: object;
				};
				nodes: any[];
				edges: any[];
				options: object;
			};
			statementHashtags: object;
		};
		statements: any[];
	};
	error?: string;
}

export interface AnswerInfraNodusAdvice {
	id: string;
	object: string;
	created: any;
	model: string;
	choices: any[];
	error?: string;
}
