import { MODULE } from '../module.js';
import { logger } from '../logger.js';
import { ActionDialog } from '../apps/action-dialog.js'

const NAME = "LegendaryActionManagement";

/** @todo need to support an array of actors, not just a single one */
class LegendaryActionDialog extends ActionDialog {

  /** @override */
  constructor(combatant) {

    /* construct an action dialog using only legendary actions */
    super(combatant, {legendary: true});
  }

}


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

  /**
   * Check Combatant for Legendary Actions, store information on the combat.
   *  actorid, [itemid], 
   * 
   * @param {*} combatant 
   * @returns 
   */
  static _createCombatant(combatant) {
    if (!MODULE.isFirstGM()) return;
  }

  /**
   * 
   * @param {*} combatant 
   * @returns 
   */
  static _deleteCombatant(combatant) {
    if (!MODULE.isFirstGM()) return;

  }

  /**
   * 
   * @param {*} combat 
   * @param {*} changed 
   * @returns 
   */
  static _updateCombat(combat, changed) {
    if (!MODULE.isFirstGM()) return;

  }

  /** @private */
  /*
   * Generates the action dialog for legendary actions 
   * @param {Object} combatant
   */
  static showLegendaryActions(combatant) {
    new LegendaryActionDialog(combatant).render(true);
  }
}
