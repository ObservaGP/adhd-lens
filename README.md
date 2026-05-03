# ADHD Lens for Zotero

![Zotero](https://img.shields.io/badge/Zotero-9-red?style=flat-square)
![TypeScript](https://img.shields.io/badge/TypeScript-enabled-blue?style=flat-square)
![Status](https://img.shields.io/badge/status-experimental-orange?style=flat-square)
![License](https://img.shields.io/badge/license-AGPL--3.0-green?style=flat-square)
[![Using Zotero Plugin Template](https://img.shields.io/badge/Using-Zotero%20Plugin%20Template-blue?style=flat-square&logo=github)](https://github.com/windingwind/zotero-plugin-template)

**ADHD Lens for Zotero** is a lightweight Zotero plugin that adds a movable, resizable, translucent reading guide overlay for focused PDF reading.

It is designed as an accessibility-oriented Zotero extension for people who benefit from visual reading aids, including users with ADHD, attention difficulties, visual tracking fatigue, or anyone reading dense academic PDFs.

> Current target: **Zotero 9**  
> Current status: **experimental prototype**

---

## What it does

ADHD Lens adds a visual reading guide to Zotero's PDF reader.

The guide works like a soft, translucent reading bar that can be positioned over the text while reading academic articles, books, reports, and other PDF documents in Zotero.

The plugin currently supports:

- a movable reading guide overlay;
- width resizing;
- height resizing;
- color presets;
- size and position presets;
- keyboard shortcuts;
- Zotero Tools menu integration;
- toolbar button integration;
- local per-PDF layout memory.

---

## Why this plugin exists

Academic PDFs are often visually dense, especially when they use:

- small font sizes;
- narrow margins;
- two-column layouts;
- long paragraphs;
- complex page structures;
- dense theoretical or technical writing.

ADHD Lens was created to support focused academic reading by providing a simple visual guide that helps the reader keep their place on the page.

The project was inspired by screen ruler and reading ruler tools, but adapted specifically for Zotero's PDF reading workflow.

---

## Main features

### Reading guide overlay

- Movable translucent guide
- Resizable width
- Resizable height
- Thin drag handles
- No internal label or text inside the guide
- Designed to stay visually unobtrusive while reading

### Per-PDF layout memory

ADHD Lens can remember the guide layout independently for each PDF.

For each PDF, it can locally remember:

- position;
- width;
- height;
- selected color;
- enabled/disabled state.

This is useful because different PDFs often require different guide positions, especially when switching between one-column and two-column layouts.

### PDF-only behavior

The reading guide is shown only when a Zotero PDF reader tab is active.

It does not appear over the main Zotero library/items list.

### Color presets

The guide currently supports four color presets:

- Yellow
- Blue
- Green
- Gray

### Size and position presets

The plugin includes preset layouts for common reading situations:

- Wide
- Central column
- Left column
- Right column

These presets are useful for one-column and two-column academic PDFs.

### Keyboard shortcuts

Some actions can be triggered with keyboard shortcuts.

Shortcut behavior may depend on the operating system, keyboard layout, and Zotero focus state.

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
└── ADHD Lens
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
