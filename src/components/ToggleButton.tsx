const ToggleButton = (params: {
	toggle: boolean;
	onClick: () => void;
	color?: string;
}) => {
	return (
		<label className="flex items-center cursor-pointer">
			<div className="relative">
				<input
					type="checkbox"
					className="sr-only"
					checked={params.toggle}
					onChange={params.onClick}
				/>
				<div
					className={`block bg-gray-400 dark:bg-gray-600 w-8 h-5 rounded-full ${
						params.toggle ? "bg-green-400 dark:bg-green-400" : ""
					}`}
				></div>
				<div
					className={`dot absolute left-1 top-1 bg-white w-3 h-3 rounded-full transition ${
						params.toggle ? "translate-x-full" : ""
					}`}
				></div>
			</div>
		</label>
	);
};
export { ToggleButton };
