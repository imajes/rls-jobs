# UI Prototypes

This folder contains exportable JSON payloads for Slack Block Kit preview.

## Generate / refresh

```zsh
npm run export:ui
```

## Files

- `job-posting-modal.json`
- `candidate-profile-modal.json`
- `job-preview-message.json`
- `candidate-preview-message.json`
- `index.json`

## Usage in Block Kit Builder

1. Open [https://app.slack.com/block-kit-builder](https://app.slack.com/block-kit-builder).
2. Choose the matching surface:
   - modal files -> Modal
   - preview files -> Message
3. Paste file JSON and render.
