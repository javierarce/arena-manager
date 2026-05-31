import { ArenaBlock, ArenaChannel, Block, Channel } from "./types";

/**
 * Decode the HTML entities are.na's markdown escaping produces.
 *
 * are.na's markdown escapes exactly three HTML-significant characters —
 * `&` -> `&amp;`, `<` -> `&lt;`, `>` -> `&gt;` (quotes and apostrophes are left
 * raw). The v3 migration decoded these on the `content` field — a blockquote
 * `> quote` comes back as `> quote` — but left them escaped on `description`
 * values that predate the migration, so `Wenger &amp; Lave` reaches the note
 * verbatim and a `>` in a description renders as `&gt;`. We decode them here to
 * match how v3 already treats `content`.
 *
 * Scoped to just these three entities on purpose: decoding more (e.g. `&quot;`)
 * would corrupt descriptions that legitimately contain that literal text, since
 * are.na never escapes those in markdown.
 */
export function decodeEntities(text: string): string {
	return text
		.replace(/&lt;/g, "<")
		.replace(/&gt;/g, ">")
		// `&amp;` last so a doubly-escaped entity (`&amp;gt;`) only unwinds one
		// level, mirroring a single HTML-decode pass.
		.replace(/&amp;/g, "&");
}

/**
 * Derive a human-readable title from a block's text content.
 *
 * v3 dropped the `generated_title` field that v2 provided for untitled blocks
 * (most commonly Text blocks). We reproduce it here from the first line of the
 * markdown content so those blocks still get a meaningful file name.
 */
export function deriveTitle(markdown: string | null | undefined): string {
	if (!markdown) {
		return "Untitled";
	}

	const firstLine = markdown
		.replace(/\s+/g, " ")
		.trim()
		.slice(0, 50)
		.trim();

	return firstLine || "Untitled";
}

/**
 * Map a raw are.na v3 block into the plugin's internal {@link Block} shape.
 *
 * v3 renamed and reshaped several fields relative to v2:
 *   - `class`        -> `type`
 *   - `content`      string -> `content.markdown` (v3 HTML-decodes this)
 *   - `description`  string -> `description.markdown` (pre-migration values are
 *                              still HTML-escaped; see {@link decodeEntities})
 *   - `position`     -> `connection.position`
 *   - `generated_title` was removed (see {@link deriveTitle})
 *   - `image.display.url` -> `image.large.src` (falling back to `image.src`)
 *   - attachment `file_name`/`extension` -> `filename`/`file_extension`
 */
export function normalizeBlock(raw: ArenaBlock): Block {
	const title = raw.title ?? "";

	const block: Block = {
		id: raw.id,
		class: raw.type,
		title,
		// content is HTML-decoded by v3; old (pre-migration) descriptions are not,
		// so we decode them to keep markdown (blockquotes, `&`, `<`) intact.
		content: raw.content?.markdown ?? "",
		description: decodeEntities(raw.description?.markdown ?? ""),
		// v2 always populated generated_title and several call sites use it
		// directly as a file name. v3 dropped it, so we always provide a usable
		// value: the real title when present, otherwise one derived from content.
		generated_title: title || deriveTitle(raw.content?.markdown),
		position: raw.connection?.position ?? 0,
	};

	if (raw.image) {
		block.image = {
			display: { url: raw.image.large?.src ?? raw.image.src },
			// Kept so images can be downloaded locally with a sensible extension
			// (the display URL is a resized CDN link with no file extension).
			filename: raw.image.filename,
			content_type: raw.image.content_type,
		};
	}

	if (raw.attachment) {
		block.attachment = {
			file_name: raw.attachment.filename,
			extension: raw.attachment.file_extension,
			file_size: raw.attachment.file_size,
			url: raw.attachment.url,
		};
	}

	// Embed (Media) blocks have no markdown body; their value is the iframe HTML.
	// Keep it so getBlockContent can render the playable embed into the note.
	if (raw.embed?.html) {
		block.embed = { html: raw.embed.html };
	}

	if (raw.user?.slug) {
		block.user = { slug: raw.user.slug };
	}

	if (raw.source) {
		block.source = { title: raw.source.title, url: raw.source.url };
	}

	return block;
}

/**
 * Map a raw are.na v3 channel into the plugin's internal {@link Channel} shape.
 *
 * v3 changes relative to v2:
 *   - `length` (total content count) -> `counts.blocks`
 *   - `status` -> `visibility`
 *
 * `length` uses `counts.blocks`, not `counts.contents`: `contents` also counts
 * nested channels, which getBlocksFromChannel skips. Counting them made a
 * channel whose only connection is a sub-channel show a non-zero count and then
 * import nothing, and slip past the empty-channel filter in the picker.
 */
export function normalizeChannel(raw: ArenaChannel): Channel {
	return {
		id: raw.id,
		slug: raw.slug,
		title: raw.title ?? "",
		length: raw.counts?.blocks ?? 0,
		status: raw.visibility,
	};
}
