import { TFile, TFolder } from "obsidian";
export default class Filemanager {
	app: any;

	constructor(app: any) {
		this.app = app;
	}

	async updateFile(
		filePath: TFile,
		content: string,
		frontData: { [key: string]: any },
	) {
		await this.app.vault.modify(filePath, content);
		this.writeFrontmatter(filePath, frontData);
	}

	asycn fileExists(filePath: string): boolean {
		return this.app.vault.getAbstractFileByPath(filePath) ? true : false;
	}

	async writeFile(
		folderPath: string,
		fileName: string,
		content: string,
		frontData: { [key: string]: any },
	) {
		const normalizedFolderPath = folderPath.replace(/\\/g, "/");

		const folder =
			this.app.vault.getAbstractFileByPath(normalizedFolderPath);

		if (!folder) {
			await this.app.vault.createFolder(normalizedFolderPath);
		}

		const filePath = `${normalizedFolderPath}/${fileName}`;
		const file = this.app.vault.getAbstractFileByPath(filePath);

		if (file) {
			console.log("File exists");
			const blockid = await this.getBlockId(file);

			if (blockid != frontData?.blockid) {
				console.log("Blockid mismatch");
				const newFileName = `${fileName.split(".")[0]}-${frontData.blockid}.md`;
				const newFilePath = `${normalizedFolderPath}/${newFileName}`;

				if (this.fileExists(newFilePath)) {
					console.log("File exists");
					await this.app.vault.modify(newFilePath, content);
				} else {
					await this.app.vault.create(newFilePath, content);
				}
			} else {
				console.log("Blockid not found");
				await this.app.vault.modify(file, content);
			}

			await this.writeFrontmatter(file, frontData);
		} else {
			const f = await this.app.vault.create(filePath, content);
			await this.writeFrontmatter(f, frontData);
		}
	}

	async getBlockId(file: TFile): Promise<number | null> {
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
