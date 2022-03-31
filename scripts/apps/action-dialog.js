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
  constructor(combatants, options = { action : true, bonus : true, reaction : true, legendary : true, lair : true, special : true, id: ActionDialog.DEFAULT_ID }){
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
      close: { label: MODULE.format("Close"), callback: ActionDialog.storePosition}
    };
    this.data.default = "close";
    this.data.combatants = combatants;
    mergeObject(this.position, ActionDialog._lastPosition.get(this.options.id) ?? {});
  }

  static DEFAULT_ID = 'dnd5e-helpers-action-dialog';
  static _lastPosition = new Map(); 

  static storePosition(html) {
    const id = html.attr('id');
    const position = html.position();
    ActionDialog._lastPosition.set(id, {top: position.top, left: position.left});
  }

  /** @inheritdoc */
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      template : `modules/${MODULE.data.name}/templates/ActionDialog.html`,
      classes: ["dnd5ehelpers","action-dialog"], 
      resizable: false,
      id: ActionDialog.DEFAULT_ID,
      jQuery : true,
      height: "100%",
      close: ActionDialog.storePosition,
      popOutModuleDisable: true,
    });
  }

  get title() {
    return this.data.title;
  }

  _generateCombatantData() {
    return this.data.combatants.map((combatant) => {
      return {
        id : combatant.id,
        combatId: combatant.combat.id,
        img : combatant.img,
        name : combatant.name,
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

  getCombatantItemData(combatant, type){
    return combatant.actor.items
      .filter(item => item?.data?.data?.activation?.type === type)
      .map( (item) => {
        /* common data */
        let data = {
          name : item.name, 
          id : item.id,
          activation : mergeObject(getProperty(item,'data.data.activation'), {canUse: true}),
          description : getProperty(item ,'data.data.description.value'), 
          img : item.img, 
          uuid : item.uuid,
        }

        /* special case data -- legendary actions REQUIRE available resources */
        switch(type){
          case 'legendary':
            mergeObject(data.activation, { available : getProperty(combatant.actor, 'data.data.resources.legact.value') } ); 
            data.activation.canUse = data.activation.available >= data.activation.cost;
            break;
        }

        return data;
      });
  }

  getData(options) {
    let data = super.getData(options);  
    data.combatants = this._generateCombatantData();
    return data;
  }

  update(){
    return this.render(true);
  }

  setPosition(options = {}) {
    options.height = '100%'
    const position = super.setPosition(options);
    return position;
  }


  /*
    Overwrite
  */
  activateListeners(html){
    super.activateListeners(html);

    /* register img and item clicks for each combatant */
    this.data.combatants.forEach( (combatant) => {
      html.find(`#${combatant.id}`).on('click', this._onImgClick);
    });

    html.find('.item').on('click', this._onButtonClick.bind(this));
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
    const itemUUID = event.currentTarget.id;
    const item = await fromUuid(itemUUID);

    if(!item || !(item instanceof Item)) return;

    await item.roll();
    logger.debug("onButtonClick | DATA | ", { event, itemUUID, item });

    /* close the dialog if only one combatant can do a thing here */
    if (this.data.combatants.length == 1) {
      return this.close();
    } else {
      return this.update();
    }
  }
}
