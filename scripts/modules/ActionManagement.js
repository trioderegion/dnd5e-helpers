import { MODULE } from '../module.js';
import { logger } from '../logger.js';

const NAME = "ActionManagement";

export class ActionManagement{
  static register(){
    this.defaults();
    this.settings();
    this.hooks();
    this.patch();
    this.globals();
  }

  static defaults(){
    MODULE[NAME] = {
      /* Sub Module Constant Values */
    };
  }

  static settings(){
    const config = false;
    const settingData = {

    };

    MODULE.applySettings(settingData);

    /*
      additional settings
    */
  }

  static hooks(){

  }

  static patch(){

  }

  static globals(){

  }

  /**
   * Hook Functions
   */

  /**
   * Patching Functions
   */

  /**
   * Global Accessor Functions
   */

  /**
   * Module Specific Functions
   */
}