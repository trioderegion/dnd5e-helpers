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

  static defaults(){
    MODULE[NAME] = {
      /* Sub Module Constant Values */
      flagKey : "ActionManagement",
      default : {
        action : 0, reaction : 0, bonus : 0
      },
      textures : {
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
    Hooks.on(`updateCombat`, ActionManagement._updateCombat);
    Hooks.on(`controlToken`, ActionManagement._controlToken);
  }

  static patch(){

  }

  static globals(){

  }

  /**
   * Hook Functions
   */
  static _updateCombat(combat, changed, /** options, userid */){
    if(MODULE.setting('cbtReactionEnable') == 0) return;

    if(MODULE.isFirstTurn(combat, changed) || MODULE.isTurnChange(combat, changed))
      ActionManagement._resetActionMarker(combat?.combatant?.token);
  }

  static _controlToken(token, state){
    if(MODULE.setting('cbtReactionEnable') == 0) return;

    if(token.inCombat && state == true)
      ActionManagement._renderActionMarkers([token]);
  }

  static _updateToken(tokenDocument, update, options, id){
    if(MODULE.setting('cbtReactionEnable') == 0 || !tokenDocument.inCombat) return;
    if("tint" in update || "width" in update || "height" in update || "img" in update || "flags" in update)
      ActionManagement._renderActionMarkers([tokenDocument.object]);
  }
  /**
   * Patching Functions
   */

  /**
   * Global Accessor Functions
   */

  /**
   * Module Specific Functions
   */
  static async _addActionMarker(tokenDocument){
    if(!tokenDocument || !(tokenDocument instanceof TokenDocument5e)) return new Error("Token Error");
    return await tokenDocument.setFlag(MODULE.data.name, MODULE[NAME].flagKey, MODULE[NAME].default);
  }

  static async _removeActionMarker(tokenDocument){
    if(!tokenDocument || !(tokenDocument instanceof TokenDocument5e)) return new Error("Token Error");
    return await tokenDocument.unsetFlag(MODULE.data.name, MODULE[NAME].flagKey);
  }
  
  static async _resetActionMarker(tokenDocument){
    await ActionManagement._removeActionMarker(tokenDocument);
    return await ActionManagement._addActionMarker(tokenDocument);
  }

  static _getActionMarker(tokenDocument){
    return tokenDocument.getFlag(MODULE.data.name, MODULE[NAME].flagKey) ?? MODULE[NAME].default;
  }

  static async _removeAllActionMarkers(tokenIds = []){
    let updates = tokenIds.map(id => ({ _id : id, [`flags.${MODULE.data.name}`] : `-=${MODULE[NAME].flagKey}`}));
    return await canvas.updateEmbeddedDocuments("Token", updates);
  }

  static async _addAllActionMarkers(tokenIds = []){
    let updates = tokenIds.map(id =>({ _id : id, [`flags.${MODULE.data.name}.${MODULE[NAME].flagKey}`] : MODULE[NAME].default }));
    return await canvas.updateEmbeddedDocuments("Token", updates);
  }

  static async _renderActionMarkers(tokens = []){
    const mode = MODULE.setting("cbtReactionEnable");
    if(tokens.every(ActionManagement.hasActionMarker) || mode == 0) return;
    const textures = await ActionManagement._loadTextures();

    for(let token of tokens){
      if(!token.isOwner || ActionManagement.hasActionMarker(token) || !token.document) continue;
      await ActionManagement._renderSprites(textures, token);
    }
  }

  static async _loadTextures(obj = {}){
    for(let [k,v] of Object.entries(MODULE[NAME].textures)){
      let t = await loadTexture(v);
      t.orig = MODULE[NAME].orig;
      obj[k] = t;
    }
    return obj;
  }

  static async _renderSprites(textures, token){
    const mode = MODULE.setting("cbtReactionEnable")
    const actions = ActionManagement._getActionMarker(token.document);
    const actionContainer = new PIXI.Container();
    const size = token.data.height * canvas.grid.size
    const hAlign = token.w / 10;
    const vAlign = token.h / 5
    const scale = 1/ (600/size);
    
    actionContainer.setParent(token);
    actionContainer.sortableChildren = true;
    actionContainer[NAME] = true;
    actionContainer.visible = mode == 2 ? true : token._controlled;

    const sprites = {}, icons = {};
    for(let [k, v] of Object.entries(textures)){
      let s = new PIXI.Sprite(v);
      s.anchor.set(0.5);
      s.scale.set(scale);
      
      let i = await actionContainer.addChild(s);
      i.position.set(hAlign * MODULE[NAME].offset[k].h, vAlign * MODULE[NAME].offset[k].v);
      if(k !== "background"){
        i.actionType = k;
        i.tint = 13421772;
        i.alpha = actions[k] ? 0.2 : 1;
      }else
        i.zIndex = -1000;

      sprites[k] = s;
      icons[k] = i;
    }
    
    return { textures, sprites, icons };
  }

  static hasActionMarker(tokenPlaceable){
    return !!tokenPlaceable.children?.find(i => i[NAME]);
  }
}