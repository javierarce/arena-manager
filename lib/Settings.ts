import { Setting, PluginSettingTab } from "obsidian";
import { ARENA_APP_URL } from "./types";
import ArenaManagerPlugin from "main";

export interface Settings {
	accessToken: string;
	username: string;
	folder: string;
	download_attachments?: boolean;
	attachments_folder?: string;
}

export const DEFAULT_SETTINGS: Settings = {
	accessToken: "",
	username: "",
	folder: "arena",
	download_attachments: false,
	attachments_folder: "arena/attachments",
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
		this.addToggleDownloadAttachments();
		if (this.plugin.settings.attachments_folder) {
			this.addAttachmentsFolder();
		}
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
			.setName("Access token")
			.setDesc(
				createFragment((fragment) => {
					fragment.append(
						"Ceate an app and get the 'Personal Access Token' from ",
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

	addToggleDownloadAttachments() {
		new Setting(this.containerEl)
			.setName("Download attachments")
			.setDesc("Enable or disable downloading attachments.")
			.addToggle((toggle) =>
				toggle
					.setValue(
						this.plugin.settings.download_attachments || false,
					)
					.onChange(async (value) => {
						this.plugin.settings.download_attachments = value;
						if (value) {
							this.plugin.settings.attachments_folder =
								DEFAULT_SETTINGS.attachments_folder;
						} else {
							this.plugin.settings.attachments_folder = "";
						}

						await this.plugin.saveSettings();
						this.display();
					}),
			);
	}

	addAttachmentsFolder() {
		new Setting(this.containerEl)
			.setName("Media folder")
			.setDesc("The folder where the attachments will be saved.")
			.addText((text) =>
				text
					.setPlaceholder("Enter a name")
					.setValue(this.plugin.settings.attachments_folder || "")
					.onChange(async (value) => {
						this.plugin.settings.attachments_folder = value;
						await this.plugin.saveSettings();
					}),
			);
	}
}
