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

  static registerSubMenu(subModule, settingsData, {groupLabels = HelpersSettingsConfig.defaultGroupLabels, menuIcon = 'fas fa-user-cog', /* parentMenu = null,*/ tab = 'misc'} = {}){

    const parentMenu = null;
    const subMenuId = randomID();
    const config = false;

    Object.values(settingsData).forEach( setting => mergeObject(setting, {subMenuId, config}) );

    const handler = {
      construct(target) {
        return new target({subModule, subMenuId, groupLabels, parentMenu}); 
      }
    }

    const proxy = new Proxy(HelpersSettingsConfig, handler);

    this._registerMenu({
      name : `${subModule}`,
      label : MODULE.format(`DND5EH.SubModule.${subModule}.label`),
      icon : menuIcon,
      type : proxy,
      parentMenu,
      tab
    })

    MODULE.applySettings(settingsData);

  }

  static _registerMenu(menuData) {
    logger.debug('Registering submenu:', menuData); 
    this._menus.set(menuData.name, menuData);
  }
  
  constructor({subModule = null, subMenuId = null, groupLabels = HelpersSettingsConfig.defaultGroupLabels, parentMenu = null} = {}){
    super();
    this.options.subModule = subModule;
    this.options.groupLabels = groupLabels;
    this.options.subMenuId = subMenuId;
    this.options.parentMenu = parentMenu;
  }

  static _menus = new Collection();

  static get menus() {
    return HelpersSettingsConfig._menus;
  }

  get menus() {
    return HelpersSettingsConfig.menus;
  }

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

  /** @override */
  _onClickSubmenu(event) {
    event.preventDefault();
    const menu = HelpersSettingsConfig.menus.get(event.currentTarget.dataset.key);
    if ( !menu ) return ui.notifications.error("No submenu found for the provided key");
    const app = new menu.type();
    return app.render(true);
  }

  _onClickReturn(event) {
    event.preventDefault();
    const menu = game.settings.menus.get('dnd5e-helpers.helperOptions');
    if ( !menu ) return ui.notifications.error("No parent menu found");
    const app = new menu.type();
    return app.render(true);
  }

  async _onSubmit(...args) {
    const formData = await super._onSubmit(...args);

    if( this.options.subMenuId ){
      /* submitting from a subMenu, re-render parent */
      await this._onClickReturn(...args);
    }

    return formData;
  }

  /** @override */
  activateListeners(html) {
    super.activateListeners(html);
    html.find('button[name="return"]').click(this._onClickReturn.bind(this));
  }

  static get defaultGroupLabels() {
    return {
      'system': { faIcon: 'fas fa-cog', tabLabel: 'DND5EH.groupLabel.system'},
      'npc-features': { faIcon: 'fas fa-address-book', tabLabel: 'DND5EH.groupLabel.npcFeatures'},
      'pc-features':{ faIcon: 'fas fa-address-book', tabLabel: 'DND5EH.groupLabel.pcFeatures'},
      'combat':{ faIcon: 'fas fa-dice-d20', tabLabel: 'DND5EH.groupLabel.combat'},
      'misc':{ faIcon: 'fas fa-list-alt', tabLabel: 'DND5EH.groupLabel.misc'},
    }
  }

  /**@override */
  getData(options){
    const canConfigure = game.user.can("SETTING_MODIFY");
    const settings = Array.from(game.settings.settings);

    options.title = MODULE.format(options.subMenuId ? `DND5EH.SubModule.${this.options.subModule}.label` : 'DND5EH.ConfigApp.title');
    let data = {
      tabs: duplicate(options.groupLabels),
      hasParent: !!options.subMenuId,
      parentMenu: options.parentMenu
    }

    const registerTabSetting = (tabName) => {
      /* this entry exists already or the setting does NOT have a group,
       * dont need to create another tab. Core settings do not have this field.
       */
      if(data.tabs[tabName].settings) return false;  
      
      /* it doesnt exist, so add a new entry */
      data.tabs[tabName].settings = [];
    }

    const registerTabMenu = (tabName) => {
      /* this entry exists already or the setting does NOT have a group,
       * dont need to create another tab. Core settings do not have this field.
       */
      if(data.tabs[tabName].menus) return false;  
      
      /* it doesnt exist, so add a new entry */
      data.tabs[tabName].menus = [];
    }

    for(let [_, setting] of settings.filter(([_, setting]) => setting.namespace == MODULE.data.name)){

      /* only add an actual setting if the menu ids match */
      if(setting.subMenuId == this.options.subMenuId) {

      if(!canConfigure && setting.scope !== "client") continue;
        setting.group = data.tabs[setting.group] ? setting.group : 'misc'

        /* ensure there is a tab to hold this setting */
        registerTabSetting(setting.group);

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
    }

    /* check if we are the parent of any registered submenus and add those */
    const childMenus = this.menus.filter( menu => menu.parentMenu == this.options.subMenuId )
    childMenus.forEach( menu => {
      registerTabMenu(menu.tab);
      let groupTab = data.tabs[menu.tab] ?? false;
      if(groupTab) groupTab.menus.push(menu);
    })

    /* clean out tabs that have no entries */
    data.tabs = Object.entries(data.tabs).reduce( (acc, [name, val]) => {
      /* if we have any settings or any menus, keep the tab */
      if(!!val.settings || !!val.menus) acc[name] = val;
      return acc;
    },{})

    logger.debug("GET DATA | DATA | ", data);

    return {
      user : game.user, canConfigure, systemTitle : game.system.data.title, data
    }
  }

  /*
    Need to add a "reRender" state based onChange of specific elements
  */
}
