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

## Automatic Release

A GitHub Actions workflow at `.github/workflows/release.yml` turns a pushed version tag into a fully built GitHub release — no manual upload of `main.js` / `styles.css` / `manifest.json` needed.

### What it does

When you push a tag matching `x.x.x` (e.g. `0.9.10`), the workflow:

1. Checks out the repo and installs dependencies (`npm ci`).
2. Builds the plugin (`npm run build`) to produce `main.js` and `styles.css`.
3. Reads `name` and `description` from `manifest.json`.
4. Creates a GitHub release with:
    - **Title:** `<plugin name> <version>` — e.g. `InfraNodus AI Graph View 0.9.10`
    - **Body:** the plugin description followed by auto-generated notes (commits / PRs since the previous tag).
    - **Assets:** `main.js`, `manifest.json`, `styles.css` attached for Obsidian to download.

It uses the built-in `GITHUB_TOKEN` — no secrets to configure.

### Release flow

After committing your changes:

```
# 0. Run the build
npm run build
```

```
# 1. Bump the version (updates manifest.json, package.json, versions.json via version-bump.mjs)
npm version 0.9.10

# 2. Tag and push
git tag 0.9.10
git push origin master
git push origin 0.9.10
```

The workflow runs on the tag push. Watch it at `https://github.com/noduslabs/infranodus-obsidian-plugin/actions`. When it finishes, the release appears at `https://github.com/noduslabs/infranodus-obsidian-plugin/releases`.

### Notes

- **Tag format must be `x.x.x`** (no `v` prefix). Obsidian's community-plugin pipeline expects the tag to match the `version` field in `manifest.json` exactly.
- A non-matching tag (e.g. `wip-2026-05-13`) is ignored by the workflow — useful for internal checkpoints that should not produce a release.
- If a release fails, fix the issue, delete the tag locally (`git tag -d 0.9.10`) and remotely (`git push --delete origin 0.9.10`), then re-tag and push.
