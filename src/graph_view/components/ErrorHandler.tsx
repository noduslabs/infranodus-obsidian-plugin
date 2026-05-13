import { error } from "console";
import { INTERNAL_SETTINGS, SETTINGS } from "src/settings";
import { PluginGraphContext } from "../types";

type PossibleError =
	| "no-wiki-links"
	| "invalid-api-key"
	| "api-key-free-exceeded"
	| "api-key-paid-exceeded"
	| "generic-error"
	| "no-content"
	| "content-empty";

const ErrorHandler = (params: {
	graphContext: PluginGraphContext;
	error: PossibleError;
	errorText?: string;
	setError: (error: PossibleError) => void;
	context: {
		setShowingSettings: (showingSettings: boolean) => void;
	};
}) => {
	const ctx = params.context;

	return (
		<div className="absolute inset-0 z-[5] flex flex-col items-center justify-center p-10 bg-white dark:bg-black">
			<span className="text-lg text-gray-600 dark:text-gray-200">
				{params.error === "no-wiki-links" && (
					<>
						<h2>No wiki links found</h2>
						<p>
							No [[wiki links]] were detected. You can open a page
							with [[wiki links]] or change the
							<ActionLink
								text="settings"
								action={() => ctx.setShowingSettings(true)}
								addSpacesAround={true}
							/>
							to also process text in the documents.
						</p>
					</>
				)}
				{params.error === "invalid-api-key" && (
					<>
						<h2>Please, add your InfraNodus API key</h2>
						<p>
							Cannot connect to your InfraNodus account. This may
							be because your API key has expired or is incorrect.
							Please, go to
							<ActionLink
								text="infranodus subscriptions"
								href={
									SETTINGS.INFRANODUS_API_URL +
									"/subscription"
								}
								addSpacesAround={true}
							/>{" "}
							page to get your updated API key and add it to the
							<ActionLink
								text="plugin settings"
								action={() => ctx.setShowingSettings(true)}
								addSpaceLeft={true}
							/>
							. If you don't have an account, you can create a
							free trial one on any tier and use this plugin
							straight away.
						</p>
					</>
				)}
				{params.error === "api-key-free-exceeded" && (
					<>
						<h2>
							You've used all your free InfraNodus trial quota.
						</h2>
						<p>
							Please,{" "}
							<ActionLink
								text="sign up"
								href={
									SETTINGS.INFRANODUS_API_URL +
									"/signup?utm_source=obsidian_plugin_rate_limit"
								}
								addSpacesAround={true}
							/>{" "}
							or log in to generate{" "}
							<ActionLink
								text="an InfraNodus API key"
								href={
									SETTINGS.INFRANODUS_API_URL +
									"/api-access?utm_source=obsidian_plugin_rate_limit"
								}
								addSpacesAround={true}
							/>{" "}
							and then add it to your{" "}
							<ActionLink
								text="plugin settings"
								action={() => ctx.setShowingSettings(true)}
								addSpaceLeft={true}
							/>
							{"."}
						</p>
					</>
				)}
				{params.error === "api-key-paid-exceeded" && (
					<>
						<h2>You've used up all your InfraNodus API quota</h2>
						<p>
							Please, go to the
							<ActionLink
								text="infranodus subscriptions"
								href={
									SETTINGS.INFRANODUS_API_URL +
									"/subscription"
								}
								addSpacesAround={true}
							/>{" "}
							page to upgrade your plan or
							<ActionLink
								text="contact us"
								href={
									"https://support.noduslabs.com/hc/en-us/requests/new"
								}
								addSpaceLeft={true}
							/>{" "}
							if you believe this is an error or would like us to
							extend your quota.
						</p>
					</>
				)}
				{params.error === "no-content" && (
					<>
						<h2>No content found</h2>
						<p>
							No content was found in the file. Please, make sure
							the file is not empty and contains text. Or check if
							you turned on the option to process linked and
							unlinked mentions in the
							<ActionLink
								text="settings"
								action={() => ctx.setShowingSettings(true)}
								addSpacesAround={true}
							/>
							panel.
						</p>
						<p>
							Alternatively, if there is additional content in the
							file since it was loaded, you can
							<ActionLink
								text="reload"
								action={() =>
									params.graphContext.reloadGraph({
										filePath:
											params.graphContext.filePath || "",
										leaf: params.graphContext.app.workspace.getLeaf(),
										fromLayoutChange: true,
									})
								}
								addSpacesAround={true}
							/>
							the graph.
						</p>
					</>
				)}
				{params.error === "content-empty" && (
					<>
						<h2>Content processing issue</h2>
						<p>
							Could not generate an InfraNodus graph even though
							content is present. This may be due to your text
							processing settings. For instance, if you have
							"[[Wiki Links]] Only" turned on, but there are no
							[[wiki links]] on the analyzed page. Please, go to
							the
							<ActionLink
								text="plugin settings"
								action={() => ctx.setShowingSettings(true)}
								addSpacesAround={true}
							/>
							and check your setup or try another page.
						</p>
						<p>
							Alternatively, if there is additional content in the
							file since it was loaded, you can
							<ActionLink
								text="reload"
								action={() =>
									params.graphContext.reloadGraph({
										filePath:
											params.graphContext.filePath || "",
										leaf: params.graphContext.app.workspace.getLeaf(),
										fromLayoutChange: true,
									})
								}
								addSpacesAround={true}
							/>
							the graph.
						</p>
					</>
				)}

				{params.error === "generic-error" && (
					<>
						<h2>Ooops, there was an error...</h2>
						{params.errorText == "net::ERR_CONNECTION_REFUSED" && (
							<p>
								There was a problem connecting to
								InfraNodus.Com. Please, try again in a minute or
								contact our{" "}
								<ActionLink
									text="support"
									addSpacesAround={true}
									href={
										"https://support.noduslabs.com/hc/en-us/requests/new"
									}
								/>
								and describe what you were trying to do.
							</p>
						)}
						{params.errorText == "net::ERR_NAME_NOT_RESOLVED" && (
							<p>
								Could not connect to the InfraNodus API domain.
								Please, check your connection, try again later,
								or contact our{" "}
								<ActionLink
									text="support"
									addSpacesAround={true}
									href={
										"https://support.noduslabs.com/hc/en-us/requests/new"
									}
								/>
								and describe what you were trying to do.
							</p>
						)}
						{params.errorText != "net::ERR_CONNECTION_REFUSED" &&
							params.errorText !=
								"net::ERR_NAME_NOT_RESOLVED" && (
								<p>
									{typeof params.errorText === "string" &&
									params.errorText.length > 0
										? params.errorText
										: "An unknown error occured. Please try again later or with another page."}
									{isRateLimitError(params.errorText) && (
										<>
											<br></br>
											The connection was refused. This
											could be due to the rate limit. If
											you are on a free plan, please,
											upgrade, and add your API key to the
											plugin settings. If you are on a
											paid plan, please, try to reduce the
											number of requests per minute.
										</>
									)}
								</p>
							)}
						{typeof params.errorText === "string" &&
							params.errorText.includes("API key") && (
								<>
									<br></br>
									<ActionLink
										text="go to plugin settings"
										action={() =>
											ctx.setShowingSettings(true)
										}
										addSpacesAround={true}
									/>
								</>
							)}
					</>
				)}
			</span>
		</div>
	);
};

const isRateLimitError = (errorText?: string) => {
	if (typeof errorText !== "string") return false;
	const lower = errorText.toLowerCase();
	return (
		lower.includes("rate limit") ||
		lower.includes("rate-limit") ||
		lower.includes("too many requests") ||
		lower.includes("call limit has been exceeded") ||
		lower.includes("quota")
	);
};

const ActionLink = (params: {
	action?: () => void;
	href?: string;
	text: string;
	addSpacesAround?: boolean;
	addSpaceLeft?: boolean;
	addSpaceRight?: boolean;
}) => {
	return (
		<>
			{(params.addSpacesAround || params.addSpaceLeft) && " "}
			<a
				className="text-blue-500 underline cursor-pointer"
				onClick={params.action}
				href={params.href}
			>
				{params.text}
			</a>
			{(params.addSpacesAround || params.addSpaceRight) && " "}
		</>
	);
};

export { ErrorHandler };
export type { PossibleError };
