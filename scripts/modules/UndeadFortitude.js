import { logger } from '../logger.js';
import { MODULE } from '../module.js';
import { queueUpdate } from './update-queue.js';

const NAME = "UndeadFortitude";

export class UndeadFortitude {

  static register() {
    logger.info("Registering Undead Fortitude");
    UndeadFortitude.settings();
    UndeadFortitude.defaults();
    UndeadFortitude.hooks();
  }

  static settings() {
    const config = false;
    const settingsData = {
      undeadFort: {
        scope: "world", config, group: "npc-features", default: 0, type: Number,
        choices: {
          0: game.i18n.format("option.undeadFort.none"),
          1: game.i18n.format("option.undeadFort.quick"),
          2: game.i18n.format("option.undeadFort.advanced"),
        },
      },
      undeadFortDamageTypes: {
        scope: "world", config, group: "npc-features", default: "Radiant", type: String,
      },
      undeadFortName: {
        scope: "world", config, group: "npc-features", default: "Undead Fortitude", type: String,
      },
      undeadFortDC: {
        scope: "world", config, group: "npc-features", default: 5, type: Number,
      },
    };

    MODULE.applySettings(settingsData);

  }

  static defaults() {
    MODULE[NAME] = {
      hpThreshold: 0,
    }
  }

  static hooks() {
    Hooks.on('preUpdateActor', UndeadFortitude._preUpdateActor);
  }

  /* for a pre hook, the initiating user can handle updates
   * as they have initiated this update already.
   */
  static _preUpdateActor(actor, update, options/*, userId*/) {
    
    /* bail if not enabled */
    if(!MODULE.setting('undeadFort') > 0) return;

    /* bail if this actor does not have undead fortitude feature */
    if(!actor.items.getName(MODULE.setting("undeadFortName"))) return;

    /* collect the needed information and pass it along to the handler */ 
    const originalHp = actor.data.data.attributes.hp.value;
    const finalHp = getProperty(update, "data.attributes.hp.value") ?? actorHp;
    const hpDelta = originalHp - finalHp;

    const data = {
      actor,
      finalHp,
      hpDelta,
      ignoredDamageTypes: MODULE.setting('undeadFortDamageTypes'),
      baseDc: MODULE.setting('undeadFortDC'),
      skipCheck: options.skipUndeadCheck,
    };

    logger.debug(`${NAME} data`, data);

    UndeadFortitude.runSave(data, options);
  }

  /* Decides which save type to run, should it proc, and handles rolling.
   *
   * param {Object} data = {actor, finalHp, hpDelta}
   */
  static async runSave(data, options = {}) {

    /* we have been requested to run the save, check threshold DC */
    if (data.finalHp > MODULE[NAME].hpThreshold) {
      logger.debug(`${NAME} | Actor has feat, but hasnt hit the threshold`);
      return;
    }

    if (options.skipUndeadCheck){
      logger.debug(`${NAME} | Skipped undead fortitude check via options`);
      return;
    }

    /* get the DC */
    const mode = MODULE.setting('undeadFort')

    queueUpdate( async () => {
      const saveInfo = await UndeadFortitude._getUndeadFortSave(data, mode === 2 ? true : false ); 
      const speaker = ChatMessage.getSpeaker({actor: data.actor, token: data.actor.token});
      const whisper = game.users.entities.filter(u => u.isGM).map(u => u._id)
      let content = '';

      /* assume the actor fails its save automatically (i.e. rollSave == false) */
      let hasSaved = false;

      if (saveInfo.rollSave) {
        /* but roll the save if we need to and check */
        const result = (await data.actor.rollAbilitySave('con', {flavor: `${MODULE.setting('undeadFortName')} - DC ${saveInfo.saveDc}`, rollMode: 'gmroll'})).total;
        hasSaved = result >= saveInfo.saveDc;

        if (hasSaved) {
          /* they saved, report and restore to 1 HP */
          content = MODULE.format("DND5EH.UndeadFort_surivalmessage", { tokenName: data.actor.token.name, total: result });
          await data.actor.update({'data.attributes.hp.value': 1});
        } else {
          /* rolled and failed, but not instantly via damage type */
          content = MODULE.format("DND5EH.UndeadFort_deathmessage", { tokenName: data.actor.token.name, total: result });
        }
      } else {
        /* this is an auto-fail due to damage type, do not update remain at 0 */
        content = MODULE.format("DND5EH.UndeadFort_insantdeathmessage", { tokenName: data.actor.token.name});

      } 

      await ChatMessage.create({content, speaker, whisper });
    });
    
    
  }

  static async _getUndeadFortSave(data, fullCheck = false) {

    let saveInfo = {};
    if (fullCheck) {
      /* full check where we ask for the total damage */
      saveInfo = await UndeadFortitude.fullCheck(data);
      
    } else {
      /* quick check (no spillover) */
      saveInfo = await UndeadFortitude.quickCheck(data);
    }

    logger.debug(`${NAME} undead fort. info:`, saveInfo);

    return saveInfo;
  }

  static quickCheck(data) {
    return MODULE.buttonDialog({
      title: MODULE.localize("DND5EH.UndeadFort_dialogname"),
      content: MODULE.localize("DND5EH.UndeadFort_quickdialogcontent"),
      buttons: [{
        label: MODULE.format("DND5EH.UndeadFort_quickdialogprompt1", { types: data.ignoredDamageTypes }),
        value: { rollSave: false, saveDc: 0 }
      },{
        label: MODULE.localize("DND5EH.UndeadFort_quickdialogprompt2"),
        value: { rollSave: true, saveDc: data.baseDc + data.hpDelta },
      }
      ],
    });
  }

  static fullCheck(data) {
    const ignoredDamageTypes = data.ignoredDamageTypes;
    if (data.skipUndeadCheck) return;

    let damageQuery = MODULE.format("DND5EH.UndeadFort_slowdialogcontentquery")
    let content = `
        <form>
                <div class="form-group">
                    <label for="num">${damageQuery} </label>
                    <input id="num" name="num" type="number" min="0"></input>
                </div>
            </form>`;
    return new Promise( async (resolve) => {
      let dialog = new Dialog({
        title: MODULE.format("DND5EH.UndeadFort_dialogname"),
        content: content,
        buttons: {
          one: {
            label: MODULE.format("DND5EH.UndeadFort_quickdialogprompt1", { types: ignoredDamageTypes }),
            callback: () => resolve({rollSave: false, saveDc: 0})
          },
          two: {
            label: MODULE.format("DND5EH.UndeadFort_quickdialogprompt2"),
            callback: (html) => {
              const totalDamage = Number(html.find("#num")[0].value); 
              return resolve({ rollSave: true, saveDc: data.baseDc + totalDamage})
            },
          },
        },
      });

      dialog.render(true);
    });
  }
}

  
