import { MODULE } from "../module.js";
import { logger } from "../logger.js";

const NAME = "DnDWildMagic";

/**
 * Acts as the primary API class for the wild magic system and interacting with it.
 * Exposes system functions from the DnDWildMagic class.
 * @class
 */
class WildMagicAPI {
  
  initialize() {

    /* clear any handlers present */
    this._handlers.clear()
    this._preCheck.clear()

    /* call for surge handlers */
    Hooks.callAll('wmsRegister');

    /* Add surge handlers to special traits options */
    DnDWildMagic._setTraitsOptions(Array.from(this._handlers.keys())); 
  }

  constructor() {
    this._handlers = new Map();
    this._preCheck = new Map();
  }

  getHandler(label){
    return this._handlers.get(label);
  }

  getPreCheck(label){
    return this._preCheck.get(label);
  }

  /**
   * @namespace templates
   * @memberof WildMagicAPI
   * @type {Object} 
   */
  get templates() {
    return {

      /**
       * Core `roll <= target` handler. Has no side effects and can be used to build upon.
       * Checks for surge given the roll and targets, produces chat message data, retrieves the
       * table configured in Helpers, and produces the update data for recharging Tides if enabled
       * in the Helpers options.
       * @memberof WildMagicAPI.templates
       * @method handler
       * @async
       *
       * @param {Actor5e} actor - actor for the surge
       * @param {Object} surgeData 
       * @param {number} surgeData.spellLevel - Spell level triggering this surge check
       * @param {string|Roll} targetRoll - Either a die expression or a Roll object (evaluated or not)
       * representing the target number that the surge roll will be compared against.
       * @param {string|Roll} surgeRoll - Either a die expression or a Roll object (evaluated or not)
       * representing the surge check.
       *
       * @returns {Promise} surge results, table selection, resulting chat data for this surge.
       *
       */
      handler: DnDWildMagic.commonSurgeHandler,

      /**
       * Core "was slot used?" pre check for surging. Checks if the actor update is a reduction
       * in spell slot counts. Each preCheck function will return data for its paired handler to
       * consume in order to execute the needed rolls to determine if a surge actually occurs.
       * @memberof WildMagicAPI.templates
       * @method preCheck
       *
       * @param {Actor5e} actor - The actor at its current state, before any updates have been applied
       * @param {Object} updates - The incoming updates that _may_ trigger a surge check. In this case,
       * the reduction of any spell slot count will trigger a surge check.
       *
       * @returns {Object|boolean} a non-false return indicates that this update triggers a surge check.
       * Additionally, the data returned will be used by the surge handler in order to execute the needed
       * checks. `{spellLevel: number}` is returned by this handler and is intended for use with the default
       * handler.
       * @see {@link WildMagic.templates.handler}
       */
      preCheck: DnDWildMagic.slotExpended,
    }
  }

  /**
   * Registers the provided handler with the wild magic system. If done during the 
   * 'wmsRegister' hook, will additionally add this to the actor special traits
   * list. If done afterwords, can be invoked by directly calling 'surge'.
   * @see {@link DnDWildMagic.surge}
   *
   * @param {string} label - Unique identifier for this handler. Also used as the
   * displayed handler name in the special traits menu
   * @param {function} handler - signature: `async function handler(actor, surgeData)`.
   * Given surgeData produced by the preCheck function, determines if a surge occurs
   * (typically by rolling under a target number).
   * @param {function} [preCheck = WildMagic.slotExpended] - signature 
   * `function preCheck(actor, update)`. Given an actor pre-update and the update to
   * be applied, returns an object containing information for its paired handler OR 
   * false if a surge cannot occur (ex. the update was not expending a spell slot).
   *
   * @returns {boolean} indicates successful addition
   */
  registerHandler(label, handler, preCheck = DnDWildMagic.slotExpended) {
    if( this._handlers.has(label) ){
      logger.warn(`Rejecting duplicate surge handler: ${label}`);
      return false;
    }

    this._handlers.set(label, handler);
    this._preCheck.set(label, preCheck);
    return true;
  }

  /**
   * Unregisters a given handler and preCheck pair based on the handler's key (label)
   * @param {string} label - name of handler and preCheck pair to remove
   * @returns {boolean} indicates successful removal of handler
   */
  unregisterHandler(label) {
   if( !this._handlers.has(label) ){
      logger.warn(`Cannot locate existing handler to remove: ${label}`);
      return false;
    }
    
    this._handlers.delete(label);
    this._preCheck.delete(label);
    return true;
  }

