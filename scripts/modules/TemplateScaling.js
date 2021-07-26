import { logger } from '../logger.js';
import { MODULE } from '../module.js';
import { queueUpdate } from './update-queue.js';

const NAME = "TemplateScaling";

export class TemplateScaling {
  static register(){
    logger.info("Registering Template Scaling Features");
    TemplateScaling.defaults();
    TemplateScaling.settings();
    TemplateScaling.hooks();
  }

  static defaults() {

  }

  static settings() {
    const config = false;
    const settingsData = {
      gridTemplateScaling : {
        scope : "world", config, group: "system", default: 0, type: Number,
        choices : {
          0 : MODULE.localize("option.gridTemplateScaling.none"),
          1 : MODULE.localize("option.gridTemplateScaling.lineCone"),
          2 : MODULE.localize("option.gridTemplateScaling.circle"),
          3 : MODULE.localize("option.gridTemplateScaling.all"),
        }
      }
    };

    MODULE.applySettings(settingsData);
  }

  static hooks() {
    Hooks.on("preCreateMeasuredTemplate", TemplateScaling._preCreateMeasuredTemplate);
  }

  /*
    Class Specific Functions
  */

  /**
   * hook method to modify the size/shape of a template to better fit the 5/5/5 grid rules
   * @param {*} templateDocument
   * @todo clamp size to maximum supported by current scene
   */
  static _preCreateMeasuredTemplate(templateDocument) {

    /** range 0-3
     *  b01 = line/cone, 
     *  b10 = circles,
     *  b11 = both 
     */
    const templateMode = MODULE.setting('gridTemplateScaling');

    /** if template adjusting is not enabled, bail out */
    if (templateMode == 0) {
      return;
    }

    const template = templateDocument.data;
    const scene = templateDocument.parent;

    if (!!(templateMode & 0b01) && (template.t == 'ray' || template.t == 'cone')) {

      TemplateScaling._scaleDiagonalDistance(templateDocument);
    }
    else if (!!(templateMode & 0b10) && template.t == 'circle' &&
      !(template.distance / scene.data.gridDistance < .9)) {

      TemplateScaling._convertToSquare(templateDocument);
    }
  }

  /** scale rays after placement to cover the correct number of squares based on 5e diagonal distance */
  static _scaleDiagonalDistance(templateDocument) {
    const template = templateDocument.data;

    let diagonalScale = Math.abs(Math.sin(Math.toRadians(template.direction))) +
      Math.abs(Math.cos(Math.toRadians(template.direction)))
    
    queueUpdate( () => template.update({distance: diagonalScale * template.distance}));
  }

  /** Convert circles to equivalent squares (e.g. fireball is square) 
   *  if the template is 1 grid unit or larger (allows for small circlar
   *  templates as temporary "markers" of sorts)
   */
  static _convertToSquare(templateDocument) {

    const template = templateDocument.data;
    const scene = templateDocument.parent;

    /** convert radius in grid units to radius in pixels */
    let radiusPx = (template.distance / scene.data.gridDistance) * scene.data.grid;

    /** convert the "distance" to the squares hypotenuse */
    const length = template.distance * 2;
    const distance = Math.hypot(length, length);

    /** convert to a rectangle */
    /** shift origin to top left in prep for converting to rectangle */
    /** always measured top left to bottom right */
    queueUpdate(() => template.update({t: 'rect', x: template.x - radiusPx, y: template.y - radiusPx, distance: distance, direction: 45}));

  }
}
