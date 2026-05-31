import {
	Events,
	App,
	SuggestModal,
	FuzzySuggestModal,
	FuzzyMatch,
} from "obsidian";
import { Settings } from "./Settings";
import { Channel, Block } from "./types";

const INSTRUCTIONS = [
	{ command: "↑↓", purpose: "to navigate" },
	{ command: "Tab ↹", purpose: "to autocomplete" },
	{ command: "↵", purpose: "to choose item" },
	{ command: "esc", purpose: "to dismiss" },
];

// The source chooser has no search field, so it drops the autocomplete hint.
const SOURCE_INSTRUCTIONS = [
	{ command: "↑↓", purpose: "to navigate" },
	{ command: "↵", purpose: "to choose item" },
	{ command: "esc", purpose: "to dismiss" },
];

// Where the channel to import from should come from. Both "get blocks from
// channel" and "get a block from are.na" start by asking this.
export type ChannelSource = "your-channels" | "other-user" | "channel-url";

interface SourceOption {
	id: ChannelSource;
	label: string;
}

// A FuzzySuggestModal so the chooser keeps the same top-anchored look, item
// styling, and keyboard navigation as the channel/block pickers — but with a
// short, fixed option list, search adds nothing, so `arena-manager-no-search`
// hides the input field (see styles.css). Navigation still works because
// Obsidian drives ↑↓/↵ through the modal's keymap scope, not the input element.
export class ChannelSourceModal extends FuzzySuggestModal<SourceOption> {
	options: SourceOption[];
	callback: (source: ChannelSource) => void;

	constructor(
		app: App,
		username: string,
		callback: (source: ChannelSource) => void,
	) {
		super(app);
		this.callback = callback;
		this.options = [
			{ id: "your-channels", label: `Your channels (@${username})` },
			{ id: "other-user", label: "Channels from another user" },
			{ id: "channel-url", label: "Channel URL" },
		];

		this.setInstructions(SOURCE_INSTRUCTIONS);
		this.containerEl.addClass("arena-manager-modal");
		this.containerEl.addClass("arena-manager-no-search");
	}

	// Always show every option: with the search field hidden there's no way to
	// type a query, and this keeps the list full even if a stray keystroke lands
	// on the (invisible) input.
	getSuggestions(_query: string): FuzzyMatch<SourceOption>[] {
		return this.options.map((item) => ({
			item,
			match: { score: 0, matches: [] },
		}));
	}

	getItems(): SourceOption[] {
		return this.options;
	}

	getItemText(option: SourceOption): string {
		return option.label;
	}

	onChooseItem(option: SourceOption, _evt: MouseEvent | KeyboardEvent): void {
		this.callback(option.id);
	}
}

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
			void super.onOpen();
		});
	}

	constructor(
		app: App,
		settings: Settings,
		showEmptyChannels: boolean,
		events: Events,
		callback: (channel: Channel) => void,
		// Whose channels are being browsed; defaults to the signed-in user but is
		// overridden when searching another user's channels.
		username: string = settings.username,
	) {
		super(app);
		this.settings = settings;
		this.events = events;
		this.showEmptyChannels = showEmptyChannels;
		this.callback = callback;

		this.emptyStateText = "No channels found. Press esc to dismiss.";
		this.setPlaceholder(`Search @${username}'s channels`);

		this.containerEl.addClass("arena-manager-modal");
	}

	renderSuggestion(match: FuzzyMatch<Channel>, el: HTMLElement): void {
		if (match.item.status === "private") {
			el.createSpan({ cls: "icon-lock" });
		}
		el.createSpan({ text: match.item.title });
		el.createSpan({ text: match.item.length.toString() }).addClass("count");
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
			void super.onOpen();
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
			return this.blocks.filter((block) => block.class !== "Channel");
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

// Validate a submitted value. Return an error message to show inline (the modal
// stays open so the user can fix their input), or null/undefined on success (the
// modal closes). May be async so the validator can hit the network — e.g. to
// confirm a channel actually exists.
export type InputValidator = (
	value: string,
) => string | null | undefined | Promise<string | null | undefined>;

// A single free-text prompt for a block id/URL, an are.na username, or a channel
// URL. Built on SuggestModal so it gets the same top-anchored prompt-input field
// as the channel/block pickers (rather than a centered dialog): the placeholder
// states what to enter, results are hidden (see `arena-manager-input-only` in
// styles.css), and ↵ submits the typed value.
//
// On submit the value is run through `onSubmit`. A returned message is shown in
// an inline status row and the modal stays open; on success the modal closes.
// This keeps malformed URLs / missing channels from dumping the user back to the
// start with only a transient notice.
export class InputModal extends SuggestModal<string> {
	onSubmit: InputValidator;
	private statusEl: HTMLElement;
	private submitting = false;

	constructor(
		app: App,
		onSubmit: InputValidator,
		options: { placeholder?: string } = {},
	) {
		super(app);
		this.onSubmit = onSubmit;

		this.setPlaceholder(
			options.placeholder ?? "Enter an are.na block URL or ID",
		);
		this.setInstructions([
			{ command: "↵", purpose: "to submit" },
			{ command: "esc", purpose: "to dismiss" },
		]);
		this.containerEl.addClass("arena-manager-modal");
		this.containerEl.addClass("arena-manager-input-only");

		// An inline status row for errors / progress, placed between the input row
		// and the instructions footer. Inserting it after the whole input
		// container (not the input itself, which lives in a flex row alongside the
		// clear button) keeps it on its own full-width line.
		this.statusEl = createDiv({ cls: "arena-manager-input-status" });
		const inputRow = this.inputEl.parentElement ?? this.inputEl;
		inputRow.insertAdjacentElement("afterend", this.statusEl);
		// Clear a shown error as soon as the user edits their input.
		this.inputEl.addEventListener("input", () => this.clearStatus());
	}

	private clearStatus() {
		this.statusEl.setText("");
		this.statusEl.removeClasses(["is-error", "is-loading"]);
	}

	private showError(message: string) {
		this.statusEl.setText(message);
		this.statusEl.removeClass("is-loading");
		this.statusEl.addClass("is-error");
	}

	private showLoading() {
		this.statusEl.setText("Checking…");
		this.statusEl.removeClass("is-error");
		this.statusEl.addClass("is-loading");
	}

	private async handleSubmit() {
		// Ignore re-submits while an async validation is already in flight.
		if (this.submitting) {
			return;
		}

		const value = this.inputEl.value;
		const outcome = this.onSubmit(value);

		// Synchronous result (e.g. an obviously malformed URL): no spinner.
		if (!(outcome instanceof Promise)) {
			if (outcome) {
				this.showError(outcome);
			} else {
				this.close();
			}
			return;
		}

		this.submitting = true;
		this.showLoading();
		try {
			const error = await outcome;
			if (error) {
				this.showError(error);
			} else {
				this.close();
			}
		} finally {
			this.submitting = false;
		}
	}

	getSuggestions(query: string): string[] {
		// A single echo suggestion (even when empty) so ↵ always has something to
		// select, which is what routes through to handleSubmit.
		return [query];
	}

	renderSuggestion(_value: string, _el: HTMLElement): void {
		// Results are hidden; nothing to render.
	}

	// SuggestModal closes the modal right after choosing a suggestion. We override
	// the choose step so submission is validated first and only closes on success.
	selectSuggestion(_value: string, _evt: MouseEvent | KeyboardEvent): void {
		void this.handleSubmit();
	}

	onChooseSuggestion(_value: string, _evt: MouseEvent | KeyboardEvent): void {
		// Submission is handled in selectSuggestion; nothing to do here.
	}
}
