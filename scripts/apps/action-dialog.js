import { logger } from '../logger.js';
import { MODULE } from '../module.js';

/**
 * Simple form app that allows you to list abilities for a combatant
 * 
 * options = {
 *  action, bonus, reaction, legendary, lair, special
 * }
 */
export class ActionDialog extends Dialog {
  /** @override */
  constructor(combatants, options = { action : true, bonus : true, reaction : true, legendary : true, lair : true, special : true }){
    /*
      Build Options
    */
    super(options);
    foundry.utils.mergeObject(this.options, options);

    /*
      Build Data
     */
    this.data = {};
    this.data.title = options?.title ?? "Action Dialog";
    this.data.buttons = { 
      close: { label: MODULE.format("Close"), callback: () => {}}
    };
    this.data.default = "close";
    this.data.combatants = combatants.map((combatant) => {return {
      id : combatant.id,
      img : combatant.actor.img,
      name : combatant.actor.name,
      economy : this.getCombatantItemData(combatant),
      items : {
        action : this.options?.action ? this.getCombatantItemData(combatant, "action") : undefined,
        bonus : this.options?.bonus ? this.getCombatantItemData(combatant, "bonus") : undefined,
        reaction : this.options?.reaction ? this.getCombatantItemData(combatant, "reaction"): undefined,
        legendary : this.options?.legendary ? this.getCombatantItemData(combatant, "legendary") : undefined,
        lair : this.options?.lair ? this.getCombatantItemData(combatant, "lair") : undefined,
        special : this.options?.special ? this.getCombatantItemData(combatant, "special") : undefined,
      }
    }
    });
  }

  /** @inheritdoc */
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      template : `modules/${MODULE.data.name}/templates/ActionDialog.html`,
      classes: ["dnd5ehelpers","action-dialog"], 
      resizable: true,
      jQuery : true,
      width : "auto",
      close: () => {ui.notify}
    });
  }

  get title() {
    return this.data.tile;
  }

  getCombatantItemData(combatant, type){
    return combatant.actor.items
      .filter(item => item?.data?.data?.activation?.type === type)
      .map( (item) => {
        /* common data */
        let data = {
          name : item.name, 
          id : item.id,
          activation : getProperty(item,'data.data.activation'), 
          description : getProperty(item ,'data.data.description.value'), 
          img : item.img, 
          uuid : item.uuid,
        }

        /* special case data */
        switch(type){
          case 'legendary':
            mergeObject(data.activation, { available : getProperty(combatant.actor, 'data.data.resources.legact.value') } ); 
            break;
        }

        return data;
      });
  }

  getCombatantEconomyData(combatant){
    return {
      action : 1,
      bonus : 1,
      reaction : 1,
      legendary : combatant.actor.data.data.resources?.legact,
      lair : combatant.actor.data.data.resources?.lair
    }
  }

  getData(options) {
    let data = super.getData(options);  
    data.combatants = this.data.combatants;
    return data;
  }

  /*
    Overwrite
  */
  activateListeners(html){
    super.activateListeners(html);

    /* register img and item clicks for each combatant */
    this.data.combatants.forEach( (combatant) => {
      html.find(`#${combatant.id}`).on('click', this._onImgClick);
      for(const item of Object.values(combatant.items).reduce((a,v) => a.concat(v?.map(e => e.id) ?? []), [])){
        html.find(`#${item}`).on('click', this._onButtonClick);
      }
    });
  }

  update(combat){

  }

  _onImgClick(event){
    logger.debug("_onImgClick | DATA | ", { event });
    const combatantID = event.currentTarget.id;
    if(!combatantID || !game.combats.active) return;

    const token = game.combats.active.combatants.get(combatantID)?.token.object;
    if(!token) return;

    token.control({ releaseOthers : true });
    canvas.animatePan({ x : token.x, y : token.y });
  }

  async _onButtonClick(event){
    const itemUUID = event.currentTarget.value;
    const item = await fromUuid(itemUUID);

    if(!item || !(item instanceof Item)) return;

    await item.roll();
    logger.debug("onButtonClick | DATA | ", { event, itemUUID, item });
  }
}
