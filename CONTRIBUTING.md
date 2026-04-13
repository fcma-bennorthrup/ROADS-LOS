# Contributing to ROADS-LOS

This project is collaboratively developed between Replit and local environments, synced via GitHub. Follow these guidelines to avoid overwriting each other's work.

## Pull Before You Push

Always pull the latest changes before pushing your work. The push endpoint will block your push if it detects that someone else has pushed changes since your last sync and any of your files conflict with theirs.

## How Sync Works

The system tracks the last commit SHA that was successfully synced. When you push or pull, it compares your files against the remote files using that sync point as a common ancestor:

- **Files only you changed**: Safe to push/pull normally.
- **Files only the other person changed**: Safe to push/pull normally.
- **Files both of you changed**: Flagged as a conflict. The operation will either block (push) or skip those files (pull) so nothing gets overwritten.

## Workflow

1. **Before starting work**: Pull the latest from GitHub.
2. **Do your work**: Edit files as needed.
3. **When ready to share**: Push to GitHub.
   - If the push is blocked due to conflicts, pull first to see which files conflict.
   - Manually reconcile the conflicting files.
   - Push again.

## Reading Conflict Reports

When a conflict is detected, the API response includes:

- `conflicts`: A list of files that were modified on both sides, with the file path and a description of the issue.
- `filesUpdated`: How many files were safely synced.
- `filesUnchanged`: How many files were identical on both sides.

## Force Push / Force Pull

If you are certain you want to overwrite, you can pass `{ "force": true }` in the request body. This skips conflict detection entirely. Use with caution.

## File Exclusions

The following are excluded from sync:
- `node_modules`, `.git`, `.cache`, `dist`, `.local`, `.agents`, `migrations`, `.config`, `.upm`, `attached_assets`
- `package-lock.json`
- Binary files (images, fonts, PDFs, videos, archives)
- Files larger than 500 KB
