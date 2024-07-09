import { requestUrl } from "obsidian";
import { Channel, Block } from "./types";
import { Settings } from "./Settings";

const BLOCKS_LIMIT = 1000;

export default class Arena {
	settings: Settings;

	constructor(settings: Settings) {
		this.settings = settings;
	}

	async getChannelsFromUser(): Promise<Channel[]> {
		const baseUrl = `https://api.are.na/v2/users/${this.settings.username}/channels`;
		const headers = {
			Authorization: `Bearer ${this.settings.accessToken}`,
		};

		let allChannels: Channel[] = [];
		let currentPage = 1;
		let totalPages = 1;

		while (currentPage <= totalPages) {
			const url = `${baseUrl}?page=${currentPage}&v=${Date.now()}`;

			try {
				const response = await requestUrl({
					url,
					headers,
				});

				if (response.status !== 200) {
					throw new Error(`HTTP error! Status: ${response.status}`);
				}

				const data = response.json;

				allChannels = allChannels.concat(data.channels);
				totalPages = data.total_pages;
				currentPage++;
			} catch (error) {
				console.error("Error fetching channels:", error);
				break;
			}
		}

		return allChannels;
	}

	async updateBlockWithContentAndBlockID(
		id: number,
		title: string,
		content: string,
		frontmatter: Record<string, string | number> = {},
	): Promise<any> {
		try {
			const newTitle =
				typeof frontmatter.title === "string"
					? frontmatter.title
					: title;
			const description = frontmatter.description;
			content = content.replace(/---[\s\S]*?---\n/g, "");

			const url = `https://api.are.na/v2/blocks/${id}`;
			const response = await requestUrl({
				url,
				method: "PUT",
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

			return response;
		} catch (error) {
			console.error("Failed to update block:", error);
			throw error;
		}
	}

	async getBlockWithID(id: number): Promise<Block> {
		const url = `https://api.are.na/v2/blocks/${id}?v=${Date.now()}`;
		return requestUrl({
			url,
			headers: {
				Authorization: `Bearer ${this.settings.accessToken}`,
			},
		})
			.then((response) => response.json)
			.then((data) => {
				return data;
			});
	}

	async getBlocksFromChannel(channelSlug: string): Promise<Block[]> {
		const url = `https://api.are.na/v2/channels/${channelSlug}/contents?per=${BLOCKS_LIMIT}&v=${Date.now()}`;
		return requestUrl({
			url,
			headers: {
				Authorization: `Bearer ${this.settings.accessToken}`,
			},
		})
			.then((response) => response.json)
			.then((data) => {
				return data.contents.sort((a: Block, b: Block) => {
					return b.position - a.position;
				});
			});
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

		const url = `https://api.are.na/v2/channels/${channelSlug}/blocks`;
		return requestUrl({
			url,
			method: "POST",
			headers: {
				Authorization: `Bearer ${this.settings.accessToken}`,
				"Content-Type": "application/json",
			},
			body: JSON.stringify({
				title,
				content,
				description,
			}),
		}).then((response) => response.json);
	}
}
