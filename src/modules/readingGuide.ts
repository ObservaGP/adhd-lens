const HTML_NS = "http://www.w3.org/1999/xhtml";
const XUL_NS = "http://www.mozilla.org/keymaster/gatekeeper/there.is.only.xul";

type DragMode = "move" | "resize-left" | "resize-right" | "resize-height" | null;

type ColorPreset = {
  name: string;
  background: string;
  border: string;
};

type SizePreset = {
  name: string;
  left: string;
  top: string;
  width: string;
  height: string;
};

type StoredGuideLayout = {
  left: number;
  top: number;
  width: number;
  height: number;
  colorIndex: number;
};

const PREF_KEY = "extensions.zoteroReadingGuide.layoutsByDocument";

const GUIDE_ID = "zotero-reading-guide-bar";
const TOOLBAR_BUTTON_ID = "zotero-reading-guide-toolbar-button";
const TOOLBAR_STYLE_ID = "zotero-reading-guide-toolbar-style";

const COLOR_PRESETS: ColorPreset[] = [
  {
    name: "Amarelo",
    background: "rgba(255, 255, 0, 0.22)",
    border: "rgba(120, 120, 0, 0.35)",
  },
  {
    name: "Azul",
    background: "rgba(80, 160, 255, 0.20)",
    border: "rgba(30, 90, 160, 0.35)",
  },
  {
    name: "Verde",
    background: "rgba(80, 220, 120, 0.18)",
    border: "rgba(30, 120, 60, 0.35)",
  },
  {
    name: "Cinza",
    background: "rgba(180, 180, 180, 0.22)",
    border: "rgba(90, 90, 90, 0.35)",
  },
];

const SIZE_PRESETS: SizePreset[] = [
  {
    name: "Largo",
    left: "5vw",
    top: "320px",
    width: "90vw",
    height: "72px",
  },
  {
    name: "Coluna central",
    left: "28vw",
    top: "300px",
    width: "44vw",
    height: "72px",
  },
  {
    name: "Coluna esquerda",
    left: "18vw",
    top: "300px",
    width: "33vw",
    height: "72px",
  },
  {
    name: "Coluna direita",
    left: "50vw",
    top: "300px",
    width: "33vw",
    height: "72px",
  },
];

export class ReadingGuideController {
  private win: Window;
  private doc: Document;
  private guide: HTMLElement | null = null;
  private menuElements: Element[] = [];

  private dragMode: DragMode = null;
  private startX = 0;
  private startY = 0;
  private startLeft = 0;
  private startTop = 0;
  private startWidth = 0;
  private startHeight = 0;
  private pointerId: number | null = null;

  private colorIndex = 0;
  private keyboardRegistered = false;
  private refreshTimer: number | null = null;
  private currentDocumentKey = "";

  constructor(win: Window) {
    this.win = win;
    this.doc = win.document;
  }

  install() {
    this.currentDocumentKey = this.getCurrentDocumentKey();

    this.createMenuItems();
    this.createToolbarButton();
    this.registerKeyboardShortcuts();

    if (this.isReaderTabActive()) {
      this.show();
    }

    this.refreshTimer = this.win.setInterval(() => {
      this.handleDocumentSwitch();
    }, 700);
  }

  uninstall() {
    this.saveCurrentLayout();
    this.hide();
    this.removeMenuItems();
    this.removeToolbarButton();

    if (this.refreshTimer !== null) {
      this.win.clearInterval(this.refreshTimer);
      this.refreshTimer = null;
    }
  }

  toggle() {
    if (this.guide) {
      this.saveCurrentLayout();
      this.hide();
      return;
    }

    if (!this.isReaderTabActive()) {
      Zotero.debug("Zotero Reading Guide: ignored toggle outside PDF reader tab");
      this.updateToolbarButtonState();
      return;
    }

    this.show();
  }

