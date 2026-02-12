# StackHub Chrome Extension (WXT + React)

This project is a WXT + React browser extension to view and manage stacked GitHub pull requests.

## What it does

- Stores GitHub token + repository coordinates in extension storage.
- Loads open pull requests from GitHub and groups them into stacks.
- Detects stack parent by:
  - `Depends on #123` in PR body, or
  - base branch matching another PR's head branch.
- Lets you:
  - open any PR,
  - copy `gh pr checkout <number>`,
  - align each child PR's base branch to its parent head branch.

## Start

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
npm run zip
```
