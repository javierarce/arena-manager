import { ArenaSettings, Channel, Block } from "./interfaces";

export default class Arenilla {
	settings: ArenaSettings;

	constructor(settings: ArenaSettings) {
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
		frontmatter: any,
	): Promise<void> {
		title = frontmatter.title || title;
		const description = frontmatter.description;
		content = content.replace(/---[\s\S]*?---\n/g, "");

		fetch(`https://api.are.na/v2/blocks/${id}`, {
			method: "PUT",
			headers: {
				Authorization: `Bearer ${this.settings.accessToken}`,
				"Content-Type": "application/json",
			},
			body: JSON.stringify({
				title,
				content,
				description,
			}),
		});
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
			`https://api.are.na/v2/channels/${channelSlug}/contents?v=${Date.now()}`,
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
		frontmatter: any,
	): Promise<Block> {
		const title = frontmatter.title || generated_title;
		const description = frontmatter.description;
		content = content.replace(/---[\s\S]*?---\n/g, "");

		if (!title && !description && content.length === 0) {
			console.log("Content is empty");
			return {} as Block;
		}

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
