import { MODULE } from '../module.js';
import { logger } from '../logger.js';
import { queueUpdate } from './update-queue.js'

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
      actionMgmtEnable : {
        scope : "world", type : Number, group : "combat", default : 0, config,
        choices : {
          0 : MODULE.localize("option.default.disabled"),
          1 : MODULE.localize("option.default.enabled"),
          2 : MODULE.localize("option.default.enabledHover"),
          3 : MODULE.localize("option.default.displaySuppressed"),
        },
        onChange : async (v) =>{
          /**
           * @todo deal with updates based on rapid changes.
           */
        },
      },
      actionsAsStatus : {
        scope : "world", type : Number, group : "combat", default : 2, config,
        choices : {
          0 : MODULE.localize("option.default.disabled"),
          1 : MODULE.localize("option.default.enabled"),
          2 : MODULE.localize("option.actionsAsStatus.onlyReaction"),
        }
      },
      /** @todo localize */
      effectIconScale : {
        scope : "client", type : Number, group : "system", default : 1, config,
        onChange : () => {
          canvas?.tokens.placeables.forEach( token => token.drawEffects() );
        }
      }
      /**
       * @todo add new setting to handle container location
       * @todo add new setting for click handler (and dialog availability)
       */

    };

    MODULE.applySettings(settingData);

    /*
      additional settings
    */
  }

  static hooks(){
    Hooks.on(`updateCombat`, ActionManagement._updateCombat);
    Hooks.on(`controlToken`, ActionManagement._controlToken);
    Hooks.on(`updateToken`, ActionManagement._updateToken);
    Hooks.on(`preCreateChatMessage`, ActionManagement._preCreateChatMessage);
    Hooks.on(`deleteCombat`, ActionManagement._deleteCombat);
    Hooks.on(`deleteCombatant`, ActionManagement._deleteCombatant);
    Hooks.on('hoverToken', ActionManagement._hoverToken);
  }

  static patch(){
    this._patchToken();
  }

  static globals(){

  }

  /**
   * Hook Functions
   */
  static async _updateCombat(combat, changed, /*options, userid*/){
    if(MODULE.setting('actionMgmtEnable') == 0) return;

    logger.debug("_updateCombat | DATA | ", { 
      isFirstTurn : MODULE.isFirstTurn(combat,changed),
      isTurnChange : MODULE.isTurnChange(combat, changed),
      isFirstGM : MODULE.isFirstGM(),
      isFirstOwner : MODULE.isFirstOwner(combat.combatant?.token?.actor),
      combat,
      changed,
    });

    if(MODULE.isFirstTurn(combat, changed) && MODULE.isFirstGM())
      for(let combatant of combat.combatants){
        const token = combatant.token.object;
        await token.resetActionFlag();
        await token.renderActionContainer(combatant.token.object._controlled);
      }
    
    if(MODULE.isTurnChange(combat, changed) && MODULE.isFirstOwner(combat.combatant.token.actor)){
      await combat.combatant.token.object.resetActionFlag();
    }
  }

  static async _deleteCombat(combat, /* options, userId */){
    const mode = MODULE.setting('actionMgmtEnable');
    if(mode == 0) return;

    for(const combatant of combat.combatants){
      ActionManagement._deleteCombatant(combatant);
    }
  }

  static _deleteCombatant(combatant/*, options, userId */){

    /* need to grab a fresh copy in case this
     * was triggered from a delete token operation,
     * which means this token is already deleted
     * and we need to do nothing
     */
    const tokenId = combatant.token?.id;
    const sceneId = combatant.parent.data.scene

    /* this retrieves a token DOCUMENT */
    const tokenDoc = game.scenes.get(sceneId).tokens.get(tokenId);
    const token = tokenDoc?.object;

    if(token?.hasActionContainer()) {
      queueUpdate( async () => {
        await token.removeActionContainer();
      });
    }
    if(token?.hasActionFlag()) {
      /* reset its flags to 0 to update status effect icons */
      queueUpdate( async () => {
        await token.resetActionFlag();
        await token.updateActionMarkers();
        await token.removeActionFlag();
      });
    }
  }

  static _controlToken(token, state){
    const mode = MODULE.setting('actionMgmtEnable');
    if(mode == 0) return;

    if(token.inCombat){

      queueUpdate( async () => {
        if(token.hasActionContainer()) token.toggleActionContainer(mode === 3 || !state ? false : true);
        else await ActionManagement._renderActionContainer(token, mode === 3 || !state ? false : true);
        return token.drawEffects();
      });

    }
  }

  static _updateToken(tokenDocument, update, /* options, id */){
    const mode = MODULE.setting('actionMgmtEnable');
    if(mode == 0 || !tokenDocument.inCombat) return;

    if("width" in update || "height" in update || "scale" in update){
      ActionManagement._renderActionContainer(tokenDocument.object, mode === 3 || !tokenDocument.object._controlled ? false : true );
    }

    if("tint" in update || "img" in update || "flags" in update)
      tokenDocument.object.updateActionMarkers();
      
    logger.debug("_updateToken | Data | ", {
      tokenDocument, mode, update, container : tokenDocument.object.getActionContainer(),
    });
  }

  static async _preCreateChatMessage(messageDocument, messageData, /*options, userId*/){
    const types = Object.keys(MODULE[NAME].default);
    const speaker = messageData.speaker;

    logger.debug("_preCreateChatMessage | DATA | ", {
      types, speaker, messageData,
    });

    /* check validity of message */
    if(!speaker || !speaker.scene || !speaker.token)  return;
    const token = await fromUuid(`Scene.${speaker.scene}.Token.${speaker.token}`);

    /* check that the token is in combat */
    if ( (token.combatant?.combat?.started ?? false) == false) return;

    const item_id = $(messageData.content).attr("data-item-id");

    logger.debug("_preCreateChatMessage | DATA | ", {
      item_id, token,
    });

    if(!item_id || !token || !MODULE.isFirstOwner(token.actor)) return;

    const item = token.actor.items.get(item_id);

    logger.debug("_preCreateChatMessage | DATA | ", {
      item,
    });

    if(!item || !types.includes(item.data.data.activation.type)) return;
    let type = item.data.data.activation.type;
    
    logger.debug("_preCreateChatMessage | DATA | ", {
      type,
    });

    type = ActionManagement._checkForReaction(type, token.combatant);
    token.object.iterateActionFlag(type);
  }

  static _checkForReaction(actionType, combatant){

    if (!combatant) return actionType;

    /* if this is an action not on your turn, interpret as a reaction */
    if(actionType === 'action' && combatant.id !== combatant.combat.current.combatantId) {
      return 'reaction';
    }

    return actionType;
  }

  static async _hoverToken(token, state){
    /* users can hover anything, but only 
     * should display on owned tokens 
     */
    if(!token.isOwner) return;
    const mode = MODULE.setting('actionMgmtEnable');

    /* main hover option must be enabled, and we must be in combat
     */
    if(mode == 2 && token.inCombat){
      if(!state) {
        setTimeout(function() {
          token.renderActionContainer(state);
          token.drawEffects();
        }, 100)}
      setTimeout(function() {
        if(!token._hover && state) return;
        token.renderActionContainer(state);
        token.drawEffects();
      }, 500)
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

    Token.prototype.updateActionMarkers = function(){
      const flag = this.getActionFlag();
      const container = this.getActionContainer();

      if(!container || !flag) return;

      for(const type of Object.keys(MODULE[NAME].default)){
        const element = container.children.find(e => e.actionType == type);
        if(flag[type] > 0) {
          /* has been used */
          element.alpha = 0.2;
        } else {
          /* has been restored */
          element.alpha = 1;
        }

        /* update any needed status icons for this change */
        if (ActionManagement._shouldAddEffect(type)) {
          queueUpdate( async () => {
            await this.toggleEffect( MODULE[NAME].img[type] , {active: flag[type] > 0 ? true : false} );
          });
        }
      }
    }

    Token.prototype.getActionFlag = function(){
      return this.document.getFlag(MODULE.data.name, MODULE[NAME].flagKey);
    }

    Token.prototype.hasActionFlag = function(){
      return !!this.getActionFlag();
    }

    /** @return {Promise<TokenDocument>} */
    Token.prototype.iterateActionFlag = function(type, value){

      /* dont mess with flags if I am not in combat */
      if (!this.combatant) return false;

      let flag = this.getActionFlag() ?? duplicate(MODULE[NAME].default);
      if(value === undefined) flag[type] += 1;
      else flag[type] = value;

      logger.debug("iterateActionFlag | DATA | ", {
        type, flag, token : this, scope : MODULE.data.name, key : MODULE[NAME].flagKey,
      });

      return this.document.setFlag(MODULE.data.name, MODULE[NAME].flagKey, flag);
      
    }

    Token.prototype.resetActionFlag = async function(){
      logger.debug("resetActionFlag | DATA | ", {
        token : this, default : MODULE[NAME].default,
      });

      return await this.document.setFlag(MODULE.data.name, MODULE[NAME].flagKey, duplicate(MODULE[NAME].default));
    }

    Token.prototype.removeActionContainer = function(){
      if(this.hasActionContainer()) return this.removeChild(this.getActionContainer());
    }

    Token.prototype.removeActionFlag = async function(){
      if(!!this.getActionFlag()) return this.document.update({[`flags.${MODULE.data.name}.-=${MODULE[NAME].flagKey}`] : null });
    }

    Token.prototype.renderActionContainer = function(state){
      if(this.hasActionContainer())
        return this.toggleActionContainer(state);
      else
        return ActionManagement._renderActionContainer(this, state);
    }

    /* return: Promise<setFlag> */
    Token.prototype.setActionUsed = async function(actionType, overrideCount = undefined) {
      const validActions = ['action', 'bonus', 'reaction'];
      if (validActions.includes(actionType)){

        /* if setting the action went well, return the resulting action usage object */
        const success = await this.iterateActionFlag(actionType, overrideCount); 
        if(success){
          return this.getActionFlag();
        }
      } 

      return false;
    }

    //from foundry.js:44998 as of v0.8.8.
    Token.prototype._drawEffect = async function (src, index, bg, w, tint) {
      let tex = await loadTexture(src);
      let icon = this.effects.addChild(new PIXI.Sprite(tex));
      
      //BEGIN D5H
      const scale = MODULE.setting('effectIconScale');
      icon.width = icon.height = w * scale;
      /* if the action hud is visible, offset the start offset
       * of the icons */
      const actionHeight = this.getActionContainer()?.visible ? this.getActionContainer().getLocalBounds().bottom : 0;

      const numColumns = Math.floor(this.data.width/scale * 5);
      icon.x = (index % numColumns) * icon.width;
      
      icon.y = actionHeight + Math.floor(index/numColumns) * icon.height;
      //END D5H

      if ( tint ) icon.tint = tint;
      bg.drawRoundedRect(icon.x + 1, icon.y + 1, icon.width - 2, icon.height - 2, 2);
      this.effects.addChild(icon);
    }
  }

  /**
   * Global Accessor Functions
   */

  /**
   * Module Specific Functions
   */
  static _shouldAddEffect(type) {
    const preDefAnswers = [false, true, type == 'reaction' ? true : false];
    const mode = MODULE.setting('actionsAsStatus');
    return preDefAnswers[mode];
  }

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
    const actions = token.getActionFlag() ?? duplicate(MODULE[NAME].default);
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
      s.position.set(hAlign * MODULE[NAME].offset[k].h, vAlign /* MODULE[NAME].offset[k].v*/);
    
      if(k !== "background"){
        s.interactive = true;
        s.buttonMode = true;
        s.actionType = k;
        s.tint = 13421772;
        s.alpha = actions[k] === 0 ? 1 : 0.2;
        s.on("mousedown", async (event) => {
          const actions = token.getActionFlag() ?? (duplicate(MODULE[NAME].default));
          const container = token.getActionContainer();
          if(container.visible) {
            await token.iterateActionFlag(k, actions[k] > 0 ? 0 : 1);
          }
          logger.debug("_MouseDown | DATA |", { 
            event, token, container, actions
          });
        });
      }else{
        s.zIndex = -1000;
      }
      
      let i = container.addChild(s);

      logger.debug("_renderAction Container", {
        s, i, k, v
      });
    }

    logger.debug("_renderActionContainer | DATA | ", {
      actions, container, textures, token, state, size, hAlign, vAlign, scale
    });

    /* return Container*/
    return container;
  }
}
