/* TODO: Used without permission from Foundry Network. Currently
 * attempting to acquire permission.
 * 
 * This code is taken in large part from Foundry VTT v0.7.9
 * at foundry.js:24832
 *
 */

export {HelpersSettingsConfig}

export const MODULE = 'dnd5e-helpers';
export const PATH = `modules/${MODULE}`

/**
 * A game settings configuration application
 * This form renders the settings defined via the game.settings.register API which have config = true
 *
 * @extends {SettingsConfig}
 */
class HelpersSettingsConfig extends SettingsConfig{
  /**@override */
  static get defaultOptions(){
    return mergeObject(super.defaultOptions, {
      title : game.i18n.localize("Helpers"),
      id : "helpers-client-settings",
      template : `${PATH}/templates/HelperConfig.html`,
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

    for(let [mapIterator, setting] of settings.filter(([mapIterator, setting]) => mapIterator.includes(MODULE))){
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

    return {
      user : game.user, canConfigure, systemTitle : game.system.data.title, data
    }
  }
}

