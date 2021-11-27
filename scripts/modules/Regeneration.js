import { logger } from '../logger.js';
import { MODULE } from '../module.js';
import { queueUpdate } from './update-queue.js';

const NAME = "Regeneration";

export class Regeneration {

  static register() {
    logger.info("Registering Automatic Regeneration");
    Regeneration.settings();
    Regeneration.hooks();
  }

  static settings() {
    const config = false;
    const settingsData = {
      autoRegen : {
        scope : "world", config, group: "npc-features", default: 0, type: Boolean,
      },
      regenBlock : {
        scope : "world", config, group: "npc-features", default: MODULE.localize('DND5EH.regenBlock_default'), type: String,
      }
    };

    MODULE.applySettings(settingsData);

  }

  static hooks() {
    Hooks.on("updateCombat", Regeneration._updateCombat);
  }

  static _updateCombat(combat, changed) {

    const setting = MODULE.setting('autoRegen');

    /** bail out if disabled */
    if( setting == 0 ) return;

    /** only want the GM to operate and only on a legitimate turn change */
    if (!MODULE.isTurnChange(combat, changed) || !MODULE.isFirstGM()) return;

    /** get the actor whose turn it just changed to */
    const next = combat.combatants.get(combat.current.combatantId);
    const token = next.token?.object;

    if(!token) {
      logger.debug('Could not find a valid token in the upcoming turn.');
      return;
    }

    /** does the current actor have a regeneration feature? */
    const feature = Regeneration._getRegenFeature(token.actor);

    /** if we have a valid feature, run the regen process */
    if(feature) Regeneration._executeRegen(token, feature);

  }

  static _getRegenFeature(actor) {
    if(!actor) {
      logger.debug('Cannot regenerate a null actor');
      return null;
    }

    /** before we check anything else, is regen blocked on this actor? */
    const regenBlockName = MODULE.setting("regenBlock");
    const blockEffect = actor.effects?.find(e => e.data.label === regenBlockName );
    const enabledBlockEffect = !(getProperty(blockEffect ?? {}, 'data.disabled') ?? true);

    if (enabledBlockEffect){
      logger.debug(`${actor.name}'s regeneration blocked by ${blockEffect.data.label}`);
      return null;
    }

    /** Get the supported names of the regeneration feature */
    const regenName = game.i18n.format("DND5EH.AutoRegen_Regneration")
    const selfRepairName = game.i18n.format("DND5EH.AutoRegen_SelfRepair")

    /** search for this item in the actor */
    const regen = actor.items.find(i => i.name === regenName || i.name === selfRepairName);

    return regen;
  }

  static _getActorHP(actor) {
    const actorHP = getProperty(actor, 'data.data.attributes.hp');
    return actorHP;
  }

  /* @private */
  static _parseRegenFeature(item) {

    /* @todo localize 'hit points'! */
    const hitPointsString = MODULE.localize("DND5EH.AutoRegen_HP");
    const regenRegExp = new RegExp(`([0-9]+|[0-9]*d0*[1-9][0-9]*) ${hitPointsString}`);
    let match = item.data.data.description.value.match(regenRegExp);

    if (!match) {
      logger.debug(`Could not parse ${item.name}'s description for a regeneration value containing ${hitPointsString}`);
      return null;
    }

    return match[1];
  }

  static _executeRegen(token, feature) {

    const regen = Regeneration._parseRegenFeature(feature);

    if (!regen) return;

    const hp = Regeneration._getActorHP(token.actor);

    const rollRegenCallback = () => queueUpdate( async () => {

      /** roll the regen expression */
      const rollObject = await new Roll(regen).evaluate({async: true});
      let regenRoll = rollObject.total;

      /** apply the damage to the token */
      await token.actor.applyDamage(- regenRoll);

      /** echo results to chat */
      await ChatMessage.create({
        content: game.i18n.format("DND5EH.AutoRegenDialog_healingmessage",
          {tokenName: token.name, regenRoll: regenRoll}),
        whisper: ChatMessage.getWhisperRecipients('gm').map(o => o.id)
      });

    });


    //dialog choice to heal or not
    if (regen !== null) {
      new Dialog({
        title: game.i18n.format("DND5EH.AutoRegenDialog_name", {tokenName: token.name}),
        content: game.i18n.format("DND5EH.AutoRegenDialog_content", {tokenName: token.name, tokenHP: hp.value, actorMax: hp.max}),
        buttons: {
          one: {
            // @todo need to correct the type in 'regenAmout'
            label: game.i18n.format("DND5EH.AutoRegenDialog_healingprompt", {regenAmout: regen}),
            callback: rollRegenCallback
          },
          two: {
            label: game.i18n.format("DND5EH.AutoRegenDialog_stopprompt"),
          }
        }
      }).render(true);

      return;
    }

  }
}