  show() {
    if (this.guide) return;

    if (!this.isReaderTabActive()) {
      Zotero.debug("Zotero Reading Guide: show ignored outside PDF reader tab");
      this.updateToolbarButtonState();
      return;
    }

    this.currentDocumentKey = this.getCurrentDocumentKey();

    const guide = this.doc.createElementNS(HTML_NS, "div") as HTMLElement;
    guide.id = GUIDE_ID;

    const color = COLOR_PRESETS[this.colorIndex];
    const size = SIZE_PRESETS[0];

    guide.setAttribute(
      "style",
      [
        "position: fixed",
        `left: ${size.left}`,
        `top: ${size.top}`,
        `width: ${size.width}`,
        `height: ${size.height}`,
        `background: ${color.background}`,
        `border: 1px solid ${color.border}`,
        "box-shadow: 0 0 4px rgba(0, 0, 0, 0.18)",
        "z-index: 2147483647",
        "cursor: grab",
        "box-sizing: border-box",
        "pointer-events: auto",
        "user-select: none",
        "touch-action: none",
      ].join("; ")
    );

    const leftHandle = this.createHandle("left");
    const rightHandle = this.createHandle("right");
    const bottomHandle = this.createHandle("bottom");

    guide.appendChild(leftHandle);
    guide.appendChild(rightHandle);
    guide.appendChild(bottomHandle);

    guide.addEventListener("pointerdown", (ev) =>
      this.onPointerDown(ev as PointerEvent, "move")
    );

    leftHandle.addEventListener("pointerdown", (ev) =>
      this.onPointerDown(ev as PointerEvent, "resize-left")
    );

    rightHandle.addEventListener("pointerdown", (ev) =>
      this.onPointerDown(ev as PointerEvent, "resize-right")
    );

    bottomHandle.addEventListener("pointerdown", (ev) =>
      this.onPointerDown(ev as PointerEvent, "resize-height")
    );

    this.doc.documentElement!.appendChild(guide);
    this.guide = guide;

    this.applySavedLayout();
    this.updateToolbarButtonState();

    Zotero.debug(`Zotero Reading Guide: shown for ${this.currentDocumentKey}`);
  }

  hide() {
    if (!this.guide) {
      this.updateToolbarButtonState();
      return;
    }

    this.guide.remove();
    this.guide = null;

    this.updateToolbarButtonState();

    Zotero.debug("Zotero Reading Guide: hidden");
  }

  private isReaderTabActive(): boolean {
    try {
      const zoteroTabs = (this.win as any).Zotero_Tabs || (globalThis as any).Zotero_Tabs;

      const selectedID =
        zoteroTabs?.selectedID ||
        zoteroTabs?._selectedID ||
        zoteroTabs?.selectedTabID ||
        zoteroTabs?._selectedTabID ||
        zoteroTabs?.selected;

      if (!selectedID) {
        return false;
      }

      const reader = this.getReaderFromTabID(String(selectedID));

      if (!reader) {
        return false;
      }

      return reader._type === "pdf" || reader.type === "pdf" || Boolean(reader.itemID);
    } catch (_err) {
      return false;
    }
  }

  private createHandle(position: "left" | "right" | "bottom"): HTMLElement {
    const handle = this.doc.createElementNS(HTML_NS, "div") as HTMLElement;

    let style = [
      "position: absolute",
      "background: rgba(0, 0, 0, 0.06)",
      "z-index: 2147483647",
    ];

    if (position === "left") {
      style = style.concat([
        "left: 0",
        "top: 0",
        "width: 3px",
        "height: 100%",
        "cursor: ew-resize",
      ]);
    }

    if (position === "right") {
      style = style.concat([
        "right: 0",
        "top: 0",
        "width: 3px",
        "height: 100%",
        "cursor: ew-resize",
      ]);
    }

    if (position === "bottom") {
      style = style.concat([
        "left: 0",
        "bottom: 0",
        "width: 100%",
        "height: 3px",
        "cursor: ns-resize",
      ]);
    }

    handle.setAttribute("style", style.join("; "));
    return handle;
  }

  private onPointerDown(ev: PointerEvent, mode: DragMode) {
    if (!this.guide) return;

    ev.preventDefault();
    ev.stopPropagation();

    const rect = this.guide.getBoundingClientRect();

    this.dragMode = mode;
    this.pointerId = ev.pointerId;

    this.startX = ev.clientX;
    this.startY = ev.clientY;
    this.startLeft = rect.left;
    this.startTop = rect.top;
    this.startWidth = rect.width;
    this.startHeight = rect.height;

    this.guide.style.left = `${rect.left}px`;
    this.guide.style.top = `${rect.top}px`;
    this.guide.style.width = `${rect.width}px`;
    this.guide.style.height = `${rect.height}px`;

    if (this.dragMode === "move") {
      this.guide.style.cursor = "grabbing";
    }

    try {
      this.guide.setPointerCapture(ev.pointerId);
    } catch (_err) {
      // Ignora.
    }

    this.guide.addEventListener("pointermove", this.onPointerMove);
    this.guide.addEventListener("pointerup", this.onPointerUp);
    this.guide.addEventListener("pointercancel", this.onPointerUp);

    this.win.addEventListener("pointermove", this.onPointerMove);
    this.win.addEventListener("pointerup", this.onPointerUp);
  }

