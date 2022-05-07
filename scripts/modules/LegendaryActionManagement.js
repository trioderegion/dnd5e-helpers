import { MODULE } from '../module.js';
import { logger } from '../logger.js';
import { ActionDialog } from '../apps/action-dialog.js'
import { queueUpdate } from './update-queue.js'

const NAME = "LegendaryActionManagement";

/** @todo need to support an array of actors, not just a single one */
class LegendaryActionDialog extends ActionDialog {

  /** @override */
  constructor(combatants) {
    
    /* Localize title */
    const title = MODULE.format("DND5E.LegAct");

    /* construct an action dialog using only legendary actions */
    super(combatants, {legendary: true, title, id:'legact-action-dialog'});
  }

}


/**
 * LegendaryActionManagement
 *  This Module strictly manages Legendary action economy per the dnd5e rules.
 */
export class LegendaryActionManagement{

  /** @public */
  static register(){
    this.settings();
    this.hooks();
  }

  /** @public */
  static settings(){
    const config = false;
    const settingsData = {
      legendaryActionRecharge : {
        scope : "world", config, group: "npc-features", default: false, type: Boolean,
      },
      legendaryActionHelper : {
        scope : "world", config, group: "npc-features", default: false, type: Boolean,
      }
    };

    MODULE.applySettings(settingsData);
  }

  /** @public */
  static hooks() {
    Hooks.on('createCombatant', LegendaryActionManagement._createCombatant);
    Hooks.on('updateCombat', LegendaryActionManagement._updateCombat);
  }

  /**
   * Check Combatant for Legendary Actions, store information on the combat.
   *  actorid, [itemid], 
   * 
   * @param {Combatant} combatant 
   */
  static _createCombatant(combatant) {

    /* do not run if not the first GM, but always flag regardless of enable state */
    if (!MODULE.isFirstGM()) return;

    const hasLegendary = !!combatant.actor?.items.find((i) => i.data?.data?.activation?.type === "legendary")

    /* flag this combatant as a legendary actor for quick filtering */
    if (hasLegendary){
      logger.debug(`${NAME} | flagging as legendary combatant: ${combatant.name}`, combatant);
      queueUpdate( async () => await combatant.setFlag(MODULE.data.name, 'hasLegendary', true) )
    }

  }

  /** @private */
  /* 
   * @param {*} combat 
   * @param {*} changed 
   * @returns 
   */
  static _updateCombat(combat, changed) {

    /* do not run if not the first GM or the feature is not enabled */
    if (!MODULE.isFirstGM()) return;

    /* only trigger legendary actions on a legit turn change */
    if (!MODULE.isTurnChange(combat, changed)) return;

    const previousId = combat.previous?.combatantId;

    /* run the leg action helper dialog if enabled */
    if (MODULE.setting('legendaryActionHelper')) {

      /* Collect legendary combatants (but not the combatant whose turn just ended) */
      let legendaryCombatants = combat.combatants.filter( combatant => combatant.getFlag(MODULE.data.name, 'hasLegendary') && combatant.id != previousId );

      /* only prompt for actions from alive creatures with leg acts remaining */
      legendaryCombatants = legendaryCombatants.filter( combatant => getProperty(combatant.actor, 'data.data.resources.legact.value') ?? 0 > 0 );
      legendaryCombatants = legendaryCombatants.filter( combatant => getProperty(combatant.actor, 'data.data.attributes.hp.value') ?? 0 > 0 );

      /* send list of combantants to the action dialog subclass */
      if (legendaryCombatants.length > 0) {
        LegendaryActionManagement.showLegendaryActions(legendaryCombatants);
      }

    }

    /* recharge the legendary actions, if enabled */
    if (MODULE.setting('legendaryActionRecharge')) {

      /* once the dialog for the "in-between" turn has been rendered, recharge legendary actions
       * for the creature whose turn just ended. This is not entirely RAW, but due to order
       * of operations it must be done 'late'. Since a creature cannot use a legendary
       * action at the end of its own turn, nor on its own turn, recharging at end of turn
       * rather than beginning of turn is functionally equivalent. */
      if (previousId) {

        /* does the previous combatant have legendary actions? */
        const previousCombatant = combat.combatants.get(previousId);
        if(!!previousCombatant?.getFlag(MODULE.data.name, 'hasLegendary')) {
          LegendaryActionManagement.rechargeLegendaryActions(previousCombatant);
        }
      }

    }
  }

  /** @private */
  /*
   * Generates the action dialog for legendary actions 
   * @param {Array of Object} combatants
   */
  static showLegendaryActions(combatants) {
    new LegendaryActionDialog(combatants).render(true);
  }

  /** @private */
  /*
   * @param {Combatant} combatant
   *
   * @return {Actor5e} modified actor document
   */
  static rechargeLegendaryActions(combatant) {

    if (!combatant.actor || !combatant.token) {
      return;
    }

    let legact = getProperty(combatant.actor, 'data.data.resources.legact');

    /* does this creature have the legendary action counter? */
    if (!!legact && legact.value !== null) {

      /* only reset if needed */
      if (legact.value < legact.max) {
        ui.notifications.info(game.i18n.format("DND5EH.CombatLegendary_notification", {max: legact.max, tokenName: combatant.token.name}))

        /* send the reset update and sheet refresh */
        queueUpdate( async () => {
          const newActor = await combatant.actor.update({'data.resources.legact.value': legact.max});
          newActor.sheet.render(false);
        });

      }
    }

    return;
  }

}
