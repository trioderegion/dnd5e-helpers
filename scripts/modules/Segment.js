import { Point } from './Point.js';

export class Segment {
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