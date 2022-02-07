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
      template : `${MODULE.data.path}/templates/ModularSettings.html`,
      width : 600,
      height : "auto",
      tabs : [
        {navSelector: ".tabs", contentSelector: ".content", initial: "general"}
      ],
    });
  }

  static groupLabels = {
    'system': { faIcon: 'fas fa-cog', tabLabel: 'DND5EH.groupLabel.system'},
    'npc-features': { faIcon: 'fas fa-address-book', tabLabel: 'DND5EH.groupLabel.npcFeatures'},
    'pc-features':{ faIcon: 'fas fa-address-book', tabLabel: 'DND5EH.groupLabel.pcFeatures'},
    'combat':{ faIcon: 'fas fa-dice-d20', tabLabel: 'DND5EH.groupLabel.combat'},
    'misc':{ faIcon: 'fas fa-list-alt', tabLabel: 'DND5EH.groupLabel.misc'},
  }

  /**@override */
  getData(options){
    const canConfigure = game.user.can("SETTING_MODIFY");
    const settings = Array.from(game.settings.settings);

    let data = {
      tabs: HelpersSettingsConfig.groupLabels
    }

    const registerGroup = (setting) => {
      /* this entry exists already or the setting does NOT have a group,
       * dont need to create another tab. Core settings do not have this field.
       */
      if(data.tabs[setting.group].menus || data.tabs[setting.group].settings) return false;  
      
      /* it doesnt exist, so add a new entry */
      data.tabs[setting.group].menus = [];
      data.tabs[setting.group].settings = [];
    }

    for(let [_, setting] of settings.filter(([k, _]) => k.includes(MODULE.data.name))){
      if(!canConfigure && setting.scope !== "client") continue;
      
      setting.group = data.tabs[setting.group] ? setting.group : 'misc'
      /* ensure there is a tab to hold this setting */
      registerGroup(setting);

      let groupTab = data.tabs[setting.group] ?? false;
      if(groupTab) groupTab.settings.push({
        ...setting,
        type : setting.type instanceof Function ? setting.type.name : "String",
        isCheckbox : setting.type === Boolean,
        isSelect : setting.choices !== undefined,
        isRange : setting.type === Number && setting.range,
        value : MODULE.setting(setting.key),
        path: `${setting.namespace}.${setting.key}`
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
