import { MODULE } from '../module.js';
import { logger } from '../logger.js';

const NAME = "ActionManagement";

/**
 * ActionManagement
 *  This Module strictly manages token action economy per the dnd5e rules.
 */
export class ActionManagement{
  static register(){
    logger.info("Registering Action Management");
    this.defaults();
    this.settings();
    this.hooks();
    this.patch();
    this.globals();
  }

  static async defaults(){
    MODULE[NAME] = {
      /* Sub Module Constant Values */
      flagKey : "ActionManagement",
      default : {
        action : 0, reaction : 0, bonus : 0
      },
      img : {
        action : "modules/dnd5e-helpers/assets/action-markers/ACTION2.png",
        reaction : "modules/dnd5e-helpers/assets/action-markers/reaction.png",
        bonus : "modules/dnd5e-helpers/assets/action-markers/bonus.png",
        background : "modules/dnd5e-helpers/assets/action-markers/background.png",
      },
      orig : {
        height : 150, width : 150, x : 0, y : 0,
      }, 
      offset : {
        action : { h : 5, v : -1},
        reaction : { h : 2, v : -1},
        bonus : { h : 8, v : -1},
        background : { h : 5, v : -1}
      }
    };
  }

  static settings(){
    const config = false;
    const settingData = {
      cbtReactionEnable : {
        scope : "world", type : Number, group : "combat", default : 0, config,
        choices : {
          0 : MODULE.localize("option.default.none"),
          1 : MODULE.localize("option.default.enabled"),
          2 : MODULE.localize("option.enabled.displaySuppressed"),
        },
        onChange : async (v) =>{
          /**
           * @todo deal with updates based on rapid changes.
           */
        },
      }
    };

    MODULE.applySettings(settingData);

    /*
      additional settings
    */
  }

  static hooks(){
    //Hooks.on(`updateCombat`, ActionManagement._updateCombat);
    Hooks.on(`controlToken`, ActionManagement._controlToken);
    Hooks.on(`updateToken`, ActionManagement._updateToken);
  }

  static patch(){
    this._patchToken();
  }

  static globals(){

  }

  /**
   * Hook Functions
   */
  static _updateCombat(combat, changed, /*options, userid*/){
    if(MODULE.setting('cbtReactionEnable') == 0) return;

    if(MODULE.isFirstTurn(combat, changed) || MODULE.isTurnChange(combat, changed))
      ActionManagement._resetActionMarker(combat?.combatant?.token);
  }

  static _controlToken(token, state){
    const mode = MODULE.setting('cbtReactionEnable');
    if(mode == 0) return;

    if(token.inCombat){
      if(token.hasActionContainer()) token.toggleActionContainer(mode === 2 || !state ? false : true);
      else ActionManagement._renderActionContainer(token, mode === 2 || !state ? false : true);
    }
  }

  static _updateToken(tokenDocument, update, /* options, id */){
    const mode = MODULE.setting('cbtReactionEnable');
    if(mode == 0 || !tokenDocument.inCombat) return;

    if("width" in update || "height" in update || "scale" in update){
      //tokenDocument.object.removeActionContainer();
      //tokenDocument.object.renderActionContainer(mode == 2 || tokenDocument.object._controlled ? false : true); 
    }

    if("tint" in update || "img" in update || "flags" in update){
      //ActionManagement._renderActionMarkers([tokenDocument.object]);
    }
  }

  /**
   * Patching Functions
   */
  static _patchToken(){
    Token.prototype.hasActionContainer = function(){
      return !!this.children?.find(i => i[NAME]);
    }

    Token.prototype.toggleActionContainer = function(state){
      let container = this.getActionContainer();
      if(container) container.visible = state === undefined ? !container.visible : state;
    }

    Token.prototype.getActionContainer = function(){
      return this.children?.find(i => i[NAME]);
    }

    Token.prototype.toggleActionMarker = function(type){
      const container = this.getActionContainer();
      if(container){
        const element = container.children.find(e => e.actionType == type);
        element.alpha = element.alpha == 1 ? 0.2 : 1; 
      }
    }

    Token.prototype.getActionFlag = function(){
      return this.document.getFlag(MODULE.data.name, MODULE[NAME].flagKey);
    }

    Token.prototype.iterateActionFlag = async function(type){
      let flag = this.getActionFlag() ?? MODULE[NAME].default;
      flag[type] += 1;
      return await this.document.setFlag(MODULE.data.name, MODULE[NAME].flagKey, flag);
    }

    Token.prototype.resetActionFlag = async function(){
      return await this.document.setFlag(MODULE.data.name, MODULE[NAME].flagKey, MODULE[NAME].default);
    }
  }

  /**
   * Global Accessor Functions
   */

  /**
   * Module Specific Functions
   */
  static async _loadTextures(orig, obj = {}){
    const textures = {};
    for(let [k,v] of Object.entries(obj)){
      let t = await loadTexture(v);
      if(k !== "background") t.orig = orig;
      textures[k] = t;
    }
    return textures;
  }

  static async _renderActionContainer(token, state){
    /* Define Constants */
    const actions = token.getActionFlag() ?? MODULE[NAME].default;
    const container = new PIXI.Container();
    const size = token.h, hAlign = token.w / 10, vAlign = token.h / 5, scale = 1/ (600/size);

    /* Build Textures, Sprites, Icons, and Container */
    container.setParent(token);
    container.sortableChildren = true;
    container[NAME] = true;
    container.visible = state;

    const textures = await ActionManagement._loadTextures(MODULE[NAME].orig, MODULE[NAME].img)

    for(let [k, v] of Object.entries(textures)){
      let s = new PIXI.Sprite(v);
      s.anchor.set(0.5);
      s.scale.set(scale);
      
      let i = await container.addChild(s);
      i.position.set(hAlign * MODULE[NAME].offset[k].h, vAlign * MODULE[NAME].offset[k].v);
      if(k !== "background"){
        i.actionType = k;
        i.tint = 13421772;
        i.alpha = actions[k] === 0 ? 1 : 0.2;
      }else
        i.zIndex = -1000;
    }

    /* return Container*/
    return container;
  }

  static _removeActionContainer(token){
    if(token.hasActionContainer()) return token.removeChild(token.getActionContainer());
  }
}