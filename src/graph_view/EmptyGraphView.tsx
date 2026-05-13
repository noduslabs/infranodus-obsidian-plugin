const EmptyGraphView = () => {
	const colorScheme = getColorScheme();
	return (
		<div
			id="graph-container-empty"
			className="bg-[#e6e7eb] dark:bg-[#0d1117] relative"
		>
			<div className="absolute inset-0 mt-8 z-10 flex flex-col items-center justify-center bg-black bg-opacity-50 top-8 dark:bg-white">
				<span
					className={`text-xl  dark:text-white p-4 ${
						colorScheme === "dark" ? "text-white" : "text-black"
					}`}
				>
					InfraNodus graph view: <br />
					<br />
					No file or data to refer to. Open a file and click the
					InfraNodus button or use the contextual menu on a file, a
					folder, search results, tags, or bookmarks.
				</span>
			</div>
		</div>
	);
};

function getColorScheme() {
	if (document.body.classList.contains("theme-dark")) {
		return "dark";
	}
	return "light";
}

export { EmptyGraphView };
