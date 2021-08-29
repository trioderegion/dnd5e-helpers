/**
 * Imports
 */
import { logger } from '../logger.js';
import { MODULE } from '../module.js';

/**
 * Action Dialog
 */
export class AD extends Application{
  /**
   * Action Dialog constructor method
   * @param [*] items : all the items to be displayed on the Dialog
   * @param {*} options : various options to control how things are displayed
   */
  constructor(items, options = {
    action : true, bonus : true, reaction : true, legendary : true, lair : true, /* @todo : add "item" label string, add "actor" information array*/
  }){
    super(options);
    this.items = items;
  }

  /** @inheritdoc */
  static get defaultOptions(){
    return foundry.utils.mergeObject(super.defaultOptions, {
      template : `modules/${MODULE.data.name}/templates/ActionDialogApp.html`,
      classes : ["action-dialog-app"],
      width : "auto",
      height : "auto",
      jQuery : true,
    });
  }

  getData(options){
    this._getItems();
    this._getActors();
    this._getActions();

    this.selectedActor = this?.selectedActor ?? this.actors[0];
    this.selectedAction = this?.selectedAction ?? ["action", "bonus", "reaction", "legendary", "lair", "special"].find(t => !!this.options[t]);    

    return this._getData();
  }

  activateListeners(){
    const html = this.element;
    const data = this.getData();

    for(const ele of data.actors)
      this._executeActorClick(html.find(`#${ele}`)[0]);
    
    for(const ele of data.actions)
      this._executeActionClick(html.find(`#${ele}`)[0]);

    for(const ele of Array.from(html.find(`[data-tab="${this.selectedAction}"]`)[0].children))
      this._executeItemClick(ele);
  }

  update(){
    this._update();
  }

  _getActors(){
    this.actors = this.items.reduce((a,b) => a.includes(b.actor) ? a : a.concat(b.actor), []);
    return this.actors;
  }

  /**
   * @todo add "tab" for each actor items?
   * @returns 
   */
  _getItems(){
    this.items = this.items.reduce((a,b) => {
      for(const type of ["action", "bonus", "reaction", "legendary", "lair", "special"]){
        if(!!this.options[type] && getProperty(b,'data.data.activation.type') == type)
          return a.concat(b);          
      }
      return a;
    }, []);
    return this.items;
  }

  _getActions(){
    this.actions = this.items.reduce((a,b) => {
      for(const type of ["action", "bonus", "reaction", "legendary", "lair", "special"]){
        if(!!this.options[type] && getProperty(b,'data.data.activation.type') == type && !a.includes(type)){
          return a.concat(type);
        }
      }
      return a;
    }, []);
    return this.actions;
  }

  _getData(){
    return {
      actions : this.actions,
      actors : this.actors.map(a => a.name),
      actor : this._getActorDetails(this.selectedActor),
    };
  }

  _getActorDetails(actor){
    return {
      label : actor.name,
      uuid : actor?.token?.document?.uuid ?? actor.getActiveTokens()[0]?.document?.uuid,
      img : actor.img,
      items : this.items.reduce((a,b,c) => {
        if(Array.from(actor.items).includes(b)){
          const type = getProperty(b,'data.data.activation.type');
          
          if(type !== this.selectedAction)
            a[type] = [];
          else if(a[type] instanceof Array){
            a[type] = a[type].concat(this._getItemDetails(b));
          }else{
            a[type] = [this._getItemDetails(b)];
          }
        }
        return a;
      }, {})
    };
  }

  _getItemDetails(item){
    return {
      label : item.name,
      img : item.img,
      uuid : item.uuid
    };
  }

  _update(){

  }

  _executeActorClick(html){
    logger.debug("Actor Click | ", html);
  }

  _executeActionClick(html){
    logger.debug("Action Click | ", html);
  }

  _executeItemClick(html){
    logger.debug("Item Click | ", html);
    html.onclick = async (event) => {
      const item = await fromUuid(html.id);
      await item.roll();
    }
  }
}