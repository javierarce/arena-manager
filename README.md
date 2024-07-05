# Are.na Manager

Publish content from [Obsidian](https://obsidian.md) to [Are.na](https://www.are.na) and the other way around.

### Commands

Currently this plugin offers 5 commands:

| Command                   | Description                                                                                         |
|:------------------------- |:--------------------------------------------------------------------------------------------------- |
| `Get blocks from channel` | Get all the blocks from a channel and create a new note in Obsidian with the content of each block. |
| `Pull block`              | Updates the current open note with the content of a block from Are.na.                              |
| `Push note`               | Pushes the content of the current open note to a block in Are.na.                                   |
| `Get block from Are.na`   | Creates a new note with the content of a block from Are.na.                                         |
| `Go to block in Are.na`   | Opens the block in the Are.na website.                                                              |

### Installation

1. [Install the plugin](https://obsidian.md/plugins?search=are.na%20manager) and enable it in Obsidian settings.
2. Create a new Are.na application at [https://dev.are.na/oauth/applications](https://dev.are.na/oauth/applications). You can use any valid URL in the "Redirect URI
" field (for example, `https://api.are.na/v2` or the URL of your blog).
3. Submit the form and copy the "Personal Access Token".
4. Open the plugin settings page and set the following options
    - **Personal Access Token**: Your Are.na Personal Access Token,
    - **Username**: your Are.na slug (e.g. `username` in `https://www.are.na/username`),
    - **Folder**: Folder where you want to store the notes (the folder is called `arena` by default).
5. Use any of the commands above to interact with your Are.na blocks and channels.

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
