import { useState, useEffect } from "react";
import { LoadingState } from "../types";

const totalWeight = 10;
const stateMessages: Map<LoadingState, { texts: string[]; weight: number }> =
	new Map([
		["initializing", { texts: ["Initializing..."], weight: 1 }],
		[
			"getting-content",
			{
				weight: 2,
				texts: [
					"Getting content from file system...",
					"Extracting statements from content...",
				],
			},
		],
		[
			"generating-graph",
			{
				weight: 8,
				texts: [
					"Generating graph from content...",
					"Processing statements...",
					"Generating relations...",
				],
			},
		],
		[
			"waiting-iframe",
			{
				weight: 9.9,
				texts: ["Rendering graph..."],
			},
		],
	]);

function getMaxProgressOfLoadingState(loadingState: LoadingState) {
	const weight = stateMessages.get(loadingState)?.weight || 0;
	return weight * 10;
}

function getSpeedForProgressOnWeight(params: {
	loadingState: LoadingState;
	currentProgress: number;
	maxProgress: number;
}) {
	if (params.loadingState === "waiting-iframe") {
		return 3;
	}

	// Faster on start
	// Slower on end
	const progress = params.currentProgress / params.maxProgress;
	const speed = 1 - Math.pow(progress, 2);
	return speed;
}

const LoadingView = (params: { loadingState: LoadingState }) => {
	const [progress, setProgress] = useState(0);
	const [textIndex, setTextIndex] = useState(0);

	// Setting progress bar
	useEffect(() => {
		const progressInterval = setInterval(() => {
			const maxProgress = getMaxProgressOfLoadingState(
				params.loadingState
			);
			if (progress >= maxProgress) {
				clearInterval(progressInterval);
			} else {
				setProgress((prevProgress) => {
					const newProgress =
						prevProgress +
						getSpeedForProgressOnWeight({
							loadingState: params.loadingState,
							currentProgress: prevProgress,
							maxProgress,
						});
					// (params.loadingState === "waiting-iframe" ? 5 : 1);
					// waiting-iframe is the last step, and does not take long
					// therefore, we can increase the progress bar faster
					return Math.min(newProgress, maxProgress);
				});
			}
		}, 50);

		const progressTextInterval = setInterval(() => {
			setTextIndex((prevIndex) => {
				const texts =
					stateMessages.get(params.loadingState)?.texts || [];
				return (prevIndex + 1) % texts.length;
			});
		}, 3000);
		return () => {
			clearInterval(progressInterval);
			clearInterval(progressTextInterval);
		};
	}, [params.loadingState]);

	const currentTexts = stateMessages.get(params.loadingState)?.texts || [];
	const currentText = currentTexts[textIndex % currentTexts.length];

	return (
		<div className="absolute inset-0 z-[5] flex flex-col items-center justify-center dark:bg-black bg-opacity-50 bg-white">
			<span className="mb-4 text-lg text-gray-600 dark:text-gray-200 animate-pulse">
				Loading InfraNodus Graph...
			</span>
			<div className="w-64 h-4 overflow-hidden bg-gray-200 rounded-full">
				<div
					className="h-full transition-all duration-500 ease-out bg-blue-500"
					style={{ width: `${progress}%` }}
				></div>
			</div>
			<span className="h-6 mt-2 text-sm text-gray-500 dark:text-gray-400">
				{currentText}
			</span>
		</div>
	);
};

export { LoadingView };
