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
      wallCoverValue : 3,
      wallCover : {
        3 : [0,1,1,2,3],
        2 : [0,1,1,2,2],
        1 : [0,0,0,1,1],
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
      tileFlag : "coverLevel",
      tileCover : {
        3 : [0,1,1,2,3],
        2 : [0,1,1,2,2],
        1 : [0,0,0,1,1],
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
      tokenCoverValue : 1,
      tokenCover : { 
        3 : [0,1,1,2,3],
        2 : [0,1,1,2,2],
        1 : [0,1,1,1,1],
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
    //renderTokenConfig
    //renderWallConfig
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
    const status = app.document.object.coverValue() ?? 0;
    const tab = html.find('[data-tab="basic"]')[1];
    const checkBoxHTML = `<label>${MODULE.localize("DND5EH.LoS_providescover")}</label>
                          <select name="flags.dnd5e-helpers.coverLevel" data-dtype="Number">
                            ${
                              Object.entries(MODULE[NAME].coverData).reduce((acc, [key,{label}]) => acc+=`<option value="${key}" ${key == status ? 'selected' : ''}>${label}</option>`, ``)
                            }
                          </select>`;

    html.css("height", "auto");
    tab.append(MODULE.stringToDom(checkBoxHTML, "form-group"));
  }

  static _targetToken(user, target, onOff){
    logger.debug("_targetToken | DATA | ", user, target, onOff);
    if(game.user !== user) return;

    const keyBind = MODULE.setting("losKeyBind");
    const confirmCover = game.keyboard._downKeys.has(keyBind) || keyBind == "";

    if(user.targets.size == 1 && confirmCover){
        if(confirmCover && onOff && MODULE.setting("losOnTarget")){
          for(const selected of canvas.tokens.controlled){
            let cover = new Cover(selected, target);

            cover.toMessage();
          }

          ///return CoverCalculator.onTargetToken(user, target, onOff);
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
    Token.prototype.computeTargetCover = function(target = null, visualize = false){
      target = target instanceof Token ? target : Array.from(game.user.targets)[0];
      if(!target) return logger.error(MODULE.localize("DND5EH.LoS_notargeterror"));
      if(target.id === this.id) return logger.error("Targeting Yourself.");

      const points = CoverCalculator._getPoints(this);
      const squares = CoverCalculator._getSquares(target);
      const ignore = [
        this.id, 
        target.id, 
        ...canvas.background.placeables
          .filter(tile => (tile.coverValue() ?? 0) == 0)
          .map(tile => tile.id),
      ];

      const results = points.map(point => squares.map(square => {
        return CoverCalculator._pointSquareCover(point, square, ignore, visualize);
      }));

      const result = Math.min(...results.map(arr => Math.min(...arr)));

      logger.debug(`Token Prototype | computeTargetCover | Results |  `, results);
      logger.debug(`Token Prototype | computeTargetCover | Result  |  `, result);

      return this.ignoresCover() && result < 3 ? 0 : result;
    }

    Token.prototype.ignoresCover = function(){
      return this.actor.getFlag("dnd5e", "helpersIgnoreCover");
    }

    Token.prototype.coverValue = function(){
      const d = MODULE[NAME].token;
      return this.document.getFlag(MODULE.data.name, d.flag) ?? d.default;
    }
  }

  static _patchArray(){
    Array.prototype.count = function(value){
      return this.filter(x => x == value).length;
    }
  }

  static _patchTile(){
    Tile.prototype.coverValue = function(){
      const d = MODULE[NAME].tile;
      return this.document.getFlag(MODULE.data.name, d.flag) ?? d.default;
    }
  }

  static _patchWall(){
    Wall.prototype.coverValue = function(){
      const d = MODULE[NAME].wall;
      const s = this.data.sense;
      return this.document.getFlag(MODULE.data.name, d.flag) ?? (s >= CONST.WALL_SENSE_TYPES.NORMAL ? d.default : 0);
    }
  }

  /*
    Class Specific Functions
  */

  /**
   * _getSquares accepts a token class document and returns an array of squares.
   * @param {Placeable} p
   * @returns [[{x: Number, y: Number},...],...]
   */
  static _getSquares(p){
    const grid=canvas.grid.size,
          padding=grid*0.05,
          width=Math.round(p.width/grid),
          height=Math.round(p.height/grid);

    return Array(Math.round(width)).fill(0).reduce((t,e,a) => {
      return t.concat(Array(Math.round(height)).fill(0).map((e,b) =>{
        return [
          [(a * grid ) + p.x + padding, (b * grid ) + p.y + padding,],
          [(a * grid ) + p.x + grid - padding, (b * grid ) + p.y + padding,],
          [(a * grid ) + p.x + grid - padding, (b * grid ) + p.y + grid - padding,],
          [(a * grid ) + p.x + padding, (b * grid ) + p.y + grid - padding,],
        ]
      }));
    }, []);
  }

  /**
   * _getPoints accepts a token class document and returns an array of points depending.
   * @param {Placeable} p 
   * @returns [[x : Number,y : Number], ...]
   */
  static _getPoints(p){
    if(MODULE.setting('losOnTarget') === 1) return [[p.center.x, p.center.y]];
    const grid=canvas.grid.size,
          width=Math.round(p.width/grid),
          height=Math.round(p.height/grid);    
    
    const points = [];

    Array(Math.round(width)).fill(0).forEach((e,a) => {
      Array(Math.round(height)).fill(0).forEach((e,b) => {
        const square = [
          [(a * grid ) + p.x, (b * grid ) + p.y],
          [(a * grid ) + p.x + grid, (b * grid ) + p.y],
          [(a * grid ) + p.x + grid, (b * grid ) + p.y + grid],
          [(a * grid ) + p.x, (b * grid ) + p.y + grid],
        ];

        square.forEach(point => {
          if(!points.find(e => e[0] === point[0] && e[1] === point[1])) points.push(point);
        });
      });
    });

    return points;
  }

  /**
   * _getX accepts a placeable and returns an Array of Rays in the Form of an X
   * @param {Placeable} p 
   * @returns {Array} [[x0,y0,x1,y1], ...]
   */
  static _getX(p){
    const grid=canvas.grid.size,
          padding=grid*0.05,
          width=Math.round(p.width/grid)*grid,
          height=Math.round(p.height/grid)*grid;

    const p0 = [p.x + padding, p.y + padding];
    const p1 = [p.x + padding, p.y + height- padding];
    const p2 = [p.x + width - padding,  p.y + height - padding ];
    const p3 = [p.x + width - padding,  p.y + padding];

    return [
      [...p0, ...p2], [...p1, ... p3]
    ];
  }

  /**
   * _getRay accepts 4 coords [x0,y0,x1,y1] and returns a ray.
   * @param {Number} x0
   * @param {Number} y0
   * @param {Number} x1
   * @param {Number} y1
   * @returns {Ray}
   */
  static _getRay(x0,y0,x1,y1){
    return new Ray({ x : x0, y : y0 }, { x : x1, y : y1 });
  }

  /**
   * _pointSquareCover accepts one point, square and a boolean for visualization
   * @param {Array} point [x : Number, y : Number]
   * @param {Array} square [[x : Number, y : Number], ...]
   * @returns {Number} value is equal to the maximum cover gained.
   */
  static _pointSquareCover(point, square, ignore, visualize){
    const sourcePoint = { x : point[0], y : point[1] };
    const squarePoints = square.map(point => ({x : point[0], y : point[1]}));

    let rayResults = squarePoints
      .map(point => {
        const ray = new Ray(sourcePoint, point);

        let walls = getWallCollisions(ray);
        let tiles = getTileCollisions(ray);  
        let tokens = getTokenCollisions(ray);

        if(visualize)
          CoverCalculator._drawRay(ray, 1, MODULE[NAME].rayColor[Math.max(walls, tiles, tokens)]);

        return {walls,tiles,tokens,ray};
      });
    
    logger.debug(`_pointSquareCover | hitResults | `, rayResults);

    const wallResult = getResult(MODULE[NAME].wallCover, rayResults.map(r => r.walls)) ?? 0;
    const tileResult = getResult(MODULE[NAME].tileCover, rayResults.map(r => r.tiles)) ?? 0;
    const tokenResult = getResult(MODULE[NAME].tokenCover, rayResults.map(r => r.tokens)) ?? 0;

    logger.debug(`_pointSquareCover | Wall Result  | `, wallResult);
    logger.debug(`_pointSquareCover | Tile Result  | `, tileResult);
    logger.debug(`_pointSquareCover | Token Result | `, tokenResult);
    logger.debug(`_pointSquareCover | Max Cover    | `, Math.max(wallResult,tileResult,tokenResult));

    return Math.max(wallResult, tileResult, tokenResult);

    function getWallCollisions(ray){
      let COLLISION = canvas.walls.getRayCollisions(ray, { blockMovement : false, blockSenses : true, mode : 'any', });
      const COVER_VALUE = 3;
      return COLLISION === true ? COVER_VALUE : 0;
    }
    function getTileCollisions(ray){
      if(!MODULE.setting("losWithTiles")) return 0;

      const valid_tiles = canvas.background.placeables.filter(tile => !ignore.includes(tile.id)) ?? [];
      let COLLISIONS = valid_tiles
        .filter(tile => {
          const x = CoverCalculator._getX(tile);
          if(visualize) x.forEach(s => CoverCalculator._drawRay(CoverCalculator._getRay(...s), 2, "0x000000"));
          return x.reduce((a,v) => a || !!ray.intersectSegment(v), false);
        })
        .sort((a,b) => b.coverValue() - a.coverValue())
      
      return COLLISIONS.length !== 0 ? COLLISIONS[0].coverValue() : 0;
    }
    function getTokenCollisions(ray){
      if(!MODULE.setting("losWithTokens")) return 0;
      
      const COVER_VALUE = 1;
      const valid_tokens = canvas.tokens.placeables.filter(token => !ignore.includes(token.id)) ?? [];
      const COLLISION = valid_tokens.find(token => {
        const x = CoverCalculator._getX(token);
        if(visualize) x.forEach(s => CoverCalculator._drawRay(CoverCalculator._getRay(...s), 2, "0x000000"));
        return x.reduce((a,v) => a || !!ray.intersectSegment(v) ,false);
      });

      return !!COLLISION ? COVER_VALUE : 0;
    }

    function getResult(data, arr){
      return Math.max(...Object.entries(data).map(([key, coverArr]) => coverArr[arr.count(key)]));
    }
  }

  /**
   * _drawRay
   * @param {Ray} ray 
   * @param {Number} thickness 
   * @param {String} color 
   */
  static _drawRay(ray, thickness = 1, color = "0xffffff"){
    const {x0, y0, dx,dy} = ray;
    const line = new PIXI.Graphics();

    line.position.set(x0,y0);
    line.lineStyle(thickness, color).moveTo(0,0).lineTo(dx,dy);
    canvas.foreground.addChild(line);
  }

  /*
    _removeRays - removes all rays that were drawn to the canvas.
  */
  static _removeRays(){
    for(let child of canvas.foreground.children.filter(c => c.constructor.name === "r"))
      canvas.foreground.removeChild(child);
  }

  static onTargetToken(user, target, onOff){
    if(MODULE.setting("losOnTarget") === 0 || !onOff || user.id !== game.userId) return;
    
    for(const selected of canvas.tokens.controlled){
      let cover = selected.computeTargetCover(target);

      ChatMessage.create({
        content : `${target.name} has ${MODULE[NAME].coverData[cover].label}`
      });
    }
  }
}

export class Cover{
  data = {
    origin : {},
    target : {},
    tokens : {},
    tiles : {},
    walls : {},
    results : {},
  };

  constructor(origin, target){
    this.data.origin.object = origin;
    this.data.target.object = target;
    this.data.padding = canvas.grid.size * 0.05;
    this.calculate();
  }

  calculate(){
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

            //getting the max # of hits a specific segment gets for each type
            let r = {
              tiles : Math.max(...this.data.tiles.shapes.map(shape => shape.checkIntersection(s))),
              tokens : Math.max(...this.data.tokens.shapes.map(shape => shape.checkIntersection(s))),
              walls : Math.max(...this.data.walls.shapes.map(shape => shape.checkIntersection(s))),
            };

            r.total = Math.max(r.tiles, r.tokens, r.walls);

            if(MODULE.setting("debugDrawing")){
              s.draw({ color : MODULE[NAME].coverData[r.total].color });
            }

            return r;
        });

        //get results here
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
    this.data.results.cover = results.reduce((a,b) => Math.min(a, b.reduce((c,d) => Math.min(c, d.total), 3)),3);
    this.data.results.label = MODULE[NAME].coverData[this.data.results.cover ?? 0].label;
    this.data.results.value = MODULE[NAME].coverData[this.data.results.cover ?? 0].value;

    function getResult(data, arr){
      return Math.max(...Object.entries(data).map(([key, coverArr]) => coverArr[arr.count(key)]));
    }
  }

  async toMessage({ speaker = {}, whisper = []} = {}){
    ChatMessage.create({
      content : `${this.data.target.object.name} has ${this.data.results.label} from ${this.data.origin.object.name}'s attacks.`,
      speaker : speaker !== {} ? speaker : ChatMessage.getSpeaker(),
      whisper,
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