import { MODULE } from "../module.js";
import { logger } from "../logger.js";

/**
 * HelpersSettingConfig extends {SettingsConfig}
 * 
 * Additional window for 5e Helper specific settings
 * Allows for Settings to be organized in 4 categories
 *  System Helpers
 *  NPC Features
 *  PC Features
 *  Combat Helpers
 * 
 * @todo "display" value which is true or false based on some other setting
 * @todo "reRender" grabs (possibly saves) values and rerenders the Config to change what is displayed dynamically
 */
export class HelpersSettingsConfig extends SettingsConfig{
  /**@override */
  static get defaultOptions(){
    return mergeObject(super.defaultOptions, {
      title : MODULE.localize("Helpers"),
      id : "helpers-client-settings",
      template : `${MODULE.data.path}/templates/HelperConfig.html`,
      width : 600,
      height : "auto",
      tabs : [
        {navSelector: ".tabs", contentSelector: ".content", initial: "general"}
      ],
    });
  }

  /**@override */
  getData(options){
    const canConfigure = game.user.can("SETTING_MODIFY");
    const settings = Array.from(game.settings.settings);

    

    const data = {
      tabs : [
        {name: "system",       i18nName:"System Helpers",      class: "fas fa-cog",          menus: [], settings: []},
        {name: "npc-features", i18nName:"NPC Feature Helpers", class: "fas fa-address-book", menus: [], settings: []},
        {name: "pc-features",  i18nName:"PC Feature Helpers",  class: "fas fa-address-book", menus: [], settings: []},
        {name: "combat",       i18nName:"Combat Helpers",      class: "fas fa-dice-d20",     menus: [], settings: []},
      ],
    };

    const registerGroup = (setting) => {
      
    }

    for(let [k, setting] of settings.filter(([k, setting]) => k.includes(MODULE.data.name))){
      if(!canConfigure && setting.scope !== "client") continue;

      let groupTab = data.tabs.find(tab => tab.name === setting.group) ?? false;
      if(groupTab) groupTab.settings.push({
        ...setting,
        type : setting.type instanceof Function ? setting.type.name : "String",
        isCheckbox : setting.type === Boolean,
        isSelect : setting.choices !== undefined,
        isRange : setting.type === Number && setting.range,
        value : MODULE.setting(setting.key),
      });
    }

    logger.debug("GET DATA | DATA | ", data);

    return {
      user : game.user, canConfigure, systemTitle : game.system.data.title, data
    }
  }

  /*
    Need to add a "reRender" state based onChange of specific elements
  */
}
