/** @type {import('tailwindcss').Config} */
module.exports = {
	darkMode: "selector",
	corePlugins: {
		preflight: false,
	},
	content: ["./src/**/*.{js,jsx,ts,tsx}"],
	theme: {
		extend: {
			fontSize: {
				xs: "10px", // 0.675rem
				sm: "12px", // 0.75rem
				base: "14px", // 0.85rem
				lg: "16px", // 1.1rem
				xl: "18px", // 1.2
			},
			colors: {
				"gray-350": "#b6bcc5",
			},
		},
	},
	plugins: [require("@tailwindcss/container-queries")], // prefix: 'infra-tw-',
	safelist: [{ pattern: /^bg-/ }], // /^infra-tw-bg-/
};
