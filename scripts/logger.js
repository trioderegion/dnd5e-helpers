import { MODULE } from './module.js'

export class logger {
  static info(...args) {
    console.log(`${MODULE?.data?.title || "" }  | `, ...args);
  }
  static debug(...args) {
    if (MODULE.setting('debug'))
      this.info("DEBUG | ", ...args);
  }
  static error(...args) {
    console.error(`${MODULE?.data?.title || "" } | ERROR | `, ...args);
    ui.notifications.error(`${MODULE?.data?.title || "" } | ERROR | ${args[0]}`);
  }

  static notify(...args) {
    ui.notifications.notify(`${args[0]}`);
  }

  static register(){
    this.settings()
  }

  static settings(){
    const config = false;
    const settingsData = {
      debug : {
        scope: "world", config, default: false, type: Boolean,
      },
    };

    MODULE.applySettings(settingsData);
  }
}
