import { requestUrl } from "obsidian";
import {
	ArenaBlock,
	ArenaChannelsResponse,
	ArenaContentsResponse,
	Channel,
	Block,
} from "./types";
import type { Settings } from "./Settings";
import { normalizeBlock, normalizeChannel } from "./normalize";

// v3 caps `per` at 100, so paginated endpoints must be fetched page by page.
const PER_PAGE = 100;

// Extract a human-readable message from a v3 error response. v3 returns either
// `{ message }` (validation errors) or `{ title }` (e.g. Not Found).
function getErrorMessage(response: { status: number; json?: unknown }): string {
	try {
		const body = response.json as { message?: string; title?: string };
		if (body?.message) return body.message;
		if (body?.title) return body.title;
	} catch {
		// Non-JSON error body; fall through to the status-based message.
	}
	return `Request failed with status ${response.status}`;
}

export default class Arena {
	settings: Settings;

	constructor(settings: Settings) {
		this.settings = settings;
	}

	async getChannelsFromUser(): Promise<Channel[]> {
		// v3 removed `/users/:id/channels`; a user's channels are their
		// contents filtered to the Channel type.
		const baseUrl = `https://api.are.na/v3/users/${this.settings.username}/contents`;
		const headers = {
			Authorization: `Bearer ${this.settings.accessToken}`,
		};

		const channels: Channel[] = [];
		let page = 1;
		let hasMorePages = true;

		while (hasMorePages) {
			const url = `${baseUrl}?type=Channel&page=${page}&per=${PER_PAGE}&v=${Date.now()}`;

			try {
				const response = await requestUrl({ url, headers });

				if (response.status !== 200) {
					throw new Error(`HTTP error! Status: ${response.status}`);
				}

				const data = response.json as ArenaChannelsResponse;

				for (const raw of data.data) {
					channels.push(normalizeChannel(raw));
				}

				hasMorePages = data.meta?.has_more_pages ?? false;
				page += 1;
			} catch (error) {
				console.error("Error fetching channels:", error);
				break;
			}
		}

		return channels;
	}

	async updateBlockWithContentAndBlockID(
		id: number,
		title: string,
		content: string,
		frontmatter: Record<string, string | number> = {},
	): Promise<any> {
		const newTitle =
			typeof frontmatter.title === "string" ? frontmatter.title : title;
		const description = frontmatter.description;
		content = content.replace(/---[\s\S]*?---\n/g, "");

		const response = await requestUrl({
			url: `https://api.are.na/v3/blocks/${id}`,
			method: "PUT",
			throw: false,
			headers: {
				Authorization: `Bearer ${this.settings.accessToken}`,
				"Content-Type": "application/json",
			},
			body: JSON.stringify({
				title: newTitle,
				content,
				description,
			}),
		});

		if (response.status >= 400) {
			throw new Error(getErrorMessage(response));
		}

		return response.json;
	}

	async getBlockWithID(id: number): Promise<Block> {
		const url = `https://api.are.na/v3/blocks/${id}?v=${Date.now()}`;
		return requestUrl({
			url,
			headers: {
				Authorization: `Bearer ${this.settings.accessToken}`,
			},
		})
			.then((response) => response.json as ArenaBlock)
			.then((data) => normalizeBlock(data));
	}

	async getBlocksFromChannel(channelSlug: string): Promise<Block[]> {
		const headers = {
			Authorization: `Bearer ${this.settings.accessToken}`,
		};

		const blocks: Block[] = [];
		let page = 1;
		let hasMorePages = true;

		while (hasMorePages) {
			const url = `https://api.are.na/v3/channels/${channelSlug}/contents?page=${page}&per=${PER_PAGE}&v=${Date.now()}`;

			const response = await requestUrl({ url, headers });

			if (response.status !== 200) {
				throw new Error(`HTTP error! Status: ${response.status}`);
			}

			const data = response.json as ArenaContentsResponse;

			for (const raw of data.data) {
				blocks.push(normalizeBlock(raw));
			}

			hasMorePages = data.meta?.has_more_pages ?? false;
			page += 1;
		}

		return blocks.sort((a, b) => b.position - a.position);
	}

	async createBlockWithContentAndTitle(
		content: string,
		generated_title: string,
		channelSlug: string,
		frontmatter: Record<string, string | number> = {},
	): Promise<any> {
		const title = frontmatter.title || generated_title;
		const description = frontmatter.description;
		content = content.replace(/---[\s\S]*?---\n/g, "");

		// v3 creates blocks at POST /v3/blocks: `content` became `value`, and the
		// target channel moved from the URL into `channel_ids` (which accepts slugs).
		const response = await requestUrl({
			url: `https://api.are.na/v3/blocks`,
			method: "POST",
			throw: false,
			headers: {
				Authorization: `Bearer ${this.settings.accessToken}`,
				"Content-Type": "application/json",
			},
			body: JSON.stringify({
				value: content,
				title,
				description,
				channel_ids: [channelSlug],
			}),
		});

		if (response.status >= 400) {
			throw new Error(getErrorMessage(response));
		}

		return response.json;
	}
}
