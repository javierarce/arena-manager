# Are.na Manager

Publish content from [Obsidian](https://obsidian.md) to [Are.na](https://www.are.na) and the other way around.

### Commands

Currently this plugin offers 6 commands:

| Command                      | Description                                                                                                                       |
| :--------------------------- | :------------------------------------------------------------------------------------------------------------------------------- |
| Get blocks from channel      | Get all the blocks from your own channels, other people's public channels, or any channel URL, and create a note for each block. |
| Pull block from Are.na       | Update the current open note with the content of a specific block.                                                              |
| Push note to Are.na          | Push the content of the current open note to a channel or block.                                                                |
| Get a block from Are.na      | Create a new note from a single block you pick out of your own channels, other people's public channels, or any channel URL.     |
| Get a block by ID or URL     | Create a new note from a specific block using its direct ID or URL.                                                             |
| Go to block on Are.na        | Open the selected block directly on the website.                                                                                |

### Installation

1. [Install the plugin](https://obsidian.md/plugins?id=arena-manager) and enable it.
2. Create a `Personal Access Token` at [https://are.na/developers](https://are.na/developers) with **read and write** access (write access is required to publish blocks and channels back to Are.na).
3. Submit the form and copy the `Personal Access Token`.
4. Open the plugin settings page and set the following options:
    - **Personal Access Token**: the `Personal Access Token` you copied earlier.
    - **Username**: Your Are.na slug (e.g., `username` in `https://www.are.na/username`).
    - **Folder**: The folder where you want to store the notes (the folder is called `arena` by default).

And you are done! Use any of the commands above to interact with your Are.na blocks and channels.

### Attachments download

The plugin doesn’t download attachments by default. If you want to download them, you can enable the `Download attachments` option in the settings. You can choose from the following download locations:

-   **Download inside the channel folder**: Attachments will be stored in the same folder as the note. For example: `arena/fantastic-channel/{folder name}`. If you leave the field empty, your attachments will be stored in the channel folder.
-   **Download to a custom folder**: Attachments will be stored in a custom folder. For example: `attachments/web/files-i-saved-in-arena`

### Frontmatter structure

When you get a block from Are.na, the plugin will add some frontmatter automatically to allow synchronizing your note and the block.

| Property     | Description                                                |
| :----------- | :--------------------------------------------------------- |
| blockid      | the id of the block in Are.na                              |
| class        | the class of the block in Are.na (e.g. Link or Attachment) |
| title        | the title of the block in Are.na                           |
| user         | the user who created the block in Are.na                   |
| channel      | the channel where the block was pulled from                |
| source title | the title of the block's source                            |
| source url   | the url of the block's source                              |

### Roadmap

-   [x] Fetch all the user's channels.
-   [x] Attachment offline support.
-   [x] Getting blocks by their ID or URL.
-   [ ] Avoid overriding the frontmatter when pulling a block.
-   [ ] Template system (from [this issue](https://github.com/javierarce/arena-manager/issues/1))
-   [ ] Getting blocks to folders outside of the Are.na directory designated in the settings.
-   [x] Getting blocks from other users’ channels.
-   [ ] Creating new channels from the content of a note or directory

### Contributing

If you have ideas, suggestions, or bug reports feel free to [open an issue](https://github.com/javierarce/arena-manager/issues). To set up the project locally and submit code, see the [contributing guide](CONTRIBUTING.md).
