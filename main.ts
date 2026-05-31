import { Plugin } from "obsidian";

import {
	Settings,
	DEFAULT_SETTINGS,
	ArenaManagerSettingTab,
} from "./lib/Settings";

import Commands from "./lib/Commands";
import Utils from "./lib/Utils";

export default class ArenaManagerPlugin extends Plugin {
	settings: Settings;
	commands: Commands;

	async onload() {
		await this.loadSettings();
		this.commands = new Commands(this.app, this.settings);

		this.addSettingTab(new ArenaManagerSettingTab(this));

		this.addCommand({
			id: "get-blocks-from-channel",
			name: "Get blocks from channel",
			checkCallback: (checking: boolean) => {
				if (Utils.hasRequiredSettings(this.settings)) {
					if (!checking) {
						void this.commands.getBlocksFromChannel();
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
						void this.commands.pullBlock();
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
						void this.commands.pushBlock();
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
						void this.commands.getBlockFromArena();
					}
					return true;
				}

				return false;
			},
		});

		this.addCommand({
			id: "go-to-block",
			name: "Go to block on Are.na",
			checkCallback: (checking: boolean) => {
				const currentFile = this.app.workspace.getActiveFile();

				if (currentFile) {
					if (!checking) {
						void this.commands.goToBlock();
					}
					return true;
				}

				return false;
			},
		});

		this.addCommand({
			id: "get-block-by-id",
			name: "Get a block by ID or URL",
			checkCallback: (checking: boolean) => {
				if (Utils.hasRequiredSettings(this.settings)) {
					if (!checking) {
						void this.commands.getBlockByID();
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
