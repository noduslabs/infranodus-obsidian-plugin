
function encodeInfraNodusGraphName(graphName: string, graphPrefix: string, vaultName: string) {
	// First, replace spaces and common problematic symbols with underscores
	let encodedName = graphName.replace(/[\s%&=?#/\\]/g, "_");

	// Then, encode the string for URL use
	encodedName = encodeURIComponent(encodedName);

	const graphNameToReturn = getGraphName(encodedName, graphPrefix, vaultName);

	// Finally, replace any remaining percent-encoded characters with underscores
	return graphNameToReturn.replace(/%[0-9A-Fa-f]{2}/g, "_").slice(0, 32) || 'from_obsidian_plugin'
}

function makeNameSafe(name: string) {
	return name.replace(/[\s%&=?#/\\]/g, "_")
}

function getGraphName(encodedName: string, graphPrefix: string,vaultName: string): string {

	
	if (!graphPrefix) {
		return `${vaultName}_${encodedName}`;
	}
	
	if (graphPrefix.includes('*')) {
		if (graphPrefix.includes('**')) {
			return graphPrefix.replace('**', makeNameSafe(vaultName));
		}
		
		return graphPrefix.replace('*', makeNameSafe(encodedName));
	}
	
	if (graphPrefix === 'page_name') {
		return 'from_obsidian_' + makeNameSafe(encodedName);
	}
	
	if (graphPrefix === 'obsidian_files') {
		return 'obsidian_files';
	}
	
	return graphPrefix;
}


export { encodeInfraNodusGraphName };
