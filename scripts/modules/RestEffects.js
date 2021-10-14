import { logger } from '../logger.js';
import { MODULE } from '../module.js';

const NAME = "RestEffects";

export class RestEffects{
  static register(){
    logger.info("Registering Rest Effect Deletion");
    RestEffects.defaults();
    RestEffects.settings();
    RestEffects.hooks();
    RestEffects.patch();
  }

  static defaults(){
    MODULE[NAME] = {
      /*
        Options require localization
      */
      options : ["Ignore", "Short Rest", "Long Rest"],
      key : "rest-effect",
    }
  }

  static settings(){

  }
  
  static hooks(){
    Hooks.on(`renderActiveEffectConfig`, RestEffects._renderActiveEffectConfig);
  }

  static patch(){
    RestEffects._patchActor();
  }

  /*
    Class Specific Functions
  */
  /**
   * _renderActiveEffectConfig is a hook method to display setting in active effects
   * @param {*} app 
   * @param {*} html 
   * @todo add conditions, might not be required
   * @todo localize labeling
   */
  static _renderActiveEffectConfig(app, html){
    const status = app.object.getFlag(MODULE.data.name, MODULE[NAME].key) ?? "";
    const tab = html.find('[data-tab="duration"]')[1];
    const selectHTML = `<label> Remove after Rest </label>
                        <div class="form-fields">
                          <select name="flags.${MODULE.data.name}.${MODULE[NAME].key}" data-dtype="String">
                            ${MODULE[NAME].options.reduce((a,v) => a+=`<option value="${v}" ${status == v ? `selected` : ``}>${v}</option>`, ``)}
                          </select>
                        </div>`;

    html.css("height", "auto");
    tab.append(MODULE.stringToDom(selectHTML, "form-group"));
  }

  //@todo possibly add additional information to what effects were removed to the last chatmessage
  static _patchActor(){
    //patch long rest
    const orig_longRest = getDocumentClass("Actor").prototype.longRest;
    getDocumentClass("Actor").prototype.longRest = async function({ dialog = true, chat = true, newDay = true} = {}){
      let result = await orig_longRest.call(this, {dialog, chat, newDay});
      if(result !== undefined)
        for(let effect of this.effects){
          let status = effect.getFlag(MODULE.data.name, MODULE[NAME].key) ?? "";
          if(status === "Short Rest" || status === "Long Rest")
            await effect.delete();
        }
      return result;
    }

    //patch short rest
    const orig_shortRest = getDocumentClass("Actor").prototype.shortRest;
    getDocumentClass("Actor").prototype.shortRest = async function({dialog = true, chat = true, autoHD = false, autoHDThreshold = 3}={}){
      let result = await orig_shortRest.call(this, {dialog, chat, autoHD, autoHDThreshold});
      if(result !== undefined){
        for(let effect of this.effects){
          let status = effect.getFlag(MODULE.data.name, MODULE[NAME].key) ?? "";
          if(status === "Short Rest")
            await effect.delete();
        }
      }
      return result;
    }
  }
}