  /**
   * Force a surge to occur for the desired actor
   * @param {Actor5e} actor - which character will surge
   * @param {Object} [surgeOptions] - optional information to customize this actor's surge process and results
   * @param {Object} surgeOptions.data - information needed by this actor's surge handler. Often {spellLevel: N}.
   * @param {string|function} surgeOptions.handler - Either the handler's key (string) or a custom handler function.
   * @see {@link DnDWildMagic.registerHandler} for details on the handler function signature.
   *
   * @returns {Promise} Resulting information returned by the handler function used to carry out any needed operations resulting from this type of surge.
   */
  surge(actor, {data = {}, handler = actor.getFlag('dnd5e', 'wildMagic')} = {} ) {
    return DnDWildMagic._runHandler(handler, actor, data)
  }

  /** 
   * Helper function for creating the chat message data for a given surge result
   * @parm {Object} info - needed surge information to construct the feedback chat message
   * @param {Roll} info.surgeRoll - Roll object representing the test roll for surging
   * @param {Roll} info.targetRoll - Roll object representing the upper bound for a successful surge
   * @param {boolean} [info.surgeOccured = false] - whether a surge occured or not
   * @param {number} [info.spellLevel = 0] - spell level that triggered this surge
   * @param {string} [info.extraText = ''] - Additional string placed between spell level and "spell" in output. Ex. 'as a level 9<extraText> spell is cast'
   *
   * @returns {Object} - ChatMessage data needed to construct the surge results.
   */
  async generateChatData(info){

    const data = {
      action : info.surgeOccured ? MODULE.localize("DND5EH.WildMagicConsoleSurgesSurge") : MODULE.localize("DND5EH.WildMagicConsoleSurgesCalm"),
      spellLevel: info.spellLevel ?? 0,
      resultText : `[[/r ${info.surgeRoll.formula}cs<=${info.targetRoll.formula} #${info.surgeRoll.formula}cs<=${info.targetRoll.formula}]]{${info.surgeRoll.total} <= ${info.targetRoll.total}}`,
      extraText: info.extraText ?? '',
    }

    const rollHtml = $(await info.surgeRoll.render());

    rollHtml.find(".dice-total")
      .toggleClass('critical', info.surgeOccured)
      .text(info.surgeRoll.total);

    rollHtml.find('.dice-formula').text(`${info.surgeRoll.formula}cs<=${info.targetRoll.formula}`);

    const whisper = info.whisper ?? (MODULE.setting("wmWhisper") ? ChatMessage.getWhisperRecipients("GM") : []);
    const speaker = info.speaker ?? ChatMessage.getSpeaker({ alias : MODULE.localize("DND5EH.WildMagicChatSpeakerName")});
    const content = info.content ?? await renderTemplate(`modules/${MODULE.data.name}/templates/WildMagicSurgeChat.html`, {
      mainMessage: game.i18n.format("DND5EH.WildMagicConsoleSurgesMessage", { ...data }),
      roll: rollHtml.prop("outerHTML")
    });

    return {
      content,
      speaker,
      whisper,
    };
  }

  /**
   * Determines if the actor has a charged use of Tides remaining. In the event of both
   * a resource and feature item being used to track charges, this will indicate true (charged)
   * if *either* the resource or item has uses left.
   *
   * @param {Actor5e} actor - actor to query for charged tides
   *
   * @returns {boolean} indicates if tides is charged (true) or not (false)
   */
  isTidesCharged(actor){
    let item = DnDWildMagic._getTides(actor);
    const itemCharge =  item?.data?.data?.uses?.value != 0;

    let resource = DnDWildMagic._getTidesResource(actor);
    const resourceCharge = !!resource.value 

    return itemCharge || resourceCharge
  }

  /**
   * Generates the needed actor and item updates for recharging the configured Tides feature/resource
   *
   * @param {Actor5e} actor - actor for which to generate the recharge update information.
   *
   * @returns {Object} updates - resulting update information
   * @returns {Object} updates.actor - actor update data
   * @returns {Object[]} updates.item - array of item update data
   */
  tidesRechargeUpdate(actor) {
    let updates = {actor: {}, item: []};
    const item = DnDWildMagic._getTides(actor);

    if(item)
      updates.item.push({_id:item.id, "data.uses.value" : item.data.data.uses.max });

    const resource = DnDWildMagic._getTidesResource(actor);
    if(resource)
      updates.actor = { [`data.resources.${resource.key}.value`] : resource.max }
    return updates;
  }
}

/**
 * Core wild magic operations, initialization, and helper functions
 * @class
 */
export class DnDWildMagic {
  static register(){
    logger.info("Registering Wild Magic Surge");
    DnDWildMagic.defaults();
    DnDWildMagic.settings();
    DnDWildMagic.globals();
    DnDWildMagic.hooks();
  }

