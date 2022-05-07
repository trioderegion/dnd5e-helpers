import { Point } from './Point.js';
import { Segment } from './Segment.js';

export class Shape {
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
    let r = mergeObject({cover: 3, limited: false}, this.options ?? {});
    return this.segments.reduce((a,v) => a || s.checkIntersection(v), false) ? r : {cover: 0, limited: r.limited};
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
    try {
      return new Shape({ segments : [new Segment({ numbers : wall.data.c }, o)] }, o);
    } catch(e) {
      logger.debug('Ignoring invalid wall:', wall);
      return null;
    }
  }

  static buildTile(tile, o){

  }

  static buildToken(token, o){

  }
  static buildDrawing(drawing, o){

  }
}
