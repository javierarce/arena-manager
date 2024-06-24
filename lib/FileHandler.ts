import { App, TFile, TFolder } from "obsidian";
import { Settings } from "./Settings";
export default class Filemanager {
	app: App;
	settings: Settings;

	constructor(app: App, settings: Settings) {
		this.app = app;
		this.settings = settings;
	}

	async updateFile(
		filePath: TFile,
		title: string,
		content: string,
		frontData: Record<string, string | number> = {},
	) {
		const newName = `${this.settings.folder}/${frontData.channel}/${title}.md`;
		await this.app.vault.modify(filePath, content);
		await this.writeFrontmatter(filePath, frontData);
		await this.app.vault.rename(filePath, newName);
	}

	async getFileByFolderPathAndFileName(
		folderPath: string,
		fileName: string,
	): Promise<TFile> {
		const normalizedFolderPath = folderPath.replace(/\\/g, "/");
		const filePath = `${normalizedFolderPath}/${fileName}`;
		return (await this.app.vault.getAbstractFileByPath(filePath)) as TFile;
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
		const filePath = `${normalizedFolderPath}/${fileName}`;

		const file = this.app.vault.getAbstractFileByPath(filePath) as TFile;
		await this.app.vault.modify(file, content);
		await this.writeFrontmatter(file, frontData);
	}

	async createFileWithFrontmatter(
		folderPath: string,
		fileName: string,
		content: string,
		frontData: Record<string, string | number> = {},
	) {
		const normalizedFolderPath = folderPath.replace(/\\/g, "/");
		const filePath = `${normalizedFolderPath}/${fileName}`;
		const file = await this.app.vault.create(filePath, content);
		await this.writeFrontmatter(file, frontData);
	}

	async writeFile(
		folderPath: string,
		fileName: string,
		content: string,
		frontData: Record<string, string | number> = {},
	) {
		await this.createFolder(folderPath);
		const file = await this.getFileByFolderPathAndFileName(
			folderPath,
			fileName,
		);

		if (!file) {
			await this.createFileWithFrontmatter(
				folderPath,
				fileName,
				content,
				frontData,
			);
		} else {
			const blockId = await this.getBlockIdFromFile(file);

			if (blockId === frontData?.blockid) {
				await this.updateFileWithFrontmatter(
					folderPath,
					fileName,
					content,
					frontData,
				);
			} else {
				const newFilename = `${fileName.split(".")[0]}-${frontData.blockid}.md`;

				const newFile = await this.getFileByFolderPathAndFileName(
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

	async getFilesWithBlockId(
		folderPath: string,
	): Promise<{ name: string; blockid: number }[]> {
		const result: { name: string; blockid: number }[] = [];

		const folder = this.app.vault.getAbstractFileByPath(folderPath);
		if (!folder || !(folder instanceof TFolder)) {
			throw new Error("Directory not found or not a folder");
		}

		const files = folder.children.filter(
			(file) => file instanceof TFile && file.extension === "md",
		) as TFile[];

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
