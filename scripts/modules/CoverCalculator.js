import { MODULE } from "../module.js";
import { Shape } from "./Shape.js";
import { Segment } from "./Segment.js";
import { Point } from "./Point.js";
import { logger } from "../logger.js";
import { queueUpdate } from "./update-queue.js"

const NAME = "CoverCalculator";

export class CoverCalculator{
  static register(){
    CoverCalculator.defaults();
    CoverCalculator.settings();
    CoverCalculator.hooks();
    CoverCalculator.patch();
    CoverCalculator.globals();
  }

  static defaults(){
    MODULE[NAME] = {
      coverData : {
        0 : { 
          label : MODULE.localize("DND5EH.LoS_nocover"), 
          value : 0, 
          color : "0xff0000", 
          icon : "" 
        },
        1 : { 
          label : MODULE.localize("DND5EH.LoS_halfcover"), 
          value : -2, 
          color : "0xffa500", 
          icon : "modules/dnd5e-helpers/assets/cover-icons/Half_Cover.svg" 
        },
        2 : { 
          label : MODULE.localize("DND5EH.LoS_34cover"), 
          value : -5, 
          color : "0xffff00", 
          icon : "modules/dnd5e-helpers/assets/cover-icons/ThreeQ_Cover.svg" 
        },
        3 : { 
          label : MODULE.localize("DND5EH.LoS_fullcover"), 
          value : -40, 
          color : "0x008000", 
          icon : "modules/dnd5e-helpers/assets/cover-icons/Full_Cover.svg"
        },
      },
      wall : {
        default : 3, 
        flag : "coverLevel",
        cover : {
          3 : [0,1,1,2,3],
          2 : [0,1,1,2,2],
          1 : [0,0,0,1,1],
        },
      },
      tile : {
        default : 0,
        flag : "coverLevel",
        cover : {
          3 : [0,1,1,2,3],
          2 : [0,1,1,2,2],
          1 : [0,0,0,1,1],
        },
      },
      token : {
        default : 1,
        flag : "coverLevel",
        cover : {
          3 : [0,1,1,2,3],
          2 : [0,1,1,2,2],
          1 : [0,1,1,1,1],
        }
      },
      ignoreCover:{ // Defining what number relates to what cover ignore level
        "none":0,
        "half":1,
        "threeQuarter":2,
        "full":3
      },
    }
  }

  static settings(){
    const config = false;
    const menuData = {
      debugDrawing : {
        scope : "client", config, groupd: 'misc', default : false, type : Boolean,
      },
      losSystem : {
        scope : "world", config, group : "system", default : 0, type : Number,
        choices : {
          0 : MODULE.localize("option.default.disabled"),
          1 : MODULE.localize("option.losOnTarget.center"),
          2 : MODULE.localize("option.losOnTarget.corner"),
        }
      },
      losOnTarget : {
        scope : "client", config, group : "system", default : 0, type : Boolean,
      }, losWithTiles : {
        scope : "world", config, group : "system", default : false, type : Boolean,
      },
      losWithTokens : {
        scope : "world", config, group : "system", default : false, type : Boolean,
      },
      coverTint : {
        scope : "world", config, group : "system", default : 0, type : String, 
        choices : {
          "DarkRed" : MODULE.localize("option.coverTint.red"),
          "CadetBlue" : MODULE.localize("option.coverTint.blue"),
          "DimGrey" : MODULE.localize("option.coverTint.grey"),
          "linear-gradient(to right, orange , yellow, green, cyan, blue, violet)" : MODULE.localize("option.coverTint.rainbow"),
        },
      },
      //losKeyBind : {
      //  scope : "world", config, group : "system", default : "", type : String,
      //},
      coverApplication : {
        scope : "world", config, group : "system", default : 0, type : Number, 
        choices : {
          0 : MODULE.format("option.default.disabled"),
          1 : MODULE.format("option.coverApplication.manual"),
          2 : MODULE.format("option.coverApplication.auto"),
        }
      },
      whisperToSelf:{
        scope : "client", config, group : "system", default : false, type : Boolean,
      },
      losMaskNPC : {
        scope : "world", config, group : "system", default : false, type : Boolean,
      },
      removeCover : {
        scope : "world", config, group : "combat", default : false, type : Boolean,
      },
      
    };

    MODULE.registerSubMenu(NAME, menuData, {tab: 'system'});

    const settingsData = {
      clearTargets : {
        scope : "world", config, group : "combat", default : false, type : Boolean,
      },
    }

    MODULE.applySettings(settingsData);

    CONFIG.DND5E.characterFlags.helpersIgnoreCover = {
      hint: MODULE.localize("DND5EH.flagsNoCoverHint"),
      name: MODULE.localize("DND5EH.flagsNoCover"),
      section: "Feats",
      choices:{
        0:MODULE.localize("DND5EH.flagsNoCoverOptionNone"),
        1:MODULE.localize("DND5EH.flagsNoCoverOptionHalf"),
        2:MODULE.localize("DND5EH.flagsNoCoverOptionThreeQ"),
        3:MODULE.localize("DND5EH.flagsNoCoverOptionFull")
      },
      type: Number
    };

    /* insert keybindings */
    game.keybindings.register(MODULE.data.name, "coverReport", {
      name: "Check Cover",
      hint: "Check the cover between the selected and hovered token",
      editable: [
        {
          key: "KeyR"
        }
      ],
      onDown: () => CoverCalculator._handleCover()
    });
  }

