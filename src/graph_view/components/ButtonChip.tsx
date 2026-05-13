const ButtonChip = (chip: {
	name?: string;
	icon: any;
	isClicked: boolean;
	onClick: () => void;
}) => {
	return (
		<div
			onClick={() => chip.onClick()}
			className={`${
				chip.isClicked
					? "bg-gray-400 dark:bg-gray-600"
					: "bg-gray-300 hover:bg-gray-400 dark:bg-gray-800 dark:hover:bg-gray-700"
			} whitespace-nowrap text-black dark:text-white text-[13px] px-2.5 py-0.5 font-semibold rounded cursor-pointer transition-colors flex flex-row gap-2 items-center h-7`}
		>
			<chip.icon size={16} />
			{chip.name && <span>{chip.name}</span>}
		</div>
	);
};

export { ButtonChip };
