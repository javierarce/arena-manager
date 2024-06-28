import { App, Notice, Events } from "obsidian";

import Arena from "./Arena";
import FileHandler from "./FileHandler";
import Utils from "./Utils";
import { ARENA_BLOCK_URL, Channel, Block } from "./types";
import { ChannelsModal, BlocksModal } from "./Modals";
import { Settings } from "./Settings";

export default class Commands {
	app: App;
	settings: Settings;
	events: Events;
	arena: Arena;
	fileHandler: FileHandler;

	constructor(app: App, settings: Settings) {
		this.app = app;
		this.settings = settings;
		this.arena = new Arena(settings);
		this.events = new Events();
		this.fileHandler = new FileHandler(app, settings);
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

					if (frontmatter.user !== this.settings.username) {
						return new Notice(
							`You don't have permission to update ${frontmatter.user}'s block`,
						);
					}

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
										frontmatter["channel"] =
											Utils.createPermalinkFromTitle(
												channel.title,
											);
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

	async getBlocksFromChannel() {
		const callback = async (channel: Channel) => {
			let notesCreated = 0;
			new Notice(`Getting blocks from ${channel.title}…`);

			this.arena
				.getBlocksFromChannel(channel.slug)
				.then(async (blocks) => {
					for (const block of blocks) {
						if (
							block.class === "Channel" ||
							block.class === "Attachment" ||
							block.class === "Media"
						) {
							continue;
						}
						const fileName = block.generated_title
							? block.generated_title
							: block.title;

						const frontData = Utils.getFrontmatterFromBlock(
							block,
							channel.title,
						);

						const slug = Utils.createPermalinkFromTitle(
							channel.title,
						);

						try {
							await this.fileHandler.writeFile(
								`${this.settings.folder}/${slug}`,
								fileName,
								block.content,
								frontData,
							);
							notesCreated++;
						} catch (error) {
							console.error(error);
							new Notice("Error creating file");
						}
					}

					new Notice(
						`${notesCreated} note${notesCreated > 1 ? "s" : ""} created`,
					);
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
				const frontData = Utils.getFrontmatterFromBlock(
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
				const frontData = Utils.getFrontmatterFromBlock(
					block,
					channel.title,
				);
				const slug = Utils.createPermalinkFromTitle(channel.title);

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