  static hooks(){
    Hooks.on(`renderTileConfig`, CoverCalculator._renderTileConfig);
    Hooks.on(`renderTokenConfig`, CoverCalculator._renderTokenConfig);
    Hooks.on(`renderWallConfig`, CoverCalculator._renderWallConfig);
    Hooks.on(`targetToken`, CoverCalculator._targetToken);
    Hooks.on(`renderChatMessage`, CoverCalculator._renderChatMessage);
    Hooks.on(`updateCombat`, CoverCalculator._updateCombat);
    Hooks.on(`deleteCombat`, CoverCalculator._deleteCombat);
    Hooks.on(`deleteCombatant`, CoverCalculator._deleteCombatant);
  }

  static patch(){
    CoverCalculator._patchToken();
    CoverCalculator._patchArray();
    CoverCalculator._patchTile();
    CoverCalculator._patchWall();
  }

  static globals(){
    window[NAME] = {
      Cover : CoverCalculator._Cover,
      Shape : CoverCalculator._Shape,
      Segment : CoverCalculator._Segment,
      Point : CoverCalculator._Point,
    };
  }

  /**
   * Hook Functions
   */
  static async _deleteCombat(combat, /*settings, id*/){
    if(MODULE.setting("losSystem") > 0 && MODULE.isFirstGM()){
      for(let combatant of combat.combatants){
        const token = combatant?.token?.object;
        if(token)
          queueUpdate( () => {
            return Cover._removeEffect(token);
          });
      }
    }
  }

  static async _deleteCombatant(combatant, /*render*/){
    if(MODULE.setting("losSystem") > 0 && MODULE.isFirstGM()){

      /* need to grab a fresh copy in case this
       * was triggered from a delete token operation,
       * which means this token is already deleted
       * and we need to do nothing
       */
      const tokenId = combatant.token?.id;
      const sceneId = combatant.parent.data.scene

      const tokenDoc = game.scenes.get(sceneId).tokens.get(tokenId);
      const token = tokenDoc?.object;

      if(token)
        queueUpdate( () => {
          return Cover._removeEffect(token);
        });
    }
  }
  
