function arraysAreEqual(array1: any[], array2: any[]): boolean {
	return (
		array1.length === array2.length &&
		array1.every((value, index) => value === array2[index])
	);
}

function extractIndexToUse({direction, currentElementNumber, arrayLength} : {
	direction: 'next' | 'back' | 'gap';
	currentElementNumber: number;
	arrayLength: number;
}) {
		const overshootFront = (direction == 'next' || direction == 'gap') && currentElementNumber == arrayLength;
		const overshootBack = direction == 'back' && currentElementNumber == 1

		const elementToShow = 	currentElementNumber == 0 || overshootFront ? 1 : 
								overshootBack ? arrayLength :
								direction == 'back' ? currentElementNumber - 1 :
								currentElementNumber + 1;	

		const indexToUse = elementToShow - 1;

		return indexToUse
}

export { arraysAreEqual, extractIndexToUse };
