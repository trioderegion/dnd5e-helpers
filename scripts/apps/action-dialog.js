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
  constructor(combatant, options = { action : true, bonus : true, reaction : true, legendary : true, lair : true, special : true }){
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
    this.data.combatant = {
      id : combatant.id,
      img : combatant.actor.img,
      name : combatant.actor.name,
      items : {
        actions : this.options?.action ? this.getCombatantData(combatant, "action") : undefined,
        bonus : this.options?.bonus ? this.getCombatantData(combatant, "bonus") : undefined,
        reaction : this.options?.reaction ? this.getCombatantData(combatant, "reaction"): undefined,
        legendary : this.options?.legendary ? this.getCombatantData(combatant, "legendary") : undefined,
        lair : this.options?.lair ? this.getCombatantData(combatant, "lair") : undefined,
        special : this.options?.special ? this.getCombatantData(combatant, "special") : undefined,
      }
    }
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

  getCombatantData(combatant, type){
    return combatant.actor.items
      .filter(item => item?.data?.data?.activation?.type === type)
      .map(item => ({
        name : item.name, id : item.id, cost : getProperty(item,'data.data.activation.cost'), description : getProperty(item ,'data.data.description.value'), img : item.img, uuid : item.uuid,
      }));
  }

  getData(options) {
    let data = super.getData(options);  
    data.combatant = this.data.combatant;
    return data;
  }

  /*
    Overwrite
  */
  activateListeners(html){
    super.activateListeners(html);
    html.find(`#${this.data.combatant.id}`).on('click', this._onImgClick);
    for(const item of Object.values(d.data.combatant.items).reduce((a,v) => a.concat(v.map(e => e.id)), [])){
      html.find(`#${item}`).on('click', this._onButtonClick);
    }
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