  static async _renderChatMessage(app, html, data){
    if(app.getFlag(MODULE.data.name, 'coverMessage') && MODULE.setting("coverApplication") > 0 ){
      await MODULE.waitFor(() => !!canvas?.ready);

      const hasButtons = html.find('.cover-button').length > 0

      /* some messages may not have buttons to put listeners on */
      if(!hasButtons) return;

      const token = (await fromUuid(app.getFlag(MODULE.data.name, 'tokenUuid')))?.object;

      if(!token) return new Error(MODULE.localize("error.token.missing"));

      const a = html.find('#half')[0];
      const b = html.find('#34')[0];
      const c = html.find('#full')[0];
      const l = token.getCoverEffect()?.getFlag(MODULE.data.name, "level");

      if(l == 1) a.style.background = MODULE.setting("coverTint");
      else 
      if(l == 2) b.style.background = MODULE.setting("coverTint");
      else 
      if(l == 3) c.style.background = MODULE.setting("coverTint");

      //add listeners
      a.onclick =  () => Cover._toggleEffect(token, a, [b,c], 1);
      b.onclick = () => Cover._toggleEffect(token, b, [a,c], 2);
      c.onclick = () => Cover._toggleEffect(token, c, [a,b], 3);
    }
  }

  static _renderTileConfig(app, html){
    if(MODULE.setting("losSystem") === 0 || !MODULE.setting("losWithTiles") || app.object.data.overhead ) return;
    const adjacentElement = html.find('[data-tab="basic"] .form-group').last();
    CoverCalculator._injectCoverAdjacent(app, html, adjacentElement);
  }

  static _renderTokenConfig(app, html){
    if(MODULE.setting("losSystem") === 0 || !MODULE.setting("losWithTokens")) return;
    const adjacentElement = html.find('[data-tab="character"] .form-group').last();
    CoverCalculator._injectCoverAdjacent(app, html, adjacentElement);
  }

  static _renderWallConfig(app, html){
    if(MODULE.setting("losSystem") === 0) return;
    const ele = html.find('[name="ds"]')[0].parentElement;
    CoverCalculator._addToConfig(app, html, ele);
  }

  /* used for new style multi-tab config apps */
  // TODO functionalize HTML generation between these two functions
  static _injectCoverAdjacent(app, html, element) {
    /* if this app doesnt have the expected
     * data (ex. prototype token config),
     * bail out.
     */
    if (!app.object?.object) return;
    const status = app.object.object.coverValue() ?? 0;
    const selectHTML = `<div class="form-group">
                          <label>${MODULE.localize("DND5EH.LoS_providescover")}</label>
                          <select name="flags.dnd5e-helpers.coverLevel" data-dtype="Number">
                            ${
                              Object.entries(MODULE[NAME].coverData).reduce((acc, [key,{label}]) => acc+=`<option value="${key}" ${key == status ? 'selected' : ''}>${label}</option>`, ``)
                            }
                          </select>
                        </div>`;

    html.css("height", "auto");
    element.after(selectHTML);

  }

    /* used for "legacy" single page config apps */
    // TODO functionalize HTML generation between these two functions
    static _addToConfig(app, html, ele){

      /* if this app doesnt have the expected
       * data (ex. prototype token config),
       * bail out.
       */
      if (!app.object?.object) return;
      const status = app.object.object.coverValue() ?? 0;
      const selectHTML = `<label>${MODULE.localize("DND5EH.LoS_providescover")}</label>
                          <select name="flags.dnd5e-helpers.coverLevel" data-dtype="Number">
                            ${
                              Object.entries(MODULE[NAME].coverData).reduce((acc, [key,{label}]) => acc+=`<option value="${key}" ${key == status ? 'selected' : ''}>${label}</option>`, ``)
                            }
                          </select>`;

                                html.css("height", "auto");
                                ele.insertAdjacentElement('afterend',MODULE.stringToDom(selectHTML, "form-group"));
                              }

  static _handleCover() {
    if ( !canvas.ready ) return false;
    const layer = canvas.activeLayer;
    if ( !(layer instanceof TokenLayer) ) return false;
    const hovered = layer.placeables.find(t => t._hover);
    if ( !hovered ){

      /* remove cover bonuses for any selected */
      for(const selected of canvas.tokens.controlled)
        queueUpdate( async () => {
          await Cover._removeEffect(selected);
        });

      return;
    }

    return CoverCalculator._runCoverCheck(canvas.tokens.controlled, hovered);
  }

