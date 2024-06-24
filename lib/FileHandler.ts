import { TFile, TFolder } from "obsidian";
export default class Filemanager {
	app: any;

	constructor(app: any) {
		this.app = app;
	}

	async updateFile(
		filePath: TFile,
		title: string,
		content: string,
		frontData: { [key: string]: any },
	) {
		console.log(frontData);
		const newName = `${frontData.channel}/${title}.md`;
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

		let folder = this.app.vault.getAbstractFileByPath(normalizedFolderPath);

		if (!folder) {
			await this.app.vault.createFolder(normalizedFolderPath);
		}
	}

	async updateFileWithFrontmatter(
		folderPath: string,
		fileName: string,
		content: string,
		frontData: { [key: string]: any },
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
		frontData: { [key: string]: any },
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
		frontData: { [key: string]: any },
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
	): Promise<{ [key: string]: any } | null> {
		let frontmatterData: { [key: string]: any } | null = null;

		await this.app.fileManager.processFrontMatter(
			file,
			(frontmatter: any) => {
				frontmatterData = frontmatter || null;
			},
		);

		return frontmatterData;
	}

	async getBlockIdFromFile(file: TFile): Promise<number | null> {
		let blockId: number | null = null;

		await this.app.fileManager.processFrontMatter(
			file,
			(frontmatter: any) => {
				blockId = frontmatter.blockid || null;
			},
		);

		return blockId;
	}

	async writeFrontmatter(file: TFile, frontData: { [key: string]: any }) {
		if (!frontData) {
			return;
		}
		await this.app.fileManager.processFrontMatter(
			file,
			async (frontmatter: any) => {
				Object.entries(frontData).forEach(([key, value]) => {
					frontmatter[key] = value;
				});
			},
		);
	}

	async getFilesWithBlockId(
		folderPath: string,
	): Promise<{ name: string; blockid: string }[]> {
		const result: { name: string; blockid: string }[] = [];

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
				(frontmatter: any) => {
					if (frontmatter.blockid) {
						result.push({
							name: file.name,
							blockid: frontmatter.blockid,
						});
					}
				},
			);
		}

		return result;
	}
}
