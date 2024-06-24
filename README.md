# Are.na Manager

Publish content from Obsidian to Are.na and the other way around.

### Commands

Currently this plugin offers 5 commands:

| Command                   | Description                                                                                         |
| ------------------------- | --------------------------------------------------------------------------------------------------- |
| `Get blocks from channel` | Get all the blocks from a channel and create a new note in Obsidian with the content of each block. |
| `Pull block`              | Updates the current open note with the content of a block from Are.na.                              |
| `Push note`               | Pushes the content of the current open note to a block in Are.na.                                   |
| `Get block from Are.na`   | Creates a new note with the content of a block from Are.na.                                         |
| `Go to block in Are.na`   | Opens the block in the Are.na website.                                                              |

To pull and push blocks your note will need to have a `blockid` property in the frontmatter.

### Installation

1. Install the plugin from the community or build it from source.
2. Create a new Are.na application at [https://dev.are.na/oauth/applications](https://dev.are.na/oauth/applications) and copy the access token.
3. Open the settings of the plugin and set the following options:
    - **Personal access token**: Your Are.na Personal Access Token,
    - **Username**: your Are.na slug (e.g. `username` in `https://www.are.na/username`),
    - **Folder**: Folder where you want to store the notes (by default the folder is called `are.na`).

### Limitations

This plugin is still in development and has some known limitations:

-   Image and attachment management is not currently supported.

### Contributing

If you have any ideas or suggestions, feel free to open an issue.
