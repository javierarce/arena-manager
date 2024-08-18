import { Events, Plugin } from "obsidian";

import {
	Settings,
	DEFAULT_SETTINGS,
	TemplaterSettingTab,
} from "./lib/Settings";

import Arena from "./lib/Arena";
import Commands from "./lib/Commands";
import FileHandler from "./lib/FileHandler";
import Utils from "./lib/Utils";

export default class ArenaManagerPlugin extends Plugin {
	settings: Settings;
	events: Events;
	arena: Arena;
	fileHandler: FileHandler;
	commands: Commands;

	async onload() {
		await this.loadSettings();
		this.commands = new Commands(this.app, this.settings);

		this.events = new Events();
		this.fileHandler = new FileHandler(this.app, this.settings);
		this.arena = new Arena(this.settings);

		this.addSettingTab(new TemplaterSettingTab(this));

		this.addCommand({
			id: "get-blocks-from-channel",
			name: "Get blocks from channel",
			checkCallback: (checking: boolean) => {
				if (Utils.hasRequiredSettings(this.settings)) {
					if (!checking) {
						this.commands.getBlocksFromChannel();
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
				const currentFile = this.app.workspace.getActiveFile();
				if (currentFile && Utils.hasRequiredSettings(this.settings)) {
					if (!checking) {
						this.commands.pullBlock();
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

				if (currentFile && Utils.hasRequiredSettings(this.settings)) {
					if (!checking) {
						this.commands.pushBlock();
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
				if (Utils.hasRequiredSettings(this.settings)) {
					if (!checking) {
						this.commands.getBlockFromArena();
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
						this.commands.goToBlock();
					}
					return true;
				}

				return false;
			},
		});

		this.addCommand({
			id: "get-block-by-id",
			name: "Get a block by its ID or URL",
			checkCallback: (checking: boolean) => {
				if (Utils.hasRequiredSettings(this.settings)) {
					if (!checking) {
						this.commands.getBlockByID();
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
}
