# ADHD Lens

![Zotero](https://img.shields.io/badge/Zotero-9-red?style=flat-square)
![TypeScript](https://img.shields.io/badge/TypeScript-enabled-blue?style=flat-square)
![Status](https://img.shields.io/badge/status-experimental-orange?style=flat-square)
![License](https://img.shields.io/badge/license-AGPL--3.0-green?style=flat-square)
[![Using Zotero Plugin Template](https://img.shields.io/badge/Using-Zotero%20Plugin%20Template-blue?style=flat-square&logo=github)](https://github.com/windingwind/zotero-plugin-template)

**ADHD Lens for Zotero** is a lightweight reading guide overlay for PDF reading in Zotero.

The plugin adds a movable, resizable, and translucent visual guide to help users maintain focus while reading academic PDFs.

---

## Purpose

ADHD Lens was created as an experimental accessibility-oriented plugin for Zotero.

Its goal is to support focused academic reading by providing a visual guide that can be positioned over the text. The project was inspired by screen ruler tools, but adapted for reading support rather than measurement.

The current version focuses on a simple and stable overlay that the user can manually position, resize, and customize while reading.

---

## Features

### Reading guide overlay

- Movable translucent guide
- Resizable width
- Resizable height
- Thin drag handles
- Pointer capture support to reduce cursor loss while dragging
- No internal label/text inside the guide

### Color presets

The guide currently supports four visual presets:

- Yellow
- Blue
- Green
- Gray

These options are available from the Zotero menu.

### Size and position presets

The plugin includes preset layouts for common reading situations:

- Wide layout
- Central column
- Left column
- Right column

This is especially useful for academic PDFs with one-column or two-column layouts.

### Keyboard shortcuts

Some actions can be triggered with keyboard shortcuts. Shortcut behavior may depend on the operating system, keyboard layout, and Zotero focus state.

| Shortcut | Action |
|---|---|
| `Alt + Shift + G` | Show/hide guide |
| `Alt + Shift + ↑` | Move guide up |
| `Alt + Shift + ↓` | Move guide down |
| `Alt + Shift + ←` | Move guide left |
| `Alt + Shift + →` | Move guide right |
| `Alt + Shift + +` | Increase guide height |
| `Alt + Shift + -` | Decrease guide height |
| `Alt + Shift + 1` | Yellow guide |
| `Alt + Shift + 2` | Blue guide |
| `Alt + Shift + 3` | Green guide |
| `Alt + Shift + 4` | Gray guide |
| `Alt + Shift + Q` | Wide preset |
| `Alt + Shift + W` | Central column preset |
| `Alt + Shift + E` | Left column preset |
| `Alt + Shift + R` | Right column preset |

When shortcuts do not work reliably, use the Zotero menu instead.

---

## Zotero menu

The plugin adds a submenu to Zotero's **Tools** menu:

```text
Tools
└── Zotero Reading Guide
    ├── Show/hide guide
    ├── Colors
    │   ├── Yellow
    │   ├── Blue
    │   ├── Green
    │   └── Gray
    ├── Sizes and positions
    │   ├── Wide
    │   ├── Central column
    │   ├── Left column
    │   └── Right column
    └── Show current tab/document key
```

The diagnostic option **Show current tab/document key** is used to inspect how the plugin identifies the currently active Zotero tab or document.

---

## Experimental memory

ADHD Lens includes an experimental local memory mechanism.

The goal is to remember the guide's:

- position
- width
- height
- color

for different active Zotero tabs or documents.

This feature is still experimental. In the current prototype, document identification is based on available Zotero tab, reader, and DOM information. Future versions should improve this by using a more robust Zotero attachment key or item identifier.

---

## Current status

This project is an experimental prototype.

It is under active development and may change significantly.

Current priorities:

- improve per-document memory;
- refine Zotero tab/PDF detection;
- improve menu organization;
- improve user preferences;
- prepare packaged releases.

---

## Tested environment

Tested on:

- Linux Mint / Ubuntu
- Zotero 9
- Zotero installed via Flatpak
- Node.js 22
- npm 10

---

## Development setup

Clone the repository:

```bash
git clone https://github.com/ObservaGP/adhd-lens.git
cd adhd-lens
```

Use the Node.js version defined in `.nvmrc`:

```bash
nvm use
```

Install dependencies:

```bash
npm install
```

Build the plugin:

```bash
npm run build
```

The generated `.xpi` file is created inside:

```bash
.scaffold/build/
```

---

## Installing locally in Zotero

After building, locate the generated `.xpi` file:

```bash
XPI=$(find .scaffold -type f -name "*.xpi" | head -n 1)
echo "$XPI"
```

Copy it to Zotero's extensions folder.

Example:

```bash
cp "$XPI" ~/.zotero/zotero/PROFILE.default/extensions/zotero-reading-guide@victor.xpi
```

Replace `PROFILE.default` with your actual Zotero profile folder.

Then restart Zotero.

For Zotero installed through Flatpak, the application can usually be restarted with:

```bash
flatpak kill org.zotero.Zotero
flatpak run org.zotero.Zotero
```

---

## Development notes

This project was initially developed from the Zotero Plugin Template.

Main customized files include:

```text
src/modules/readingGuide.ts
src/hooks.ts
package.json
addon/manifest.json
README.md
```

The core reading guide logic is currently implemented in:

```text
src/modules/readingGuide.ts
```

The Zotero lifecycle hook integration is implemented in:

```text
src/hooks.ts
```

---

## Roadmap

Possible next steps:

- improve document-specific memory;
- use Zotero attachment keys instead of tab labels when possible;
- add a preferences pane;
- allow users to configure opacity;
- allow users to configure default color;
- allow users to configure default height;
- add export/import of settings;
- prepare GitHub releases with `.xpi` packages.

---

## Repository

Repository name:

```text
adhd-lens
```

Public plugin name:

```text
ADHD Lens for Zotero
```

---

## License

This repository currently keeps the original **AGPL-3.0** license inherited from the Zotero Plugin Template.

No warranties are provided.
