# Are.na Manager

Publish content from [Obsidian](https://obsidian.md) to [Are.na](https://www.are.na) and the other way around.

### Commands

Currently this plugin offers 5 commands:

| Command                   | Description                                                                                         |
| ------------------------- | --------------------------------------------------------------------------------------------------- |
| `Get blocks from channel` | Get all the blocks from a channel and create a new note in Obsidian with the content of each block. |
| `Pull block`              | Updates the current open note with the content of a block from Are.na.                              |
| `Push note`               | Pushes the content of the current open note to a block in Are.na.                                   |
| `Get block from Are.na`   | Creates a new note with the content of a block from Are.na.                                         |
| `Go to block in Are.na`   | Opens the block in the Are.na website.                                                              |

### Installation

> [!IMPORTANT]  
> The plugin is not yet available in the Obsidian community, so you need to install it manually for now

1. Clone this repository into your Obsidian plugins folder.
2. Run `npm install` in the plugin folder to install the dependencies.
3. Run `npm run build` to build the plugin.
4. Enable the plugin in Obsidian settings.
5. Create a new Are.na application at [https://dev.are.na/oauth/applications](https://dev.are.na/oauth/applications) and copy the access token.
6. Open the plugin settings page and set the following options
    - **Personal Access Token**: Your Are.na Personal Access Token,
    - **Username**: your Are.na slug (e.g. `username` in `https://www.are.na/username`),
    - **Folder**: Folder where you want to store the notes (the folder is called `arena` by default).

### Frontmatter structure

When you get a block from Are.na, the plugin will add some frontmatter automatically to allow syncronizing your note and the block.

| Property     | Description                                  |
| ------------ | -------------------------------------------- |
| blockid      | the id of the block in Are.na                |
| class        | the class of the block in Are.na (e.g. Link) |
| user         | the user who created the block in Are.na     |
| channel      | the channel where the block was pulled from  |
| source title | the title of the block's source              |
| source url   | the url of the block's source                |

### Roadmap

This plugin is still in development and has some known limitations that I’d like to address in future releases:

-   [ ] Media and attachment support in blocks.
-   [ ] Pulling blocks to folders outside of the Are.na directory designated in the settings.
-   [ ] Pulling blocks from other users’ channels.
-   [ ] Creating new channels from the content of a note or directory

### Contributing

If you have any ideas or suggestions, feel free to [open an issue](https://github.com/javierarce/arena-manager/issues).
