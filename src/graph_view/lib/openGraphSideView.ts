import { App } from "obsidian";
import { INFRANODUS_GRAPH_BUTTON_ID, INFRANODUS_GRAPH_SIDE_VIEW_ID } from "..";

function graphContainerSidebarIsHidden() {
	const graphContainer = document.getElementById(
		INFRANODUS_GRAPH_SIDE_VIEW_ID,
	);
	if (!graphContainer) return false;
	const isHidden = graphContainer.offsetParent === null;
	return isHidden;
}
async function openGraphSideView(app: App) {
	const isHidden = graphContainerSidebarIsHidden();
	if (!isHidden) return; // console.log("Graph container is already open");

	const rightSplit = app.workspace.rightSplit;
	if (rightSplit.collapsed) rightSplit.expand();

	const stillHidden = graphContainerSidebarIsHidden();
	if (!stillHidden) return; //console.log("Graph container is already open");

	const headerElement = document.getElementById(INFRANODUS_GRAPH_BUTTON_ID);
	if (!headerElement) return; // console.log("Header element not found");
	headerElement.click();
	// console.log("Graph container sideview opened");
}

export { openGraphSideView, graphContainerSidebarIsHidden };
