import {MODULE} from "../module.js"

/**
 * Implements stock surge rules, and two homebrew variants. "More Surges" will surge if the
 * d20 is less than or equal to the spell level cast. "Volatile Surges" will add a d4 to the
 * spell level if the sorcerer has their Tides feature expended.
 */
class WildMagicSurge {

  static init() {

    /* When called on by the WildMagic utility, register our surge handlers and pre checks */
    this.api = game.dnd5e.helpers.WildMagicAPI;
    Hooks.on('wmsRegister', () => {

      /* Using the core "is slot expended?" preCheck for all variants (default, 3rd argument) */

      /* use the core, default implementation for the PHB surge 1d20 == 1 */
      this.api.registerHandler(game.i18n.localize("option.wmOptions.standard"), this.api.templates.handler);
      /* use our modified inputs for the homebrew variants */
      this.api.registerHandler(game.i18n.localize("option.wmOptions.more"), WildMagicSurge.moreHandler);
      this.api.registerHandler(game.i18n.localize("option.wmOptions.volatile"), WildMagicSurge.volatileHandler);
      this.api.registerHandler(game.i18n.localize("option.wmOptions.buildup"), WildMagicSurge.buildupHandler);
    });
  }

  /* surges on 1d20 <= spell level */
  static async moreHandler(actor, surgeData) {

    /* roll at or under spell level */
    return this.api.templates.handler(actor, surgeData, `${surgeData.spellLevel}`);
  }

  /* surges on 1d20 <= spell level. If Tides is expended, spell level is increased by 1d4 */
  static async volatileHandler(actor, surgeData) {

    /* increase the spell level (like 'more') if tides is spent */
    const tidesCharged = this.api.isTidesCharged(actor);
    const targetRoll = `${surgeData.spellLevel}${tidesCharged ? '' : ' + 1d4'}`;


    return this.api.templates.handler(actor, surgeData, targetRoll);
  }
  
  /* surges on 1d20 <= (number of spells since the last surge + 1) */
  static async buildupHandler(actor, surgeData) {
    const targetRoll = actor.getFlag(MODULE.data.name, 'wildMagicBuildupThreshold') ?? 1;
    
    const surgeResult = await this.api.templates.handler(actor, surgeData, `${targetRoll}`);
    surgeResult.actorUpdates[`flags.${MODULE.data.name}.wildMagicBuildupThreshold`] = surgeResult.surge ? 1 : targetRoll + 1;
    //await actor.setFlag(MODULE.data.name, 'wildMagicBuildupThreshold', surgeResult.surgeOccured ? 1 : targetRoll + 1);

    return surgeResult;
  }
}

/* When the WildMagic utility is ready, we can use its helpers
 * and register ourselves */
Hooks.on('helpersReady', WildMagicSurge.init)
