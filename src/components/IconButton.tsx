import { Icon } from "@primer/octicons-react";
import * as React from "react";

interface IconButtonProps {
	icon: Icon;
	onClick: () => void;
	isClicked?: boolean;
	className?: string;
	label?: string;
	width?: number;
}

const IconButton = React.forwardRef<HTMLDivElement, IconButtonProps>(
	(props, ref) => {
		return (
			<div
				ref={ref}
				className={`${
					props.width ? `w-${props.width}` : ""
				} flex flex-row items-center justify-end p-2 transition-colors bg-gray-300 rounded cursor-pointer dark:bg-gray-800 hover:bg-gray-350 dark:hover:bg-gray-700`}
				onClick={() => props.onClick()}
			>
				<span className="flex flex-row items-center justify-end text-black dark:text-white">
					<props.icon
						size={16}
						className={`${props.className ? props.className : ""}`}
					/>
					{props.label && (
						<span className="ml-2 text-sm">{props.label}</span>
					)}
				</span>
			</div>
		);
	}
);

export { IconButton };
