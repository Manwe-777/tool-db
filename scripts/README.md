# Scripts

## run-demo.js

Automates the process of building and running the demo project with the latest tooldb version.

### What it does:

1. Cleans all tooldb packages
2. Builds all tooldb packages
3. Installs/updates demo dependencies
4. Starts the Next.js dev server

### Usage:

From the root directory:

```bash
# Standard run (keeps existing node_modules in demo)
npm run demo

# Fresh install (cleans demo node_modules first)
npm run demo:fresh
```

### Options:

- `--clean`: Removes demo/node_modules before installing (used by `demo:fresh`)

### When to use which command:

- **`npm run demo`**: Use this most of the time. It rebuilds packages and updates demo dependencies without removing node_modules.
- **`npm run demo:fresh`**: Use this when you encounter dependency issues or want a completely fresh install.
