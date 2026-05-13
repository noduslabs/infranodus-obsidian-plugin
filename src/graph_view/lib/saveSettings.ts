import { Notice } from "obsidian";
import InfraNodusPlugin from "src/main";

const EVENT_SETTINGS_SAVED = "infranodusCustomSettingsSaved";
const EVENT_SAVE_SETTINGS = "infranodusCustomSaveSettings";

async function saveSettings(settings: any): Promise<void> {
	let resolved = false;
	try {
		return new Promise((resolve, reject) => {
			// error if it takes over 1 second
			setTimeout(() => {
				if (resolved) return;
				console.error("[TIMEOUT] for saving settings");
				reject(new Error("Timeout error on saving data"));
				document.removeEventListener(
					EVENT_SETTINGS_SAVED,
					onSettingsSaved
				);
			}, 1000);

			const onSettingsSaved = (event: Event) => {
				// console.log(`4. Listen to "${EVENT_SETTINGS_SAVED}" event`);
				resolve();
				resolved = true;
				document.removeEventListener(
					EVENT_SETTINGS_SAVED,
					onSettingsSaved
				);
				new Notice("Settings saved");
			};

			document.addEventListener(EVENT_SETTINGS_SAVED, onSettingsSaved);

			// console.log(
			// 	`1. Dispatch "${EVENT_SAVE_SETTINGS}" event with settings:`,
			// 	settings
			// );
			const dispatchedStatus = document.dispatchEvent(
				new CustomEvent(EVENT_SAVE_SETTINGS, {
					detail: settings,
				})
			);
		});
	} catch (err) {
		console.log("Error when saving settings", err);
		// await InfraNodusPlugin.saveSettings(settings);
	}
}

export { saveSettings, EVENT_SAVE_SETTINGS, EVENT_SETTINGS_SAVED };
