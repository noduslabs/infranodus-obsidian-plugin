function createSidebarHeader(name: string, onClick: () => void) {
	// const parent = document.getElementsByClassName(
	// 	"workspace-tab-header-container-inner"
	// )[0] as HTMLElement;
	// const workspacesContainer = parent.childNodes[0] as HTMLElement;
	// // const workspacesContainer = document.getElementsByClassName(
	// // 	"workspace-tab-header-container-inner"
	// // )?.[0] as HTMLElement;
	// console.log(workspacesContainer);
	// const workspace = workspacesContainer.childNodes[0].cloneNode(
	// 	true
	// ) as HTMLElement;
	// workspace.setAttribute("aria-label", "InfraNodus Graph");
	// const titleElement = workspace.getElementsByClassName(
	// 	"workspace-tab-header-inner-title"
	// )?.[0] as HTMLElement;
	// if (titleElement) titleElement.innerText = name;
	// workspacesContainer.appendChild(workspace);
}

export { createSidebarHeader };
