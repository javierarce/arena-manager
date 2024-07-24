import { App, TFile, TAbstractFile, TFolder, requestUrl } from "obsidian";

import { Attachment } from "./types";
import { Settings, DOWNLOAD_ATTACHMENTS_TYPES } from "./Settings";

export default class Filemanager {
	app: App;
	settings: Settings;

	constructor(app: App, settings: Settings) {
		this.app = app;
		this.settings = settings;
	}

	getSafeFilename(fileName: string) {
		return fileName.replace(/[\\/:]/g, " ");
	}

	async doesAttachmentExist(fileName: string): Promise<boolean> {
		const filePath = `${this.settings.attachments_folder}/${fileName}`;
		return this.doesFileExist(filePath);
	}

	async doesFileExist(filePath: string): Promise<boolean> {
		const file = this.app.vault.getAbstractFileByPath(filePath);
		return file !== null;
	}

	async renameFile(
		filePath: TFile,
		title: string,
		content: string,
		frontData: Record<string, string | number> = {},
		attachment?: Attachment,
	) {
		const fileName = this.getSafeFilename(title);
		const folderPath = `${this.settings.folder}/${frontData.channel}`;

		if (
			this.settings.download_attachments_type !==
				DOWNLOAD_ATTACHMENTS_TYPES.none &&
			attachment
		) {
			const attachmentFileName = await this.downloadAttachment(
				attachment,
				folderPath,
				fileName,
			);
			content = `![[${attachmentFileName}]]`;
		}

		const newName = `${folderPath}/${fileName}.md`;
		await this.app.vault.modify(filePath, content);
		await this.writeFrontmatter(filePath, frontData);
		await this.app.vault.rename(filePath, newName);
	}

	getFileByFolderPathAndFileName(
		folderPath: string,
		fileName: string,
	): TFile | null {
		const normalizedFolderPath = folderPath.replace(/\\/g, "/");
		const filePath = `${normalizedFolderPath}/${this.getSafeFilename(fileName)}.md`;
		return this.app.vault.getFileByPath(filePath);
	}

	async createFolder(folderPath: string) {
		const normalizedFolderPath = folderPath.replace(/\\/g, "/");

		const folder =
			this.app.vault.getAbstractFileByPath(normalizedFolderPath);

		if (!folder) {
			await this.app.vault.createFolder(normalizedFolderPath);
		}
	}

	async updateFileWithFrontmatter(
		folderPath: string,
		fileName: string,
		content: string,
		frontData: Record<string, string | number> = {},
	) {
		const normalizedFolderPath = folderPath.replace(/\\/g, "/");
		const filePath = `${normalizedFolderPath}/${this.getSafeFilename(fileName)}.md`;

		const file = this.app.vault.getFileByPath(filePath);
		if (file) {
			await this.app.vault.modify(file, content);
			await this.writeFrontmatter(file, frontData);
		}
	}

	async createFileWithFrontmatter(
		folderPath: string,
		fileName: string,
		content: string,
		frontData: Record<string, string | number> = {},
	) {
		const normalizedFolderPath = folderPath.replace(/\\/g, "/");
		const filePath = `${normalizedFolderPath}/${this.getSafeFilename(fileName)}.md`;
		const file = await this.app.vault.create(filePath, content);
		await this.writeFrontmatter(file, frontData);
	}

	getAttachmentFilenameFromTitle(attachment: Attachment, title?: string) {
		let name = title || attachment.file_name;
		if (name.endsWith(`.${attachment.extension}`)) {
			name = name.slice(0, -attachment.extension.length - 1);
		}
		return this.getSafeFilename(`${name}.${attachment.extension}`);
	}

	async downloadAttachment(
		attachment: Attachment,
		folderPath: string,
		filename: string,
	) {
		const request = await requestUrl(attachment.url);

		if (
			this.settings.download_attachments_type !=
				DOWNLOAD_ATTACHMENTS_TYPES.none &&
			this.settings.attachments_folder
		) {
			if (
				this.settings.download_attachments_type ==
				DOWNLOAD_ATTACHMENTS_TYPES.channel
			) {
				await this.createFolder(
					`${folderPath}/${this.settings.attachments_folder}`,
				);
			} else if (
				this.settings.download_attachments_type ==
				DOWNLOAD_ATTACHMENTS_TYPES.custom
			) {
				await this.createFolder(this.settings.attachments_folder);
			}
		}

		try {
			const attachmentFileName = this.getAttachmentFilenameFromTitle(
				attachment,
				filename,
			);

			let attachmentFolderPath = this.settings.attachments_folder;

			if (
				this.settings.download_attachments_type ==
				DOWNLOAD_ATTACHMENTS_TYPES.channel
			) {
				if (this.settings.attachments_folder) {
					attachmentFolderPath = `${folderPath}/${this.settings.attachments_folder}`;
				} else {
					attachmentFolderPath = `${folderPath}`;
				}
			}

			this.app.vault.adapter.writeBinary(
				`${attachmentFolderPath}/${attachmentFileName}`,
				request.arrayBuffer,
			);

			if (
				this.settings.download_attachments_type ==
				DOWNLOAD_ATTACHMENTS_TYPES.channel
			) {
				if (this.settings.attachments_folder) {
					return `${folderPath}/${this.settings.attachments_folder}/${attachmentFileName}`;
				} else {
					return `${folderPath}/${attachmentFileName}`;
				}
			} else {
				return `${attachmentFolderPath}/${attachmentFileName}`;
			}
		} catch (error) {
			console.error("Error downloading attachment", error);
			return null;
		}
	}

