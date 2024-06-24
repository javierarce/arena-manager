import { Events, Notice, Plugin } from "obsidian";

import { ARENA_BLOCK_URL, Channel, Block } from "./lib/types";
import {
	Settings,
	DEFAULT_SETTINGS,
	TemplaterSettingTab,
} from "./lib/Settings";

import { ChannelsModal, BlocksModal } from "./lib/Modals";
import FileHandler from "./lib/FileHandler";
import Arenilla from "./lib/Arena";

export default class ArenaSync extends Plugin {
	settings: Settings;
	events: Events;
	arena: Arenilla;
	fileHandler: FileHandler;

	createPermalinkFromTitle(title: string) {
		return title.replace(/-\d+$/, "");
	}

	getFrontmatterFromBlock(block: Block, channelTitle?: string) {
		const frontmatter: Record<string, string | number> = {};

		frontmatter["blockid"] = block.id;

		if (block.class) {
			frontmatter["class"] = block.class;
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

	async onload() {
		await this.loadSettings();

		this.events = new Events();
		this.fileHandler = new FileHandler(this.app, this.settings);

		this.addSettingTab(new TemplaterSettingTab(this));

		this.addCommand({
			id: "get-blocks-from-channel",
			name: "Get blocks from channel",
			callback: this.getBlocksFromChannel.bind(this),
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
			name: "Get a block from Are.na",
			callback: this.getBlockFromArena.bind(this),
		});

		this.addCommand({
			id: "go-to-block",
			name: "Go to block in Are.na",
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

	async getBlocksFromChannel() {
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
							await this.fileHandler.writeFile(
								`${this.settings.folder}/${slug}`,
								filePath,
								content,
								frontData,
							);
						} catch (error) {
							console.error(error);
							new Notice("Error creating file");
						}
					}

					new Notice(`${channel.length} files created`);
				});
		};

		const modal = new ChannelsModal(
			this.app,
			this.settings,
			false,
			this.events,
			callback,
		);

		modal.open();

		this.arena.getChannelsFromUser().then((channels) => {
			this.events.trigger("channels-load", channels);
		});
	}

	async pullBlock() {
		const currentFile = this.app.workspace.getActiveFile();

		this.arena = new Arenilla(this.settings);

		if (!currentFile) {
			new Notice("No active file open"); // TODO: Improve error message
			return;
		}

		const frontMatter =
			await this.fileHandler.getFrontmatterFromFile(currentFile);

		const blockId = frontMatter?.blockid as number;

		if (blockId) {
			this.arena.getBlockWithID(blockId).then(async (block) => {
				const title = block.generated_title;
				let content = block.content;

				if (block.class === "Image") {
					const imageUrl = block.image?.display.url;
					content = `![](${imageUrl})`;
				}

				const channelTitle = frontMatter?.channel as string;
				const frontData = this.getFrontmatterFromBlock(
					block,
					channelTitle,
				);
				this.fileHandler.updateFile(
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

					const modal = new ChannelsModal(
						this.app,
						this.settings,
						true,
						this.events,
						callback,
					);

					this.arena.getChannelsFromUser().then((channels) => {
						this.events.trigger("channels-load", channels);
					});

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

				let content = block.content;
				if (block.class === "Image") {
					const imageUrl = block.image?.display.url;
					content = `![](${imageUrl})`;
				}

				await this.fileHandler.writeFile(
					`${this.settings.folder}/${slug}`,
					filePath,
					content,
					frontData,
				);

				new Notice(`Block created`);
				await this.app.workspace.openLinkText(filePath, "", true);
			};

			const modal = new BlocksModal(
				this.app,
				channel,
				this.events,
				callback,
			);

			modal.open();

			this.arena.getBlocksFromChannel(channel.slug).then((channels) => {
				this.events.trigger("blocks-load", channels);
			});
		};

		const modal = new ChannelsModal(
			this.app,
			this.settings,
			false,
			this.events,
			callback,
		);

		modal.open();

		this.arena.getChannelsFromUser().then((channels) => {
			this.events.trigger("channels-load", channels);
		});
	}
}
