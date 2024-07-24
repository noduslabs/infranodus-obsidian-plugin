# InfraNodus Plugin for Obsidian

[InfraNodus](https://infranodus.com) is an advanced visual text analysis tool with AI capabilities. It can be used to import and analyze any web content, PDF files, spreadsheets, and identify the main topics, ideas, and gaps between them. The built-in GPT-4 AI will help connect ideas, generate summaries and research questions from the content.

This plugin visualizes the content of Obsidian vaults as a knowledge graph, retrieving the main topical clusters, most important ideas, and helping identify the gaps between them. The built-in AI can be used to generate new ideas and research questions from your Obsidian content. Only [InfraNodus](https://infranodus.com) account is needed, OpenAI API GPT-4 use is included with InfraNodus account.

## Installation Instructions

- Activate the Community Plugins for your Obsidian Vault (Obsidian > Settings > Community Plugins > Activate Community Plugins).

- Install the InfraNodus 3D Graph View plugin.

- Activate the InfraNodus plugin and go to its settings (Obsidian > Settings > Community Plugins > InfraNodus > Settings).

- Add your InfraNodus API key in the plugin's settings. It which can be found on [https://infranodus.com/subscription](https://infranodus.com/subscription) and you will need an InfraNodus account for that. If you don't have one, you can get a free trial and also use the special code for Obsidian users INFRANODUSOBSIDIAN2024 to get a lifetime 50% discont.

## User's Manual

The best use case for the plugin is to get an overview of the connections between your ideas and to find the gaps between different topics. Here's how you can do that:

- Open your Obsidian vault on any page.

- Click the InfraNodus Graph button (available at the top menu, left menu, and sidebar menu). You can also activate the plugin for any folder: just right-click on it and choose "InfraNodus graph".

- InfraNodus will open a graph visualization of the page's content. The words and the [[wikilinks]] that you use are the nodes and their co-occurrences are the connections between them. Based on network science metrics, the nodes will be ranged by their importance (betweenness centrality) and aligned into groups (topical clusters), which will have the same color. Based on this representation, you can see what are the **most important** ideas and what **topical clusters** exist in your document.

- To learn more about the science behind the tool, please, check the [InfraNodus - How it Works](https://infranodus.com/about/how-it-works) page as well as the the peer-reviewed [InfraNodus Whitepaper](https://dl.acm.org/doi/10.1145/3308558.3314123).

- Use the graph visualization to get an overview of what the text is about and see if anything is missing.

- Click on the "Topics" to see the main topics present in the document. You can use the built-in GPT-4 AI to generate a summary of the document in "Topics" > "Summary".

- Click on the terms that seem relevant to you and then click on the "Concepts" > "Context" button to see the context where these terms appear in the document (the actual statement). You can also navigate directly to that statement in Obsidian and visualize a new graph of the document where the statement is contained.

- Most interesting feature: click on the "Gaps" and see the blind holes identified in your content. These are the clusters of ideas that could be better connected. Use the built-in AI to generate interesting research questions that will help you develop the ideas in your notes further.

- Remove the top nodes from the graph (select > hide) to reveal underlying ideas and latent topics that are not visible on the surface.

- Reiterate.

- If you find a concept or topic you like, you can also use InfraNodus to **navigate** to that page. Just click the node in the graph and then click the arrow above to proceed to that page.

- Feel free to export the most interesting excerpts and AI-generated ideas to InfraNodus for later reference and analysis.

## Data Privacy

We do not save any data you send to InfraNodus servers via the Obsidian plugin to keep your privacy intact — not even in the logs. Our servers simply convert your text into a JSON graph and send it back to the plugin for visualization.

When you use some of the parts of the graph to generate AI content, we only send the underlying graph structure and some of the statements that relate to the parts of the graph you selected (not your whole document) to the OpenAI's API in order to get a response. OpenAI's terms of use state that they do not use data received via API for training their model.

While the plugin is in the beta stage we collect data about the features of the extension you use, so we can improve this plugin for you. We do not collect any information from your Obsidian vault.

## More Information

You can learn more about InfraNodus on [www.infranodus.com](https://infranodus.com).

Also, please, check our support portal on [https://support.noduslabs.com](https://support.noduslabs.com) where you can learn more about the various use cases and also contact us directly or via our [Discord channel](https://discord.gg/v4BWAvTfB9).

We also invite you to subscribe to the [Nodus Labs YouTube channel](https://youtube.com/@noduslabs) where you can learn more about the various exciting use cases for the plugin.

## Legal Information

This plugin was developed by Nodus Labs (Ways Ltd in UK). You can find full information about our company and contact detailed on our website [www.noduslabs.com](https://noduslabs.com).
