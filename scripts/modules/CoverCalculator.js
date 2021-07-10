import { MODULE } from "../module.js";
import { logger } from "../logger.js";

const NAME = "CoverCalculator";

export class CoverCalculator{
  static register(){
    CoverCalculator.defaults();
    CoverCalculator.settings();
    CoverCalculator.hooks();
    CoverCalculator.patch();
  }

  static defaults(){
    MODULE[NAME] = {
      coverData : {
        0 : { label : MODULE.localize("DND5EH.LoS_nocover"), value : 0, color : "0xff0000"},
        1 : { label : MODULE.localize("DND5EH.LoS_halfcover"), value : -2, color : "0xffa500" },
        2 : { label : MODULE.localize("DND5EH.LoS_34cover"), value : -5, color : "0xffff00" },
        3 : { label : MODULE.localize("DND5EH.LoS_fullcover"), value : -1000, color : "0x008000"},
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
    }
  }

  static settings(){
    const config = false;
    const settingsData = {
      debugDrawing : {
        scope : "client", config, default : true, type : Boolean,
      },
      losOnTarget : {
        scope : "world", config, group : "system", default : 0, type : Number,
        choices : {
          0 : MODULE.localize("option.default.disabled"),
          1 : MODULE.localize("option.losOnTarget.center"),
          2 : MODULE.localize("option.losOnTarget.corner"),
        }
      },
      losWithTiles : {
        scope : "world", config, group : "system", default : false, type : Boolean,
      },
      losWithTokens : {
        scope : "world", config, group : "system", default : false, type : Boolean,
      },
      coverTint : {
        scope : "world", config, group : "system", default : 0, type : Number, 
        choices : {
          "DarkRed" : MODULE.localize("option.coverTint.red"),
          "CadetBlue" : MODULE.localize("option.coverTint.blue"),
          "DimGrey" : MODULE.localize("option.coverTint.grey"),
          "linear-gradient(to right, orange , yellow, green, cyan, blue, violet)" : MODULE.localize("option.coverTint.rainbow"),
        },
      },
      losKeyBind : {
        scope : "world", config, group : "system", default : "", type : String,
      },
      coverApplication : {
        scope : "world", config, group : "system", default : 0, type : Number, 
        choices : {
          0 : MODULE.format("option.default.disabled"),
          1 : MODULE.format("option.coverApplication.manual"),
          2 : MODULE.format("option.coverApplication.auto"),
        }
      },
      losMaskNPCs : {
        scope : "world", config, group : "system", default : false, type : Boolean,
      }
    };

    MODULE.applySettings(settingsData);

    CONFIG.DND5E.characterFlags.helpersIgnoreCover = {
      hint: "DND5EH.flagsNoCoverHint",
      name: "DND5EH.flagsNoCover",
      section: "Feats",
      type: Boolean
    };
  }

  static hooks(){
    Hooks.on(`renderTileConfig`, CoverCalculator._renderTileConfig);
    Hooks.on(`renderTokenConfig`, CoverCalculator._renderTokenConfig);
    Hooks.on(`renderWallConfig`, CoverCalculator._renderWallConfig);
    Hooks.on(`targetToken`, CoverCalculator._targetToken);
  }

  static patch(){
    CoverCalculator._patchToken();
    CoverCalculator._patchArray();
    CoverCalculator._patchTile();
    CoverCalculator._patchWall();
  }

  /**
   * Hook Functions
   */
  static _deleteCombat(combat, settings, id){

  }

  static _deleteCombatant(combatant, render){

  }
  
  static _renderChatMessage(app, html, data){
    //add buttons?

    //firstGM stuff?
  }

  static _renderTileConfig(app, html){
    if(MODULE.setting("losOnTarget") === 0 || !MODULE.setting("losWithTiles") || app.object.data.overhead ) return;
    const tab = html.find('[data-tab="basic"]')[1];
    CoverCalculator._addToConfig(app, html, tab);
  }

  static _renderTokenConfig(app, html){

    if(MODULE.setting("losOnTarget") === 0 || !MODULE.setting("losWithTokens")) return;
    const tab = html.find('[data-tab="vision"]')[1];
    CoverCalculator._addToConfig(app, html, tab);
  }

  static _renderWallConfig(app, html){
    if(MODULE.setting("losOnTarget") === 0) return;
    const ele = html.find('[name="ds"]')[0].parentElement;
    CoverCalculator._addToConfig(app, html, ele);
  }

  static _addToConfig(app, html, ele){
    const status = app.object._object.coverValue() ?? 0;
    const selectHTML = `<label>${MODULE.localize("DND5EH.LoS_providescover")}</label>
                          <select name="flags.dnd5e-helpers.coverLevel" data-dtype="Number">
                            ${
                              Object.entries(MODULE[NAME].coverData).reduce((acc, [key,{label}]) => acc+=`<option value="${key}" ${key == status ? 'selected' : ''}>${label}</option>`, ``)
                            }
                          </select>`;

    html.css("height", "auto");
    ele.insertAdjacentElement('afterend',MODULE.stringToDom(selectHTML, "form-group"));
  }

  static _targetToken(user, target, onOff){
    if(game.user !== user) return;

    const keyBind = MODULE.setting("losKeyBind");
    const confirmCover = game.keyboard._downKeys.has(keyBind) || keyBind == "";

    if(user.targets.size == 1 && confirmCover && onOff && MODULE.setting("losOnTarget")){
      for(const selected of canvas.tokens.controlled){
        let cover = new Cover(selected, target);
        cover.toMessage();
      }         
    }

    if(user.targets.size != 1)
      //remove cover
      return;
  }

  static async _updateCombat(combat, change /*, options, userId */){
    if(MODULE.setting("removeCover"))
      //remove cover
      return;
  } 

  /*
    Prototype patch functions
  */
  static _patchToken(){
    Token.prototype.ignoresCover = function(){
      return !!this.actor.getFlag("dnd5e", "helpersIgnoreCover");
    }

    Token.prototype.coverValue = function(){
      const data = MODULE[NAME].token;
      return this.document.getFlag(MODULE.data.name, data.flag) ?? data.default;
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
      const sense = this.data.sense;
      return this.document.getFlag(MODULE.data.name, data.flag) ?? (sense >= CONST.WALL_SENSE_TYPES.NORMAL ? data.default : 0);
    }
  }

  /*
    Accessors
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
    this.data.walls.objects = canvas.walls.placeables.filter(wall => wall.coverValue() !== 0 );
    this.data.walls.shapes = this.data.walls.objects.map(wall => Shape.buildWall(wall, { cover : wall.coverValue() }));

    if(MODULE.setting("debugDrawing"))
      this.data.walls.shapes.forEach(shape => shape.draw());
  }

  buildPoints(){
    this.data.origin.shapes = [];
    this.data.origin.points = [];

    if(MODULE.setting('losOnTarget') === 1)
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

  pointSquareCoverCalculator(){
    const results = this.data.origin.points.map(point =>{
      return this.data.target.shapes.map(square => {
        let collisions = square.points
          .map(p => {
            let s = new Segment({ points : [point, p]});

            let r = {
              tiles : Math.max(...this.data.tiles.shapes.map(shape => { this.data.calculations++; return shape.checkIntersection(s) })),
              tokens : Math.max(...this.data.tokens.shapes.map(shape => { this.data.calculations++; return shape.checkIntersection(s) })),
              walls : Math.max(...this.data.walls.shapes.map(shape => { this.data.calculations++; return shape.checkIntersection(s) })),
            };

            r.total = Math.max(r.tiles, r.tokens, r.walls);

            if(MODULE.setting("debugDrawing"))
              s.draw({ color : MODULE[NAME].coverData[r.total].color });

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
    this.data.results.cover = this.data.results.cover < 3 && this.data.results.ignore ? 0 : this.data.results.cover;
    this.data.results.label = MODULE[NAME].coverData[this.data.results.cover ?? 0].label;
    this.data.results.value = MODULE[NAME].coverData[this.data.results.cover ?? 0].value;

    function getResult(data, arr){
      return Math.max(...Object.entries(data).map(([key, coverArr]) => coverArr[arr.count(key)]));
    }
  }

  async toMessage({ speaker = {}, whisper = []} = {}){
    this.data.origin.name = MODULE.sanitizeTokenName(this.data.origin.object, "losMaskNPCs", "DND5EH.LoSMaskNPCs_sourceMask");
    this.data.target.name = MODULE.sanitizeTokenName(this.data.origin.object, "losMaskNPCs", "DND5EH.LoSMaskNPCs_targetMask");

    const content = `
    <div class="dnd5ehelpers">
      <div class="dice-roll">
        <i>${this.data.origin.name} ${MODULE.localize("DND5EH.LoS_outputmessage")} ${this.data.target.name}</i>
        <div class="dice-result">
          <div class="dice-formula">
            ${this.data.results.label}
            <div class="desc">
              ${this.data.results.corners} ${MODULE.localize("DND5EH.LoS_visiblecorners")}
            </div>
          </div>
        </div>
      </div>
    </div>
    `;

    ChatMessage.create({
      whisper, content ,speaker : speaker !== {} ? speaker : ChatMessage.getSpeaker(),
    });
  }

  static _removeRays(){
    for(let child of canvas.foreground.children.filter(c => c.constructor.name === "r"))
      canvas.foreground.removeChild(child);
  }
}

class Point {
  constructor(...args) {
    if (args[0] instanceof Array) this._buildFromArray(args[0]);
    else if (args[0] instanceof Object) this._buildFromObject(args[0]);
    else if (typeof args[0] == "number") this._buildFromArray(args);
    else throw new Error("Invalid Arguments");
  }

  _buildFromObject({ x, y }) {
    this.x = x;
    this.y = y;
  }

  _buildFromArray([x, y]) {
    this.x = x;
    this.y = y;
  }

  get Object() {
    return { x: this.x, y: this.y };
  }

  get Array() {
    return [this.x, this.y];
  }

  is(p){
    if(p instanceof Point)
      return this.x === p.x && this.y === p.y;
    throw new Error("Point is not an instance of Point");
  }

  draw({ thickness = 5, color = "0xffffff" } = {}){
    const graphics = new PIXI.Graphics();
    graphics.beginFill(color);
    graphics.drawCircle(this.x, this.y, thickness);
    graphics.endFill();
    canvas.foreground.addChild(graphics);
  }
}

class Segment {
  points = [];
  options = {};

  constructor({ points = [] , numbers = []} = {}, options = {}) {
    for(let point of points){
      if(point instanceof Point) this._buildFromPoint(point);
      else this._buildFromOther(point);
    }
    if(numbers.length === 4) this._buildFromNumber(numbers);
    if(this.points.length !== 2) throw new Error("Invalid Arguments");

    this.options = options;
  }

  _buildFromPoint(p) {
    if(!this.points.reduce((a,e) => a || e.is(p), false))
      return this.points.push(p);
    throw new Error("Invalid Arguments");
  }

  _buildFromOther(o) {
    this._buildFromPoint(new Point(o));
  }

  _buildFromNumber(args) {
    if (args.reduce((a,b) => a || typeof b !== "number", false)) throw new Error("Invalid Arguments");
    this._buildFromOther([args[0], args[1]]);
    this._buildFromOther([args[2], args[3]]);
  }

  get Length() {
    let [p1, p2] = this.points;
    return Math.sqrt((p2.x - p1.x) * (p2.x - p1.x) + (p2.y - p1.y) * (p2.y - p1.y));
  }

  get Ray() {
    return new Ray(...this.points.map(p => p.Object));
  }

  get options() {
    return this.options;
  }

  is(s){
    if(!(s instanceof Segment)) return;
    return s.points.reduce((a, s_point) => a && this.points.reduce((b, t_point) => b || s_point.is(t_point), false) , true);
  }

  draw({ thickness = 1, color = "0xfffffff" } = {}) {
    const [p1, p2] = this.points;
    const line = new PIXI.Graphics();

    line.position.set(p1.x, p1.y);
    line.lineStyle(thickness, color).moveTo(0, 0).lineTo(p2.x - p1.x, p2.y - p1.y);
    canvas.foreground.addChild(line);

    for(let p of this.points)
      p.draw({ thickness : thickness + 3, color });
  }

  checkIntersection(s, draw = false) {
    if(!(s instanceof Segment)) throw new Error("Invalid argument");
    const [p1, p2] = this.points, [p3, p4] = s.points;
    let det, gam, lam, result;
    det = (p2.x - p1.x) * (p4.y - p3.y) - (p4.x - p3.x) * (p2.y - p1.y);
    if (det !== 0) {
      lam = ((p4.y - p3.y) * (p4.x - p1.x) + (p3.x - p4.x) * (p4.y - p1.y)) / det;
      gam = ((p1.y - p2.y) * (p4.x - p1.x) + (p2.x - p1.x) * (p4.y - p1.y)) / det;
      result = (0 < lam && lam < 1) && (0 < gam && gam < 1);
    } else {
      result = false;
    }

    if (result && draw) { this.draw(); s.draw(); }

    return result ? this.options : result;
  }
}

class Shape {
  segments = [];
  options = {};
  points = [];

  constructor({ points = [], segments = []} = {}, options = {}) {
    this.options = options;

    for(let s of segments)
      this.addSegment(s);

    if(points instanceof Array){
      points.forEach((element, index, array) => {
        let p = index + 1 !== array.length ? [element, array[index + 1]] : [element, array[0]];
        this.addSegment(new Segment({ points : p}), options);
      });
    }   
  }

  addSegment(s){
    if(s instanceof Segment && !this.segments.reduce((a,b) => a || b.is(s), false)){
      this.segments.push(s);
      for(let p of s.points){
        if(p instanceof Point && !this.points.reduce((a,b) => a || b.is(p), false)){
          this.points.push(p);
        }
      }
    }   
  }

  removeSegment(s){
    let index = this.segments.reduce((a,b,i) =>{
      if(b.is(s))
        return i;
      return a;
    }, null);

    if(index) this.segments.splice(index, 1);
  }

  draw({ thickness = 1, color = "0xfffffff" } = {}){
    for(let s of this.segments)
      s.draw({ thickness, color });
  }

  checkIntersection(s){
    let r = this.options !== {} ? this.options.cover : 3;
    return this.segments.reduce((a,v) => a || s.checkIntersection(v), false) ? r : 0;
  } 

  static buildRectangle({x, y, w, h} = {}, p = 0, o){
    let points = [
      new Point(x + p, y + p),
      new Point(x + w - p, y + p),
      new Point(x + w - p, y + h - p),
      new Point(x + p, y + h - p)
    ];

    return new Shape({points}, o);
  }

  static buildX({x, y, w, h} = {}, p = 0, o){
    let segments = [
      new Segment({ numbers : [x + p , y + p, x + w - p, y + h - p]}),
      new Segment({ numbers : [x + w - p, y + p, x + p, y + h - p]}),
    ];
    return new Shape({segments}, o);
  }

  static buildWall(wall, o){
    return new Shape({ segments : [new Segment({ numbers : wall.data.c }, o)] }, o);
  }
}