  static async _runCoverCheck(sources, target){
    for(const selected of sources){
      if(selected.id === target.id) continue;
      let cover = new Cover(selected, target);

      //apply cover bonus automatically if requested
      queueUpdate( async () => {
        if(MODULE.setting("coverApplication") == 2) await cover.addEffect();
        await cover.toMessage();
      });
    }         
  }

  static async _targetToken(user, target, onOff){
    if(game.user !== user || MODULE.setting('losOnTarget') == false) return;

    if(user.targets.size == 1 && onOff ){
      CoverCalculator._runCoverCheck(canvas.tokens.controlled, target)
    }

    if(user.targets.size != 1) {
      for(const selected of canvas.tokens.controlled)
        queueUpdate( async () => {
          await Cover._removeEffect(selected);
        });
    }
  }

  static async _updateCombat(combat, changed /*, options, userId */){
    /** only concerned with turn changes during active combat that is NOT turn 1 */  
    if(MODULE.setting("removeCover") && MODULE.isFirstGM() && MODULE.isTurnChange(combat, changed)){
      const token = combat.combatants.get(combat.previous.combatantId)?.token?.object;

      if(token)
        queueUpdate( async () => {
          await Cover._removeEffect(token);
        });
    }

    /* clear targets for all users on a turn change */
    if(MODULE.setting('clearTargets') && MODULE.isTurnChange(combat,changed)){
        game.user.updateTokenTargets();
    }
  } 

  /**
   * Prototype Patch Functions
   */
  static _patchToken(){
    Token.prototype.ignoresCover = function(){
      let flagValue=this.actor?.getFlag("dnd5e", "helpersIgnoreCover") ?? 0;
      if (flagValue===true||flagValue==="true"){
        // used to be a boolean flag, if the flag is true either 
        // ,the value or a string due to AE shenanigans, treat is as it would have been before
        flagValue=MODULE[NAME].ignoreCover.threeQuarter
      }
      return flagValue
    }

    Token.prototype.coverValue = function(){
      const data = MODULE[NAME].token;
      return this.document.getFlag(MODULE.data.name, data.flag) ?? data.default;
    }

    Token.prototype.getCoverEffect = function(){
      return this?.getCoverEffects()[0] ?? undefined;
    }

    Token.prototype.getCoverEffects = function(){
      return this.actor?.effects.filter(e => e.getFlag(MODULE.data.name, "cover")) ?? [];
    }

    Token.prototype.setCoverValue = function(value){
      const data = MODULE[NAME].token;
      return this.document.setFlag(MODULE.data.name, data.flag, value);
    }
  }

  static _patchArray(){
    Array.prototype.count = function(value){
      return this.filter(x => x == value).length;
    }
  }

  static _patchTile(){
    Tile.prototype.coverValue = function(){
      const data = MODULE[NAME].tile;
      return this.document.getFlag(MODULE.data.name, data.flag) ?? data.default;
    }
  }

  static _patchWall(){
    Wall.prototype.coverValue = function(){
      const data = MODULE[NAME].wall;
      /* sight vs sense is a 0.9 vs 0.8 issue -- prefer 0.9, but fall back to 0.8 */
      const definedCover = this.document.getFlag(MODULE.data.name, data.flag);

      if (definedCover != undefined) return definedCover;

      /* otherwise, make an intelligent guess as to the default state based on the wall itself */
      /* sight vs sense is a 0.9 vs 0.8 issue -- prefer 0.9, but fall back to 0.8 */
      const sense = this.document.data.door < CONST.WALL_DOOR_TYPES.DOOR ? this.document.data.sight
        : this.document.data.ds == CONST.WALL_DOOR_STATES.OPEN ? CONST.WALL_SENSE_TYPES.NONE 
        : this.document.data.sight;

      return sense >= CONST.WALL_SENSE_TYPES.LIMITED ? data.default : 0;
    }
  }

