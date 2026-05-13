import { XCircleIcon } from "@primer/octicons-react";
import { IconButton } from "src/components/IconButton";
import { useEffect, useRef, useState } from "react";
import { saveSettings } from "../lib/saveSettings";
import { INTERNAL_SETTINGS, SETTINGS } from "src/settings";
import { InfraNodusSettingTab } from "src/settings/settingsTab";
import { InfraNodus } from "src/infranodus";
import { SettingsTextField } from "./settingsOverlay/SettingsTextField";
import { SettingsDropdownField } from "./settingsOverlay/SettingsDropdownField";
import { SettingsToggleField } from "./settingsOverlay/SettingsToggleField";
import * as React from "react";
import { Notice, Platform } from "obsidian";
import { PluginGraphContext } from "../types";

const AI_MODELS_FALLBACK = ["gpt-5.4", "gpt-5.4-mini"];

interface SettingsFieldType {
	name: string;
	key?: string;
	description?: string;
	value: string;
	link?: string;
	onChange?: (value: string) => void;
	type: "text" | "dropdown" | "toggle";
	dropdownOptions?: { value: string; label: string }[];
	note?: string;
	noteTriggers?: string[];
}

const graphProcessingDropdownOptions = [
	{
		value: "[[Wiki Links]] and Concepts",
		label: "[[Wiki Links]] and Concepts",
	},
	{
		value: "[[Wiki Links]] Only",
		label: "[[Wiki Links]] Only",
	},
	{
		value: "[[Wiki Links]] Prioritized",
		label: "[[Wiki Links]] Prioritized",
	},
	{ value: "Concepts only", label: "Concepts Only" },
];

const currentPlatform =
	Platform.isMobileApp || Platform.isMobile ? "mobile" : "desktop";

