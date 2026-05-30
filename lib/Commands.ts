import { App, Notice, Events } from "obsidian";

import Arena from "./Arena";
import FileHandler from "./FileHandler";
import Utils from "./Utils";
import { ARENA_BLOCK_URL, Channel, Block } from "./types";
import { ChannelsModal, BlocksModal, URLModal } from "./Modals";
import { Settings } from "./Settings";

// Parse an are.na block id from a pasted block URL or a bare numeric id.
// Returns null when the input contains neither.
export function getIDFromURL(url: string): number | null {
	const blockMatch = url.match(/block\/(\d+)/);
	if (blockMatch) {
		return Number(blockMatch[1]);
	}

	if (/^\d+$/.test(url)) {
		return Number(url);
	}

	return null;
}

export default class Commands {
	app: App;
	settings: Settings;
	arena: Arena;
	fileHandler: FileHandler;

	constructor(app: App, settings: Settings) {
		this.app = app;
		this.settings = settings;
		this.arena = new Arena(settings);
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
						.then(() => {
							new Notice("Block updated");
						})
						.catch((error) => {
							console.error(error);
							new Notice(`Block not updated: ${error.message}`);
						});
				} else {
					// A fresh emitter per invocation; a shared one would
					// accumulate modal listeners that never get removed.
					const events = new Events();

					const onSelectChannel = async (channel: Channel) => {
						await this.arena
							.createBlockWithContentAndTitle(
								currentFileContent,
								currentFile.basename,
								channel.slug,
								frontmatter,
							)
							.then((response: any) => {
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

								new Notice("Block created");
							})
							.catch((error) => {
								console.error(error);
								new Notice(`Block not created: ${error.message}`);
							});
					};

					new ChannelsModal(
						this.app,
						this.settings,
						true,
						events,
						onSelectChannel,
					).open();

					this.arena.getChannelsFromUser().then((channels) => {
						events.trigger("channels-load", channels);
					});
				}
			},
		);
	}

	async getBlocksFromChannel() {
		const events = new Events();

		const callback = async (channel: Channel) => {
			let notesCreated = 0;
			new Notice(`Getting blocks from ${channel.title}…`);

			this.arena
				.getBlocksFromChannel(channel.slug)
				.then(async (blocks) => {
					for (const block of blocks) {
						if (
							block.class === "Channel" ||
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

						const content = Utils.getBlockContent(block);

						try {
							await this.fileHandler.writeFile(
								`${this.settings.folder}/${slug}`,
								fileName,
								content,
								frontData,
								Utils.getBlockAttachment(block),
							);
							notesCreated++;
						} catch (error) {
							console.error(error);
							new Notice("Error creating file");
						}
					}

					new Notice(
						`${notesCreated} note${notesCreated !== 1 ? "s" : ""} created`,
					);
				});
		};

		const modal = new ChannelsModal(
			this.app,
			this.settings,
			false,
			events,
			callback,
		);

		modal.open();

		this.arena.getChannelsFromUser().then((channels) => {
			events.trigger("channels-load", channels);
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
				const channelTitle = frontMatter?.channel as string;

				const frontData = Utils.getFrontmatterFromBlock(
					block,
					channelTitle,
				);

				const content = Utils.getBlockContent(block);

				this.fileHandler.renameFile(
					currentFile,
					title,
					content,
					frontData,
					Utils.getBlockAttachment(block),
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
		const events = new Events();

		const onSelectChannel = async (channel: Channel) => {
			const onSelectBlock = async (block: Block, channel: Channel) => {
				const fileName = `${block.generated_title}`;
				const frontData = Utils.getFrontmatterFromBlock(
					block,
					channel.title,
				);
				const slug = Utils.createPermalinkFromTitle(channel.title);

				const content = Utils.getBlockContent(block);

				await this.fileHandler.writeFile(
					`${this.settings.folder}/${slug}`,
					fileName,
					content,
					frontData,
					Utils.getBlockAttachment(block),
				);

				new Notice(`Note created`);
				await this.app.workspace.openLinkText(fileName, "", true);
			};

			new BlocksModal(
				this.app,
				channel,
				events,
				onSelectBlock,
			).open();

			this.arena.getBlocksFromChannel(channel.slug).then((channels) => {
				events.trigger("blocks-load", channels);
			});
		};

		new ChannelsModal(
			this.app,
			this.settings,
			false,
			events,
			onSelectChannel,
		).open();

		this.arena.getChannelsFromUser().then((channels) => {
			events.trigger("channels-load", channels);
		});
	}

	async getBlockByID() {
		new URLModal(this.app, (url: string) => {
			const blockId = getIDFromURL(url);

			if (blockId !== null && blockId > 0) {
				this.arena
					.getBlockWithID(blockId)
					.then(async (block) => {
						const fileName = `${block.generated_title}`;
						const frontData = Utils.getFrontmatterFromBlock(block);

						const content = Utils.getBlockContent(block);

						await this.fileHandler.writeFile(
							`${this.settings.folder}`,
							fileName,
							content,
							frontData,
							Utils.getBlockAttachment(block),
						);

						new Notice(`Note created`);
						await this.app.workspace.openLinkText(
							fileName,
							"",
							true,
						);
					})
					.catch((error) => {
						console.error(error);
						new Notice("Error getting block");
					});
			}
		}).open();
	}
}