  /**
   * Global Accessors for Cover, Shape, Segment, and Point
   */
  static _Cover(...args){
    return new Cover(...args);
  }

  static _Shape(...args){
    return new Shape(...args);
  }

  static _Segment(...args){
    return new Segment(...args);
  }

  static _Point(...args){
    return new Point(...args);
  }
}

class Cover{
  data = {
    origin : {},
    target : {},
    tokens : {},
    tiles : {},
    walls : {},
    results : {},
    calculations : 0,
  };

  constructor(origin, target, padding = 5){
    if(origin.id === target.id) return new Error("Token Error");

    this.data.origin.object = origin;
    this.data.target.object = target;
    this.data.padding = canvas.grid.size * padding / 100;
    this.calculate();
  }

  calculate(){
    if(MODULE.setting("debugDrawing"))
      Cover._removeRays();

    this.buildTokenData();
    this.buildTileData();
    this.buildWallData();

    this.buildPoints();
    this.buildSquares();

    this.pointSquareCoverCalculator();
  }

  buildTokenData(){
    //create list of tokens to find collisions with
    this.data.tokens.objects = MODULE.setting("losWithTokens") ? canvas.tokens.placeables.filter(token => token.id !== this.data.origin.object.id && token.id !== this.data.target.object.id) : [];
    this.data.tokens.shapes =  this.data.tokens.objects.map(token => Shape.buildX(token, this.data.padding, { cover : token.coverValue() }));

    if(MODULE.setting("debugDrawing"))
      this.data.tokens.shapes.forEach(shape => shape.draw());
  }

  buildTileData(){
    //create list of tiles to find collisions with
    this.data.tiles.objects = MODULE.setting("losWithTiles") ? canvas.background.placeables.filter(tile => (tile.coverValue() ?? 0) !== 0) : [];
    this.data.tiles.shapes = this.data.tiles.objects.map(tile => Shape.buildX({ x : tile.x, y : tile.y, w : tile.data.width, h : tile.data.height}, this.data.padding, { cover : tile.coverValue() }));

    if(MODULE.setting("debugDrawing"))
      this.data.tiles.shapes.forEach(shape => shape.draw());
  }

  buildWallData(){
    //create list of walls to find collisions with
    this.data.walls.objects = canvas.walls.placeables.filter(wall => wall.coverValue() !== 0 && wall.document.data.ds !== CONST.WALL_DOOR_STATES.OPEN);
    this.data.walls.shapes = this.data.walls.objects.map(wall => Shape.buildWall(wall, { cover : wall.coverValue(), limited: wall.document.data.sight == CONST.WALL_SENSE_TYPES.LIMITED }));

    //filter out garbage walls (i.e. null)
    this.data.walls.shapes = this.data.walls.shapes.filter( shape => !!shape );

    if(MODULE.setting("debugDrawing"))
      this.data.walls.shapes.forEach(shape => shape.draw());
  }

  buildPoints(){
    this.data.origin.shapes = [];
    this.data.origin.points = [];

    if(MODULE.setting('losSystem') === 1)
      this.data.origin.points.push(new Point(this.data.origin.object.center));
    else{
      let c = Math.round(this.data.origin.object.w / canvas.grid.size), d = Math.round(this.data.origin.object.h / canvas.grid.size);
      for(let a = 0; a < c; a++){
        for(let b = 0; b < d; b++){
          let s = Shape.buildRectangle({
            x : this.data.origin.object.x + (a * canvas.grid.size),
            y : this.data.origin.object.y + (b * canvas.grid.size), 
            w : canvas.grid.size,
            h : canvas.grid.size,
          });
          this.data.origin.shapes.push(s);

          s.points.forEach(p =>{
            if(p instanceof Point && !this.data.origin.points.reduce((a,b,i,o) => o.length == 0 ? a : (a || b.is(p)), false))
              this.data.origin.points.push(p);
          });
        }
      }
    }

    if(MODULE.setting("debugDrawing"))
      this.data.origin.shapes.forEach(shape => shape.draw());
  }

