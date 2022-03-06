import { MODULE } from "../module.js";
import { logger } from "../logger.js";
import {HelpersSettingsConfig} from "../apps/config-app.js";

const NAME = "DnDWildMagic";

export class DnDWildMagic {
  static register(){
    logger.info("Registering Wild Magic Surge");
    DnDWildMagic.defaults();
    DnDWildMagic.settings();
    DnDWildMagic.hooks();
    DnDWildMagic.patch();
    DnDWildMagic.globals();
  }

  static defaults(){
    MODULE[NAME] = { 
      table : "Wild-Magic-Surge-Table",
      feature : "Tides of Chaos",
    };
  }

  static settings(){
    const config = false;
    const settingsData = {
      wmOptions : {
        scope: "world", config, group: "pc-features", default: 0, type: Number,
        choices: {
          0: MODULE.localize("option.default.disabled"),
          1: MODULE.localize("option.wmOptions.standard"),
          2: MODULE.localize("option.wmOptions.more"),
          3: MODULE.localize("option.wmOptions.volatile"),
        //4: MODULE.localize("option.wmOptions.custom"),
        },
        onchange : (...args) => {
          logger.info("Settings Change!", args);
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

    };

    MODULE.registerSubMenu(NAME, settingsData, {tab: 'pc-features'});

    CONFIG.DND5E.characterFlags.wildMagic = {
      hint: "DND5EH.flagsWildMagicHint",
      name: "DND5EH.flagsWildMagic",
      section: "Feats",
      type: Boolean
    }
  }

  static hooks(){
    Hooks.on("preUpdateActor", DnDWildMagic._preUpdateActor);
  }

  static patch(){
    
  }

  static globals(){
    
  }
  /*
    Class specific functions
  */
  static async _preUpdateActor(actor, update){
    logger.debug(`_preUpdateActor | Entered`);
    /** Exit if hook is not the product of a spell change */
    const spells = !!getProperty(update, "data.spells");
    const specialTrait = actor.getFlag('dnd5e', 'wildMagic');
    const enabled = MODULE.setting('wmOptions') !== 0;
    logger.debug(`_preUpdateActor | Logic (e/s) | `, specialTrait, spells);
    if(!specialTrait || !spells || !enabled) return;

    /** Find the spell level just cast */
    const spellLvlNames = ["spell0", "spell1", "spell2", "spell3", "spell4", "spell5", "spell6", "spell7", "spell8", "spell9"];
    let lvl = spellLvlNames.findIndex(name => { return getProperty(update, "data.spells." + name) });

    const preCastSlotCount = getProperty(actor.data.data.spells, spellLvlNames[lvl] + ".value");
    const postCastSlotCount = getProperty(update, "data.spells." + spellLvlNames[lvl] + ".value");
    const wasCast = (preCastSlotCount - postCastSlotCount) > 0;

    logger.debug(`_preUpdateActor | `, { actor, lvl, wasCast , FeatureName : MODULE.setting("wmToCFeatureName") ?? MODULE[NAME].feature });

    if (wasCast && lvl > 0) {
      /** lets go baby lets go */
      logger.info(MODULE.localize("DND5EH.WildMagicConsoleSurgesroll"));

      switch(MODULE.setting("wmOptions")){
        case 1 : 
          return DnDWildMagic._rollSurge(actor, 1, lvl, "Normal Surge");
        case 2 :
          return DnDWildMagic._rollSurge(actor, lvl, lvl, "More Surge");
        case 3 :
          return DnDWildMagic._rollSurge(actor, lvl, lvl, "Volatile Surge");
        case 4 :
          /*
            Custom Die Roll for WM Surge (Hook controller)
          */
          break;
        default :
          return logger.error(`An actor with wild magic surge cast a spell, but we could not determine the surge type to use!`);
      }
    }
  }

  static async _rollSurge(actor, target, level, type){
    logger.debug("_rollSurge | ", { actor, target, level, type });
    const surge_die = "1d20";
    const bonus_die = "1d4";

    let surge_die_result = (await new Roll(surge_die).evaluate({ async : true})).total;
    let bonus_die_result = (await new Roll(bonus_die).evaluate({ async : true})).total;

    surge_die_result = (MODULE.setting("wmOptions") === 3 && DnDWildMagic._isTidesSpent(actor)) ? surge_die_result - bonus_die_result : surge_die_result;

    logger.debug("_rollSurge | ", type, {surge_die_result, bonus_die_result, target });

    await DnDWildMagic._showResult({
      action : surge_die_result <= target ? MODULE.localize("DND5EH.WildMagicConsoleSurgesSurge") : MODULE.localize("DND5EH.WildMagicConsoleSurgesCalm"),
      level,
      resultText : `( [[/r ${surge_die_result} #${surge_die}${(MODULE.setting("wmOptions") === 3 && DnDWildMagic._isTidesSpent(actor)) ? `+${bonus_die}` : ""} result]] )`
    });

    if(surge_die_result <= target){
      await DnDWildMagic._rollTable();

      if( MODULE.setting("wmToCRecharge") && DnDWildMagic._isTidesSpent(actor) ) {
        await DnDWildMagic._rechargeTides(actor);
      }
    }
  }

  static async _showResult({action, level, resultText}){
    return ChatMessage.create({
      content : MODULE.format("DND5EH.WildMagicConsoleSurgesMessage", { action, spellLevel : level, resultText, extraText : "" }),
      speaker : ChatMessage.getSpeaker({ alias : MODULE.localize("DND5EH.WildMagicChatSpeakerName")}),
      whisper : MODULE.setting("wmWhisper") ? ChatMessage.getWhisperRecipients("GM") : [],
    })
  }

  static async _rollTable(){
    const rollMode = MODULE.setting('wmWhisper') ? "blindroll" : game.settings.get("core", "rollMode");
    const name = MODULE.setting("wmTableName") ?? MODULE[NAME].table;
    const table = game.tables.getName(name);

    logger.debug("_rollTable | ", {rollMode, name, table});
    
    if(table){
      return await table.draw({ rollMode });
    }
    return logger.error(`Failed to get ${name} Table`);
  }

  static async _rechargeTides(actor){
    const item = DnDWildMagic._getTides(actor);

    if(item)
      await item.update({ "data.uses.value" : item.data.data.uses.max });

    const resource = DnDWildMagic._getTidesResource(actor);
    if(resource)
      await actor.update({ [`data.data.resources[${resource.key}].value`] : resource.max });
    return { item, actor };
  }

  static _isTidesSpent(actor){
    let item = DnDWildMagic._getTides(actor);
    return item?.data?.data?.uses?.value === 0;
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
    }, {});
  }

  /*
    Rewrite majority of the module to add a hook for surge control
  */
}
