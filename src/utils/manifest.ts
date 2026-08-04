import { App, Notice, normalizePath } from "obsidian";

/* ------------------------------------------------------------------ *
 * infranodus/manifest.json — the vault's graph routing table
 *
 * After a successful export we can register the graph in
 * <vaultRoot>/infranodus/manifest.json so that agents working with this
 * vault (Claude Code / Cursor / anything reading the manifest contract)
 * can find the graph and query it via the InfraNodus MCP tools instead
 * of reading every note.
 *
 * We never create the manifest: registration is only offered when the
 * vault ALREADY has `infranodus/manifest.json`, i.e. when the user has
 * opted into the knowledge-base workflow. Without it we export and stay
 * out of the user's vault.
 *
 * The plugin is only ONE of several writers of this file, so every write
 * is a read–modify–write that touches exactly one entry and preserves
 * everything else. Entries we create are always `policy: "external"` —
 * query-only, never uploaded to or deleted by the manifest tooling.
 * ------------------------------------------------------------------ */

const MANIFEST_DIR = "infranodus";
const MANIFEST_PATH = `${MANIFEST_DIR}/manifest.json`;
const REPORT_PATH = `${MANIFEST_DIR}/INFRANODUS_REPORT.md`;
const MANIFEST_SOURCE = "obsidian-plugin";

export interface ManifestScopeEntry {
	graphName: string;
	policy: "external";
	source: typeof MANIFEST_SOURCE;
	purpose?: string;
	url?: string;
	topics?: string[];
	gaps?: string[];
	hint?: string;
	file?: string;
	statements?: number;
	updated: string;
	[key: string]: unknown;
}

/** Today as ISO `YYYY-MM-DD` in the user's local timezone. */
function isoToday(): string {
	const now = new Date();
	const pad = (n: number) => String(n).padStart(2, "0");
	return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(
		now.getDate()
	)}`;
}

/**
 * Render one entry of `extendedGraphSummary.mainTopics` / `.contentGaps`
 * as a single line. The API may return plain strings or objects; we accept
 * both rather than assuming a shape, because metadata must never block an
 * export.
 */
function summaryItemToString(item: unknown): string {
	if (typeof item === "string") return item.trim();
	if (typeof item === "number" || typeof item === "boolean") {
		return String(item);
	}
	if (!item || typeof item !== "object") return "";

	const obj = item as Record<string, unknown>;
	const pickString = (keys: string[]): string => {
		for (const key of keys) {
			const value = obj[key];
			if (typeof value === "string" && value.trim()) return value.trim();
		}
		return "";
	};
	const pickList = (keys: string[]): string => {
		for (const key of keys) {
			const value = obj[key];
			if (Array.isArray(value) && value.length > 0) {
				const parts = value
					.map((v) =>
						typeof v === "string"
							? v.trim()
							: v && typeof v === "object"
							? String(
									(v as Record<string, unknown>).name ??
										(v as Record<string, unknown>).label ??
										""
							  ).trim()
							: String(v ?? "").trim()
					)
					.filter(Boolean);
				if (parts.length > 0) return parts.join(" ");
			}
			if (typeof value === "string" && value.trim()) return value.trim();
		}
		return "";
	};

	const name = pickString([
		"name",
		"topic",
		"label",
		"title",
		"cluster",
		"gap",
	]);
	const detail = pickList([
		"keywords",
		"concepts",
		"nodes",
		"terms",
		"description",
	]);

	if (name && detail) return `${name}: ${detail}`;
	if (name) return name;
	if (detail) return detail;

	try {
		return JSON.stringify(item);
	} catch {
		return "";
	}
}

/** Normalize a topics/gaps array to at most `limit` non-empty strings. */
function normalizeSummaryList(
	value: unknown,
	limit: number
): string[] | undefined {
	if (!Array.isArray(value) || value.length === 0) return undefined;
	const out: string[] = [];
	for (const item of value) {
		const line = summaryItemToString(item);
		if (line) out.push(line);
		if (out.length >= limit) break;
	}
	return out.length > 0 ? out : undefined;
}

/** True when the vault already has an `infranodus/manifest.json`. */
export async function vaultHasManifest(app: App): Promise<boolean> {
	try {
		return await app.vault.adapter.exists(normalizePath(MANIFEST_PATH));
	} catch {
		return false;
	}
}

/**
 * Read–modify–write the existing `infranodus/manifest.json`, upserting a
 * single entry keyed by graph name. Returns false (without writing) if the
 * file is missing — we never create it — or if it exists but isn't
 * parseable: clobbering another writer's entries is worse than skipping
 * registration.
 */
async function upsertManifestEntry(
	app: App,
	key: string,
	entry: ManifestScopeEntry
): Promise<boolean> {
	const manifestPath = normalizePath(MANIFEST_PATH);

	let raw: string;
	try {
		raw = await app.vault.adapter.read(manifestPath);
	} catch {
		// No manifest in this vault — the user hasn't opted into the
		// knowledge-base workflow here, so leave their vault alone.
		return false;
	}

	let manifest: Record<string, any> = { scopes: {} };
	if (raw.trim()) {
		try {
			const parsed = JSON.parse(raw);
			if (
				!parsed ||
				typeof parsed !== "object" ||
				Array.isArray(parsed)
			) {
				throw new Error("manifest root is not an object");
			}
			manifest = parsed;
		} catch (error) {
			new Notice(
				`InfraNodus: could not register "${key}" — infranodus/manifest.json is not valid JSON. Fix or remove it and export again.`
			);
			console.error("[InfraNodus] manifest parse failed", error);
			return false;
		}
	}

	if (
		!manifest.scopes ||
		typeof manifest.scopes !== "object" ||
		Array.isArray(manifest.scopes)
	) {
		manifest.scopes = {};
	}

	const rawExisting = manifest.scopes[key];
	const existing =
		rawExisting &&
		typeof rawExisting === "object" &&
		!Array.isArray(rawExisting)
			? (rawExisting as Record<string, unknown>)
			: undefined;

	// Only ever update entries this plugin created. Anything another tool
	// owns or a human hand-wrote stays untouched — re-exporting under the
	// same name must not silently rewrite it.
	if (existing && existing.source !== MANIFEST_SOURCE) {
		new Notice(
			`InfraNodus: "${key}" already exists in infranodus/manifest.json and is managed elsewhere — not overwriting. Export under a different name to register it.`
		);
		return false;
	}

	// Merge over our own previous entry so unknown keys survive, but drop
	// metadata fields the current response didn't provide rather than
	// leaving stale topics/gaps from an earlier export behind.
	const merged: Record<string, unknown> = { ...(existing ?? {}), ...entry };
	for (const field of [
		"purpose",
		"url",
		"topics",
		"gaps",
		"hint",
		"file",
		"statements",
	]) {
		if (!(field in entry)) delete merged[field];
	}
	manifest.scopes[key] = merged;

	await app.vault.adapter.write(
		manifestPath,
		`${JSON.stringify(manifest, null, 2)}\n`
	);
	return true;
}

/**
 * Append a dated section to `infranodus/INFRANODUS_REPORT.md`. The file is
 * append-only by contract — existing content is never modified. Only ever
 * called after a successful manifest write, so the folder already exists.
 */
async function appendManifestReport(
	app: App,
	entry: ManifestScopeEntry
): Promise<void> {
	const reportPath = normalizePath(REPORT_PATH);

	let existing = "";
	try {
		existing = await app.vault.adapter.read(reportPath);
	} catch {
		existing = "# InfraNodus build log\n";
	}

	const heading = `## Export ${entry.updated}`;
	const lines: string[] = [];
	if (!existing.includes(heading)) {
		lines.push("", heading);
	}
	lines.push(
		"",
		entry.url
			? `### ${entry.graphName} — ${entry.url}`
			: `### ${entry.graphName}`
	);
	if (entry.purpose) lines.push(`- purpose: ${entry.purpose}`);
	if (entry.topics?.length) lines.push(`- topics: ${entry.topics.join("; ")}`);
	if (entry.gaps?.length) lines.push(`- gaps: ${entry.gaps.join("; ")}`);

	const body = `${existing.replace(/\s*$/, "")}\n${lines.join("\n")}\n`;
	await app.vault.adapter.write(reportPath, body);
}

