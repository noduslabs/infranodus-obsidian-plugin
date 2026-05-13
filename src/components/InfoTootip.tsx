import * as React from "react";
import { ReactNode, useEffect, useRef } from "react";

interface InfoTooltipProps {
	text: string;
	direction?: "top" | "bottom" | "left" | "right";
	distance?: number;
	isAbsolute?: boolean;
	children: React.ReactElement;
}

const InfoTooltip = React.forwardRef<HTMLDivElement, InfoTooltipProps>(
	(
		{
			text,
			direction = "bottom",
			distance = 4,
			children,
			isAbsolute = false,
		},
		ref
	) => {
		const tooltipRef = useRef<HTMLElement | null>(null);
		const childRef = useRef<HTMLDivElement>(null);

		useEffect(() => {
			const div = document.createElement("div");
			div.style.position = "absolute";
			div.style.zIndex = "10";
			div.style.visibility = "hidden";
			div.style.padding = "0.5rem";
			div.style.fontSize = "0.75rem";
			div.style.color = "white";
			div.style.transitionProperty = "opacity";
			div.style.transitionDuration = "0.3s";
			div.style.backgroundColor = "rgba(0, 0, 0, 1)";
			div.style.borderRadius = "0.25rem";
			div.style.opacity = "0";
			div.style.maxWidth = "250px";

			div.innerHTML = text;
			document.body.appendChild(div);
			tooltipRef.current = div;
		}, [children]);

		useEffect(() => {
			const tooltip = tooltipRef.current;
			const child = childRef.current;
			if (!tooltip || !child) return;

			const firstChild = React.Children.toArray(
				children
			)[0] as React.ReactElement;
			const clonedChild = React.cloneElement(firstChild, {
				ref: childRef,
			});

			let timeout: NodeJS.Timeout | null = null;
			const handleMouseEnter = () => {
				timeout = setTimeout(() => {
					matchLocationWithDirection(
						child,
						tooltip,
						direction,
						distance
					);
					tooltip.style.visibility = "visible";
					tooltip.style.opacity = "1";
				}, 300);
			};
			const handleMouseLeave = () => {
				if (timeout) {
					clearTimeout(timeout);
					timeout = null;
				}
				tooltip.style.visibility = "hidden";
				tooltip.style.opacity = "0";
			};

			child.addEventListener("mouseenter", handleMouseEnter);
			child.addEventListener("mouseleave", handleMouseLeave);

			return () => {
				tooltip.remove();
				child.removeEventListener("mouseenter", handleMouseEnter);
				child.removeEventListener("mouseleave", handleMouseLeave);
			};
		}, [direction, distance, children]);

		const matchLocationWithDirection = (
			child: HTMLElement,
			tooltip: HTMLElement,
			direction: string,
			distance: number
		) => {
			const childRect = child.getBoundingClientRect();
			const tooltipRect = tooltip.getBoundingClientRect();

			switch (direction) {
				case "left":
					tooltip.style.left = `${
						childRect.left - tooltipRect.width - distance
					}px`;
					tooltip.style.top = `${
						childRect.top +
						childRect.height / 2 -
						tooltipRect.height / 2
					}px`;
					break;
				case "right":
					tooltip.style.left = `${childRect.right + distance}px`;
					tooltip.style.top = `${
						childRect.top +
						childRect.height / 2 -
						tooltipRect.height / 2
					}px`;
					break;
				case "top":
					tooltip.style.top = `${
						childRect.top - tooltipRect.height - distance
					}px`;
					tooltip.style.left = `${
						childRect.left - tooltipRect.width / 2
					}px`;
					break;
				case "bottom":
					tooltip.style.top = `${childRect.bottom + distance}px`;
					tooltip.style.left = `${
						childRect.left -
						(tooltipRect.width - childRect.width) / 2
					}px`;
					break;
				default:
					throw new Error("Invalid direction");
			}
		};

		return (
			// <div className="relative inline-block">
			// <>
			// 	<div ref={childRef}>{children}</div>
			// </>
			<>
				{isAbsolute ? (
					React.cloneElement(
						React.Children.toArray(
							children
						)[0] as React.ReactElement,
						{ ref: childRef }
					)
				) : (
					<div ref={childRef}>{children}</div>
				)}
			</>
			// </div>
		);
	}
);

export { InfoTooltip };
