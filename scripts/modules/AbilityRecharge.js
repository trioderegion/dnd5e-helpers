import { logger } from '../logger.js';
import { MODULE } from '../module.js';
import { queueUpdate } from './update-queue.js';

const NAME = "AbilityRecharge";

export class AbilityRecharge {
  static register(){
    logger.info("Registering In-Combat Ability Recharge");
    AbilityRecharge.settings();
    AbilityRecharge.hooks();
  }

  static settings() {
    const config = false;
    const settingsData = {
      abilityRecharge : {
        scope : "world", config, group: "combat", default: 0, type: Number,
        choices : {
          0 : MODULE.localize("option.arOption.Off"),
          1 : MODULE.localize("option.arOption.Start"),
          2 : MODULE.localize("option.arOption.End"),
        }
      },
      hideAbilityRecharge : {
        scope : "world", config, group: "combat", default: false, type: Boolean,
      }
    };

    MODULE.applySettings(settingsData);
  }

  static hooks() {
    Hooks.on("updateCombat", AbilityRecharge._updateCombat);
  }

  static _updateCombat(combat, changed) {

    const setting = MODULE.setting('abilityRecharge');

    /** bail out if disabled */
    if( setting == 0 ) return;

    /** only want the GM to operate and only on a legitimate turn change */
    if (!MODULE.isTurnChange(combat, changed) || !MODULE.isFirstGM()) return;

    /** get the turn of interest */
    const next = combat.combatants.get(combat.current.combatantId);
    const previous = combat.combatants.get(combat.previous.combatantId);

    const turn = setting === 1 ? next : setting === 2 ? previous : null;

    const token = turn?.token?.object;

    if (token) AbilityRecharge._recharge(token);
  }

  static _recharge(token) {
    const rechargeItems = AbilityRecharge._collectRechargeItems(token);

    /** can do this inside a for each because of update-queue! yay! */
    rechargeItems.forEach(AbilityRecharge._rollRecharge);
  }

  static _needsRecharge(recharge = { value: 0, charged: false }) {
    return (recharge.value !== null &&
      (recharge.value > 0) &&
      recharge.charged !== null &&
      recharge.charged == false);
  }

  static _collectRechargeItems(token) {
    const rechargeItems = token.actor?.items.filter(e => AbilityRecharge._needsRecharge(e.data.data.recharge)) ?? [];

    return rechargeItems;
  }

  static _rollRecharge(item) {
    const data = item.data.data;
    if (!data.recharge.value) return;

    queueUpdate(async () => {
      // Roll the check
      const roll = await(new Roll("1d6").evaluate({async: true}));
      const success = roll.total >= parseInt(data.recharge.value);
      const rollMode = MODULE.setting("hideAbilityRecharge") == true ? "blindroll" : "";

      // Display a Chat Message
      // @todo rollMode is not being respected...
      await roll.toMessage({
        flavor: `${game.i18n.format("DND5E.ItemRechargeCheck", {name: item.name})} - ${game.i18n.localize(success ? "DND5E.ItemRechargeSuccess" : "DND5E.ItemRechargeFailure")}`,
        speaker: ChatMessage.getSpeaker({actor: item.actor, token: item.actor.token}),
        },
        {
          rollMode
        }
      );

      // Update the Item data
      if (success) await item.update({"data.recharge.charged": true});

      return;
    });
  }
}
