import { Attachment, Block } from "./types";
import { Settings } from "./Settings";

class Utils {
	createPermalinkFromTitle(title: string) {
		return title.replace(/-\d+$/, "");
	}

	// Image and Link blocks have no usable markdown body; represent them as an
	// embedded image pointing at the block's display URL. Everything else uses
	// its own content.
	getBlockContent(block: Block): string {
		if (block.class === "Image" || block.class === "Link") {
			return `![](${block.image?.display.url})`;
		}
		return block.content;
	}

	getBlockAttachment(block: Block): Attachment | undefined {
		return block.class === "Attachment" ? block.attachment : undefined;
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
