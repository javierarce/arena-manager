# Contributing to Are.na Manager

Thanks for your interest in improving Are.na Manager! This plugin lets you
publish content between [Obsidian](https://obsidian.md) and
[Are.na](https://www.are.na). Contributions of all kinds are welcome — bug
reports, feature ideas, documentation, and code.

## Ways to contribute

- **Report a bug** or **request a feature** by opening an
  [issue](https://github.com/javierarce/arena-manager/issues). Search first to
  avoid duplicates.
- **Improve the docs** — fixes to the README or this guide are very welcome.
- **Submit code** via a pull request (see below).

If you're planning a larger change, please open an issue first so we can discuss
the approach before you invest time in it.

## Development setup

You'll need [Node.js](https://nodejs.org) (the project targets Node 16+) and a
local Obsidian vault to test against.

1. Fork and clone the repository.
2. Install dependencies:
   ```sh
   npm install
   ```
3. Build the plugin in watch mode while you work:
   ```sh
   npm run dev
   ```
4. To test inside Obsidian, symlink or copy the repo into your vault's plugins
   folder, then enable the plugin:
   ```
   <your-vault>/.obsidian/plugins/arena-manager/
   ```
   The build produces `main.js`, `manifest.json`, and `styles.css` — those are
   the files Obsidian loads.

To produce a production build (type-checks first):

```sh
npm run build
```

## Project layout

| Path                | What lives there                                          |
| :------------------ | :-------------------------------------------------------- |
| `main.ts`           | Plugin entry point and lifecycle.                         |
| `lib/Arena.ts`      | Are.na API client.                                        |
| `lib/Commands.ts`   | Command implementations registered with Obsidian.         |
| `lib/FileHandler.ts`| Reading and writing notes/attachments in the vault.       |
| `lib/Modals.ts`     | UI modals.                                                |
| `lib/Settings.ts`   | Settings tab and stored options.                          |
| `lib/normalize.ts`, `lib/Utils.ts` | Helpers and formatting.                    |
| `lib/types.ts`      | Shared TypeScript types.                                  |
| `tests/`            | [Vitest](https://vitest.dev) unit tests.                  |

## Tests

The project uses [Vitest](https://vitest.dev). Please add or update tests for any
behavior you change.

```sh
npm test          # run the suite once
npm run test:watch  # re-run on change
```

## Code style

- Written in **TypeScript**. Keep new code typed; avoid `any` where a real type
  is reasonable.
- The project uses **ESLint** (`.eslintrc`) and an `.editorconfig`. Match the
  existing formatting (tabs for indentation, as in the current files).
- Lint your changes before opening a PR:
  ```sh
  npm run lint        # report issues
  npm run lint -- --fix  # auto-fix what it can
  ```
- Follow the conventions of the surrounding code — naming, structure, and
  patterns already in the file you're editing.

## Pull requests

1. Create a branch off `master` for your change.
2. Make sure the project builds, lints, and tests pass:
   ```sh
   npm run build && npm run lint && npm test
   ```
3. Keep PRs focused — one logical change per PR is easier to review.
4. Write a clear description of **what** changed and **why**. Link any related
   issue.
5. Open the PR against the `master` branch.

A maintainer will review your PR and may request changes. Thanks for helping
make Are.na Manager better!

## License

By contributing, you agree that your contributions will be licensed under the
[MIT License](LICENSE) that covers this project.
