# Hide Deployments for GitHub

A Chrome extension that hides old deployment messages in GitHub PR timelines, keeping only the most recent deployment per environment.

<img width="300" alt="Extension menu screenshot" src="https://github.com/user-attachments/assets/31f1e1d7-196d-4243-8e98-3cb8c116d2b1" />

## What it does

GitHub PR timelines can get cluttered with deployment messages, especially in active repositories with frequent deployments. This extension cleans up the timeline by:

- Hiding successful deployments (all or just old ones, keeping most recent per environment)
- Hiding destroyed/temporary deployments
- Hiding failed deployments
- Auto-expanding the "Show environments" box with optional full-height display
- Auto-expanding "Load more..." buttons to show more timeline content

## Installation

1. Download or clone this repository
2. Open Chrome (or any Chromium-based browser) and go to `chrome://extensions/`
3. Enable "Developer mode" (toggle in the top right)
4. Click "Load unpacked"
5. Select the folder containing this extension\
   (_if you chose to download it as zip, unzip it first_)
7. Navigate to any GitHub PR to see the cleaner timeline
