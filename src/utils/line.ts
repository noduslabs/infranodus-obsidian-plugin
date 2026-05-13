function getPureTextFromMarkdown(markdown: string): string {
	let text = markdown.replace(/^#+\s*/gm, ""); // headings
	text = text.replace(/^[-*+]\s*/gm, ""); // bullet points
	text = text.replace(/^(\d+\.)\s*/gm, ""); // numbered lists
	text = text.replace(/\*\*|__/g, ""); // bold
	text = text.replace(/\*|_/g, ""); // italic
	text = text.replace(/\[([^\]]+)\]\([^)]+\)/g, "$1"); // links
	text = text.replace(/!\[[^\]]*\]\([^)]+\)/g, ""); // images
	text = text.trim();
	return text;
}

export { getPureTextFromMarkdown };
