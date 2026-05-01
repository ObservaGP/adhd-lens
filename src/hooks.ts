import { ReadingGuideController } from "./modules/readingGuide";

const controllers = new WeakMap<Window, ReadingGuideController>();

const hooks = {
  async onStartup() {
    Zotero.debug("Zotero Reading Guide: startup");

    try {
      const mainWin = (Zotero as any).getMainWindow?.() as Window | undefined;

      if (mainWin && !controllers.has(mainWin)) {
        const controller = new ReadingGuideController(mainWin);
        controllers.set(mainWin, controller);
        controller.install();
      }
    } catch (err) {
      Zotero.debug(`Zotero Reading Guide: startup install failed: ${err}`);
    }
  },

  async onMainWindowLoad(win: Window) {
    Zotero.debug("Zotero Reading Guide: main window loaded");

    if (controllers.has(win)) return;

    const controller = new ReadingGuideController(win);
    controllers.set(win, controller);
    controller.install();
  },

  async onMainWindowUnload(win: Window) {
    Zotero.debug("Zotero Reading Guide: main window unloaded");

    const controller = controllers.get(win);

    if (controller) {
      controller.uninstall();
      controllers.delete(win);
    }
  },

  async onShutdown() {
    Zotero.debug("Zotero Reading Guide: shutdown");

    try {
      const mainWin = (Zotero as any).getMainWindow?.() as Window | undefined;
      const controller = mainWin ? controllers.get(mainWin) : undefined;

      if (controller && mainWin) {
        controller.uninstall();
        controllers.delete(mainWin);
      }
    } catch (err) {
      Zotero.debug(`Zotero Reading Guide: shutdown cleanup failed: ${err}`);
    }
  },
};

export default hooks;
