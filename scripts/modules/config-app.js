/*
 * MIT License
 * 
 * Copyright (c) 2020-2021 DnD5e Helpers Team
 *
 * Portions re-used with permission from Foundry Network
 * 
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 * 
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 * 
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
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
      s.name = game.i18n.localize(s.name);
      s.hint = game.i18n.localize(s.hint);
      s.value = game.settings.get(s.module, s.key);
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