  buildSquares(){
    this.data.target.shapes = [];
    this.data.target.points = [];

    let c = Math.round(this.data.target.object.w / canvas.grid.size), d = Math.round(this.data.target.object.h / canvas.grid.size);
    for(let a = 0; a < c; a++){
      for(let b = 0; b < d; b++){
        let s = Shape.buildRectangle({
          x : this.data.target.object.x + (a * canvas.grid.size),
          y : this.data.target.object.y + (b * canvas.grid.size), 
          w : canvas.grid.size,
          h : canvas.grid.size,
        }, this.data.padding);
        this.data.target.shapes.push(s);
        s.points.forEach(p =>{
            if(p instanceof Point && !this.data.target.points.reduce((a,b,i,o) => o.length == 0 ? a : (a || b.is(p)), false))
              this.data.target.points.push(p);
          });
      }
    }

    if(MODULE.setting("debugDrawing"))
      this.data.target.shapes.forEach(shape => shape.draw());
  }

  static _processLimitedSightCollisions(results = []){
    const numLimited = results.reduce( (acc, curr) => {
      if (curr.limited) acc++;
      return acc;
    }, 0)

    const toRemove = numLimited % 2;
    const processed = results.reduce( (acc, curr) => {

      if( acc.numSeen < toRemove) {
        acc.numSeen++; 
      } else {
        acc.results.push(curr.cover);
      }

      return acc;
      
    },{results: [], numSeen: 0});

    return processed.results;
  }

  pointSquareCoverCalculator(){
    const results = this.data.origin.points.map(point =>{
      return this.data.target.shapes.map(square => {
        let collisions = square.points
          .map(p => {
            let s = new Segment({ points : [point, p]});

            let r = {
              tiles : Math.max.apply(null, Cover._processLimitedSightCollisions(this.data.tiles.shapes.map(shape => { this.data.calculations++; return shape.checkIntersection(s) }))),
              tokens : Math.max.apply(null, Cover._processLimitedSightCollisions(this.data.tokens.shapes.map(shape => { this.data.calculations++; return shape.checkIntersection(s) }))),
              walls : Math.max.apply(null, Cover._processLimitedSightCollisions(this.data.walls.shapes.map(shape => { this.data.calculations++; return shape.checkIntersection(s) }))),
            };

            r.total = Math.max(r.tiles, r.tokens, r.walls);

            if(MODULE.setting("debugDrawing")) s.draw({ color : MODULE[NAME].coverData[r.total <= 0 ? 0 : r.total].color });

            return r;
        });

        let results = {
          tiles : getResult(
            MODULE[NAME].tile.cover,
            collisions.map(c => c.tiles),
          ),
          tokens : getResult(
            MODULE[NAME].token.cover,
            collisions.map(c => c.tokens),
          ),          
          walls : getResult(
            MODULE[NAME].wall.cover,
            collisions.map(c => c.walls),
          ),
        }

        results.total = Math.max(results.tiles, results.tokens, results.walls);

        logger.debug("Collisions | ", collisions);
        logger.debug("Results | ", results);

        return results;
      });
    });

    this.data.results.raw = results;
    this.data.results.ignore = this.data.origin.object.ignoresCover();
    this.data.results.corners = 0;
    this.data.results.cover = results.reduce((a,b) => Math.min(a, b.reduce((c,d) => Math.min(c, d.total), 3)),3);
    // If the current cover value is under the ignore threshold set cover to 0. ignore theshold goes from 1 to 3, cover from 0 to 3
    // none, half, threequarter, full
    this.data.results.cover = this.data.results.cover <= this.data.results.ignore ? 0 : this.data.results.cover;
    this.data.results.label = MODULE[NAME].coverData[this.data.results.cover ?? 0].label;
    this.data.results.value = MODULE[NAME].coverData[this.data.results.cover ?? 0].value;

    function getResult(data, arr){
      return Math.max(...Object.entries(data).map(([key, coverArr]) => coverArr[arr.count(key)]));
    }
  }

