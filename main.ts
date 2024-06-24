import { Notice, Plugin } from "obsidian";

import {
	Settings,
	DEFAULT_SETTINGS,
	TemplaterSettingTab,
} from "./lib/Settings";
import { ChannelsModal, BlocksModal } from "./lib/Modals";
import FileHandler from "./lib/FileHandler";
import { Channel, Block } from "./lib/interfaces";
import Arenilla from "./lib/Arena";

const ARENA_BLOCK_URL = "https://www.are.na/block/";
const EMPTY_TEXT = "No block found. Press esc to dismiss.";
const PLACEHOLDER_TEXT = "Type name to fuzzy find.";
const INSTRUCTIONS = [
	{ command: "↑↓", purpose: "to navigate" },
	{ command: "Tab ↹", purpose: "to autocomplete" },
	{ command: "↵", purpose: "to choose item" },
	{ command: "esc", purpose: "to dismiss" },
];

export default class ArenaSync extends Plugin {
	settings: Settings;
	arena: Arenilla;

	createPermalinkFromTitle(title: string) {
		return title.replace(/-\d+$/, "");
	}

	getFrontmatterFromBlock(block: Block, channelTitle?: string) {
		const frontmatter: { [key: string]: any } = {};

		frontmatter["blockid"] = block.id;

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

	async onload() {
		await this.loadSettings();

		this.addSettingTab(new TemplaterSettingTab(this));

		this.addCommand({
			id: "create-blocks-from-channel",
			name: "Create blocks from channel",
			callback: this.createBlocksFromChannel.bind(this),
		});

		this.addCommand({
			id: "pull-block",
			name: "Pull block from Are.na",
			callback: this.pullBlock.bind(this),
		});

		this.addCommand({
			id: "push-block",
			name: "Push block to Are.na",
			callback: this.pushBlock.bind(this),
		});

		this.addCommand({
			id: "get-block-from-arena",
			name: "Get block from Are.na",
			callback: this.getBlockFromArena.bind(this),
		});

		this.addCommand({
			id: "go-to-block",
			name: "Go to block",
			callback: this.goToBlock.bind(this),
		});
	}

	onunload() {}

	async loadSettings() {
		this.settings = Object.assign(
			{},
			DEFAULT_SETTINGS,
			await this.loadData(),
		);
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}

	async createBlocksFromChannel() {
		this.arena = new Arenilla(this.settings);

		const callback = async (channel: Channel) => {
			this.arena
				.getBlocksFromChannel(channel.slug)
				.then(async (blocks) => {
					for (const block of blocks) {
						const filePath = `${block.generated_title}.md`;

						const frontData = this.getFrontmatterFromBlock(
							block,
							channel.title,
						);

						const slug = this.createPermalinkFromTitle(
							channel.title,
						);

						const content = block.content;

						try {
							await new FileHandler(this.app).writeFile(
								`${this.settings.folder}/${slug}`,
								filePath,
								content,
								frontData,
							);
						} catch (error) {
							new Notice("Error creating file");
							console.error(error);
						}
					}

					new Notice(`${channel.length} files created`);
				});
		};

		const channels = await this.arena.getChannelsFromUser();
		const modal = new ChannelsModal(
			this.app,
			channels,
			this.settings,
			false,
			callback,
		);

		modal.open();
	}

	async pullBlock() {
		const currentFile = this.app.workspace.getActiveFile();

		this.arena = new Arenilla(this.settings);

		if (!currentFile) {
			new Notice("No active file open"); // TODO: Improve error message
			return;
		}

		const frontMatter = await new FileHandler(
			this.app,
		).getFrontmatterFromFile(currentFile);

		const blockId = frontMatter?.blockid;

		if (blockId) {
			this.arena.getBlockWithID(blockId).then(async (block) => {
				const title = block.generated_title;
				const content = block.content;
				const channelTitle = frontMatter?.channel;
				const frontData = this.getFrontmatterFromBlock(
					block,
					channelTitle,
				);
				new FileHandler(this.app).updateFile(
					currentFile,
					title,
					content,
					frontData,
				);
			});
		} else {
			new Notice("No block id found in frontmatter");
		}
	}

	async pushBlock() {
		const currentFile = this.app.workspace.getActiveFile();
		this.arena = new Arenilla(this.settings);

		if (!currentFile) {
			new Notice("No active file open"); // TODO: Improve error message
			return;
		}

		const currentFileContent = await this.app.vault.read(currentFile);

		this.app.fileManager.processFrontMatter(
			currentFile,
			async (frontmatter) => {
				const blockId = frontmatter.blockid;
				if (blockId) {
					const title = currentFile.basename;
					this.arena
						.updateBlockWithContentAndBlockID(
							blockId,
							title,
							currentFileContent,
							frontmatter,
						)
						.then((_response) => {
							new Notice("Block updated");
						})
						.catch((error) => {
							console.error(error);
							new Notice("Block not updated");
						});
				} else {
					const callback = async (channel: Channel) => {
						new Notice("New block created");
						const response =
							await this.arena.createBlockWithContentAndTitle(
								currentFileContent,
								currentFile.basename,
								channel.slug,
								frontmatter,
							);

						this.app.fileManager.processFrontMatter(
							currentFile,
							async (frontmatter) => {
								frontmatter["blockid"] = response.id;
							},
						);
					};

					const channels = await this.arena.getChannelsFromUser();
					const modal = new ChannelsModal(
						this.app,
						channels,
						this.settings,
						true,
						callback,
					);

					modal.open();
				}
			},
		);
	}

	async goToBlock() {
		const currentFile = this.app.workspace.getActiveFile();
		this.arena = new Arenilla(this.settings);
		if (!currentFile) {
			new Notice("No active file open"); // TODO: Improve error message
			return;
		}

		this.app.fileManager.processFrontMatter(currentFile, (frontmatter) => {
			const blockId = frontmatter.blockid;
			if (blockId) {
				const url = `${ARENA_BLOCK_URL}${blockId}`;
				window.open(url, "_blank");
			} else {
				new Notice("No block id found in frontmatter");
			}
		});
	}

	async getBlockFromArena() {
		this.arena = new Arenilla(this.settings);

		const callback = async (channel: Channel) => {
			const callback = async (block: Block, channel: Channel) => {
				const filePath = `${block.generated_title}.md`;
				const frontData = this.getFrontmatterFromBlock(
					block,
					channel.title,
				);
				const slug = this.createPermalinkFromTitle(channel.title);

				const content = block.content;
				await new FileHandler(this.app).writeFile(
					`${this.settings.folder}/${slug}`,
					filePath,
					content,
					frontData,
				);

				new Notice(`Block created`);
				await this.app.workspace.openLinkText(filePath, "", true);
			};

			const blocks = await this.arena.getBlocksFromChannel(channel.slug);
			const modal = new BlocksModal(this.app, blocks, channel, callback);

			modal.open();
		};

		const channels = await this.arena.getChannelsFromUser();

		const modal = new ChannelsModal(
			this.app,
			channels,
			this.settings,
			false,
			callback,
		);

		modal.open();
	}
}
