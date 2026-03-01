# Agent Guide — enough-reddit

## Environment

This is a Firefox browser extension. The canonical tool for linting and packaging it is [`web-ext`](https://github.com/mozilla/web-ext).

Install it once globally if not already present:

```bash
npm install -g web-ext
```

Verify it is available before running any command:

```bash
web-ext --version
```

---

## Linting

Always lint before building. Lint catches manifest errors, deprecated APIs, and common extension mistakes.

```bash
web-ext lint
```

Run from the project root (where `manifest.json` lives). A clean run prints no errors. Warnings are acceptable but should be reviewed. Fix all errors before proceeding to build.

---

## Building

Build produces a signed-ready `.zip` artifact in `./web-ext-artifacts/`:

```bash
web-ext build
```

The output file will be named `enough_reddit-{version}.zip` where `{version}` comes from the `version` field in `manifest.json`. Increment that field before each build.

To clean old artifacts before building:

```bash
rm -rf web-ext-artifacts && web-ext build
```

---

## Workflow

Always follow this order:

1. Make code changes
2. Run `web-ext lint` — fix any errors before continuing
3. Bump `version` in `manifest.json` if shipping
4. Run `web-ext build`
5. The artifact in `web-ext-artifacts/` is ready for submission or manual install

---

## Running locally (optional)

To launch Firefox with the extension loaded for manual testing:

```bash
web-ext run
```

This opens a temporary Firefox profile with the extension installed and auto-reloads on file changes. Quit with `Ctrl+C`.

---

## Files excluded from the build

Create a `web-ext-config.cjs` file at the project root to define which files should be excluded:

```javascript
module.exports = {
  ignoreFiles: [
    'AGENT.md',
    'plan.md',
    'README.md',
    '*.md',
    'web-ext-config.cjs'
  ]
};
```
