import { InfoIcon } from "@primer/octicons-react";
import type { SettingsFieldType } from "../GraphViewOverlaySettings";
import { assert } from "console";
import { INTERNAL_SETTINGS } from "src/settings";

import { Platform } from "obsidian";

const currentPlatform =
	Platform.isMobileApp || Platform.isMobile ? "mobile" : "desktop";

const SettingsDropdownField = (params: SettingsFieldType) => {
	// defined only for desktop
	if (currentPlatform === "desktop") {
		assert(params.type === "dropdown");
		assert(params.dropdownOptions);
	}

	return (
		<div className="flex flex-col items-start w-full gap-1">
			<div className="flex flex-row justify-between w-full">
				<div className="flex flex-row items-center gap-1">
					<span className="text-base font-semibold">
						{params.name}
					</span>
				</div>
				<select
					className="px-1.5 py-1 bg-gray-350 dark:bg-gray-700 rounded outline-none h-min text-black dark:text-white"
					onChange={(e) => {
						if (!params.onChange) return;
						params.onChange(e.target.value);
					}}
					style={{
						fontFamily:
							'-apple-system, BlinkMacSystemFont, Segoe UI, Helvetica, Arial, sans-serif, "Apple Color Emoji", "Segoe UI Emoji"',
					}}
					value={params.value}
				>
					{params.dropdownOptions!.map((option) => (
						<option key={option.label} value={option.value}>
							{option.label}
						</option>
					))}
				</select>
			</div>
			{params.note &&
				params.noteTriggers &&
				params.noteTriggers.contains(params.value) && (
					<span className="text-sm">{params.note}</span>
				)}
		</div>
	);
};

export { SettingsDropdownField };
