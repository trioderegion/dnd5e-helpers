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
      tileFlag : "coverLevel",
      coverData : {
        0 : MODULE.localize("DND5EH.LoS_nocover"),
        1 : MODULE.localize("DND5EH.LoS_halfcover"),
        2 : MODULE.localize("DND5EH.LoS_34cover"),
        3 : MODULE.localize("DND5EH.LoS_fullcover"),
      },
      rayColor : {
        0 : "0xff0000",
        1 : "0xffa500",
        2 : "0xffff00",
        3 : "0x008000",
      },
      wallCover : {
        3 : [0,1,1,2,3],
      },
      tileCover : {
        3 : [0,1,1,2,3],
        2 : [0,1,1,2,2],
        1 : [0,0,0,1,1],
      },
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
    };

    MODULE.applySettings(settingsData);
  }

  static hooks(){
    Hooks.on(`renderTileConfig`, CoverCalculator._renderTileConfig);
  }

  static patch(){
    CoverCalculator._patchToken();
    CoverCalculator._patchArray();
  }

  /*
    Class Specific Functions
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
          .filter(tile => (CoverCalculator._getTileFlag(tile) ?? 0) == 0)
          .map(tile => tile.id),
      ];

      const results = points.map(point => squares.map(square => 
        CoverCalculator._pointSquareCover(point, square, ignore, visualize)
      ));

      logger.debug(`Token Prototype | computeTargetCover | Results |  `, results);
      logger.debug(`Token Prototype | computeTargetCover | Result  |  `, Math.min(...results.map(arr => Math.min(...arr))));

      return Math.min(...results.map(arr => Math.min(...arr)));
    }
  }

  static _patchArray(){
    Array.prototype.count = function(value){
      return this.filter(x => x == value).length;
    }
  }

  static _renderTileConfig(app, html){
    if(MODULE.setting("losOnTarget") === 0 || !MODULE.setting("losWithTiles") || app.object.data.overhead ) return;
    const status = CoverCalculator._getTileFlag(app) ?? 0;
    const tab = html.find('[data-tab="basic"]')[1];
    const checkBoxHTML = `<label>${MODULE.localize("DND5EH.LoS_providescover")}</label>
                          <select name="flags.dnd5e-helpers.coverLevel" data-dtype="Number">
                            ${
                              Object.entries(MODULE[NAME].coverData).reduce((acc, [key,str]) => acc+=`<option value="${key}" ${key == status ? 'selected' : ''}>${str}</option>`, ``)
                            }
                          </select>`;

    html.css("height", "auto");
    tab.append(MODULE.stringToDom(checkBoxHTML, "form-group"));
  }

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

    Array(Math.round(width)).fill(0).forEach((e, a) => {
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
   * _getTileFlag
   * @param {Tile} t 
   * @returns {Number} Tile Cover Type
   */
    static _getTileFlag(t){
      return t.document.getFlag(MODULE.data.name, MODULE[NAME].tileFlag);
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
        .sort((a,b) => CoverCalculator._getTileFlag(b) - CoverCalculator._getTileFlag(a))
      
      return COLLISIONS.length !== 0 ? CoverCalculator._getTileFlag(COLLISIONS[0]) : 0;
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
}