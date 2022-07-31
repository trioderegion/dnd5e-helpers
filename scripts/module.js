import { logger } from './logger.js';
import { HelpersSettingsConfig } from './apps/config-app.js';
import { HoneyWrap } from './lib/honeywrap/shim.js'

const NAME = "dnd5e-helpers";
const PATH = `/modules/${NAME}`;
const TITLE = "DnD5e Helpers";


/**
 * @class
 * @property {Function} patch
 */
export class MODULE{
  static async register(){
    logger.info("Initializing Module");
    MODULE.settings();
    MODULE.globals();
    HoneyWrap.register(MODULE, MODULE.data.name);
  }

  static async build(){
    MODULE.data = {
      name : NAME, path : PATH, title : TITLE
    };
  }

  static globals() {
    game.dnd5e.helpers = {};
  }

  /**
   * @returns any
   */
  static setting(key){
    return game.settings.get(MODULE.data.name, key);
  }

  static localize(...args){
    return game.i18n.localize(...args);
  }

  static format(...args){
    return game.i18n.format(...args);
  }

  static async wait(ms){
    return new Promise((resolve)=> setTimeout(resolve, ms))
  }

  static async waitFor(fn, m = 200, w = 100, i = 0){
    while(!fn(i, ((i*w)/100)) && i < m){
      i++;
      await MODULE.wait(w);
    }
    return i === m ? false : true;
  }

  static isTurnChange(combat, changed){
    /* we need a turn change or a round change to consider this a live combat */
    const liveCombat = !!combat.started && (("turn" in changed) || ('round' in changed));
    const anyCombatants = (combat.data.combatants.size ?? 0) !== 0;
    const notFirstTurn = !(((changed.turn ?? undefined) === 0) && (changed.round ?? 0) === 1)

    return liveCombat && anyCombatants && notFirstTurn;
  }

  static isFirstTurn(combat, changed){
    return combat.started && changed.round === 1;
  }

  static firstGM(){
    return game.users.find(u => u.isGM && u.active);
  }

  static isFirstGM(){
    return game.user.id === MODULE.firstGM()?.id;
  }

  static firstOwner(doc){
    /* null docs could mean an empty lookup, null docs are not owned by anyone */
    if (!doc) return false;

    const playerOwners = Object.entries(doc.data.permission)
      .filter(([id, level]) => (!game.users.get(id)?.isGM && game.users.get(id)?.active) && level === 3)
      .map(([id, level])=> id);

    if(playerOwners.length > 0) {
      return game.users.get(playerOwners[0]);
    }

    /* if no online player owns this actor, fall back to first GM */
    return MODULE.firstGM();
  }

  static isFirstOwner(doc){
    return game.user.id === MODULE.firstOwner(doc).id;
  }

  static parseRollString(formula, data = {}){
    let dataRgx = new RegExp(/@([a-z.0-9_\-]+)/gi);
    return formula.replace(dataRgx, (match, term) => {
      let value = foundry.utils.getProperty(data, term);
      if ( value == null ) {
        if ( ui.notifications ) logger.error("Unable to contruct string", {match, term});
        return (missing !== undefined) ? String(missing) : match;
      }
      return String(value).trim();
    });
  }

  static sanitizeActorName(actor, sanitizeOptionKey, sanitizedNameKey){
    return ((MODULE.setting(sanitizeOptionKey) && actor.data.type === "npc") ? MODULE.format(sanitizedNameKey) : actor.name).capitalize();
  }

  static sanitizeTokenName(token, feature, label, capitalize = true){
    const name = ((MODULE.setting(feature) && token.actor.data.type === "npc") ? MODULE.format(label) : token.data.name)
    return capitalize ? name.capitalize() : name;
  }

  static applySettings(settingsData){
    Object.entries(settingsData).forEach(([key, data])=> {
      game.settings.register(
        MODULE.data.name, key, {
          name : MODULE.localize(`setting.${key}.name`),
          hint : MODULE.localize(`setting.${key}.hint`),
          subModuleId : data.subModuleId ?? HelpersSettingsConfig.defaultOptions.id,
          ...data
        }
      );
    });
  }

  static registerSubMenu(subModule, settingsData, {groupLabels = HelpersSettingsConfig.defaultGroupLabels, menuIcon = 'fas fa-user-cog', /* parentMenu = null,*/ tab = 'misc'} = {}){
    HelpersSettingsConfig.registerSubMenu(subModule, settingsData, {groupLabels, menuIcon, tab});
  }

  static stringToDom(innerHTML, className){
    let dom = document.createElement("div");
    dom.innerHTML = innerHTML;
    dom.className = className;
    return dom;
  }

  static settings(){
    game.settings.registerMenu(MODULE.data.name, "helperOptions", {
      name : MODULE.format("setting.ConfigOption.name"),
      label : MODULE.format("setting.ConfigOption.label"),
      icon : "fas fa-user-cog",
      type : HelpersSettingsConfig,
      restricted : false,
    })
  }
  static async getItem(key, id){
    if(key === "Item") return game.items.get(id)
    let pack = game.packs.get(key)
    return await pack?.getDocument(id)
  }

  /*
   * Helper function for quickly creating a simple dialog with labeled buttons and associated data. 
   * Useful for allowing a choice of actors to spawn prior to `warpgate.spawn`.
   *
   * @param `data` {Array of Objects}: Contains two keys `label` and `value`. Label corresponds to the 
   *     button's text. Value corresponds to the return value if this button is pressed. Ex. 
   *     `const data = buttons: [{label: 'First Choice, value: {token {name: 'First'}}, {label: 'Second Choice',
   *         value: {token: {name: 'Second}}}]`
   * @param `direction` {String} (optional): `'column'` or `'row'` accepted. Controls layout direction of dialog.
   */
  static async buttonDialog(data, direction = 'row') {
    return await new Promise(async (resolve) => {
      let buttons = {}, dialog;

      data.buttons.forEach((button) => {
        buttons[button.label] = {
          label: button.label,
          callback: () => resolve(button.value)
        }
      });

      dialog = new Dialog({
        title: data.title,
        content: data.content,
        buttons,
        close: () => resolve("Exit, No Button Click")
      }, {
        /*width: '100%',*/ height: '100%' 
      });

      await dialog._render(true);
      dialog.element.find('.dialog-buttons').css({'flex-direction': direction});
    });
  }
}
