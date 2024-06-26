import { Setting, PluginSettingTab } from "obsidian";
import { ARENA_APP_URL } from "./types";
import ArenaManagerPlugin from "main";

export interface Settings {
	accessToken: string;
	username: string;
	folder: string;
}

export const DEFAULT_SETTINGS: Settings = {
	accessToken: "",
	username: "",
	folder: "arena",
};

export class TemplaterSettingTab extends PluginSettingTab {
	constructor(private plugin: ArenaManagerPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		this.containerEl.empty();

		this.addFolder();
		this.addUsername();
		this.addAccessToken();
	}

	addFolder() {
		new Setting(this.containerEl)
			.setName("Folder")
			.setDesc("The folder where the blocks will be saved.")
			.addText((text) =>
				text
					.setPlaceholder("Enter a name")
					.setValue(this.plugin.settings.folder)
					.onChange(async (value) => {
						this.plugin.settings.folder = value;
						await this.plugin.saveSettings();
					}),
			);
	}

	addUsername() {
		new Setting(this.containerEl)
			.setName("Username")
			.setDesc("Your are.na slug (e.g. 'username' in are.na/username).")
			.addText((text) =>
				text
					.setPlaceholder("Enter your username")
					.setValue(this.plugin.settings.username)
					.onChange(async (value) => {
						this.plugin.settings.username = value;
						await this.plugin.saveSettings();
					}),
			);
	}

	addAccessToken() {
		new Setting(this.containerEl)
			.setName("Personal Access Token")
			.setDesc(
				createFragment((fragment) => {
					fragment.append(
						"Ceate an app and get the Personal Access Token from ",
						fragment.createEl("a", {
							text: ARENA_APP_URL,
							href: ARENA_APP_URL,
						}),
					);
				}),
			)
			.addText((text) =>
				text
					.setPlaceholder("Enter your token")
					.setValue(this.plugin.settings.accessToken)
					.onChange(async (value) => {
						this.plugin.settings.accessToken = value;
						await this.plugin.saveSettings();
					}),
			);
	}
}
