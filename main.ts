import { Events, Notice, Plugin } from "obsidian";

import { ARENA_BLOCK_URL, Channel, Block } from "./lib/types";
import {
	Settings,
	DEFAULT_SETTINGS,
	TemplaterSettingTab,
} from "./lib/Settings";

import { ChannelsModal, BlocksModal } from "./lib/Modals";
import FileHandler from "./lib/FileHandler";
import Arena from "./lib/Arena";

export default class ArenaManagerPlugin extends Plugin {
	settings: Settings;
	events: Events;
	arena: Arena;
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

	hasRequiredSettings() {
		const { username, folder, accessToken } = this.settings;

		if (!username || !folder || !accessToken) {
			return false;
		}

		return true;
	}

	async onload() {
		await this.loadSettings();

		this.events = new Events();
		this.fileHandler = new FileHandler(this.app, this.settings);
		this.arena = new Arena(this.settings);

		this.addSettingTab(new TemplaterSettingTab(this));

		this.addCommand({
			id: "get-blocks-from-channel",
			name: "Get blocks from channel",
			checkCallback: (checking: boolean) => {
				if (this.hasRequiredSettings()) {
					if (!checking) {
						this.getBlocksFromChannel();
					}
					return true;
				}

				return false;
			},
		});

		this.addCommand({
			id: "pull-block",
			name: "Pull block from Are.na",
			checkCallback: (checking: boolean) => {
				if (this.hasRequiredSettings()) {
					if (!checking) {
						this.pullBlock();
					}
					return true;
				}

				return false;
			},
		});

		this.addCommand({
			id: "push-note",
			name: "Push note to Are.na",
			checkCallback: (checking: boolean) => {
				const currentFile = this.app.workspace.getActiveFile();

				if (currentFile && this.hasRequiredSettings()) {
					if (!checking) {
						this.pushBlock();
					}
					return true;
				}

				return false;
			},
		});

		this.addCommand({
			id: "get-block-from-arena",
			name: "Get a block from Are.na",
			checkCallback: (checking: boolean) => {
				if (this.hasRequiredSettings()) {
					if (!checking) {
						this.getBlockFromArena();
					}
					return true;
				}

				return false;
			},
		});

		this.addCommand({
			id: "go-to-block",
			name: "Go to block in Are.na",
			checkCallback: (checking: boolean) => {
				const currentFile = this.app.workspace.getActiveFile();

				if (currentFile) {
					if (!checking) {
						this.goToBlock();
					}
					return true;
				}

				return false;
			},
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
		const callback = async (channel: Channel) => {
			this.arena
				.getBlocksFromChannel(channel.slug)
				.then(async (blocks) => {
					for (const block of blocks) {
						const fileName = block.generated_title
							? block.generated_title
							: block.title;

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
								fileName,
								content,
								frontData,
							);
						} catch (error) {
							console.error(error);
							new Notice("Error creating file");
						}
					}

					new Notice(`${channel.length} notes created`);
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

					await this.arena
						.updateBlockWithContentAndBlockID(
							blockId,
							title,
							currentFileContent,
							frontmatter,
						)
						.then((response: any) => {
							if (response.status === 422) {
								new Notice(`Block not updated`);
								return;
							}
							new Notice("Block updated");
						})
						.catch((error) => {
							console.error(error);
							new Notice("Block not updated");
						});
				} else {
					const callback = async (channel: Channel) => {
						await this.arena
							.createBlockWithContentAndTitle(
								currentFileContent,
								currentFile.basename,
								channel.slug,
								frontmatter,
							)
							.then((response: any) => {
								if (response.code === 422) {
									new Notice(`Error: ${response.message}`);
									return;
								}

								this.app.fileManager.processFrontMatter(
									currentFile,
									async (frontmatter) => {
										frontmatter["blockid"] = response.id;
									},
								);

								new Notice("Block updated");
							})
							.catch((error) => {
								console.error(error);
								new Notice("Block not updated");
							});
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
		const callback = async (channel: Channel) => {
			const callback = async (block: Block, channel: Channel) => {
				const fileName = `${block.generated_title}`;
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
					fileName,
					content,
					frontData,
				);

				new Notice(`Block created`);
				await this.app.workspace.openLinkText(fileName, "", true);
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