  private onPointerMove = (ev: PointerEvent) => {
    if (!this.guide || !this.dragMode) return;

    if (this.pointerId !== null && ev.pointerId !== this.pointerId) {
      return;
    }

    ev.preventDefault();

    const dx = ev.clientX - this.startX;
    const dy = ev.clientY - this.startY;

    const maxLeft = Math.max(0, this.win.innerWidth - this.startWidth);
    const maxTop = Math.max(0, this.win.innerHeight - this.startHeight);

    if (this.dragMode === "move") {
      const newLeft = this.clamp(this.startLeft + dx, 0, maxLeft);
      const newTop = this.clamp(this.startTop + dy, 0, maxTop);

      this.guide.style.left = `${newLeft}px`;
      this.guide.style.top = `${newTop}px`;
    }

    if (this.dragMode === "resize-left") {
      const maxRight = this.startLeft + this.startWidth;
      const newLeft = this.clamp(this.startLeft + dx, 0, maxRight - 120);
      const newWidth = maxRight - newLeft;

      this.guide.style.left = `${newLeft}px`;
      this.guide.style.width = `${newWidth}px`;
    }

    if (this.dragMode === "resize-right") {
      const newWidth = this.clamp(
        this.startWidth + dx,
        120,
        this.win.innerWidth - this.startLeft
      );

      this.guide.style.width = `${newWidth}px`;
    }

    if (this.dragMode === "resize-height") {
      const newHeight = this.clamp(
        this.startHeight + dy,
        20,
        this.win.innerHeight - this.startTop
      );

      this.guide.style.height = `${newHeight}px`;
    }
  };

  private onPointerUp = (ev: PointerEvent) => {
    if (!this.guide) return;

    ev.preventDefault();

    if (this.pointerId !== null) {
      try {
        this.guide.releasePointerCapture(this.pointerId);
      } catch (_err) {
        // Ignora.
      }
    }

    this.guide.style.cursor = "grab";
    this.dragMode = null;
    this.pointerId = null;

    this.guide.removeEventListener("pointermove", this.onPointerMove);
    this.guide.removeEventListener("pointerup", this.onPointerUp);
    this.guide.removeEventListener("pointercancel", this.onPointerUp);

    this.win.removeEventListener("pointermove", this.onPointerMove);
    this.win.removeEventListener("pointerup", this.onPointerUp);

    this.saveCurrentLayout();
  };

  private applyColor(index: number) {
    this.colorIndex = index;

    if (!this.guide) {
      if (!this.isReaderTabActive()) {
        Zotero.debug("Zotero Reading Guide: color change ignored outside PDF reader tab");
        return;
      }

      this.show();
    }

    if (!this.guide) return;

    const color = COLOR_PRESETS[this.colorIndex];

    this.guide.style.background = color.background;
    this.guide.style.border = `1px solid ${color.border}`;

    this.saveCurrentLayout();
    this.updateToolbarButtonState();

    Zotero.debug(`Zotero Reading Guide: color changed to ${color.name}`);
  }

  private applySizePreset(index: number) {
    if (!this.guide) {
      if (!this.isReaderTabActive()) {
        Zotero.debug("Zotero Reading Guide: size preset ignored outside PDF reader tab");
        return;
      }

      this.show();
    }

    if (!this.guide) return;

    const size = SIZE_PRESETS[index];

    this.guide.style.left = size.left;
    this.guide.style.top = size.top;
    this.guide.style.width = size.width;
    this.guide.style.height = size.height;

    const rect = this.guide.getBoundingClientRect();

    this.guide.style.left = `${rect.left}px`;
    this.guide.style.top = `${rect.top}px`;
    this.guide.style.width = `${rect.width}px`;
    this.guide.style.height = `${rect.height}px`;

    this.saveCurrentLayout();
    this.updateToolbarButtonState();

    Zotero.debug(`Zotero Reading Guide: size preset changed to ${size.name}`);
  }

  private handleDocumentSwitch() {
    const readerActive = this.isReaderTabActive();

    if (!readerActive) {
      if (this.guide) {
        this.saveCurrentLayout();
        this.hide();
      }

      this.currentDocumentKey = "";
      this.updateToolbarButtonState();
      return;
    }

    const newKey = this.getCurrentDocumentKey();

    if (newKey === this.currentDocumentKey) {
      if (!this.guide) {
        this.show();
      }

      this.updateToolbarButtonState();
      return;
    }

    this.saveCurrentLayout();
    this.currentDocumentKey = newKey;

    if (!this.guide) {
      this.show();
    } else {
      this.applySavedLayout();
    }

    this.updateToolbarButtonState();

    Zotero.debug(`Zotero Reading Guide: active document changed to ${newKey}`);
  }

