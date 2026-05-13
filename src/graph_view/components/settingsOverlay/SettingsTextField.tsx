import { INTERNAL_SETTINGS } from "src/settings";
import type { SettingsFieldType } from "../GraphViewOverlaySettings";
import { assert } from "console";
import { Platform } from "obsidian";

const currentPlatform =
	Platform.isMobileApp || Platform.isMobile ? "mobile" : "desktop";

const SettingsTextField = (params: SettingsFieldType) => {
	// defined only for desktop
	if (currentPlatform === "desktop") {
		assert(params.type === "text");
	}
	// const [value, setValue] = useState(params.value);
	// useEffect(() => setValue(params.value), [params.value]);

	return (
		<div className="flex flex-row justify-between">
			<span className="text-base font-semibold">{params.name}</span>
			{params.link ? (
				<a className="text-base" href={params.link}>
					get it here
				</a>
			) : null}
			<input
				value={params.value}
				className="px-1 py-1 bg-transparent border-0 border-b-[1px] outline-none text-black dark:text-white"
				onChange={(e) => {
					if ((params as any).onChange) {
						(params as any).onChange?.(e.target.value);
					}
					// setValue(e.target.value);
				}}
				placeholder={params.description}
				style={{
					fontFamily:
						'-apple-system, BlinkMacSystemFont, Segoe UI, Helvetica, Arial, sans-serif, "Apple Color Emoji", "Segoe UI Emoji"',
				}}
			/>
		</div>
	);
};

export { SettingsTextField };
