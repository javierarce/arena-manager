import { Setting, PluginSettingTab } from "obsidian";
import { ARENA_APP_URL } from "./types";
import ArenaManagerPlugin from "main";

export interface Settings {
	accessToken: string;
	username: string;
	folder: string;
	download_attachments_type: string;
	attachments_folder?: string;
}

export const DOWNLOAD_ATTACHMENTS_TYPES = {
	none: "1",
	channel: "2",
	custom: "3",
};

export const CUSTOM_ATTACHMENTS_FOLDER = "arena/attachments";

export const DEFAULT_SETTINGS: Settings = {
	accessToken: "",
	username: "",
	folder: "arena",
	attachments_folder: CUSTOM_ATTACHMENTS_FOLDER,
	download_attachments_type: DOWNLOAD_ATTACHMENTS_TYPES.none,
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
		this.addSelect();

		if (
			this.plugin.settings.download_attachments_type !==
			DOWNLOAD_ATTACHMENTS_TYPES.none
		) {
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

	addSelect() {
		new Setting(this.containerEl)
			.setName("Download attachments")
			.setDesc("Choose where to download the attachments.")
			.addDropdown((dropdown) => {
				dropdown.addOption(
					DOWNLOAD_ATTACHMENTS_TYPES.none,
					"Don't download attachments",
				);
				dropdown.addOption(
					DOWNLOAD_ATTACHMENTS_TYPES.channel,
					"Download inside the channel folder",
				);
				dropdown.addOption(
					DOWNLOAD_ATTACHMENTS_TYPES.custom,
					"Download to a custom folder",
				);
				dropdown.setValue(
					this.plugin.settings.download_attachments_type,
				);
				dropdown.onChange(async (value) => {
					this.plugin.settings.download_attachments_type = value;
					if (value === DOWNLOAD_ATTACHMENTS_TYPES.none) {
						this.plugin.settings.attachments_folder = undefined;
					} else if (value === DOWNLOAD_ATTACHMENTS_TYPES.channel) {
						this.plugin.settings.attachments_folder = undefined;
					} else if (value === DOWNLOAD_ATTACHMENTS_TYPES.custom) {
						this.plugin.settings.attachments_folder =
							CUSTOM_ATTACHMENTS_FOLDER;
					}

					await this.plugin.saveSettings();
					this.display();
				});
			});
	}

	addAttachmentsFolder() {
		let name = "Channel attachments folder";

		let tooltip = createFragment((fragment) => {
			fragment.append(
				"Save inside the channel folder:",
				fragment.createEl("code", {
					text: `${this.plugin.settings.folder}/channel/{folder name}.`,
				}),
			);
			fragment.append(
				"Leave empty to save directly in the channel folder",
			);
		});

		if (
			this.plugin.settings.download_attachments_type ===
			DOWNLOAD_ATTACHMENTS_TYPES.custom
		) {
			name = "Custom attachments folder";
			tooltip = tooltip = createFragment((fragment) => {
				fragment.append(
					"Save inside a custom folder:",
					fragment.createEl("code", {
						text: `${this.plugin.settings.folder}/attachments/{folder name}.`,
					}),
				);
			});
		}

		new Setting(this.containerEl)
			.setName(name)
			.setDesc(tooltip)
			.addText((text) =>
				text
					.setPlaceholder("Folder name")
					.setValue(this.plugin.settings.attachments_folder || "")
					.onChange(async (value) => {
						this.plugin.settings.attachments_folder = value;
						await this.plugin.saveSettings();
					}),
			);
	}
}
