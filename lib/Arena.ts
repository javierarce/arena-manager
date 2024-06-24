import { Channel, Block } from "./types";
import { Settings } from "./Settings";

const BLOCKS_LIMIT = 1000;

export default class Arenilla {
	settings: Settings;

	constructor(settings: Settings) {
		this.settings = settings;
	}

	async getChannelsFromUser(): Promise<Channel[]> {
		return fetch(
			`https://api.are.na/v2/users/${this.settings.username}/channels?v=${Date.now()}`,
			{
				headers: {
					Authorization: `Bearer ${this.settings.accessToken}`,
				},
			},
		)
			.then((response) => response.json())
			.then((data) => {
				return data.channels;
			});
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

			const response = await fetch(`https://api.are.na/v2/blocks/${id}`, {
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
		return fetch(`https://api.are.na/v2/blocks/${id}?v=${Date.now()}`, {
			headers: {
				Authorization: `Bearer ${this.settings.accessToken}`,
			},
		})
			.then((response) => response.json())
			.then((data) => {
				return data;
			});
	}

	async getBlocksFromChannel(channelSlug: string): Promise<Block[]> {
		return fetch(
			`https://api.are.na/v2/channels/${channelSlug}/contents?per=${BLOCKS_LIMIT}&v=${Date.now()}`,
			{
				headers: {
					Authorization: `Bearer ${this.settings.accessToken}`,
				},
			},
		)
			.then((response) => response.json())
			.then((data) => {
				return data.contents;
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

		return fetch(`https://api.are.na/v2/channels/${channelSlug}/blocks`, {
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
		}).then((response) => response.json());
	}
}
