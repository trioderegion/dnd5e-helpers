
/**
 * @class 
 */
class AbilityRecharge {

  static init() {

    /** @instanceof HPI */
    const api = game.modules.get('dnd5e-helpers')?.api;
 
    /* construct ourself */
    const plugin = new AbilityRecharge(api);

    /* Add ourselves to the HPI */
    api.addInterface('AbilityRecharge', plugin)
  }

  /**
   * @class AbilityRecharge
   * @param {HPI} helpersApi
   */
  constructor(helpersApi) {
    
    /**
     * Helper accessor to the API
     *
     * @protected
     * @default undefined
     */
    this._api = helpersApi;
    /* Add our turn check to the handler */
    this._api.hooks.on('combatTurn', this.#checkRecharge, this._api.util.isFirstGM);
  }

  /**
   * @param {Combat} combat
   * @param {IntercomData.TurnInfo} turnInfo
   */
  #checkRecharge(combat, turnInfo) {

    
  }

}

Hooks.on('helpersReady', AbilityRecharge.init)
