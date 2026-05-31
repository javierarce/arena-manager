import { Attachment, Block } from "./types";
import { Settings } from "./Settings";

class Utils {
	createPermalinkFromTitle(title: string) {
		return title.replace(/-\d+$/, "");
	}

	// Image and Link blocks have no usable markdown body; represent them as an
	// embedded image pointing at the block's display URL. Embed (Media) blocks
	// — YouTube, Vimeo, etc. — carry their iframe HTML, which Obsidian renders as
	// a playable embed in reading view. Everything else uses its own content.
	getBlockContent(block: Block): string {
		if (block.class === "Image" || block.class === "Link") {
			return `![](${block.image?.display.url})`;
		}
		if (block.embed?.html) {
			return block.embed.html;
		}
		return block.content;
	}

	getBlockAttachment(block: Block): Attachment | undefined {
		return block.class === "Attachment" ? block.attachment : undefined;
	}

	// The binary a note should embed locally when downloading is enabled: a real
	// Attachment block's file, or an Image/Link block's image. Returning an
	// Attachment-shaped descriptor lets images reuse the attachment download path
	// (which then rewrites the note body to `![[local file]]`).
	getDownloadable(block: Block): Attachment | undefined {
		if (block.class === "Attachment") {
			return block.attachment;
		}
		if (block.class === "Image" || block.class === "Link") {
			return this.imageToAttachment(block);
		}
		return undefined;
	}

	private imageToAttachment(block: Block): Attachment | undefined {
		const url = block.image?.display.url;
		if (!url) {
			return undefined;
		}
		const extension = this.getImageExtension(block.image);
		return {
			url,
			extension,
			file_name: block.image?.filename ?? `${block.id}.${extension}`,
			file_size: 0,
		};
	}

	// are.na's display URL is a resized CDN link with no extension, so derive one
	// from the original filename, then the content type, falling back to jpg.
	private getImageExtension(image: Block["image"]): string {
		const fromFilename = image?.filename?.split(".").pop();
		if (fromFilename && /^[a-z0-9]{1,5}$/i.test(fromFilename)) {
			return fromFilename.toLowerCase();
		}
		const contentType = image?.content_type;
		if (contentType?.startsWith("image/")) {
			const subtype = contentType
				.slice("image/".length)
				.replace("+xml", "");
			return subtype === "jpeg" ? "jpg" : subtype;
		}
		return "jpg";
	}

	getFrontmatterFromBlock(block: Block, channelTitle?: string) {
		const frontmatter: Record<string, string | number> = {};

		frontmatter["blockid"] = block.id;

		if (block.class) {
			frontmatter["class"] = block.class;
		}

		if (block.title) {
			frontmatter["title"] = block.title;
		}

		if (block.description) {
			frontmatter["description"] = block.description;
		}

		if (block.user?.slug) {
			frontmatter["user"] = block.user.slug;
		}

		if (block.source?.title) {
			frontmatter["source title"] = block.source.title;
		}

		if (block.source?.url) {
			frontmatter["source url"] = block.source.url;
		}

		if (channelTitle) {
			frontmatter["channel"] = channelTitle;
		}

		return frontmatter;
	}

	hasRequiredSettings(settings: Settings) {
		const { username, folder, accessToken } = settings;

		if (!username || !folder || !accessToken) {
			return false;
		}

		return true;
	}
}

export default new Utils();