  private getCurrentDocumentKey(): string {
    /*
      Chave de memória.
      No Zotero 9, o reader expõe reader.itemID.
      A melhor chave é libraryID + item.key do attachment PDF.
    */

    try {
      const zoteroTabs = (this.win as any).Zotero_Tabs || (globalThis as any).Zotero_Tabs;

      if (zoteroTabs) {
        const selectedID =
          zoteroTabs.selectedID ||
          zoteroTabs._selectedID ||
          zoteroTabs.selectedTabID ||
          zoteroTabs._selectedTabID ||
          zoteroTabs.selected;

        if (selectedID) {
          const reader = this.getReaderFromTabID(String(selectedID));

          if (reader) {
            const stableAttachmentKey = this.extractStableAttachmentKey(reader);

            if (stableAttachmentKey) {
              return stableAttachmentKey;
            }

            const readerKey = this.extractReaderKey(reader);

            if (readerKey) {
              return `reader:${readerKey}`;
            }
          }

          const selectedTab = this.getTabObject(zoteroTabs, selectedID);

          if (selectedTab) {
            const tabKey = this.extractTabKey(selectedTab, selectedID);

            if (tabKey) {
              return `tab:${tabKey}`;
            }
          }

          return `selected-tab-id:${this.normalizeKey(String(selectedID))}`;
        }
      }
    } catch (_err) {
      // Ignora.
    }

    const domKey = this.getActiveTabKeyFromDOM();

    if (domKey) {
      return `dom:${domKey}`;
    }

    const libraryKey = this.getLibrarySelectionKey();

    if (libraryKey) {
      return `library:${libraryKey}`;
    }

    const title = this.normalizeKey(this.doc.title || "");

    if (title) {
      return `window:${title}`;
    }

    return "global";
  }

  private extractStableAttachmentKey(reader: any): string {
    try {
      const itemID =
        reader?.itemID ||
        reader?._itemID ||
        reader?.item?.id ||
        reader?._item?.id;

      if (!itemID) {
        return "";
      }

      const item = (Zotero as any).Items.get(itemID);

      if (!item || !item.isAttachment?.()) {
        return "";
      }

      if (item.libraryID && item.key) {
        return `attachment:library-${item.libraryID}.item-${item.key}`;
      }

      return `attachment:item-id-${itemID}`;
    } catch (_err) {
      return "";
    }
  }

  private getReaderFromTabID(tabID: string): any | null {
    try {
      const zotero = (this.win as any).Zotero || (globalThis as any).Zotero;
      const readerAPI = zotero?.Reader || (Zotero as any).Reader;

      if (!readerAPI) return null;

      if (typeof readerAPI.getByTabID === "function") {
        const reader = readerAPI.getByTabID(tabID);

        if (reader) return reader;
      }

      if (readerAPI._readers instanceof Map) {
        for (const reader of readerAPI._readers.values()) {
          if (
            String(reader?.tabID || reader?._tabID || reader?.tabId || "") === tabID
          ) {
            return reader;
          }
        }
      }

      if (Array.isArray(readerAPI._readers)) {
        for (const reader of readerAPI._readers) {
          if (
            String(reader?.tabID || reader?._tabID || reader?.tabId || "") === tabID
          ) {
            return reader;
          }
        }
      }

      if (readerAPI._readers && typeof readerAPI._readers === "object") {
        for (const key of Object.keys(readerAPI._readers)) {
          const reader = readerAPI._readers[key];

          if (
            String(reader?.tabID || reader?._tabID || reader?.tabId || key) === tabID
          ) {
            return reader;
          }
        }
      }
    } catch (_err) {
      // Ignora.
    }

    return null;
  }

