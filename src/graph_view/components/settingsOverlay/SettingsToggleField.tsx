import type { SettingsFieldType } from "../GraphViewOverlaySettings";
import { assert } from "console";
import { ToggleButton } from "../../../components/ToggleButton";
import { useEffect, useState } from "react";
import { INTERNAL_SETTINGS } from "../../../settings";

import { Platform } from "obsidian";

const currentPlatform =
	Platform.isMobileApp || Platform.isMobile ? "mobile" : "desktop";

const SettingsToggleField = (params: SettingsFieldType) => {
	// defined only for desktop
	if (currentPlatform === "desktop") {
		assert(params.type === "text");
	}

	const [toggle, setToggle] = useState(!!params.value);
	useEffect(() => setToggle(!!params.value), [params.value]);

	return (
		<div className="flex flex-row justify-between">
			<span className="text-base font-semibold">{params.name}</span>
			<ToggleButton
				toggle={toggle}
				onClick={() => {
					if ((params as any).onChange) {
						(params as any).onChange?.(!toggle);
						// console.log("setting toggle as", !toggle);
					}
					setToggle(!toggle);
				}}
			/>
		</div>
	);
};

export { SettingsToggleField };
