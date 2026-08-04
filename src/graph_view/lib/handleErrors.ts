import { PluginSettings, SETTINGS } from "src/settings";
import { PossibleError } from "../components/ErrorHandler";

// Marks error messages that come from the InfraNodus API verbatim, so the
// catch handler in GraphView can show them with the "api-error" view
const INFRANODUS_API_ERROR_PREFIX = "INFRANODUS_API_ERROR: ";

function handleGraphDataError(params: {
	graphDataResponse: any;
	statements: string[];
	setError: (error: PossibleError) => void;
	isFolder: boolean;
}) {
	console.log("[handleGraphDataError]", params.graphDataResponse);

	// Check if it is "invalid-api-key" error
	if (
		params.graphDataResponse.error ===
		"Please, log in to access the page you requested."
	) {
		console.log("[handleGraphDataError] Setting error to invalid-api-key");
		params.setError("invalid-api-key");
		throw new Error("No API key found");
	}

	if (
		params.graphDataResponse?.error?.includes(
			"Free API call limit has been exceeded"
		)
	) {
		console.log(
			"[handleGraphDataError] Setting error to api-key-free-exceeded"
		);
		params.setError("api-key-free-exceeded");
		throw new Error("Free API call limit has been exceeded");
	}

	if (
		params.graphDataResponse?.error?.includes(
			"API call limit has been exceeded"
		)
	) {
		console.log(
			"[handleGraphDataError] Setting error to api-key-paid-exceeded"
		);
		params.setError("api-key-paid-exceeded");
		throw new Error("Paid API call limit has been exceeded");
	}

	if (
		params.graphDataResponse.error ==
		"Your session has expired. Please, log in again."
	) {
		console.log("[handleGraphDataError] Setting error to invalid-api-key");
		params.setError("invalid-api-key");
		throw new Error("API key is not up to date");
	}
	// Check if it is "no-wiki-links" error
	if (
		(params.isFolder &&
			SETTINGS.MULTI_PAGE_GRAPH_PROCESSING === "[[Wiki Links]] Only") ||
		(!params.isFolder &&
			SETTINGS.SINGLE_PAGE_GRAPH_PROCESSING === "[[Wiki Links]] Only")
	) {
		console.log("[handleGraphDataError] Checking for wiki links");
		const hasWikiLinks = _checkForWikiLinks(params.statements);
		if (!hasWikiLinks) {
			params.setError("no-wiki-links");
			throw new Error("No wiki links found");
		}
	}

	// Any other error reported by the API: surface its message as is,
	// instead of letting it fall through to a generic parse error.
	// No setError here — the fetchGraphData catch sets "api-error"
	// with this message as the errorText
	const apiErrorMessage =
		params.graphDataResponse.errormsg || params.graphDataResponse.error;
	if (typeof apiErrorMessage === "string" && apiErrorMessage.length > 0) {
		console.log(
			"[handleGraphDataError] Unrecognized API error, surfacing it"
		);
		throw new Error(INFRANODUS_API_ERROR_PREFIX + apiErrorMessage);
	}
}

function _checkForWikiLinks(statements: string[]) {
	for (const str of statements) {
		if (str.indexOf("[[") === -1) continue;
		if (str.indexOf("]]") === -1) continue;
		return true;
	}
	return false;
}

export { handleGraphDataError, INFRANODUS_API_ERROR_PREFIX };
