import { MODULE } from '../module.js';
import { logger } from '../logger.js';
import { ActionDialog } from '../apps/action-dialog.js'

const NAME = "LairActionManagement";

/** @todo need to support an array of actors, not just a single one */
class LairActionDialog extends ActionDialog {

  /** @override */
  constructor(combatants) {

    /* construct an action dialog using only legendary actions */

    /** @todo parent class needs to accept array of combatants */
    super(combatants, {lair: true});
  }

}


/**
 * LegendaryActionManagement
 *  This Module strictly manages Legendary action economy per the dnd5e rules.
 */
export class LairActionManagement{

  static register(){
    this.settings();
    this.hooks();
  }

  static settings(){
    const config = false;
    const settingsData = {
      lairActionHelper : {
        scope : "world", config, group: "combat", default: 0, type: Boolean,
      }
    };

    MODULE.applySettings(settingsData);
  }

  static hooks() {
    Hooks.on('createCombatant', LairActionManagement._createCombatant);
    
    //not needed as the flag for identification is now stored on the combatant itself
    //Hooks.on('deleteCombatant', LegendaryActionManagement._deleteCombatant);

    Hooks.on('updateCombat', LairActionManagement._updateCombat);
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
    if (!MODULE.isFirstGM() || !MODULE.setting('lairActionHelper')) return;

    const hasLair = !!combatant.token.actor.items.find((i) => i.data?.data?.activation?.type === "lair")

    /* flag this combatant as a legendary actor for quick filtering */
    if (hasLair){
      queueUpdate( async () => await combatant.setFlag(MODULE.data.name, 'hasLair', true) )
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
    if (!MODULE.isFirstGM() || !MODULE.setting('lairActionHelper')) return;

    /* only trigger legendary actions on a legit turn change */
    if (!isTurnChange(combat, changed)) return;

    /* Collect legendary combatants (but not the combatant whose turn just ended) */
    const previousId = combat.previous?.combatantId;

    /** @todo create logic for crossing a combatant's defined lair init */
    const lairCombatants = [] //combat.combatants.filter( combatant => combatant.getFlag(MODULE.data.name, 'hasLair') && combatant.id != previousId );

    /* send list of combantants to the action dialog subclass */
    LairActionManagement.showLairActions(lairCombatants);

  }

  /** @private */
  /*
   * Generates the action dialog for legendary actions 
   * @param {Array of Object} combatants
   */
  static showLairActions(combatants) {
    new LairActionDialog(combatants).render(true);
  }
}
