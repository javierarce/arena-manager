import { describe, it, expect } from "vitest";
import { normalizeBlock, normalizeChannel, deriveTitle } from "../lib/normalize";
import { ArenaBlock, ArenaChannel } from "../lib/types";
import page1 from "./fixtures/contents-page1.json";
import page2 from "./fixtures/contents-page2.json";
import channelsPage1 from "./fixtures/channels-page1.json";

// Fixtures are real v3 responses captured from the live API.
const [image, textNull, textTitled, link] = page1.data as ArenaBlock[];
const [attachment] = page2.data as ArenaBlock[];
const [channel] = channelsPage1.data as ArenaChannel[];

describe("deriveTitle", () => {
	it("uses the first line of markdown, collapsed and truncated", () => {
		expect(deriveTitle("Hello world")).toBe("Hello world");
		expect(deriveTitle("first line\n\nsecond line")).toBe(
			"first line second line",
		);
		expect(deriveTitle("  spaced   out  text ")).toBe("spaced out text");
	});

	it("truncates to 50 characters", () => {
		const long = "a".repeat(80);
		expect(deriveTitle(long)).toHaveLength(50);
	});

	it("falls back to 'Untitled' for empty/missing content", () => {
		expect(deriveTitle(null)).toBe("Untitled");
		expect(deriveTitle("")).toBe("Untitled");
		expect(deriveTitle("   ")).toBe("Untitled");
	});
});

describe("normalizeBlock", () => {
	it("maps v3 `type` to `class`", () => {
		expect(normalizeBlock(image).class).toBe("Image");
		expect(normalizeBlock(link).class).toBe("Link");
		expect(normalizeBlock(attachment).class).toBe("Attachment");
	});

	it("flattens v3 `content`/`description` objects to strings", () => {
		const block = normalizeBlock(textTitled);
		expect(typeof block.content).toBe("string");
		expect(block.content).toBe(textTitled.content?.markdown ?? "");
		expect(typeof block.description).toBe("string");
	});

	it("reads position from `connection.position`", () => {
		expect(normalizeBlock(textNull).position).toBe(
			textNull.connection?.position,
		);
	});

	it("always provides a usable generated_title", () => {
		// Titled block: generated_title mirrors the real title (used directly as a filename).
		const titled = normalizeBlock(textTitled);
		expect(titled.title).toBeTruthy();
		expect(titled.generated_title).toBe(titled.title);

		// Untitled block: generated_title is derived from content, never empty.
		const untitled = normalizeBlock(textNull);
		expect(untitled.title).toBe("");
		expect(untitled.generated_title).toBe(
			deriveTitle(textNull.content?.markdown),
		);
		expect(untitled.generated_title).not.toBe("");
	});

	it("maps the image to image.display.url, preferring the large size", () => {
		const block = normalizeBlock(image);
		expect(block.image?.display.url).toBe(
			image.image?.large?.src ?? image.image?.src,
		);
	});

	it("renames attachment fields (filename/file_extension)", () => {
		const block = normalizeBlock(attachment);
		expect(block.attachment).toEqual({
			file_name: attachment.attachment?.filename,
			extension: attachment.attachment?.file_extension,
			file_size: attachment.attachment?.file_size,
			url: attachment.attachment?.url,
		});
	});

	it("maps source and user when present", () => {
		const block = normalizeBlock(link);
		expect(block.source).toEqual({
			title: link.source?.title,
			url: link.source?.url,
		});
		expect(block.user?.slug).toBe(link.user?.slug);
	});

	it("omits optional fields that are absent", () => {
		const block = normalizeBlock(textNull);
		expect(block.image).toBeUndefined();
		expect(block.attachment).toBeUndefined();
		expect(block.source).toBeUndefined();
	});
});

describe("normalizeChannel", () => {
	it("maps id, slug and title", () => {
		const c = normalizeChannel(channel);
		expect(c.id).toBe(channel.id);
		expect(c.slug).toBe(channel.slug);
		expect(c.title).toBe(channel.title);
	});

	it("derives length from counts.contents (v3 dropped `length`)", () => {
		const c = normalizeChannel(channel);
		expect(c.length).toBe(channel.counts.contents);
	});

	it("maps visibility to status", () => {
		expect(normalizeChannel(channel).status).toBe(channel.visibility);
	});

	it("defaults length to 0 when counts are missing", () => {
		const c = normalizeChannel({
			id: 1,
			slug: "x",
			title: "X",
		} as unknown as ArenaChannel);
		expect(c.length).toBe(0);
	});
});
