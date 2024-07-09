import { App, TFile, TAbstractFile, TFolder, requestUrl } from "obsidian";
import { Attachment } from "./types";
import { Settings } from "./Settings";

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

	async renameFile(
		filePath: TFile,
		title: string,
		content: string,
		frontData: Record<string, string | number> = {},
	) {
		const newName = `${this.settings.folder}/${frontData.channel}/${this.getSafeFilename(title)}.md`;
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

	async downloadAttachment(attachment: Attachment) {
		const request = await requestUrl(attachment.url);

		try {
			this.app.vault.adapter.writeBinary(
				`${this.settings.folder}/${attachment.file_name}`,
				request.arrayBuffer,
			);
		} catch (error) {
			console.error("Error downloading attachment", error);
		}
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
			if (attachment) {
				await this.downloadAttachment(attachment);
				content = `![](${attachment.file_name})`;
			}
			await this.updateFileWithFrontmatter(
				folderPath,
				fileName,
				content,
				frontData,
			);
		} else {
			const newFilename = `${fileName.split(".")[0]}-${frontData.blockid}.md`;

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
			if (attachment) {
				await this.downloadAttachment(attachment);
				content = `![](${attachment.file_name})`;
			}

			await this.createFileWithFrontmatter(
				folderPath,
				fileName,
				content,
				frontData,
			);
		} else {
			this.updateFile(
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