  async toMessage(){
    this.data.origin.name = MODULE.sanitizeTokenName(this.data.origin.object, "losMaskNPC", "DND5EH.LoSMaskNPCs_creatureMask");
    this.data.target.name = MODULE.sanitizeTokenName(this.data.target.object, "losMaskNPC", "DND5EH.LoSMaskNPCs_creatureMask", false);
    this.data.target.name += '.'; //punctuation

    const appliedCover = this.data.origin.object.getCoverEffect()?.getFlag(MODULE.data.name, "level") ?? 0;
    let content = `
    <div class="dnd5ehelpers">
      <div class="dice-roll">
        <i>${this.data.origin.name} ${MODULE.localize("DND5EH.LoS_outputmessage")} ${this.data.target.name}</i>
        <div class="dice-result">
          <div class="dice-formula">
            ${this.data.results.label}
          </div>
        </div>
      </div>
    </div>
    `;

    
    if(MODULE.setting("coverApplication") > 0){
      content += `
        <div class="dnd5ehelpers">
          <button class="cover-button half ${appliedCover == 1 ? "active" : ""} " id="half">
            <img src="${MODULE[NAME].coverData[1].icon}">${MODULE.localize("DND5EH.LoS_halfcover")}
          </button>
          <button class="cover-button quarters ${appliedCover == 2 ? "active" : ""} " id="34">
            <img src="${MODULE[NAME].coverData[2].icon}">${MODULE.localize("DND5EH.LoS_34cover")}
          </button>
          <button class="cover-button full ${appliedCover == 3 ? "active" : ""} " id="full">
            <img src="${MODULE[NAME].coverData[3].icon}">${MODULE.localize("DND5EH.LoS_fullcover")}
          </button>
        </div>
      `;
    }
    
    return await ChatMessage.create({
      whisper : MODULE.setting("whisperToSelf")?[game.user]:ChatMessage.getWhisperRecipients("GM"),
      speaker : { alias : MODULE.localize("setting.coverApplication.name") },
      flags : {[MODULE.data.name] : { 
        ["coverMessage"] : true,
        ["tokenUuid"] : this.data.origin.object.document.uuid,
      }},
      content,
    });
  }

  async addEffect(){
    await Cover._addEffect( this.data.origin.object, this.data.results.cover );
  }

  async removeEffect(){
    await Cover._removeEffect(this.data.origin.object,);
  }

  static _removeRays(){
    for(let child of canvas.foreground.children.filter(c => c.constructor.name === "r"))
      canvas.foreground.removeChild(child);
  }

  static async _addEffect(token, cover){
    const { label, value } = MODULE[NAME].coverData[cover];
    await Cover._removeEffect(token);    
    if(cover == 0) return;

    const effectData = {
      changes : ["rwak", "rsak", "mwak", "msak"].map(s => ({ key : `data.bonuses.${s}.attack`, mode : CONST.ACTIVE_EFFECT_MODES.ADD , value })),
      icon : MODULE[NAME].coverData[cover].icon,
      label : `DnD5e Helpers - ${label}`,
      flags : { [MODULE.data.name] : { 
        ["cover"] : true, 
        ["level"] : cover 
      }},
      disabled : false, duration : {rounds : 1}, tint : "#747272",
    };

    await token.actor.createEmbeddedDocuments("ActiveEffect", [effectData]);
  }

  static async _removeEffect(token){
    const effects = token.getCoverEffects();
    return effects.length === 0 ? false : await token.actor.deleteEmbeddedDocuments("ActiveEffect", effects.map(e => e.id));
  }

  static async _toggleEffect(token, button, otherButtons, cover){
    let removed = await Cover._removeEffect(token);
    if(!removed || removed.reduce((a,b) => a || b.getFlag(MODULE.data.name, 'level') !== cover, false)){
      Cover._addEffect(token, cover);
      button.style.background = MODULE.setting("coverTint");
      otherButtons.forEach(b => b.style.background = "");
    }else{
      button.style.background = "";
    }

  }
}

/*
  target switching 
*/
