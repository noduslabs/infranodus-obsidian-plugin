async function copyToClipboard(params: { text: string }) {
	try {
		await navigator.clipboard.writeText(params.text);
	} catch (err) {
		console.error(
			"Failed to copy: ",
			err.message || err,
			"for text: ",
			params.text
		);
	}
}

export { copyToClipboard };
