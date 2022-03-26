import { MODULE } from "../module.js";
import { logger } from "../logger.js";

const NAME = "DnDWildMagic";

export class DnDWildMagic {
  static register(){
    logger.info("Registering Wild Magic Surge");
    DnDWildMagic.defaults();
    DnDWildMagic.settings();
    DnDWildMagic.globals();
    DnDWildMagic.hooks();
    DnDWildMagic.patch();
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
    Hooks.on('ready', DnDWildMagic._init);
  }

  static patch(){
    
  }

  static globals(){
    //
    // Name to Handler Fn
    MODULE[NAME].handlers = {};
    // Name to preCheck Fn
    MODULE[NAME].preCheck = {};

    //wild magic helpers
    game.dnd5e.helpers.wildMagic = {
      tidesRechargeUpdate: DnDWildMagic.tidesRechargeUpdate,
      isTidesCharged: DnDWildMagic.isTidesCharged,
      getChatData: DnDWildMagic.basicChatData,
      surge: DnDWildMagic.surge,
      commonSurgeHandler: DnDWildMagic.commonSurgeHandler,
    }
  }
  
  /* return: Promise<handlerReturnData> */
  static surge(actor, {data = {}, handler = actor.getFlag('dnd5e', 'wildMagic')} = {} ) {
    return DnDWildMagic._runHandler(handler, actor, data)
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
      handler = MODULE[NAME].handlers[handler]
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
    const preCheck = MODULE[NAME].preCheck[specialTrait]

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

  static basicChatData(info){

    const data = {
      action : info.surgeOccured ? MODULE.localize("DND5EH.WildMagicConsoleSurgesSurge") : MODULE.localize("DND5EH.WildMagicConsoleSurgesCalm"),
      spellLevel: info.spellLevel ?? 0,
      resultText : `[[/r ${info.surgeRoll.formula}cs<=${info.targetRoll.formula} #${info.surgeRoll.formula}cs<=${info.targetRoll.formula}]]{${info.surgeRoll.total} <= ${info.targetRoll.total}}`,
      extraText: info.extraText ?? '',
    }

    const whisper = info.whisper ?? (MODULE.setting("wmWhisper") ? ChatMessage.getWhisperRecipients("GM") : []);
    const speaker = info.speaker ?? ChatMessage.getSpeaker({ alias : MODULE.localize("DND5EH.WildMagicChatSpeakerName")});
    const content = info.content ?? MODULE.format("DND5EH.WildMagicConsoleSurgesMessage", data);
   
    const chatData = {
      content,
      speaker,
      whisper, 
    }

    return chatData;
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

  static tidesRechargeUpdate(actor) {
    let updates = {actor: {}, item: []};
    const item = DnDWildMagic._getTides(actor);

    if(item)
      updates.item.push({_id:item.id, "data.uses.value" : item.data.data.uses.max });

    const resource = DnDWildMagic._getTidesResource(actor);
    if(resource)
      updates.actor = { [`data.resources.${resource.key}.value`] : resource.max }
    return updates;
  }

  static isTidesCharged(actor){
    let item = DnDWildMagic._getTides(actor);
    const itemCharge =  item?.data?.data?.uses?.value != 0;

    let resource = DnDWildMagic._getTidesResource(actor);
    const resourceCharge = !!resource.value 

    return itemCharge || resourceCharge
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

  static _setTraitsOptions() {

    CONFIG.DND5E.characterFlags.wildMagic = {
      hint: "DND5EH.flagsWildMagicHint",
      name: "DND5EH.flagsWildMagic",
      section: "Feats",
      type: String,
      choices: Object.keys(MODULE[NAME].handlers).sort().reduce( (acc, curr) => {
        acc[curr]=curr;
        return acc;
      },{})
    }
  }

  static _init() {
    
    /* call for surge handlers */
    Hooks.callAll('wmsRegister', DnDWildMagic.registerHandler);

    /* configure settings */
    DnDWildMagic._setTraitsOptions();
  }

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

  static registerHandler(label, handler, preCheck = DnDWildMagic.slotExpended) {
    if( MODULE[NAME].handlers[label] ){
      logger.warn('Rejecting duplicate surge handler.');
      return false;
    }

    MODULE[NAME].handlers[label] = handler;
    MODULE[NAME].preCheck[label] = preCheck;

  }

  static _registerStockHandlers(register) {
    /* default handler */
    register('', ()=>false, ()=>false);
  }

  static async commonSurgeHandler(actor, surgeData, surgeRoll, targetRoll) {
    let results = {
      table: null,
    }

    let surgeOccured = false;
    if (surgeRoll.total <= targetRoll.total) {
      
      surgeOccured = true;

      /* should I recharge tides for this surge? */
      const rechargeTides = MODULE.setting('wmToCRecharge');

      if(rechargeTides && !game.dnd5e.helpers.wildMagic.isTidesCharged(actor)){

        /* get the actor and/or item update information for
         * recharging tides
         */
        const updates = game.dnd5e.helpers.wildMagic.tidesRechargeUpdate(actor);

        results.actorUpdates = updates.actor;
        results.itemUpdates = updates.item;
      }

      const tableName = MODULE.setting('wmTableName');
      let table = game.tables.getName(tableName) ?? await fromUuid(tableName);
      if(!table) {
        /* maybe its a uuid */
        try {
          table = await fromUuid(tableName);
        } catch (e) {
          //nope
        }
      }

      results.table = {
        uuid: table?.uuid
      }
    }

    results.chatData = game.dnd5e.helpers.wildMagic.getChatData({
      surgeRoll,
      targetRoll,
      surgeOccured,
      spellLevel: surgeData.spellLevel,
    })

    return results;
  }


}
