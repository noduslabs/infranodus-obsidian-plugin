// =====================================================================================
// ====================== ELEMENT ATTRIBUTES ===========================================
// =====================================================================================
const attributeElementsFunctionMap = new Map<
	HTMLElement,
	(mutation: MutationRecord) => void
>();

const attributeObserver = new MutationObserver((mutations) => {
	for (const mutation of mutations) {
		if (!mutation.target) {
			attributeObserver.disconnect();
			attributeElementsFunctionMap.delete(mutation.target as HTMLElement);
		}
		if (mutation.type !== "attributes") continue;
		if (attributeElementsFunctionMap.has(mutation.target as HTMLElement)) {
			attributeElementsFunctionMap.get(mutation.target as HTMLElement)?.(
				mutation
			);
		}
	}
});

function unObserveElementAttributes(element: HTMLElement | HTMLElement[]) {
	if (Array.isArray(element)) {
		for (const el of element) {
			attributeElementsFunctionMap.delete(el);
		}
	} else {
		attributeElementsFunctionMap.delete(element);
	}
}

function observerElementAttributes(params: {
	element: HTMLElement;
	onAttributeChange: (mutation: MutationRecord) => void;
}) {
	if (attributeElementsFunctionMap.has(params.element)) {
		// console.log("InfraNodus: Element already observed", params.element);
	}
	attributeElementsFunctionMap.set(params.element, params.onAttributeChange);
	attributeObserver.observe(params.element, { attributes: true });
}

// =====================================================================================
// ====================== ELEMENT VISIBILITY ===========================================
// =====================================================================================
const visibilityElementsFunctionMap = new Map<
	HTMLElement,
	(visible: boolean) => void
>();

const visibilityObserver = new IntersectionObserver((entries) => {
	for (const entry of entries) {
		visibilityElementsFunctionMap.get(entry.target as HTMLElement)?.(
			entry.isIntersecting
		);
	}
});

function unObserveElementVisibility(element: HTMLElement | HTMLElement[]) {
	if (Array.isArray(element)) {
		for (const el of element) {
			visibilityElementsFunctionMap.delete(el);
		}
	} else {
		visibilityElementsFunctionMap.delete(element);
	}
}

function observerElementVisibility(params: {
	element: HTMLElement;
	onVisibilityChange: (visible: boolean) => void;
}) {
	if (visibilityElementsFunctionMap.has(params.element)) {
		// console.log("InfraNodus: Element already observed", params.element);
	}

	visibilityElementsFunctionMap.set(
		params.element,
		params.onVisibilityChange
	);
	visibilityObserver.observe(params.element);
}

// =====================================================================================
// ====================== GENERAL =====================================================
// =====================================================================================
function unObserveAll() {
	attributeObserver.disconnect();
	attributeElementsFunctionMap.clear();

	visibilityObserver.disconnect();
	visibilityElementsFunctionMap.clear();
}

export {
	observerElementAttributes,
	unObserveElementAttributes,
	observerElementVisibility,
	unObserveElementVisibility,
	unObserveAll,
};
