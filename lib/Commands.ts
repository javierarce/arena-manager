import { App, Notice, Events } from "obsidian";

import Arena from "./Arena";
import FileHandler from "./FileHandler";
import Utils from "./Utils";
import { ARENA_BLOCK_URL, Channel, Block } from "./types";
import {
	ChannelsModal,
	BlocksModal,
	InputModal,
	ChannelSource,
	ChannelSourceModal,
} from "./Modals";
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

// Parse an are.na channel slug from a pasted channel URL or a bare slug.
// Channel URLs look like `are.na/{user}/{channel-slug}`, so the slug is the last
// path segment. A bare slug is returned untouched. Block URLs/ids return null —
// they aren't channels (use getIDFromURL for those).
export function getSlugFromURL(input: string): string | null {
	let value = input.trim();
	if (!value) {
		return null;
	}

	if (/\bblock\/\d+/.test(value) || /^\d+$/.test(value)) {
		return null;
	}

	// Drop the query string / hash, then any trailing slashes.
	value = value.split(/[?#]/)[0].replace(/\/+$/, "");

	const slug = value.substring(value.lastIndexOf("/") + 1);
	return slug || null;
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

	// Ask where the channel should come from (your channels, another user's
	// channels, or a pasted channel URL), then hand the resolved channel to
	// `onResolve`. Shared by getBlocksFromChannel and getBlockFromArena.
	private resolveChannel(onResolve: (channel: Channel) => void) {
		new ChannelSourceModal(
			this.app,
			this.settings.username,
			(source: ChannelSource) => {
				if (source === "your-channels") {
					this.openChannelPicker(this.settings.username, onResolve);
				} else if (source === "other-user") {
					this.openOtherUserChannelPicker(onResolve);
				} else {
					this.openChannelFromURL(onResolve);
				}
			},
		).open();
	}

	// Fuzzy-pick a channel from a given user's (accessible) channels.
	private openChannelPicker(
		username: string,
		onResolve: (channel: Channel) => void,
	) {
		const events = new Events();

		new ChannelsModal(
			this.app,
			this.settings,
			false,
			events,
			onResolve,
			username,
		).open();

		void this.arena
			.getChannelsFromUser(username)
			.then((channels) => {
				events.trigger("channels-load", channels);
			})
			.catch((error) => {
				console.error(error);
				new Notice(`Couldn't load @${username}'s channels.`);
			});
	}

	// Prompt for a username, then pick from that user's channels.
	private openOtherUserChannelPicker(onResolve: (channel: Channel) => void) {
		new InputModal(
			this.app,
			(value: string) => {
				const username = value.trim().replace(/^@/, "");
				if (!username) {
					return "Enter an are.na username.";
				}
				this.openChannelPicker(username, onResolve);
				return null;
			},
			{
				placeholder: "Enter an are.na username",
			},
		).open();
	}

	// Prompt for a channel URL (or slug) and resolve it directly.
	private openChannelFromURL(onResolve: (channel: Channel) => void) {
		new InputModal(
			this.app,
			(value: string) => {
				const slug = getSlugFromURL(value);
				if (!slug) {
					return "That doesn't look like an are.na channel URL.";
				}
				// Resolve the channel before closing so a missing/private/typo'd
				// slug surfaces as an inline error instead of a dead-end notice.
				return this.arena
					.getChannel(slug)
					.then((channel) => {
						onResolve(channel);
						return null;
					})
					.catch((error) => {
						console.error(error);
						return "Couldn't find that channel. Check the URL and try again.";
					});
			},
			{
				placeholder: "Enter an are.na channel URL",
			},
		).open();
	}

	async getBlocksFromChannel() {
		this.resolveChannel((channel) => this.importBlocksFromChannel(channel));
	}

	private importBlocksFromChannel(channel: Channel) {
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

					const slug = Utils.createPermalinkFromTitle(channel.title);

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
		this.resolveChannel((channel) => this.pickBlockFromChannel(channel));
	}

	private pickBlockFromChannel(channel: Channel) {
		const events = new Events();

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
	}

	async getBlockByID() {
		new InputModal(this.app, (url: string) => {
			const blockId = getIDFromURL(url);

			if (blockId === null || blockId <= 0) {
				return "That doesn't look like an are.na block URL or id.";
			}

			// Fetch and save before closing so an unknown/private block id shows
			// an inline error rather than dismissing the prompt with a notice.
			return this.arena
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
					return null;
				})
				.catch((error) => {
					console.error(error);
					return `Couldn't import that block. Check the id or URL and try again.`;
				});
		}).open();
	}
}
