export class Point {
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