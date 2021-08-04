import { MODULE } from '../module.js';
import { logger } from '../logger.js';
import { ActionDialog } from '../apps/action-dialog.js'

const NAME = "LegendaryActionManagement";

/**
 * LegendaryActionManagement
 *  This Module strictly manages Legendary action economy per the dnd5e rules.
 */
export class LegendaryActionManagement{

  static register(){
    this.settings();
    this.hooks();
  }

  static settings(){

  }

  static hooks() {
    Hooks.on('createCombatant', LegendaryActionManagement._createCombatant);
    Hooks.on('deleteCombatant', LegendaryActionManagement._deleteCombatant);
    Hooks.on('updateCombat', LegendaryActionManagement._updateCombat);
  }

  static _createCombatant(combatant) {
    if (!MODULE.isFirstGM()) return;
  }

  static _deleteCombatant(combatant) {
    if (!MODULE.isFirstGM()) return;

  }

  static _updateCombat(combat, changed) {
    if (!MODULE.isFirstGM()) return;

  }

  /** @private */
  /*
   * Generates the object containing all relevant
   * information to render and run an Action Dialog
   * @param {Object} combatant
   */
  static _legendaryActionData(combatant) {

    /* collect item list of legendary actions */
    const legendaryActions = combatant.token.actor.items.filter( item => item.data?.data?.activation?.type === "legendary" );

    let data = {
      combatantId : combatant.id,
      combatId : combatant.parent.id,
      itemIds : legendaryActions.map( item => item.id ),
    };

    return data;
  }
}
