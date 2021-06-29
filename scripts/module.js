import { logger } from './logger.js';
import { HelpersSettingsConfig } from './modules/config-app.js';

const NAME = "dnd5e-helpers";
const PATH = `/modules/${NAME}`;

export class MODULE{
  static async register(){
    logger.info("Initializing Module");
    MODULE.settings();
  }

  static async build(){
    try{
      MODULE.data = await (await fetch(`${PATH}/module.json`)).json() ?? {};
    }catch(err){
      logger.debug(`Error getting Module ${PATH} data`, err);
    }
    MODULE.data.path = PATH;
    logger.info("Module Data Built");
  }

  static setting(key){
    return game.settings.get(MODULE.data.name, key);
  }

  static localize(...args){
    return game.i18n.localize(...args);
  }

  static format(...args){
    return game.i18n.format(...args);
  }

  static applySettings(settingsData){
    Object.entries(settingsData).forEach(([key, data])=> {
      game.settings.register(
        MODULE.data.name, key, {
          name : MODULE.localize(`setting.${key}.name`),
          hint : MODULE.localize(`setting.${key}.hint`),
          ...data
        }
      );
    });
  }

  static stringToDom(innerHTML, className){
    let dom = document.createElement("div");
    dom.innerHTML = innerHTML;
    dom.className = className;
    return dom;
  }

  static settings(){
    game.settings.registerMenu(MODULE.data.name, "helperOptions", {
      name : MODULE.format("DND5EH.ConfigOption_name"),
      label : MODULE.format("DND5EH.ConfigOption_menulabel"),
      icon : "fas fa-user-cog",
      type : HelpersSettingsConfig,
      restricted : true,
    })
  }
}