const GraphViewOverlaySettings = (params: {
	graphContext: PluginGraphContext;
	closeSettings: () => void;
	isFolder: boolean;
	reloadGraph: () => Promise<void>;
}) => {
	const [savingSettings, setSavingSettings] = useState(false);
	const [settingsFields, setSettingsFields] = useState<SettingsFieldType[]>([
		{
			name: "API Key",
			key: "INFRANODUS_API_KEY",
			link: `${SETTINGS.INFRANODUS_API_URL}/subscription`,
			description: "Get your API key from InfraNodus > Subscription",
			value: "",
			type: "text",
		},
		{
			name: "AI Model",
			key: "AI_MODEL",
			description: "Choose the AI model to use.",
			value: "",
			type: "dropdown",
			dropdownOptions: AI_MODELS_FALLBACK.map((m) => ({
				value: m,
				label: m,
			})),
		},
		params.isFolder
			? {
					name: "Multi Page Processing",
					key: "MULTI_PAGE_GRAPH_PROCESSING",
					description:
						"What method of processing to use for multi page graphs.",
					value: "",
					type: "dropdown",
					dropdownOptions: graphProcessingDropdownOptions,
					note: "Note, that it may take a long time to process both page links and concepts for multiple documents. We recommend to use it on smaller subsets of pages",
					noteTriggers: [
						"[[Wiki Links]] and Concepts",
						"Concepts only",
					],
			  }
			: {
					name: "Single Page Processing",
					key: "SINGLE_PAGE_GRAPH_PROCESSING",
					description:
						"What method of processing to use for single page graphs.",
					value: "",
					type: "dropdown",
					note: "Note, that in case you prioritize the display of [[wiki links]], we won't show the [[ ]] syntax in the graph.",
					noteTriggers: [
						"[[Wiki Links]] Only",
						"[[Wiki Links]] Prioritized",
					],
					dropdownOptions: graphProcessingDropdownOptions,
			  },
		{
			name: "Color Scheme",
			key: "COLOR_SCHEME",
			description: "Choose the color scheme to use.",
			value: "",
			type: "dropdown",
			dropdownOptions: [
				{ value: "light", label: "Light" },
				{ value: "dark", label: "Dark" },
				{ value: "auto", label: "Auto" },
			],
		},
		{
			name: "Link mentions to",
			key: "LINK_PAGE_TO_MENTIONS",
			description:
				"How to generate the links between the pages mentioned in your document.",
			value: "",
			type: "dropdown",
			dropdownOptions: [
				{
					value: "paragraph",
					label: "each other if in the same paragraph (default)",
				},
				{
					value: "parent_and_paragraph",
					label: "to parent page and if in the same paragraph",
				},
				{
					value: "parent_only",
					label: "to parent page only (Obsidian style)",
				},
			],
			note: "By default, we link mentions that are mentioned in the same paragraph to emphasize the context. You can also choose standard Obsidian or mixed behavior.",
			noteTriggers: ["paragraph"],
		},
		{
			name: "Include Linked Mentions",
			key: "INCLUDE_LINKED_MENTIONS",
			description: "Choose when to include linked mentions.",
			value: "",
			type: "dropdown",
			dropdownOptions: [
				{
					value: "For empty pages only",
					label: "For empty pages only",
				},
				{ value: "For all pages", label: "For all pages" },
				{ value: "Never", label: "Never" },
			],
		},
		{
			name: "Include Unlinked Mentions",
			key: "INCLUDE_UNLINKED_MENTIONS",
			description: "Choose when to include unlinked mentions.",
			value: "",
			type: "dropdown",
			dropdownOptions: [
				{
					value: "For empty pages only",
					label: "For empty pages only",
				},
				{ value: "For all pages", label: "For all pages" },
				{ value: "Never", label: "Never" },
			],
		},
		{
			name: "Improve unlinked search",
			key: "USE_OWN_UNLINKED_SEARCH",
			description:
				"Count a text match to a page's name as an unlinked mention.",
			value: "",
			type: "dropdown",
			dropdownOptions: [
				{ value: "no", label: "No" },
				{ value: "yes", label: "Yes" },
			],
			note: "We will use a more aggressive algorithm of finding related mentions that includes partial matches.",
			noteTriggers: ["yes"],
		},
		{
			name: "Reloading Graph",
			key: "RELOADING_GRAPH",
			description: "Choose how to reload the graph.",
			value: "",
			type: "dropdown",
			dropdownOptions: [
				{ value: "automatic", label: "Automatic" },
				{ value: "manual", label: "Manual (button)" },
				{ value: "into reading", label: "Entering reading mode" },
			],
		},
		// {
		// 	name: "Add Links",
		// 	key: "ADD_LINKS",
		// 	description: "Choose where to add generated links.",
		// 	value: "",
		// 	type: "dropdown",
		// 	dropdownOptions: [
		// 		{ value: "End of statement", label: "End of statement" },
		// 		{ value: "Lemmatization", label: "Lemmatization" },
		// 		{ value: "Only exact words", label: "Only exact words" },
		// 	],
		// 	note: "Lemmatization alters the existing text to make it more suitable for linking.",
		// 	noteTriggers: ["Lemmatization"],
		// },
		{
			name: "Default Graph Layer Shown",
			key: "DEFAULT_GRAPH_MODE",
			description: "What should be the default graph view shown.",
			value: "",
			type: "dropdown",
			dropdownOptions: [
				{ value: "graph", label: "Graph" },
				{ value: "topics", label: "Topics" },
				{ value: "concepts", label: "Concepts" },
				{ value: "gaps", label: "Gaps" },
				{ value: "trends", label: "Trends" },
			],
		},
		{
			name: "InfraNodus Data Export",
			key: "EXPORT_TYPE",
			description: "How should we export your data",
			value: "",
			type: "dropdown",
			dropdownOptions: [
				{ value: "manual", label: "Copy and paste (manual)" },
				{ value: "auto", label: "Automatic" },
			],
			note: "More control with manual export, but doesn't work for big files.",
			noteTriggers: ["manual", "auto"],
		},
		{
			name: "Export Graph Name Prefix",
			key: "EXPORT_GRAPH",
			description:
				"What graph in InfraNodus should we export your text data to",
			value: "",
			type: "text",
			note: "This is the name of the graph where text data are saved. Add * for the page name, ** for the vault name.",
		},
		{
			name: "Save AI Insights to Graph Name",
			key: "CONTEXT_NAME",
			description:
				"What graph in InfraNodus should we export your AI insights to",
			value: "",
			type: "text",
			note: "This is the name of the graph where AI insights are saved. Add * for the page name, ** for the vault name.",
		},
		{
			name: "When Using Locate",
			key: "WHEN_USING_LOCATE",
			description: "Choose what to do when using the locate feature.",
			value: "",
			type: "dropdown",
			dropdownOptions: [
				{
					value: "Do not force to Edit Mode",
					label: "Do not force to Edit Mode",
				},
				{
					value: "Force to Edit Mode",
					label: "Force to Edit Mode",
				},
			],
			note: "Note: Locating works better in the Edit mode",
			noteTriggers: ["Do not force to Edit Mode"],
		},
		// {
		// 	name: "Reload When Into Reading View",
		// 	key: "RELOAD_WHEN_TO_READING",
		// 	description:
		// 		"Reload the graph when the reading mode is toggled from the editor.",
		// 	value: "",
		// 	type: "toggle",
		// },
	]);

	useEffect(() => {
		if (currentPlatform === "mobile") {
			settingsFields.push({
				name: "Open Mobile Graph In",
				key: "MOBILE_OPEN_GRAPH_IN",
				description: "Choose where to open the graph on mobile.",
				value: "",
				type: "dropdown",
				dropdownOptions: [
					{ value: "Side view", label: "Side view" },
					{ value: "New tab", label: "New tab" },
				],
			});
		}

		for (const field of settingsFields) {
			// @ts-ignore:next-line
			const settingsVal = SETTINGS[field.key] as any;
			if (settingsVal) field.value = settingsVal;
		}

		setSettingsFields([...settingsFields]);

		InfraNodus.fetchAiModels().then((models) => {
			setSettingsFields((prev) =>
				prev.map((field) =>
					field.key === "AI_MODEL"
						? {
								...field,
								dropdownOptions: models.map((m) => ({
									value: m,
									label: m,
								})),
						  }
						: field
				)
			);
		});
	}, []);

	async function saveLocalSettings() {
		if (savingSettings) return;
		setSavingSettings(true);
		try {
			const settings: { [key: string]: string } = {};
			for (const field of settingsFields) {
				if (!field.key) continue;
				settings[field.key] = field.value;
			}

			await saveSettings(settings);
			await params.reloadGraph();
		} catch (err) {
			console.error("Error saving settings", err.message, err);
			new Notice("Error saving settings. Please try again.");
			new Notice(err.message, 20000);
		}
		setSavingSettings(false);
	}

	async function setIndividualField(param: SettingsFieldType) {
		for (const field of settingsFields) {
			if (field.key !== param.key) continue;
			field.value = param.value;
		}
		setSettingsFields([...settingsFields]);
	}

	const maxHeight = `${window.innerHeight - 200}px`;

	return (
		<div
			className={`${
				currentPlatform == "desktop" ? "p-4" : "p-2"
			} absolute z-10 min-h-44  overflow-y-auto flex flex-col gap-2 items-stretch text-black dark:text-white bg-gray-300 dark:bg-gray-800 rounded text-base  ${
				currentPlatform === "desktop"
					? "bottom-3 right-0 max-w-[450px] w-auto @[470px]/main:w-full @[470px]/main:right-3 left-0 @[470px]/main:left-auto"
					: "bottom-0 right-0"
			}`}
			style={{
				maxHeight: `${maxHeight}`,
				width:
					currentPlatform === "mobile"
						? Math.min(params.graphContext.maxWidth - 16, 450)
						: undefined,
			}}
		>
			<div className="flex flex-row justify-between">
				<div className="font-bold font-lg text-lg">
					InfraNodus Plugin Settings
				</div>
				<div className="cursor-pointer" onClick={params.closeSettings}>
					<XCircleIcon size={16} />
				</div>
			</div>
			<div className="my-1"></div>
			<div
				className="px-2 py-2 mt-auto text-lg ml-auto rounded cursor-pointer bg-gray-350 dark:bg-gray-700 whitespace-nowrap hover:bg-gray-400 dark:hover:bg-gray-600"
				onClick={() => saveLocalSettings()}
			>
				Save Settings
			</div>
			<div className="my-1"></div>
			<div className="flex flex-col gap-4">
				{settingsFields.map((field, index) => (
					<div key={field.key}>
						{field.type === "text" && (
							<SettingsTextField
								{...field}
								key=""
								onChange={(val) =>
									setIndividualField({
										...field,
										value: val,
									})
								}
							/>
						)}
						{field.type === "dropdown" && (
							<SettingsDropdownField
								{...field}
								key=""
								onChange={(val) =>
									setIndividualField({
										...field,
										value: val,
									})
								}
							/>
						)}
						{field.type === "toggle" && (
							<SettingsToggleField
								{...field}
								key=""
								onChange={(val) =>
									setIndividualField({
										...field,
										value: val,
									})
								}
							/>
						)}
					</div>
				))}
			</div>
		</div>
	);
};

export { GraphViewOverlaySettings };
export type { SettingsFieldType };