  static defaults(){
    MODULE[NAME] = { 
      table : "Wild-Magic-Surge-Table",
      feature : "Tides of Chaos",
    };
  }

  static settings(){
    const config = false;

    /* {blindroll : CHAT.RollBlind} */
    let rollModes = Object.entries(CONST.DICE_ROLL_MODES).reduce( (acc, [key, value]) => {
          acc[value] = MODULE.localize(`CHAT.Roll${key.toLowerCase().capitalize()}`);         
          return acc
        },{})
    rollModes['default'] = MODULE.localize('Default');

    const settingsData = {
      wmOptions : {
        scope: "world", config, group: "pc-features", default: 0, type: Number,
        choices: {
          0: MODULE.localize("option.default.disabled"),
          1: MODULE.localize("option.default.enabled"),
        },
        onchange : (/*...args*/) => {
          //logger.info("Settings Change!", args);
        }
      },
      wmTableName : {
        scope: "world", config, group: "pc-features", default: MODULE[NAME].table, type: String,
      },
      wmToCFeatureName : {
        scope: "world", config, group: "pc-features", default: MODULE[NAME].feature, type: String,
      },
      wmToCRecharge : {
        scope: "world", config, group: "pc-features", default: false, type: Boolean,
      },
      wmWhisper : {
        scope: "world", config, group: "pc-features", default: false, type: Boolean,
      },
      wmRollMode : {
        scope: "world", config, group: "pc-features", default: 'default', type: String,
        choices: rollModes 
        
      }
    };

    MODULE.registerSubMenu(NAME, settingsData, {tab: 'pc-features'});
  }

  static hooks(){
    /* surge monitoring hooks */
    Hooks.on("preUpdateActor", DnDWildMagic._preUpdateActor);
    Hooks.on("updateActor", DnDWildMagic._updateActor);

    /* set up our stock handers when requested */
    Hooks.on('wmsRegister', DnDWildMagic._registerStockHandlers);

    /* initialize and call for surge handlers when everything is loaded */
    Hooks.on('ready', () => globalThis.WildMagic.initialize());
  }

  static globals(){
    globalThis.WildMagic = new WildMagicAPI();
  }

  static _updateActor(actor, _, options, user){
    if(!options.wmsHandler || user !== game.user.id) return;
    DnDWildMagic._runHandler(options.wmsHandler, actor, options.wmsData);
  }

  static async _runHandler(handler, actor, surgeData){

    /* run the handler to produce the results */
    let handlerResult;
    if (typeof handler == 'string') {
      /* we were handed a handler ID, grab the function */
      handler = globalThis.WildMagic.getHandler(handler);
    }

    try {
      handlerResult = await handler(actor, surgeData)
    } catch (e) {
      logger.error(e);
      return false;
    }

    /* do various things with result */
    if(handlerResult.chatData) {
      await ChatMessage.create(handlerResult.chatData);
    }

    if(handlerResult.table?.uuid){
      await DnDWildMagic._rollTable(handlerResult.table.uuid, handlerResult.table.rollMode)
    }

    /* run actor updates */
    if(handlerResult.actorUpdates) {
      await actor.update(handlerResult.actorUpdates);
    }

    /* run item updates */
    if(handlerResult.itemUpdates) {
      await actor.updateEmbeddedDocuments('Item',handlerResult.itemUpdates);
    }

    /* run effect updates */
    if(handlerResult.effectUpdates) {
      await actor.updateEmbeddedDocuments('ActiveEffect',handlerResult.effectUpdates);
    }

    return handlerResult;
  }

  static _preUpdateActor(actor, update, options){

    let specialTrait = actor.getFlag('dnd5e', 'wildMagic');

    /* Forceful Migration step TODO provide migration API */
    if (typeof specialTrait != 'string') {
      specialTrait = ''; 
    }

    const enabled = MODULE.setting('wmOptions') !== 0;
    logger.debug(`_preUpdateActor | Logic (e/s) | `, specialTrait);
    if(specialTrait == '' || !enabled) return;

    /* otherwise, call preCheck to deny the surge or prep data needed for it */
    const preCheck = globalThis.WildMagic.getPreCheck(specialTrait);
    if (!preCheck) return;

    let data;
    try{
      data = preCheck(actor, update);
    } catch (e) {
      logger.error(e)
      return
    }

    if (!!data) {
      options.wmsData = data;
      options.wmsHandler = specialTrait;
    }

  }

