# Hide Deployments for GitHub

A Chrome extension that hides old deployment messages in GitHub PR timelines, keeping only the most recent deployment per environment.

## What it does

GitHub PR timelines can get cluttered with deployment messages, especially in active repositories with frequent deployments. This extension cleans up the timeline by:

- Hiding old deployments, showing only the most recent one per environment
- Hiding destroyed/temporary deployments
- Optionally auto-expanding "Load more..." buttons to show more timeline content

## Installation

1. Download or clone this repository
2. Open Chrome and go to `chrome://extensions/`
3. Enable "Developer mode" (toggle in the top right)
4. Click "Load unpacked"
5. Select the folder containing this extension
6. Navigate to any GitHub PR to see the cleaner timeline

## Settings

Click the extension icon to access settings:

- **Hide old deployments** - Keep only the most recent deployment per environment
- **Hide destroyed deployments** - Hide deployments with "Destroyed" status
- **Expand "Load more..."** - Automatically expand hidden timeline items
  - **Expansion limit** - Maximum number of times to expand (default: 2)
