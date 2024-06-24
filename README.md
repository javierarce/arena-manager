# Are.na Manager

Manage your Are.na account from Obsidian.

### Commands

Currently this plugin offers 5 commands:

#### Get blocks from channel

Get all the blocks from a channel and create a new note with the content of each block.

#### Pull block from Are.na

Updates the current open note with the content of a block from Are.na. It uses
the `blockid` property in the frontmatter to know which block to pull.

#### Push block to Are.na

Pushes the content of the current open note to a block in Are.na. It uses the
`blockid` property in the frontmatter to know which block to push to.

#### Get a block from Are.na

Creates a new note with the content of a block from Are.na.

#### Go to block in Are.na

Opens the block in Are.na in the browser. It uses the `blockid` property in the
frontmatter to know which block to open.

### Configuration

-   **accessToken**: Your Are.na access token,
-   **username**: your Are.na slug (e.g. `username` in `https://www.are.na/username`),
-   **folder**: Folder where you want to store the notes.

### Limitations

-   Image and attachment management is not currently supported.
