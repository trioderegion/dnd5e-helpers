import { MODULE } from "../module.js";
import { logger } from "../logger.js";

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
        {name: "system",   i18nName:"System Helpers",  class: "fas fa-cog",          menus: [], settings: []},
        {name: "features", i18nName:"Feature Helpers", class: "fas fa-address-book", menus: [], settings: []},
        {name: "combat",   i18nName:"Combat Helpers",  class: "fas fa-dice-d20",     menus: [], settings: []},
      ],
    };

    for(let [mapIterator, setting] of settings.filter(([mapIterator, setting]) => mapIterator.includes(MODULE.data.name))){
      logger.debug("GET DATA | SETTING | ", setting);
      if(!canConfigure && setting.scope !== "client") continue;

      const s = duplicate(setting);
      s.name = MODULE.localize(s.name);
      s.hint = MODULE.localize(s.hint);
      s.value = MODULE.setting(s.key);
      s.type = setting.type instanceof Function ? setting.type.name : "String";
      s.isCheckbox = setting.type === Boolean;
      s.isSelect = s.choices !== undefined;
      s.isRange = (setting.type === Number) && s.range;

      const group = s.group;
      let groupTab = data.tabs.find(tab => tab.name === group) ?? false;
      if(groupTab) groupTab.settings.push(s);
    }

    logger.debug("GET DATA | DATA | ", data);

    return {
      user : game.user, canConfigure, systemTitle : game.system.data.title, data
    }
  }
}