import { Setting, PluginSettingTab } from "obsidian";
import { ARENA_APP_URL } from "./types";

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
	constructor(private plugin: any) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		this.containerEl.empty();

		this.addHeader();
		this.addFolder();
		this.addUsername();
		this.addAccessToken();
	}

	addHeader() {
		new Setting(this.containerEl).setHeading().setName("Settings");
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
			.setDesc("Your are.na username.")
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
			.setName("Access Token")
			.setDesc(
				createFragment((fragment) => {
					fragment.append(
						"Ceate an app and get the Access Token from ",
						fragment.createEl("a", {
							text: ARENA_APP_URL,
							href: ARENA_APP_URL,
						}),
					);
				}),
			)
			.addText((text) =>
				text
					.setPlaceholder("Enter your secret")
					.setValue(this.plugin.settings.accessToken)
					.onChange(async (value) => {
						this.plugin.settings.accessToken = value;
						await this.plugin.saveSettings();
					}),
			);
	}
}
