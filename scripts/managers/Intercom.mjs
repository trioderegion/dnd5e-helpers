import {MODULE} from '../module.js'
import {logger} from '../logger.js'

/** @namespace IntercomData
 * @export
 */


/** 
 * Hook manager for HPI
 */
export default class Intercom extends Hooks {

  /* default hooks */
  //static #defaultHooks = ['combatRound','combatTurn'];

  static build() {
    
    /** @type HPI */
    const publicApi = game.modules.get('dnd5e-helpers').api;

    publicApi.add('hooks', 'on', Intercom.on);
    publicApi.add('hooks', 'once', Intercom.once);
    publicApi.add('hooks', 'off', Intercom.off);

    /* combat hooks */
    Hooks.on('updateCombat', Intercom.handleUpdateCombat.bind(this));
  }
  
  /**
   * @param {Combat} combat
   * @param {object} changed
   * @param {object} options
   * @param {string} userId
   */
  static async handleUpdateCombat(combat, changed, options, userId) {

    //if (MODULE.isRoundChange)
    await this._combatRound(combat, changed, options, userId);

    if (MODULE.isTurnChange(combat, changed)) {

      const turnInfo = new TurnInfo(combat, options, userId);

      await this._combatTurn(combat, turnInfo);

    }
  };

  static #parentHooks = new Map();
  static #hookGroups = new Map();
  static #currentId = 1;
  static get #nextId() {
    return this.#currentId++;
  }

  /**
   * @param {string} hookName
   * @param {function} fn
   * @param {function} [condition=undefined]
   */
  static on(hookName, fn, condition) {

    const id = this.#nextId;

    if(!this.#hookGroups.has(hookName)) {

      const eventQueue = async (...args) => {
        
        for( const hookFn of this.#hookGroups.get(hookName) ) { 
          
          /* check if this inner hook has a conditional and run it
           * prior to the main function */
          if(hookFn.check && !hookFn.check(...args)) continue;

          try {
            await hookFn.main(...args);
          } catch (err) {
            logger.error(err);
          } finally {
            continue;
          }
        }

      }

      const superId = super.on(hookName, eventQueue) 
      this.#parentHooks.set(hookName, superId);
    }


    this.#hookGroups.get(hookName).set(id, {main: fn, check: condition});
    return id;
  }

  static call(hookName) {

  }

  static callAll(hookName) {

  }
  

  /**
   * @param {any[]} args
   */
  static async _combatRound(...args) {};

  /**
   * @param {any} combat
   * @param 
   */
  static async _combatTurn(combat, turnInfo) {

  };

}

/**
 * @memberof IntercomData
 */
class TurnInfo {
  constructor(combat, options, userId) {
    this.nextCbnt = combat.combatants.get(combat.current.combatantId);
    this.prevCbnt = combat.combatants.get(combat.previous.combatantId);
    this.combat = combat;
    this.updateOptions = options;
    this.initiator = userId;
  }
}
