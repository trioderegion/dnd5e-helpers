export {HelpersSettingsConfig}

export const MODULE = 'dnd5e-helpers';
export const PATH = `modules/${MODULE}`

/**
 * A game settings configuration application
 * This form renders the settings defined via the game.settings.register API which have config = true
 *
 * @extends {FormApplication}
 */
class HelpersSettingsConfig extends FormApplication {

  /** @override */
	static get defaultOptions() {
    return mergeObject(super.defaultOptions, {
      title: game.i18n.localize("Helpers"),
      id: "helpers-client-settings",
      template: `${PATH}/templates/HelperConfig.html`,
      width: 600,
      height: "auto",
      tabs: [
        {navSelector: ".tabs", contentSelector: ".content", initial: "general"}
      ]
    })
  }

  /* -------------------------------------------- */

  /** @override */
  getData(options) {
    const gs = game.settings;
    const canConfigure =  game.user.can("SETTINGS_MODIFY");

    // Set-up placeholder structure for system, and specific settings
    // @todo this feels like it should be a map instead of an array
    const data = {
      tabs:[{name: "system", i18nName:"System Helpers", class: "fas fa-cog", menus: [], settings: []},
            {name: "features", i18nName:"Feature Helpers", class: "fas fa-address-book", menus: [], settings: []},
            {name: "combat", i18nName:"Combat Helpers", class: "fas fa-dice-d20", menus: [], settings: []}]
    };

    /* @todo fully implement this if we require sub-menus
    // Classify all menus
    for ( let menu of gs.menus.values() ) {
      if ( menu.restricted && !canConfigure ) continue;
      if ( menu.module === "core" ) {
        data.core.menus.push(menu);
      }
      else if ( menu.module === game.system.id ) {
        data.system.menus.push(menu);
      }
      else {
        const name = menu.module || "module";
        if ( !data.modules[name] ) registerModule(name);
        data.modules[name].menus.push(menu);
      }
    }
    */

    // Classify all settings
    for ( let setting of gs.settings.values() ) {

      // Only concerned about dnd5e-helpers settings
      if(setting.module !== MODULE) continue;

      // Exclude settings the user cannot change
      if ( /*!setting.config ||*/ (!canConfigure && (setting.scope !== "client")) ) continue;

      // Update setting data
      const s = duplicate(setting);
      s.name = game.i18n.localize(s.name);
      s.hint = game.i18n.localize(s.hint);
      s.value = game.settings.get(s.module, s.key);
      s.type = setting.type instanceof Function ? setting.type.name : "String";
      s.isCheckbox = setting.type === Boolean;
      s.isSelect = s.choices !== undefined;
      s.isRange = (setting.type === Number) && s.range;

      // Classify setting
      const name = s.module;
      if(name === MODULE) {
        const group = s.group;
        let groupTab = data.tabs.find( tab => tab.name === group ) ?? false;
        if(groupTab) { 
          groupTab.settings.push(s);
        }
      }
    }

    // Sort Module headings by name
    //data.modules = Object.values(data.modules).sort((a, b) => a.title.localeCompare(b.title));

    // Return data
    return {
      user: game.user,
      canConfigure: canConfigure,
      systemTitle: game.system.data.title,
      data: data
    };
  }

  /* -------------------------------------------- */
  /*  Event Listeners and Handlers                */
  /* -------------------------------------------- */

  /** @override */
  activateListeners(html) {
    super.activateListeners(html);
    html.find('.submenu button').click(this._onClickSubmenu.bind(this));
    html.find('button[name="reset"]').click(this._onResetDefaults.bind(this));
  }

  /* -------------------------------------------- */

  /**
   * Handle activating the button to configure User Role permissions
   * @param event {Event}   The initial button click event
   * @private
   */
  _onClickSubmenu(event) {
    event.preventDefault();
    const menu = game.settings.menus.get(event.currentTarget.dataset.key);
    if ( !menu ) return ui.notifications.error("No submenu found for the provided key");
    const app = new menu.type();
    return app.render(true);
  }

  /* -------------------------------------------- */

  /**
   * Handle button click to reset default settings
   * @param event {Event}   The initial button click event
   * @private
   */
  _onResetDefaults(event) {
    event.preventDefault();
    const button = event.currentTarget;
    const form = button.form;
    for ( let [k, v] of game.settings.settings.entries() ) {
      if ( v.config ) {
        let input = form[k];
        if (input.type === "checkbox") input.checked = v.default;
        else if (input) input.value = v.default;
      }
    }
  }

  /* -------------------------------------------- */

  /** @override */
  async _updateObject(event, formData) {
    for ( let [k, v] of Object.entries(flattenObject(formData)) ) {
      let s = game.settings.settings.get(k);
      let current = game.settings.get(s.module, s.key);
      if ( v !== current ) {
        await game.settings.set(s.module, s.key, v);
      }
    }
  }
}

