import { App, MarkdownView, Modal, FuzzySuggestModal } from "obsidian";
import { Settings } from "./Settings";
import { Channel, Block } from "./interfaces";

export class ChannelsModal extends FuzzySuggestModal<Channel> {
	channels: Channel[];
	settings: Settings;
	showEmptyChannels: boolean;
	callback: (channel: Channel) => void;

	constructor(
		app: App,
		channels: Channel[],
		settings: Settings,
		showEmptyChannels: boolean,
		callback: (channel: Channel) => void,
	) {
		super(app);
		this.channels = channels;
		this.settings = settings;
		this.showEmptyChannels = showEmptyChannels;
		this.callback = callback;
		this.emptyStateText = "Loading...";
	}

	getItems(): Channel[] {
		if (this.showEmptyChannels) {
			return this.channels;
		} else {
			return this.channels.filter((channel) => channel.length > 0);
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
	callback: (blocks: Block, channel: Channel) => void;

	constructor(
		app: App,
		blocks: Block[],
		channel: Channel,
		callback: (blocks: Block, channel: Channel) => void,
	) {
		super(app);
		this.blocks = blocks;
		this.channel = channel;
		this.callback = callback;
		this.emptyStateText = "Loading...";
	}

	getItems(): Block[] {
		return this.blocks;
	}

	getItemText(item: Block): string {
		return item.generated_title;
	}

	onChooseItem(block: Block, _evt: MouseEvent | KeyboardEvent): void {
		this.callback(block, this.channel);
	}
}