  private extractReaderKey(reader: any): string {
    const itemID =
      reader?.itemID ||
      reader?._itemID ||
      reader?.item?.id ||
      reader?._item?.id;

    const itemKey =
      reader?.itemKey ||
      reader?._itemKey ||
      reader?.item?.key ||
      reader?._item?.key;

    const readerID =
      reader?.id ||
      reader?.readerID ||
      reader?._id ||
      reader?._readerID;

    const title =
      reader?.title ||
      reader?._title ||
      reader?.item?.getDisplayTitle?.() ||
      reader?._item?.getDisplayTitle?.();

    if (itemKey) return `item-key:${this.normalizeKey(String(itemKey))}`;
    if (itemID) return `item-id:${String(itemID)}`;
    if (readerID) return `reader-id:${this.normalizeKey(String(readerID))}`;
    if (title) return `title:${this.normalizeKey(String(title))}`;

    return "";
  }

  private getTabObject(zoteroTabs: any, selectedID: any): any | null {
    try {
      if (selectedID && typeof zoteroTabs.get === "function") {
        const tab = zoteroTabs.get(selectedID);
        if (tab) return tab;
      }
    } catch (_err) {
      // Ignora.
    }

    try {
      if (Array.isArray(zoteroTabs._tabs)) {
        const found = zoteroTabs._tabs.find((tab: any) => {
          return (
            tab?.id === selectedID ||
            tab?.tabID === selectedID ||
            tab?.key === selectedID ||
            tab?.id === String(selectedID)
          );
        });

        if (found) return found;
      }
    } catch (_err) {
      // Ignora.
    }

    try {
      if (zoteroTabs._tabs instanceof Map) {
        return zoteroTabs._tabs.get(selectedID) || null;
      }
    } catch (_err) {
      // Ignora.
    }

    try {
      if (zoteroTabs._tabs && typeof zoteroTabs._tabs === "object") {
        return zoteroTabs._tabs[selectedID] || null;
      }
    } catch (_err) {
      // Ignora.
    }

    return null;
  }

  private extractTabKey(tab: any, selectedID: any): string {
    const data = tab?.data || tab?._data || {};

    const type =
      tab?.type ||
      tab?.mode ||
      tab?.kind ||
      data?.type ||
      "tab";

    const itemID =
      data?.itemID ||
      data?.id ||
      tab?.itemID ||
      tab?.itemId;

    const itemKey =
      data?.itemKey ||
      data?.key ||
      data?.attachmentKey ||
      tab?.itemKey ||
      tab?.key;

    const readerID =
      data?.readerID ||
      data?.readerId ||
      tab?.readerID ||
      tab?.readerId;

    const title =
      tab?.title ||
      tab?.label ||
      tab?.name ||
      data?.title ||
      data?.label ||
      data?.name ||
      selectedID;

    if (itemKey) return `${type}:key:${this.normalizeKey(String(itemKey))}`;
    if (itemID) return `${type}:item:${String(itemID)}`;
    if (readerID) return `${type}:reader:${this.normalizeKey(String(readerID))}`;
    if (title) return `${type}:title:${this.normalizeKey(String(title))}`;

    return `${type}:selected:${this.normalizeKey(String(selectedID))}`;
  }

  private getActiveTabKeyFromDOM(): string {
    const candidateSelectors = [
      "[role='tab'][aria-selected='true']",
      "[role='tab'][selected='true']",
      "[role='tab'][selected]",
      "tab[selected='true']",
      "tab[selected]",
      ".tab[selected='true']",
      ".tab[selected]",
      ".tab.selected",
      ".tab.active",
      ".tabs .selected",
      ".tabs .active",
      "[class*='tab'][aria-selected='true']",
      "[class*='tab'][selected='true']",
      "[class*='tab'].selected",
      "[class*='tab'].active",
    ];

    for (const selector of candidateSelectors) {
      const el = this.doc.querySelector(selector) as HTMLElement | null;

      if (!el) continue;

      const label =
        el.getAttribute("label") ||
        el.getAttribute("title") ||
        el.getAttribute("aria-label") ||
        el.textContent ||
        "";

      const normalized = this.normalizeKey(label);

      if (normalized) {
        return normalized;
      }
    }

    return "";
  }

  private getLibrarySelectionKey(): string {
    try {
      const selectedItems = (this.win as any).ZoteroPane?.getSelectedItems?.();

      if (Array.isArray(selectedItems) && selectedItems.length > 0) {
        const first = selectedItems[0];

        if (first?.key) {
          return `selected-item-key:${first.key}`;
        }

        if (first?.id) {
          return `selected-item-id:${first.id}`;
        }
      }
    } catch (_err) {
      // Ignora.
    }

    return "";
  }

  private normalizeKey(value: string): string {
    return value
      .replace(/\s+/g, " ")
      .replace(/×/g, "")
      .trim()
      .slice(0, 180);
  }

