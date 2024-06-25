import { Events, App, FuzzySuggestModal, FuzzyMatch } from "obsidian";
import { Settings } from "./Settings";
import { Channel, Block } from "./types";

const INSTRUCTIONS = [
	{ command: "↑↓", purpose: "to navigate" },
	{ command: "Tab ↹", purpose: "to autocomplete" },
	{ command: "↵", purpose: "to choose item" },
	{ command: "esc", purpose: "to dismiss" },
];

export class ChannelsModal extends FuzzySuggestModal<Channel> {
	channels: Channel[];
	settings: Settings;
	showEmptyChannels: boolean;
	events: Events;
	callback: (channel: Channel) => void;

	onOpen(): void {
		const $prompt = this.containerEl.querySelector(".prompt-results");
		if ($prompt) {
			$prompt.addClass("is-loading");
		}
		this.events.on("channels-load", (channels: Channel[]) => {
			this.channels = channels;
			if ($prompt) {
				$prompt.removeClass("is-loading");
			}
			this.setInstructions(INSTRUCTIONS);
			super.onOpen();
		});
	}

	constructor(
		app: App,
		settings: Settings,
		showEmptyChannels: boolean,
		events: Events,
		callback: (channel: Channel) => void,
	) {
		super(app);
		this.settings = settings;
		this.events = events;
		this.showEmptyChannels = showEmptyChannels;
		this.callback = callback;

		this.emptyStateText = "No channels found. Press esc to dismiss.";
		this.setPlaceholder(`Search @${this.settings.username}'s channels`);

		this.containerEl.addClass("arena-manager-modal");
	}

	renderSuggestion(match: FuzzyMatch<Channel>, el: HTMLElement): void {
		if (match.item.status === "private") {
			el.addClass("is-private");
		}
		el.createEl("span", { text: match.item.title });
		el.createEl("span", { text: match.item.length.toString() }).addClass(
			"count",
		);
	}

	getItems(): Channel[] {
		if (this.showEmptyChannels) {
			return this.channels;
		} else if (this.channels) {
			return this.channels.filter((channel) => channel.length > 0);
		} else {
			return [];
		}
	}

	getItemText(channel: Channel): string {
		return `${channel.title} (${channel.length})`;
	}

	onChooseItem(channel: Channel, _evt: MouseEvent | KeyboardEvent): void {
		this.callback(channel);
	}
}

export class BlocksModal extends FuzzySuggestModal<Block> {
	blocks: Block[];
	channel: Channel;
	events: Events;
	callback: (block: Block, channel: Channel) => void;

	onOpen(): void {
		const $prompt = this.containerEl.querySelector(".prompt-results");
		if ($prompt) {
			$prompt.addClass("is-loading");
		}
		this.events.on("blocks-load", (blocks: Block[]) => {
			this.blocks = blocks;
			if ($prompt) {
				$prompt.removeClass("is-loading");
			}
			this.setInstructions(INSTRUCTIONS);
			super.onOpen();
		});
	}

	constructor(
		app: App,
		channel: Channel,
		events: Events,
		callback: (block: Block, channel: Channel) => void,
	) {
		super(app);
		this.blocks = [];
		this.channel = channel;
		this.events = events;
		this.callback = callback;

		this.emptyStateText = "No blocks found. Press esc to dismiss.";
		this.setPlaceholder(`Search blocks from ${channel.title}`);
		this.emptyStateText = "Loading...";
	}

	getItems(): Block[] {
		if (this.blocks) {
			return this.blocks.filter(
				(block) =>
					block.class !== "Channel" && block.class !== "Attachment",
			);
		}
		return this.blocks;
	}

	getItemText(item: Block): string {
		return item.generated_title;
	}

	onChooseItem(block: Block, _evt: MouseEvent | KeyboardEvent): void {
		this.callback(block, this.channel);
	}
}
