const MODULE = 'dnd5e-helpers'
let logger;
class WildMagicSurge {


  /* helper classes provided by Helpers */

  static init({logger}) {
    logger = logger;

    Hooks.on('wmsRegister', WildMagicSurge.registerHandlers);
  }

  static registerHandlers(registerFn) {
    registerFn(game.i18n.localize("option.wmOptions.standard"), WildMagicSurge.normalHandler );
    registerFn(game.i18n.localize("option.wmOptions.more"), WildMagicSurge.moreHandler);
    registerFn(game.i18n.localize("option.wmOptions.volatile"), WildMagicSurge.volatileHandler);
  }

  /* return: Promise <handlerReturn> */
  static async normalHandler(actor, surgeData) {

    /* roll for a 1 */
    const surgeRoll = await new Roll('1d20').evaluate({async: true});
    const targetRoll = await new Roll('1').evaluate({async:true});

    return game.dnd5e.helpers.wildMagic.commonSurgeHandler(actor, surgeData, surgeRoll, targetRoll);
    
  }

  static async moreHandler(actor, surgeData) {

    /* roll for a 1 */
    const surgeRoll = await new Roll('1d20').evaluate({async: true});
    const targetRoll = await new Roll(`${surgeData.spellLevel}`).evaluate({async:true});

    return game.dnd5e.helpers.wildMagic.commonSurgeHandler(actor, surgeData, surgeRoll, targetRoll);
  }

  static async volatileHandler(actor, surgeData) {

    const surgeRoll = await new Roll('1d20').evaluate({async: true});

    const tidesCharged = game.dnd5e.helpers.wildMagic.isTidesCharged(actor);
    const targetRoll = await new Roll(`${surgeData.spellLevel}${tidesCharged ? '' : ' + 1d4'}`).evaluate({async:true});

    return game.dnd5e.helpers.wildMagic.commonSurgeHandler(actor, surgeData, surgeRoll, targetRoll);
  }
}

Hooks.on('helpersReady', WildMagicSurge.init)