  private readLayouts(): Record<string, StoredGuideLayout> {
    try {
      const raw = (Zotero as any).Prefs.get(PREF_KEY, true);

      if (!raw || typeof raw !== "string") {
        return {};
      }

      const parsed = JSON.parse(raw);

      if (!parsed || typeof parsed !== "object") {
        return {};
      }

      return parsed;
    } catch (_err) {
      return {};
    }
  }

  private writeLayouts(layouts: Record<string, StoredGuideLayout>) {
    try {
      (Zotero as any).Prefs.set(PREF_KEY, JSON.stringify(layouts), true);
    } catch (err) {
      Zotero.debug(`Zotero Reading Guide: failed to save layout: ${err}`);
    }
  }

  private saveCurrentLayout() {
    if (!this.guide) return;

    const key = this.currentDocumentKey || this.getCurrentDocumentKey();
    const rect = this.guide.getBoundingClientRect();

    const layouts = this.readLayouts();

    layouts[key] = {
      left: Math.round(rect.left),
      top: Math.round(rect.top),
      width: Math.round(rect.width),
      height: Math.round(rect.height),
      colorIndex: this.colorIndex,
    };

    this.writeLayouts(layouts);

    Zotero.debug(`Zotero Reading Guide: layout saved for ${key}`);
  }

  private applySavedLayout() {
    if (!this.guide) return;

    const key = this.currentDocumentKey || this.getCurrentDocumentKey();
    const layouts = this.readLayouts();
    const layout = layouts[key];

    if (!layout) {
      return;
    }

    this.colorIndex = this.clamp(
      layout.colorIndex ?? 0,
      0,
      COLOR_PRESETS.length - 1
    );

    const color = COLOR_PRESETS[this.colorIndex];

    this.guide.style.left = `${layout.left}px`;
    this.guide.style.top = `${layout.top}px`;
    this.guide.style.width = `${layout.width}px`;
    this.guide.style.height = `${layout.height}px`;
    this.guide.style.background = color.background;
    this.guide.style.border = `1px solid ${color.border}`;

    Zotero.debug(`Zotero Reading Guide: layout restored for ${key}`);
  }

  private createToolbarButton() {
    this.ensureToolbarButtonStyle();

    if (this.doc.getElementById(TOOLBAR_BUTTON_ID)) {
      this.updateToolbarButtonState();
      return;
    }

    const toolbar =
      this.doc.getElementById("zotero-tabs-toolbar") ||
      this.doc.getElementById("zotero-items-toolbar") ||
      this.doc.getElementById("zotero-toolbar") ||
      this.doc.querySelector("toolbar");

    if (!toolbar) {
      Zotero.debug("Zotero Reading Guide: toolbar not found");
      return;
    }

    const createXULElement = (this.doc as any).createXULElement?.bind(this.doc);
    const button = createXULElement
      ? createXULElement("toolbarbutton")
      : this.doc.createElementNS(XUL_NS, "toolbarbutton");

    button.setAttribute("id", TOOLBAR_BUTTON_ID);
    button.setAttribute("class", "zotero-tb-button");
    button.setAttribute("type", "button");
    button.setAttribute("tabindex", "-1");
    button.setAttribute("tooltiptext", "Mostrar/ocultar ADHD Lens");
    button.setAttribute("aria-label", "Mostrar/ocultar ADHD Lens");
    button.setAttribute("label", "");
    button.setAttribute("data-active", "false");

    button.addEventListener("command", () => {
      this.toggle();
      this.updateToolbarButtonState();
    });

    button.addEventListener("click", () => {
      this.toggle();
      this.updateToolbarButtonState();
    });

    const insertBefore =
      this.doc.getElementById("zotero-tb-tabs-menu") ||
      this.doc.getElementById("zotero-tb-sync") ||
      toolbar.firstChild;

    toolbar.insertBefore(button, insertBefore);
    this.updateToolbarButtonState();

    Zotero.debug("Zotero Reading Guide: toolbar button created");
  }