/**
 * Register a just-exported graph in the vault's manifest. Entirely
 * best-effort: any failure is logged and swallowed — the export itself
 * already succeeded, and metadata must never turn that into an error.
 * Returns true only if the manifest was actually written.
 */
export async function registerExportInManifest(params: {
	app: App;
	graphName: string;
	responseData: any;
	sourceFile?: string;
}): Promise<boolean> {
	const { app, graphName, responseData, sourceFile } = params;
	try {
		// The API nests parts of the payload under
		// `entriesAndGraphOfContext`; look in both places rather than
		// assuming one shape.
		const pick = (key: string): any =>
			responseData?.[key] ??
			responseData?.entriesAndGraphOfContext?.[key] ??
			responseData?.entriesAndGraphOfContext?.graph?.[key];

		const summary = pick("extendedGraphSummary");
		const entry: ManifestScopeEntry = {
			graphName,
			policy: "external",
			source: MANIFEST_SOURCE,
			updated: isoToday(),
		};

		entry.purpose = sourceFile
			? `manual export from Obsidian — ${sourceFile}`
			: "manual export from Obsidian";

		const graphUrl = pick("graphUrl");
		if (typeof graphUrl === "string" && graphUrl.trim()) {
			entry.url = graphUrl.trim();
		}

		const topics = normalizeSummaryList(
			summary?.mainTopics ?? summary?.mainTopicalClusters,
			10
		);
		if (topics) entry.topics = topics;

		const gaps = normalizeSummaryList(summary?.contentGaps, 6);
		if (gaps) entry.gaps = gaps;

		const hint = pick("graphSummary");
		if (typeof hint === "string" && hint.trim()) entry.hint = hint.trim();

		if (sourceFile) entry.file = sourceFile;

		const stats = pick("statistics");
		const statements =
			typeof stats?.statementsCount === "number"
				? stats.statementsCount
				: typeof stats?.statements === "number"
				? stats.statements
				: Array.isArray(
						responseData?.entriesAndGraphOfContext?.statements
				  )
				? responseData.entriesAndGraphOfContext.statements.length
				: undefined;
		if (typeof statements === "number" && Number.isFinite(statements)) {
			entry.statements = statements;
		}

		const written = await upsertManifestEntry(app, graphName, entry);
		if (!written) return false;

		try {
			await appendManifestReport(app, entry);
		} catch (error) {
			console.error("[InfraNodus] report append failed", error);
		}

		return true;
	} catch (error) {
		console.error("[InfraNodus] manifest registration failed", error);
		return false;
	}
}
