import { App, PluginSettingTab, Setting, Platform } from "obsidian";
import InfraNodusPlugin from "src/main";
import { InfraNodus } from "src/infranodus";
import { INTERNAL_SETTINGS, SETTINGS } from ".";

const AI_MODELS_FALLBACK = ["gpt-5.4", "gpt-5.4-mini"];

const currentPlatform =
	Platform.isMobileApp || Platform.isMobile ? "mobile" : "desktop";

class InfraNodusSettingTab extends PluginSettingTab {
	plugin: InfraNodusPlugin;

	constructor(app: App, plugin: InfraNodusPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;
		// console.log("InfraNodusSettingTab", this.plugin, SETTINGS);

		const onChange = (async (key: string, value: string) => {
			// @ts-ignore:next-line
			// this.plugin.settings[key] = value;
			// console.log("onChange settings tab", key, value);

			await this.plugin.saveSettings({ [key]: value });
		}).bind(this);

		containerEl.empty();
		new Setting(containerEl)
			.setName("InfraNodus API key")
			.setDesc("Get your API key from InfraNodus > Subscription.")
			.addText((text) => {
				const key = "INFRANODUS_API_KEY";
				text.setPlaceholder("Enter key")
					.setValue(SETTINGS[key])
					.onChange(async (value) => onChange(key, value));
			});

		new Setting(containerEl)
			.setName("AI model")
			.setDesc("Choose the AI model to use.")
			.addDropdown((dropdown) => {
				const key = "AI_MODEL";
				const populate = (models: string[]) => {
					dropdown.selectEl.empty();
					const current = SETTINGS[key];
					const list =
						current && !models.includes(current)
							? [current, ...models]
							: models;
					list.forEach((m) => dropdown.addOption(m, m));
					dropdown.setValue(current);
				};
				populate(AI_MODELS_FALLBACK);
				dropdown.onChange(async (value) => onChange(key, value));
				InfraNodus.fetchAiModels().then(populate);
			});

		new Setting(containerEl)
			.setName("Link mentions to")
			.setDesc(
				"How to generate the links between the pages mentioned in your document."
			)
			.addDropdown((dropdown) => {
				const key = "LINK_PAGE_TO_MENTIONS";
				dropdown
					.addOption(
						"paragraph",
						"each other, if in the same paragraph (default)"
					)
					.addOption(
						"parent_and_paragraph",
						"to parent page and others in the same paragraph"
					)
					.addOption(
						"parent_only",
						"to parent page only (Obsidian style)"
					)
					.setValue(SETTINGS[key])
					.onChange(async (value) => onChange(key, value));
			});

		new Setting(containerEl)
			.setName("Single page processing")
			.setDesc(
				"Use [[wiki links]] and concepts for detailed results. Use [[wiki links]] only for sparser graphs."
			)
			.addDropdown((dropdown) => {
				const key = "SINGLE_PAGE_GRAPH_PROCESSING";
				dropdown
					.addOption(
						"[[Wiki Links]] and Concepts",
						"[[Wiki Links]] and Concepts"
					)
					.addOption("[[Wiki Links]] Only", "[[Wiki Links]] Only")
					.addOption(
						"[[Wiki Links]] Prioritized",
						"[[Wiki Links]] Prioritized"
					)
					.addOption("Concepts only", "Concepts Only")
					.setValue(SETTINGS[key])
					.onChange(async (value) => onChange(key, value));
			});

		new Setting(containerEl)
			.setName("Multi page processing")
			.setDesc(
				"Use [[wiki links]] only for big folders and vaults. Use [[wiki links]] and concepts for more detail."
			)
			.addDropdown((dropdown) => {
				const key = "MULTI_PAGE_GRAPH_PROCESSING";
				dropdown
					.addOption(
						"[[Wiki Links]] and Concepts",
						"[[Wiki Links]] and Concepts"
					)
					.addOption("[[Wiki Links]] Only", "[[Wiki Links]] Only")
					.addOption(
						"[[Wiki Links]] Prioritized",
						"[[Wiki Links]] Prioritized"
					)
					.addOption("Concepts only", "Concepts Only")
					.setValue(SETTINGS[key])
					.onChange(async (value) => onChange(key, value));
			});

		// color scheme
		new Setting(containerEl)
			.setName("Color scheme")
			.setDesc("Choose the color scheme to use.")
			.addDropdown((dropdown) => {
				const key = "COLOR_SCHEME";
				dropdown
					.addOption("auto", "Auto")
					.addOption("light", "Light")
					.addOption("dark", "Dark")
					.setValue(SETTINGS[key])
					.onChange(async (value) => onChange(key, value));
			});

		// Linked & Unlinked mentions
		new Setting(containerEl)
			.setName("Include linked mentions")
			.setDesc(
				"Including linked mentions helps navigate between ideas better but may be too detailed."
			)
			.addDropdown((dropdown) => {
				const key = "INCLUDE_LINKED_MENTIONS";
				dropdown
					.addOption("For empty pages only", "For empty pages only")
					.addOption("For all pages", "For all pages")
					.addOption("Never", "Never")
					.setValue(SETTINGS[key])
					.onChange(async (value) => onChange(key, value));
			});

		new Setting(containerEl)
			.setName("Include unlinked mentions")
			.setDesc(
				"Including unlinked mentions helps discover new connections but can also be overwhelming."
			)
			.addDropdown((dropdown) => {
				const key = "INCLUDE_UNLINKED_MENTIONS";
				dropdown
					.addOption("For empty pages only", "For empty pages only")
					.addOption("For all pages", "For all pages")
					.addOption("Never", "Never")
					.setValue(SETTINGS[key])
					.onChange(async (value) => onChange(key, value));
			});

		// pattern matching for unlinked mentions
		new Setting(containerEl)
			.setName("Improve unlinked search")
			.setDesc("Use aggressive partial matching when searching.")
			.addDropdown((dropdown) => {
				const key = "USE_OWN_UNLINKED_SEARCH";
				dropdown
					.addOption("no", "No")
					.addOption("yes", "Yes")
					.setValue(SETTINGS[key])
					.onChange(async (value) => onChange(key, value));
			});

		new Setting(containerEl)
			.setName("Updating graph")
			.setDesc(
				"Set manual if you want the graph to reload only when you click the reload button."
			)
			.addDropdown((dropdown) => {
				const key = "RELOADING_GRAPH";
				dropdown
					.addOption("automatic", "Automatic (on page view)")
					.addOption("manual", "Manual (button)")
					.addOption("into reading", "Entering reading mode")
					.setValue(SETTINGS[key])
					.onChange(async (value) => onChange(key, value));
			});

		// default graph mode
		new Setting(containerEl)
			.setName("Default graph layer")
			.setDesc(
				"The default layer the graph should open on when loading the first time."
			)
			.addDropdown((dropdown) => {
				const key = "DEFAULT_GRAPH_MODE";
				dropdown
					.addOption("graph", "Graph")
					.addOption("topics", "Topics")
					.addOption("concepts", "Concepts")
					.addOption("gaps", "Gaps")
					.addOption("trends", "Trends")
					.setValue(SETTINGS[key])
					.onChange(async (value) => onChange(key, value));
			});

		// new Setting(containerEl)
		// 	.setName("Add links")
		// 	.setDesc("Choose where to add generated links.")
		// 	.addDropdown((dropdown) => {
		// 		const key = "ADD_LINKS";
		// 		dropdown
		// 			.addOption("End of statement", "End of statement")
		// 			.addOption("Lemmatization", "Lemmatization")
		// 			.addOption("Only exact words", "Only exact words")
		// 			.setValue(SETTINGS[key])
		// 			.onChange(async (value) => onChange(key, value));
		// 	});

		new Setting(containerEl)
			.setName("Export type")
			.setDesc(
				"Use manual export for more control. Automatic export works with big files."
			)
			.addDropdown((dropdown) => {
				const key = "EXPORT_TYPE";
				dropdown
					.addOption("manual", "Copy and paste (manual)")
					.addOption("auto", "Automatic")
					.setValue(SETTINGS[key])
					.onChange(async (value) => onChange(key, value));
			});

		new Setting(containerEl)
			.setName("Export to graph name")
			.setDesc(
				"Name of the graph to export data to, add * for page name, ** for vault name."
			)
			.addText((text) => {
				const key = "EXPORT_GRAPH";
				text.setPlaceholder("Enter context name")
					.setValue(SETTINGS[key])
					.onChange(async (value) => onChange(key, value));
			});

		new Setting(containerEl)
			.setName("Export AI insights to graph name")
			.setDesc(
				"Name of the graph where AI insights are saved, add * for page name, ** for vault name."
			)
			.addText((text) => {
				const key = "CONTEXT_NAME";
				text.setPlaceholder("Enter context name")
					.setValue(SETTINGS[key])
					.onChange(async (value) => onChange(key, value));
			});

		new Setting(containerEl)
			.setName("When using locate")
			.setDesc("Note: Locating works better in the Edit mode.")
			.addDropdown((dropdown) => {
				const key = "WHEN_USING_LOCATE";
				dropdown
					.addOption(
						"Do not force to Edit Mode",
						"Do not force to Edit Mode"
					)
					.addOption("Force to Edit Mode", "Force to Edit Mode")
					.setValue(SETTINGS[key])
					.onChange(async (value) => onChange(key, value));
			});

		// new Setting(containerEl)
		// 	.setName("Reload when into reading view")
		// 	.setDesc(
		// 		"Reload the graph when the reading mode is toggled from the editor."
		// 	)
		// 	.addToggle((toggle) => {
		// 		const key = "RELOAD_WHEN_TO_READING";
		// 		toggle
		// 			.setValue(SETTINGS[key])
		// 			.onChange(async (value) => onChange(key, value));
		// 	});

		if (currentPlatform === "mobile") {
			new Setting(containerEl)
				.setName("Open mobile graph in")
				.setDesc("Choose where to open the graph on mobile.")
				.addDropdown((dropdown) => {
					const key = "MOBILE_OPEN_GRAPH_IN";
					dropdown
						.addOption("Side view", "Side view")
						.addOption("New tab", "New tab")
						.setValue(SETTINGS[key])
						.onChange(async (value) => onChange(key, value));
				});
		}

		new Setting(containerEl)
			.setName("InfraNodus API URL")
			.setDesc(
				"Developer mode. InfraNodus.Com is a default value, do not change."
			)
			.addDropdown((dropdown) => {
				const key = "INFRANODUS_API_URL";
				dropdown
					.addOption(
						"https://infranodus.com",
						"https://infranodus.com"
					)
					.addOption("http://localhost:3000", "http://localhost:3000")
					.setValue(SETTINGS[key])
					.onChange(async (value) => onChange(key, value));
			});

		new Setting(containerEl)
			.setName("InfraNodus Graph URL")
			.setDesc(
				"Developer mode. The default value is graph.infranodus.com, do not change."
			)
			.addDropdown((dropdown) => {
				const key = "INFRANODUS_GRAPH_URL";
				dropdown
					.addOption(
						"https://graph.infranodus.com",
						"https://graph.infranodus.com"
					)
					.addOption(
						"https://localhost:5173",
						"https://localhost:5173"
					)
					.addOption(
						"https://localhost:4173",
						"https://localhost:4173"
					)
					.setValue(SETTINGS[key])
					.onChange(async (value) => onChange(key, value));
			});
	}
}

export { InfraNodusSettingTab };
