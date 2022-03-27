class WildMagicSurge {

  /* helper classes provided by Helpers */

  static init() {
    Hooks.on('wmsRegister', WildMagicSurge.registerHandlers);
  }

  static registerHandlers() {
    WildMagic.registerHandler(game.i18n.localize("option.wmOptions.standard"), WildMagicSurge.normalHandler );
    WildMagic.registerHandler(game.i18n.localize("option.wmOptions.more"), WildMagicSurge.moreHandler);
    WildMagic.registerHandler(game.i18n.localize("option.wmOptions.volatile"), WildMagicSurge.volatileHandler);
  }

  /* return: Promise <handlerReturn> */
  static normalHandler(actor, surgeData) {

    /* surge on a roll of 1 */
    return WildMagic.templates.handler(actor, surgeData);
  }

  static async moreHandler(actor, surgeData) {

    /* roll at or under spell level */
    return WildMagic.templates.handler(actor, surgeData, '1d20', `${surgeData.spellLevel}`);
  }

  static async volatileHandler(actor, surgeData) {

    /* increase the spell level (like 'more') if tides is spent */
    const tidesCharged = WildMagic.isTidesCharged(actor);
    const targetRoll = `${surgeData.spellLevel}${tidesCharged ? '' : ' + 1d4'}`;


    return WildMagic.templates.handler(actor, surgeData, '1d20', targetRoll);
  }
}

Hooks.on('helpersReady', WildMagicSurge.init)
