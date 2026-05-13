# InfraNodus Plugin for Obsidian

[InfraNodus](https://infranodus.com) is an advanced visual text analysis tool with AI capabilities. It can be used to import and analyze any web content, PDF files, spreadsheets, and identify the main topics, ideas, and gaps between them. The built-in AI models from OpenAI, Claude, Google, and X will help generate new ideas, summaries, and research questions from the content.

This plugin visualizes the content of Obsidian vaults as a knowledge graph, retrieving the main topical clusters, most important ideas, and helping identify the gaps between them. The built-in AI can be used to generate new ideas and research questions from your Obsidian content. Only [InfraNodus](https://infranodus) account is needed, the OpenAI API key is not required.

## Setting up

- At the folder of the obsidian vault, go to `<obsidian-vault>/.obsidian/plugins`.
- Copy the entire codebase here (so now it would be `<obsidian-vault>/.obsidian/plugins/infranodus-obsidian`).
- Running `npm run dev` here would create a `main.js` file at the root, which obsidian uses (from `manifest.json`) to load the plugin.
- Any changes to the codebase would be automatically re-built, but the plugin itself needs to be "reloaded" (I do this by turning on and off the plugin from the Obsidian app)

## Notes

- When updating / adding a new setting, edit:
    - `src/settings/index.ts`: Adjust the `SETTINGS` variable
    - `src/settings/settingsTab`: The settings under "Community Plugins" in obsidian settings
    - `src/graph_view/components/GraphViewOverlaySettings`: Custom settings tab inside the graph view

## Publishing

1. First, run `npm build`

2. Then, copy generated files

```
manifest.json
package.json
main.js
styles.css
```

to the public repo: `/Users/dmt/Software/infranodus-obsidian-plugin`

3. Commit that repo with changes descriptions

4. In that new repo, check the latest tag. Increment:

```
git tag 0.9.6
```

5. Push the repo:

```
git push origin 0.9.6
```

6. Create new version release in the repo: `https://github.com/noduslabs/infranodus-obsidian-plugin/releases`
