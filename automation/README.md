# Automation

This folder holds what the content runs need **from this project**:

- `QUEUE.md`: the task queue (`- [ ] \`id\`: description`, ticked when done)
- `PROMPT.md`: the prompt template for each item (`{{MODULE}}`, `{{DESC}}`)
- `reports/`: one report per finished item

The runner, the app, the tray icon and the run logs live in **overclaude**
(`C:\Users\Edgar\Projects\overclaude`), which works through this queue on the `content` branch.
Add new items to `QUEUE.md`, then click Start in overclaude.