  private ensureToolbarButtonStyle() {
    if (this.doc.getElementById(TOOLBAR_STYLE_ID)) {
      return;
    }

    const style = this.doc.createElementNS(HTML_NS, "style");
    style.id = TOOLBAR_STYLE_ID;

    style.textContent = `
      #${TOOLBAR_BUTTON_ID} {
        min-width: 28px !important;
        width: 28px !important;
        min-height: 28px !important;
        height: 28px !important;
        padding: 0 !important;
        margin: 0 2px !important;
        border-radius: 4px !important;
        background: transparent !important;
        list-style-image: none !important;
        -moz-context-properties: none !important;
      }

      #${TOOLBAR_BUTTON_ID}::before {
        content: "";
        display: block;
        width: 16px;
        height: 16px;
        margin: 6px;
        border-radius: 3px;
        background: rgba(255, 150, 0, 0.96);
        box-shadow:
          inset 0 0 0 1px rgba(130, 70, 0, 0.45),
          0 0 0 1px rgba(255, 255, 255, 0.35);
      }

      #${TOOLBAR_BUTTON_ID}[data-active="true"]::before {
        background: rgba(255, 215, 70, 0.98);
        box-shadow:
          inset 0 0 0 1px rgba(130, 90, 0, 0.55),
          0 0 0 2px rgba(255, 210, 60, 0.38);
      }

      #${TOOLBAR_BUTTON_ID}:hover::before {
        filter: brightness(1.08);
      }
    `;

    this.doc.documentElement!.appendChild(style);
  }

  private updateToolbarButtonState() {
    const button = this.doc.getElementById(TOOLBAR_BUTTON_ID);
    if (!button) return;

    button.setAttribute("data-active", this.guide ? "true" : "false");
  }

  private removeToolbarButton() {
    this.doc.getElementById(TOOLBAR_BUTTON_ID)?.remove();
    this.doc.getElementById(TOOLBAR_STYLE_ID)?.remove();
  }

  private createMenuItems() {
    const toolsPopup =
      this.doc.getElementById("menu_ToolsPopup") ||
      this.doc.getElementById("menuToolsPopup");

    if (!toolsPopup) {
      Zotero.debug("Zotero Reading Guide: tools menu not found");
      return;
    }

    if (this.doc.getElementById("zotero-reading-guide-menu")) {
      return;
    }

    const mainMenu = this.doc.createElementNS(XUL_NS, "menu");
    mainMenu.setAttribute("id", "zotero-reading-guide-menu");
    mainMenu.setAttribute("label", "ADHD Lens");

    const popup = this.doc.createElementNS(XUL_NS, "menupopup");
    mainMenu.appendChild(popup);

    this.appendMenuItem(
      popup,
      "zotero-reading-guide-toggle",
      "Mostrar/ocultar guia",
      () => this.toggle()
    );

    this.appendSeparator(popup);

    const colorMenu = this.doc.createElementNS(XUL_NS, "menu");
    colorMenu.setAttribute("id", "zotero-reading-guide-colors-menu");
    colorMenu.setAttribute("label", "Cores");

    const colorPopup = this.doc.createElementNS(XUL_NS, "menupopup");
    colorMenu.appendChild(colorPopup);

    this.appendMenuItem(colorPopup, "zotero-reading-guide-color-yellow", "Amarelo", () =>
      this.applyColor(0)
    );
    this.appendMenuItem(colorPopup, "zotero-reading-guide-color-blue", "Azul", () =>
      this.applyColor(1)
    );
    this.appendMenuItem(colorPopup, "zotero-reading-guide-color-green", "Verde", () =>
      this.applyColor(2)
    );
    this.appendMenuItem(colorPopup, "zotero-reading-guide-color-gray", "Cinza", () =>
      this.applyColor(3)
    );

    popup.appendChild(colorMenu);
    this.menuElements.push(colorMenu);

    const sizeMenu = this.doc.createElementNS(XUL_NS, "menu");
    sizeMenu.setAttribute("id", "zotero-reading-guide-sizes-menu");
    sizeMenu.setAttribute("label", "Tamanhos e posições");

    const sizePopup = this.doc.createElementNS(XUL_NS, "menupopup");
    sizeMenu.appendChild(sizePopup);

    this.appendMenuItem(sizePopup, "zotero-reading-guide-size-wide", "Largo", () =>
      this.applySizePreset(0)
    );
    this.appendMenuItem(sizePopup, "zotero-reading-guide-size-central", "Coluna central", () =>
      this.applySizePreset(1)
    );
    this.appendMenuItem(sizePopup, "zotero-reading-guide-size-left", "Coluna esquerda", () =>
      this.applySizePreset(2)
    );
    this.appendMenuItem(sizePopup, "zotero-reading-guide-size-right", "Coluna direita", () =>
      this.applySizePreset(3)
    );

    popup.appendChild(sizeMenu);
    this.menuElements.push(sizeMenu);

    this.appendSeparator(popup);

    this.appendMenuItem(
      popup,
      "zotero-reading-guide-show-key",
      "Mostrar chave atual da aba/documento",
      () => this.showCurrentKey()
    );

    toolsPopup.appendChild(mainMenu);
    this.menuElements.push(mainMenu);
  }

