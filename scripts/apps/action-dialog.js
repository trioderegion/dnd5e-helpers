import { MODULE } from '../module.js'
export class ActionDialog extends Dialog {
  
  /** @override */
  constructor(data, options = {}){
    super(options);
    this.data = data;
    this.data.buttons = { 
      close: { label: MODULE.format("Close"),
          callback: () => {}
      }
    };
    this.data.default = "close";

    /* construct rest of needed data */
  }

  /** @inheritdoc */
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      template : `modules/${MODULE.data.name}/templates/ActionDialog.html`,
      classes : ["ActionDialog"],
      jQuery : true,
      width : 600,
    });
  }

  get title() {
    return "Test";//this.data.tile;
  }

  getData(options) {
    let data = super.getData(options);
    
    //need array of:
    //tokenId
    //combatant name
    //combatant image
    //remaining leg act charges
    //array of:
    //  item id
    //  item name
    //  cost 
    //  description
    data.renderData = this.data.actions.map( actionData => {
        const combat = game.combats.get(actionData.combatId);    
        const combatant = combat.combatants.get(actionData.combatantId);
        const actor = combatant.actor;

        const actions = actionData.itemIds.map( (id) => {
          const item = actor.items.get(id);

          return {
            id : id,
            name : item.name,
            cost : getProperty(item, 'data.data.activation.cost'),
            description : getProperty(item, 'data.data.description.value')
          }
        });

        return {
          tokenId : combatant.token.id,
          name : combatant.name,
          img : combatant.img,
          charges : getProperty(actor, 'data.data.resources.legact.value'),
          actions,
        }
    });

    return data;
  }
}

globalThis.ActionDialog = ActionDialog;
