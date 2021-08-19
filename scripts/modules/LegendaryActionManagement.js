import { MODULE } from '../module.js';
import { logger } from '../logger.js';
import { ActionDialog } from '../apps/action-dialog.js'
import { queueUpdate } from './update-queue.js'

const NAME = "LegendaryActionManagement";

/** @todo need to support an array of actors, not just a single one */
class LegendaryActionDialog extends ActionDialog {

  /** @override */
  constructor(combatants) {

    /* construct an action dialog using only legendary actions */

    /** @todo parent class needs to accept array of combatants */
    super(combatants, {legendary: true});
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
    const config = false;
    const settingsData = {
      legendaryActionHelper : {
        scope : "world", config, group: "combat", default: 0, type: Boolean,
      }
    };

    MODULE.applySettings(settingsData);
  }

  static hooks() {
    Hooks.on('createCombatant', LegendaryActionManagement._createCombatant);
    
    //not needed as the flag for identification is now stored on the combatant itself
    //Hooks.on('deleteCombatant', LegendaryActionManagement._deleteCombatant);

    Hooks.on('updateCombat', LegendaryActionManagement._updateCombat);
  }

  /**
   * Check Combatant for Legendary Actions, store information on the combat.
   *  actorid, [itemid], 
   * 
   * @param {Combatant} combatant 
   * @returns 
   */
  static _createCombatant(combatant) {

    /* do not run if not the first GM or the feature is not enabled */
    if (!MODULE.isFirstGM() || !MODULE.setting('legendaryActionHelper')) return;

    const hasLegendary = !!combatant.token.actor.items.find((i) => i.data?.data?.activation?.type === "legendary")

    /* flag this combatant as a legendary actor for quick filtering */
    if (hasLegendary){
      queueUpdate( async () => await combatant.setFlag(MODULE.data.name, 'hasLegendary', true) )
    }

  }

  /**
   * 
   * @param {*} combat 
   * @param {*} changed 
   * @returns 
   */
  static _updateCombat(combat, changed) {

    /* do not run if not the first GM or the feature is not enabled */
    if (!MODULE.isFirstGM() || !MODULE.setting('legendaryActionHelper')) return;

    /* only trigger legendary actions on a legit turn change */
    if (!MODULE.isTurnChange(combat, changed)) return;

    /* Collect legendary combatants (but not the combatant whose turn just ended) */
    const previousId = combat.previous?.combatantId;
    const legendaryCombatants = combat.combatants.filter( combatant => combatant.getFlag(MODULE.data.name, 'hasLegendary') && combatant.id != previousId );

    /* send list of combantants to the action dialog subclass */
    if (legendaryCombatants.length > 0) {
      LegendaryActionManagement.showLegendaryActions(legendaryCombatants);
    }

  }

  /** @private */
  /*
   * Generates the action dialog for legendary actions 
   * @param {Array of Object} combatants
   */
  static showLegendaryActions(combatants) {
    
    ui.notifications.info(`Placeholder for ${combatants.length} legendary actors`);

    //new LegendaryActionDialog(combatants).render(true);
  }
}