  private appendMenuItem(
    popup: Element,
    id: string,
    label: string,
    command: () => void
  ) {
    const item = this.doc.createElementNS(XUL_NS, "menuitem");
    item.setAttribute("id", id);
    item.setAttribute("label", label);
    item.addEventListener("command", command);

    popup.appendChild(item);
    this.menuElements.push(item);
  }

  private appendSeparator(popup: Element) {
    const separator = this.doc.createElementNS(XUL_NS, "menuseparator");
    popup.appendChild(separator);
    this.menuElements.push(separator);
  }

  private showCurrentKey() {
    const key = this.getCurrentDocumentKey();
    const layouts = this.readLayouts();
    const knownKeys = Object.keys(layouts);

    this.win.alert(
      [
        "ADHD Lens",
        "",
        `Chave atual: ${key}`,
        "",
        `Chaves salvas: ${knownKeys.length}`,
        ...knownKeys.slice(0, 12).map((k) => `- ${k}`),
        knownKeys.length > 12 ? "..." : "",
      ].join("\n")
    );
  }

  private removeMenuItems() {
    for (const item of this.menuElements) {
      item.remove();
    }

    this.menuElements = [];
  }

  private registerKeyboardShortcuts() {
    if (this.keyboardRegistered) return;
    this.keyboardRegistered = true;

    this.win.addEventListener("keydown", (ev: KeyboardEvent) => {
      if (!ev.altKey || !ev.shiftKey) return;

      const key = ev.key.toLowerCase();
      const code = ev.code;

      if (key === "g") {
        ev.preventDefault();
        this.toggle();
        return;
      }

      if (!this.isReaderTabActive()) {
        return;
      }

      if (!this.guide) {
        this.show();
      }

      if (!this.guide) return;

      const rect = this.guide.getBoundingClientRect();
      let changed = false;

      if (ev.key === "ArrowUp") {
        ev.preventDefault();
        this.guide.style.top = `${Math.max(0, rect.top - 10)}px`;
        changed = true;
      }

      if (ev.key === "ArrowDown") {
        ev.preventDefault();
        this.guide.style.top = `${Math.min(
          this.win.innerHeight - rect.height,
          rect.top + 10
        )}px`;
        changed = true;
      }

      if (ev.key === "ArrowLeft") {
        ev.preventDefault();
        this.guide.style.left = `${Math.max(0, rect.left - 10)}px`;
        changed = true;
      }

      if (ev.key === "ArrowRight") {
        ev.preventDefault();
        this.guide.style.left = `${Math.min(
          this.win.innerWidth - rect.width,
          rect.left + 10
        )}px`;
        changed = true;
      }

      if (ev.key === "+" || code === "Equal" || code === "NumpadAdd") {
        ev.preventDefault();
        this.guide.style.height = `${Math.min(
          this.win.innerHeight - rect.top,
          rect.height + 10
        )}px`;
        changed = true;
      }

      if (ev.key === "-" || code === "Minus" || code === "NumpadSubtract") {
        ev.preventDefault();
        this.guide.style.height = `${Math.max(20, rect.height - 10)}px`;
        changed = true;
      }

      if (code === "Digit1" || code === "Numpad1") {
        ev.preventDefault();
        this.applyColor(0);
        return;
      }

      if (code === "Digit2" || code === "Numpad2") {
        ev.preventDefault();
        this.applyColor(1);
        return;
      }

      if (code === "Digit3" || code === "Numpad3") {
        ev.preventDefault();
        this.applyColor(2);
        return;
      }

      if (code === "Digit4" || code === "Numpad4") {
        ev.preventDefault();
        this.applyColor(3);
        return;
      }

      if (key === "q") {
        ev.preventDefault();
        this.applySizePreset(0);
        return;
      }

      if (key === "w") {
        ev.preventDefault();
        this.applySizePreset(1);
        return;
      }

      if (key === "e") {
        ev.preventDefault();
        this.applySizePreset(2);
        return;
      }

      if (key === "r") {
        ev.preventDefault();
        this.applySizePreset(3);
        return;
      }

      if (changed) {
        this.saveCurrentLayout();
        this.updateToolbarButtonState();
      }
    });
  }

  private clamp(value: number, min: number, max: number): number {
    if (max < min) return min;
    return Math.min(Math.max(value, min), max);
  }
}