	async findNextAvailableFileName(
		folderPath: string,
		baseFileName: string,
		blockId: any,
	): Promise<string> {
		let counter = 0;
		let filePath = `${folderPath}/${baseFileName}.md`;

		while (await this.doesFileExist(filePath)) {
			const file = this.app.vault.getAbstractFileByPath(
				filePath,
			) as TFile;

			const frontmatter = await this.getFrontmatterFromFile(file);

			if (frontmatter.blockid === blockId) {
				// If we find a file with the same blockId, we'll use this file
				if (counter === 0) {
					return baseFileName;
				} else {
					return `${baseFileName}-${counter}`;
				}
			}

			// If blockId is different, increment counter and try next filename
			counter++;
			filePath = `${folderPath}/${baseFileName}-${counter}.md`;
		}

		return `${baseFileName}-${counter}`;
	}

	async updateFile(
		file: TFile,
		folderPath: string,
		fileName: string,
		content: string,
		frontData: Record<string, string | number> = {},
		attachment?: Attachment,
	) {
		const blockId = await this.getBlockIdFromFile(file);

		if (blockId === frontData?.blockid) {
			if (
				this.settings.download_attachments_type !==
					DOWNLOAD_ATTACHMENTS_TYPES.none &&
				attachment
			) {
				const attachmentFileName = await this.downloadAttachment(
					attachment,
					folderPath,
					fileName,
				);
				content = `![[${attachmentFileName}]]`;
			}

			// If the blockid is the same, update the file
			await this.updateFileWithFrontmatter(
				folderPath,
				fileName,
				content,
				frontData,
			);
		} else {
			// If the blockid is different, create a new file
			const baseFileName = `${fileName.split(".")[0]}`;
			const newFilename = await this.findNextAvailableFileName(
				folderPath,
				baseFileName,
				frontData.blockid,
			);

			if (
				this.settings.download_attachments_type !==
					DOWNLOAD_ATTACHMENTS_TYPES.none &&
				attachment
			) {
				const attachmentFileName = await this.downloadAttachment(
					attachment,
					folderPath,
					newFilename,
				);
				content = `![[${attachmentFileName}]]`;
			}

			const newFile = this.getFileByFolderPathAndFileName(
				folderPath,
				newFilename,
			);

			if (!newFile) {
				await this.createFileWithFrontmatter(
					folderPath,
					newFilename,
					content,
					frontData,
				);
			} else {
				await this.updateFileWithFrontmatter(
					folderPath,
					newFilename,
					content,
					frontData,
				);
			}
		}
	}

	async writeFile(
		folderPath: string,
		fileName: string,
		content: string,
		frontData: Record<string, string | number> = {},
		attachment?: Attachment,
	) {
		await this.createFolder(folderPath);
		const file = this.getFileByFolderPathAndFileName(folderPath, fileName);

		if (!content) {
			content = "";
			console.warn("Empty content");
		}

		if (!file) {
			if (
				this.settings.download_attachments_type !==
					DOWNLOAD_ATTACHMENTS_TYPES.none &&
				attachment
			) {
				const attachmentFileName = await this.downloadAttachment(
					attachment,
					folderPath,
					fileName,
				);
				content = `![[${attachmentFileName}]]`;
			}

			await this.createFileWithFrontmatter(
				folderPath,
				fileName,
				content,
				frontData,
			);
		} else {
			await this.updateFile(
				file,
				folderPath,
				fileName,
				content,
				frontData,
				attachment,
			);
		}
	}

	async getFrontmatterFromFile(
		file: TFile,
	): Promise<Record<string, string | number>> {
		let frontmatterData: Record<string, string | number> = {};

		await this.app.fileManager.processFrontMatter(
			file,
			(frontmatter: Record<string, string | number>) => {
				frontmatterData = frontmatter || null;
			},
		);

		return frontmatterData;
	}

	async getBlockIdFromFile(file: TFile): Promise<number | null> {
		let blockId: number | null = null;

		await this.app.fileManager.processFrontMatter(
			file,
			(frontmatter: Record<string, number | null>) => {
				blockId = frontmatter.blockid || null;
			},
		);

		return blockId;
	}

	async writeFrontmatter(
		file: TFile,
		frontData: Record<string, string | number>,
	) {
		if (!frontData) {
			return;
		}
		await this.app.fileManager.processFrontMatter(
			file,
			async (frontmatter: Record<string, string | number>) => {
				Object.entries(frontData).forEach(([key, value]) => {
					frontmatter[key] = value;
				});
			},
		);
	}
	isMarkdownFile(file: TAbstractFile): file is TFile {
		return file instanceof TFile && file.extension === "md";
	}

	async getFilesWithBlockId(
		folderPath: string,
	): Promise<{ name: string; blockid: number }[]> {
		const result: { name: string; blockid: number }[] = [];

		const folder = this.app.vault.getAbstractFileByPath(folderPath);
		if (!folder || !(folder instanceof TFolder)) {
			throw new Error("Directory not found or not a folder");
		}

		const files = folder.children.filter(this.isMarkdownFile);

		for (const file of files) {
			await this.app.fileManager.processFrontMatter(
				file,
				(frontmatter: Record<string, string | number>) => {
					if (frontmatter.blockid) {
						const blockid = Number(frontmatter.blockid);
						if (!isNaN(blockid)) {
							result.push({
								name: file.name,
								blockid: blockid,
							});
						} else {
							console.warn(
								`Invalid blockid for file ${file.name}: ${frontmatter.blockid}`,
							);
						}
					}
				},
			);
		}

		return result;
	}
}
