import { describe, it, expect } from "vitest";
import type { App } from "obsidian";
import FileHandler from "../lib/FileHandler";
import type { Attachment } from "../lib/types";
import type { Settings } from "../lib/Settings";

const settings = {
	accessToken: "token",
	username: "tester",
	folder: "arena",
	download_attachments_type: "1",
} as Settings;

// A tiny in-memory vault: a path -> frontmatter map is enough for the
// filename-collision logic, which only reads existence and `blockid`.
function makeHandler(files: Record<string, { blockid?: number }> = {}) {
	const app = {
		vault: {
			getAbstractFileByPath: (path: string) =>
				path in files ? { path, frontmatter: files[path] } : null,
		},
		fileManager: {
			processFrontMatter: (
				file: { frontmatter: Record<string, unknown> },
				cb: (fm: Record<string, unknown>) => void,
			) => cb(file.frontmatter),
		},
	} as unknown as App;

	return new FileHandler(app, settings);
}

describe("FileHandler.getSafeFilename", () => {
	it("replaces slashes, backslashes and colons with spaces", () => {
		const fh = makeHandler();
		expect(fh.getSafeFilename("a/b:c\\d")).toBe("a b c d");
	});

	it("leaves a clean name untouched", () => {
		expect(makeHandler().getSafeFilename("My Note")).toBe("My Note");
	});
});

describe("FileHandler.getAttachmentFilenameFromTitle", () => {
	const att = { extension: "png" } as Attachment;

	it("falls back to the attachment file_name when no title is given", () => {
		const fh = makeHandler();
		const a = { ...att, file_name: "photo.png" } as Attachment;
		expect(fh.getAttachmentFilenameFromTitle(a)).toBe("photo.png");
	});

	it("does not duplicate an extension already present on the title", () => {
		const fh = makeHandler();
		expect(fh.getAttachmentFilenameFromTitle(att, "My Photo.png")).toBe(
			"My Photo.png",
		);
	});

	it("appends the extension when the title lacks it", () => {
		const fh = makeHandler();
		expect(fh.getAttachmentFilenameFromTitle(att, "My Photo")).toBe(
			"My Photo.png",
		);
	});

	it("sanitizes unsafe characters in the resulting name", () => {
		const fh = makeHandler();
		expect(fh.getAttachmentFilenameFromTitle(att, "a/b")).toBe("a b.png");
	});
});

describe("FileHandler.findNextAvailableFileName", () => {
	// Characterization test: callers only reach this method on a known name
	// collision, so the "nothing exists" branch is effectively dead. It returns
	// `note-0` (not `note`) — documented here so a future refactor notices.
	it("returns `<base>-0` when no file exists (out-of-contract edge case)", async () => {
		const fh = makeHandler();
		expect(await fh.findNextAvailableFileName("arena", "note", 5)).toBe(
			"note-0",
		);
	});

	it("reuses the existing file when the blockid matches", async () => {
		const fh = makeHandler({ "arena/note.md": { blockid: 5 } });
		expect(await fh.findNextAvailableFileName("arena", "note", 5)).toBe(
			"note",
		);
	});

	it("picks the next free suffix when the name is taken by another block", async () => {
		const fh = makeHandler({ "arena/note.md": { blockid: 9 } });
		expect(await fh.findNextAvailableFileName("arena", "note", 5)).toBe(
			"note-1",
		);
	});

	it("reuses a suffixed file whose blockid matches", async () => {
		const fh = makeHandler({
			"arena/note.md": { blockid: 9 },
			"arena/note-1.md": { blockid: 5 },
		});
		expect(await fh.findNextAvailableFileName("arena", "note", 5)).toBe(
			"note-1",
		);
	});
});
