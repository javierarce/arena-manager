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
			new Notice("Open a note to push it to are.na.");
			return;
		}

		const currentFileContent = await this.app.vault.read(currentFile);

		// processFrontMatter expects a synchronous callback; the network work it
		// triggers is fire-and-forget (its Notices report completion).
		void this.app.fileManager.processFrontMatter(currentFile, (frontmatter) => {
			const blockId = frontmatter.blockid;
			if (blockId) {
				const title = currentFile.basename;

				if (frontmatter.user !== this.settings.username) {
					new Notice(
						`You don't have permission to update ${frontmatter.user}'s block`,
					);
					return;
				}

				void this.arena
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

				const onSelectChannel = (channel: Channel) => {
					void this.arena
						.createBlockWithContentAndTitle(
							currentFileContent,
							currentFile.basename,
							channel.slug,
							frontmatter,
						)
						.then((response) => {
							void this.app.fileManager.processFrontMatter(
								currentFile,
								(fm) => {
									fm["blockid"] = response.id;
									fm["channel"] =
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

				void this.arena
					.getChannelsFromUser()
					.then((channels) => {
						events.trigger("channels-load", channels);
					})
					.catch((error) => {
						console.error(error);
						new Notice("Couldn't load your channels.");
					});
			}
		});
	}

	async getBlocksFromChannel() {
		const events = new Events();

		const callback = (channel: Channel) => {
			let notesCreated = 0;
			let failed = 0;
			new Notice(`Getting blocks from ${channel.title}…`);

			void this.arena
				.getBlocksFromChannel(channel.slug)
				.then(async (blocks) => {
					for (const block of blocks) {
						// Skip nested channels; every other type (including Embed
						// media) is imported as a note.
						if (block.class === "Channel") {
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
								Utils.getDownloadable(block),
							);
							notesCreated++;
						} catch (error) {
							console.error(error);
							failed++;
						}
					}

					const saved = `${notesCreated} note${notesCreated !== 1 ? "s" : ""} saved`;
					new Notice(failed ? `${saved}, ${failed} failed` : saved);
				})
				.catch((error) => {
					console.error(error);
					new Notice(`Couldn't get blocks from ${channel.title}.`);
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

		void this.arena
			.getChannelsFromUser()
			.then((channels) => {
				events.trigger("channels-load", channels);
			})
			.catch((error) => {
				console.error(error);
				new Notice("Couldn't load your channels.");
			});
	}

	async pullBlock() {
		const currentFile = this.app.workspace.getActiveFile();

		if (!currentFile) {
			new Notice("Open a note to pull it from are.na.");
			return;
		}

		const frontMatter =
			await this.fileHandler.getFrontmatterFromFile(currentFile);

		const blockId = frontMatter?.blockid as number;

		if (blockId) {
			void this.arena
				.getBlockWithID(blockId)
				.then(async (block) => {
					const title = block.generated_title;
					const channelTitle = frontMatter?.channel as string;

					const frontData = Utils.getFrontmatterFromBlock(
						block,
						channelTitle,
					);

					const content = Utils.getBlockContent(block);

					await this.fileHandler.renameFile(
						currentFile,
						title,
						content,
						frontData,
						Utils.getDownloadable(block),
					);

					new Notice("Note updated");
				})
				.catch((error) => {
					console.error(error);
					new Notice(`Couldn't pull block: ${error.message}`);
				});
		} else {
			new Notice("No block id found in frontmatter");
		}
	}

	async goToBlock() {
		const currentFile = this.app.workspace.getActiveFile();

		if (!currentFile) {
			new Notice("Open a note to go to its block on are.na.");
			return;
		}

		void this.app.fileManager.processFrontMatter(
			currentFile,
			(frontmatter) => {
				const blockId = frontmatter.blockid;
				if (blockId) {
					const url = `${ARENA_BLOCK_URL}${blockId}`;
					window.open(url, "_blank");
				} else {
					new Notice("No block id found in frontmatter");
				}
			},
		);
	}

	async getBlockFromArena() {
		const events = new Events();

		const onSelectChannel = (channel: Channel) => {
			const onSelectBlock = (block: Block, channel: Channel) => {
				const fileName = `${block.generated_title}`;
				const frontData = Utils.getFrontmatterFromBlock(
					block,
					channel.title,
				);
				const slug = Utils.createPermalinkFromTitle(channel.title);

				const content = Utils.getBlockContent(block);

				void this.fileHandler
					.writeFile(
						`${this.settings.folder}/${slug}`,
						fileName,
						content,
						frontData,
						Utils.getDownloadable(block),
					)
					.then(() => {
						new Notice("Note saved");
						return this.app.workspace.openLinkText(
							this.fileHandler.getSafeFilename(fileName),
							"",
							true,
						);
					})
					.catch((error) => {
						console.error(error);
						new Notice(`Couldn't save block: ${error.message}`);
					});
			};

			new BlocksModal(this.app, channel, events, onSelectBlock).open();

			void this.arena
				.getBlocksFromChannel(channel.slug)
				.then((blocks) => {
					events.trigger("blocks-load", blocks);
				})
				.catch((error) => {
					console.error(error);
					new Notice("Couldn't load blocks from that channel.");
				});
		};

		new ChannelsModal(
			this.app,
			this.settings,
			false,
			events,
			onSelectChannel,
		).open();

		void this.arena
			.getChannelsFromUser()
			.then((channels) => {
				events.trigger("channels-load", channels);
			})
			.catch((error) => {
				console.error(error);
				new Notice("Couldn't load your channels.");
			});
	}

	async getBlockByID() {
		new URLModal(this.app, (url: string) => {
			const blockId = getIDFromURL(url);

			if (blockId !== null && blockId > 0) {
				void this.arena
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
							Utils.getDownloadable(block),
						);

						new Notice("Note saved");
						await this.app.workspace.openLinkText(
							this.fileHandler.getSafeFilename(fileName),
							"",
							true,
						);
					})
					.catch((error) => {
						console.error(error);
						new Notice(`Couldn't import block: ${error.message}`);
					});
			} else {
				new Notice("That doesn't look like an are.na block URL or id.");
			}
		}).open();
	}
}
