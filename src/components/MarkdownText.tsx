import { useMemo } from "react";
import { marked } from "marked";
import DOMPurify from "dompurify";

interface MarkdownTextProps {
	text: string;
	className?: string;
	onClick?: (e: React.MouseEvent<HTMLDivElement>) => void;
}

const MarkdownText = ({ text, className, onClick }: MarkdownTextProps) => {
	const html = useMemo(() => {
		if (!text) return "";
		const raw = marked.parse(text, {
			breaks: true,
			gfm: true,
		}) as string;
		return DOMPurify.sanitize(raw, {
			ADD_ATTR: ["target", "rel"],
		});
	}, [text]);

	return (
		<div
			className={`infranodus-markdown ${className ?? ""}`}
			onClick={onClick}
			dangerouslySetInnerHTML={{ __html: html }}
		/>
	);
};

export { MarkdownText };
