import { ArenaBlock, ArenaChannel, Block, Channel } from "./types";

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
 *   - `content`      string -> `content.markdown`
 *   - `description`  string -> `description.markdown`
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
		content: raw.content?.markdown ?? "",
		description: raw.description?.markdown ?? "",
		// v2 always populated generated_title and several call sites use it
		// directly as a file name. v3 dropped it, so we always provide a usable
		// value: the real title when present, otherwise one derived from content.
		generated_title: title || deriveTitle(raw.content?.markdown),
		position: raw.connection?.position ?? 0,
	};

	if (raw.image) {
		block.image = {
			display: { url: raw.image.large?.src ?? raw.image.src },
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
 *   - `length` (total content count) -> `counts.contents`
 *   - `status` -> `visibility`
 */
export function normalizeChannel(raw: ArenaChannel): Channel {
	return {
		id: raw.id,
		slug: raw.slug,
		title: raw.title ?? "",
		length: raw.counts?.contents ?? 0,
		status: raw.visibility,
	};
}
