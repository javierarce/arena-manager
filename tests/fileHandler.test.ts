import { describe, it, expect } from "vitest";
import { type App, TFile } from "obsidian";
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
function makeHandler(
	files: Record<string, { blockid?: number | string }> = {},
) {
	// Real TFile instances so the code's `instanceof TFile` narrowing holds.
	const makeFile = (path: string, frontmatter: Record<string, unknown>) => {
		const file = Object.assign(new TFile(), { path });
		(
			file as unknown as { frontmatter: Record<string, unknown> }
		).frontmatter = frontmatter;
		return file;
	};

	const app = {
		vault: {
			getAbstractFileByPath: (path: string) =>
				path in files ? makeFile(path, files[path]) : null,
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

	it("replaces Obsidian-breaking characters `| # ^ [ ]` (issue #2)", () => {
		const fh = makeHandler();
		expect(fh.getSafeFilename("a|b#c^d[e]f")).toBe("a b c d e f");
	});

	it('replaces other illegal filename characters `* ? " < >`', () => {
		const fh = makeHandler();
		expect(fh.getSafeFilename('a*b?c"d<e>f')).toBe("a b c d e f");
	});

	it("collapses the whitespace left by adjacent unsafe characters", () => {
		const fh = makeHandler();
		expect(fh.getSafeFilename("a [|] b")).toBe("a b");
		expect(fh.getSafeFilename("  [trimmed]  ")).toBe("trimmed");
	});

	it("falls back to 'Untitled' when nothing usable remains", () => {
		expect(makeHandler().getSafeFilename("///")).toBe("Untitled");
		expect(makeHandler().getSafeFilename("")).toBe("Untitled");
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

	it("reuses the file when the stored blockid is a string (issue #5)", async () => {
		// A string-typed frontmatter blockid must not be treated as a new block,
		// otherwise every re-download spawns a `note-1`, `note-2`, … duplicate.
		const fh = makeHandler({ "arena/note.md": { blockid: "5" } });
		expect(await fh.findNextAvailableFileName("arena", "note", 5)).toBe(
			"note",
		);
	});
});

describe("FileHandler.sameBlockId", () => {
	const fh = makeHandler();

	it("matches across number/string representations", () => {
		expect(fh.sameBlockId(5, 5)).toBe(true);
		expect(fh.sameBlockId("5", 5)).toBe(true);
		expect(fh.sameBlockId(5, "5")).toBe(true);
		expect(fh.sameBlockId("5", "5")).toBe(true);
	});

	it("does not match different ids", () => {
		expect(fh.sameBlockId(5, 9)).toBe(false);
		expect(fh.sameBlockId("5", "9")).toBe(false);
	});

	it("treats missing/empty ids as no match (never two nulls)", () => {
		expect(fh.sameBlockId(null, null)).toBe(false);
		expect(fh.sameBlockId(undefined, 5)).toBe(false);
		expect(fh.sameBlockId(5, "")).toBe(false);
		expect(fh.sameBlockId("abc", 5)).toBe(false);
	});
});
