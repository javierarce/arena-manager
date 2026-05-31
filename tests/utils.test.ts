import { describe, it, expect } from "vitest";
import Utils from "../lib/Utils";
import type { Block } from "../lib/types";
import type { Settings } from "../lib/Settings";

describe("Utils.createPermalinkFromTitle", () => {
	it("strips a trailing -<number> suffix", () => {
		expect(Utils.createPermalinkFromTitle("my-channel-2")).toBe(
			"my-channel",
		);
		expect(Utils.createPermalinkFromTitle("notes-12")).toBe("notes");
	});

	it("leaves titles without a trailing numeric suffix untouched", () => {
		expect(Utils.createPermalinkFromTitle("my-channel")).toBe("my-channel");
		// Digits not preceded by a dash are kept.
		expect(Utils.createPermalinkFromTitle("123")).toBe("123");
		// Only the final -<number> is removed.
		expect(Utils.createPermalinkFromTitle("foo-12-34")).toBe("foo-12");
	});
});

describe("Utils.getFrontmatterFromBlock", () => {
	const fullBlock: Block = {
		id: 42,
		class: "Link",
		title: "A title",
		content: "body",
		description: "a description",
		generated_title: "A title",
		position: 1,
		user: { slug: "tester" },
		source: { title: "Source title", url: "https://example.com" },
	};

	it("always includes the block id", () => {
		const fm = Utils.getFrontmatterFromBlock(fullBlock);
		expect(fm.blockid).toBe(42);
	});

	it("maps every present field, including channel when given", () => {
		const fm = Utils.getFrontmatterFromBlock(fullBlock, "My Channel");
		expect(fm).toEqual({
			blockid: 42,
			class: "Link",
			title: "A title",
			description: "a description",
			user: "tester",
			"source title": "Source title",
			"source url": "https://example.com",
			channel: "My Channel",
		});
	});

	it("omits optional fields that are absent and channel when not passed", () => {
		const minimal: Block = {
			id: 7,
			class: "",
			title: "",
			content: "",
			description: "",
			generated_title: "Untitled",
			position: 0,
		};
		const fm = Utils.getFrontmatterFromBlock(minimal);
		expect(fm).toEqual({ blockid: 7 });
	});
});

describe("Utils.getBlockContent", () => {
	const base: Block = {
		id: 1,
		class: "Text",
		title: "",
		content: "the body",
		description: "",
		generated_title: "x",
		position: 0,
	};

	it("returns the markdown body for non-media blocks", () => {
		expect(Utils.getBlockContent(base)).toBe("the body");
	});

	it("returns an image embed for Image and Link blocks", () => {
		const img: Block = {
			...base,
			class: "Image",
			image: { display: { url: "https://img/x.png" } },
		};
		expect(Utils.getBlockContent(img)).toBe("![](https://img/x.png)");
		expect(Utils.getBlockContent({ ...img, class: "Link" })).toBe(
			"![](https://img/x.png)",
		);
	});

	it("embeds `undefined` when an Image/Link has no image (existing behavior)", () => {
		expect(Utils.getBlockContent({ ...base, class: "Image" })).toBe(
			"![](undefined)",
		);
	});

	it("returns the iframe html for Embed (Media) blocks", () => {
		const embedBlock: Block = {
			...base,
			class: "Embed",
			content: "",
			embed: { html: "<iframe src='https://youtube.com/embed/x'></iframe>" },
		};
		expect(Utils.getBlockContent(embedBlock)).toBe(
			"<iframe src='https://youtube.com/embed/x'></iframe>",
		);
	});
});

describe("Utils.getBlockAttachment", () => {
	const attachment = {
		extension: "pdf",
		file_name: "doc.pdf",
		file_size: 10,
		url: "https://files/doc.pdf",
	};
	const block: Block = {
		id: 1,
		class: "Attachment",
		title: "",
		content: "",
		description: "",
		generated_title: "x",
		position: 0,
		attachment,
	};

	it("returns the attachment only for Attachment blocks", () => {
		expect(Utils.getBlockAttachment(block)).toBe(attachment);
	});

	it("returns undefined for any other class", () => {
		expect(
			Utils.getBlockAttachment({ ...block, class: "Image" }),
		).toBeUndefined();
	});
});

describe("Utils.getDownloadable", () => {
	const base: Block = {
		id: 99,
		class: "Image",
		title: "",
		content: "",
		description: "",
		generated_title: "x",
		position: 0,
	};

	it("returns the real attachment for Attachment blocks", () => {
		const attachment = {
			extension: "pdf",
			file_name: "doc.pdf",
			file_size: 10,
			url: "https://files/doc.pdf",
		};
		const block: Block = { ...base, class: "Attachment", attachment };
		expect(Utils.getDownloadable(block)).toBe(attachment);
	});

	it("derives an attachment from an Image block's image", () => {
		const block: Block = {
			...base,
			class: "Image",
			image: {
				display: { url: "https://cdn/resized" },
				filename: "abc123.png",
				content_type: "image/png",
			},
		};
		expect(Utils.getDownloadable(block)).toEqual({
			url: "https://cdn/resized",
			extension: "png",
			file_name: "abc123.png",
			file_size: 0,
		});
	});

	it("also handles Link blocks that carry a preview image", () => {
		const block: Block = {
			...base,
			class: "Link",
			image: { display: { url: "https://cdn/x" }, content_type: "image/gif" },
		};
		expect(Utils.getDownloadable(block)?.extension).toBe("gif");
	});

	it("derives the extension from content type when filename is unusable", () => {
		const block: Block = {
			...base,
			image: {
				display: { url: "https://cdn/x" },
				content_type: "image/jpeg",
			},
		};
		const d = Utils.getDownloadable(block);
		// jpeg normalizes to jpg, and the file name falls back to the block id.
		expect(d?.extension).toBe("jpg");
		expect(d?.file_name).toBe("99.jpg");
	});

	it("falls back to jpg when there is no filename or content type", () => {
		const block: Block = {
			...base,
			image: { display: { url: "https://cdn/x" } },
		};
		expect(Utils.getDownloadable(block)?.extension).toBe("jpg");
	});

	it("returns undefined for an Image/Link block with no image", () => {
		expect(Utils.getDownloadable({ ...base, class: "Image" })).toBeUndefined();
		expect(Utils.getDownloadable({ ...base, class: "Link" })).toBeUndefined();
	});

	it("returns undefined for Text blocks", () => {
		expect(Utils.getDownloadable({ ...base, class: "Text" })).toBeUndefined();
	});
});

describe("Utils.hasRequiredSettings", () => {
	const base: Settings = {
		accessToken: "token",
		username: "tester",
		folder: "arena",
		download_attachments_type: "1",
	};

	it("is true only when username, folder and accessToken are all set", () => {
		expect(Utils.hasRequiredSettings(base)).toBe(true);
	});

	it("is false when any required field is empty", () => {
		expect(
			Utils.hasRequiredSettings({ ...base, accessToken: "" }),
		).toBe(false);
		expect(Utils.hasRequiredSettings({ ...base, username: "" })).toBe(false);
		expect(Utils.hasRequiredSettings({ ...base, folder: "" })).toBe(false);
	});
});