  static async _rollTable(uuid, rollMode = MODULE.setting('wmRollMode')) {

    rollMode = rollMode == 'default' ? game.settings.get("core", "rollMode") : rollMode;
    const table = await fromUuid(uuid);

    logger.debug("_rollTable | ", {rollMode, name: table?.name, table});
    
    if(table){
      return await table.draw({ rollMode });
    }

    return logger.error(`Failed to get Table [${uuid}]`);
  }

  static _getTides(actor){
    const name = MODULE.setting("wmToCFeatureName") ?? MODULE[NAME].feature;
    const item = actor.items.getName(name);

    logger.debug("_getTides | ", {name, item});

    if(item) return item;
  }

  static _getTidesResource(actor){
    const name = MODULE.setting("wmToCFeatureName") ?? MODULE[NAME].feature;
    return Object.entries(actor.data.data.resources).reduce((acc, [key, obj]) => {
      if(obj.label === name)
        return { key, ...obj};
      return acc;
    }, false);
  }

  static _setTraitsOptions(handlerKeys) {

    /* create key:value pair for display */
    let choices = {};
    handlerKeys.forEach( key => choices[key] = key );

    CONFIG.DND5E.characterFlags.wildMagic = {
      hint: MODULE.localize("DND5EH.flagsWildMagicHint"),
      name: MODULE.localize("DND5EH.flagsWildMagic"),
      section: "Feats",
      type: String,
      choices
    }
  }

  /**
   * Standard surge "pre-check" function which determines if this particular actor update
   * represents the use of a spell slot. This is the default pre-check handler used if one 
   * is not supplied by the caller of DnDWildMagic.registerHandler
   * @see {@link DnDWildMagic.registerHandler}
   *
   * @param {Actor5e} actor - actor under update (pre-update state)
   * @param {Object} update - update to be applied to the actor
   *
   * @returns {boolean|Object} - false if no slot was used, or an Object containing `spellLevel` if the surge occured and from which slot level.
   */
  static slotExpended(actor, update) {

    /** Exit if hook is not the product of a spell change */
    const spells = !!getProperty(update, "data.spells");
    if( !spells ) return false;

    /** Find the spell level just cast */
    const spellLvlNames = ["spell0", "spell1", "spell2", "spell3", "spell4", "spell5", "spell6", "spell7", "spell8", "spell9"];
    let lvl = spellLvlNames.findIndex(name => { return getProperty(update, "data.spells." + name) });

    const preCastSlotCount = getProperty(actor.data.data.spells, spellLvlNames[lvl] + ".value");
    const postCastSlotCount = getProperty(update, "data.spells." + spellLvlNames[lvl] + ".value");
    const wasCast = (preCastSlotCount - postCastSlotCount) > 0;

    logger.debug(`Slot Expended check | `, { actor, lvl, wasCast , FeatureName : MODULE.setting("wmToCFeatureName") ?? MODULE[NAME].feature });

    if (wasCast && lvl > 0) {
      return {
        spellLevel: lvl,
      }
    }
    
    return false;
  }

  static _registerStockHandlers() {
    /* default handler */
    globalThis.WildMagic.registerHandler('', ()=>false, ()=>false);
  }

  static async commonSurgeHandler(actor, surgeData, targetRoll = '1', surgeRoll = '1d20' ) {

    const convertEval = async (roll) => {

      if(typeof roll == 'string') {
        roll = new Roll(roll);
      }

      if( roll.total == undefined ) {
        await roll.evaluate({async: true});
      }

      return roll;
    }

    const rolledSurge = await convertEval(surgeRoll); 
    const rolledTarget = await convertEval(targetRoll); 

    const results = {
      table: undefined,
      surge: false,
      actorUpdates: {},
      itemUpdates: [],
    }

    if (rolledSurge.total <= rolledTarget.total) {
      
      results.surge = true;

      /* should I recharge tides for this surge? */
      const rechargeTides = MODULE.setting('wmToCRecharge');

      if(rechargeTides && !WildMagic.isTidesCharged(actor)){

        /* get the actor and/or item update information for
         * recharging tides
         */
        const updates = WildMagic.tidesRechargeUpdate(actor);

        results.actorUpdates = updates.actor;
        results.itemUpdates = updates.item;
      }

      let table;
      const tableName = MODULE.setting('wmTableName');
      if(tableName) {
        try {
          table = game.tables.getName(tableName) ?? await fromUuid(tableName);
        }catch(err){
          // nope
        }
      }

      results.table = {
        uuid: table?.uuid
      }
    }

    results.chatData = await WildMagic.generateChatData({
      surgeRoll: rolledSurge,
      targetRoll: rolledTarget,
      surgeOccured: results.surge,
      spellLevel: surgeData.spellLevel,
    })

    return results;
  }


}
