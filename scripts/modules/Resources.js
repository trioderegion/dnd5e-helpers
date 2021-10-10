import { MODULE } from "../module.js";
import { logger } from "../logger.js";
import { queueUpdate } from './update-queue.js';

const NAME = "Resources";
/**
 * Resources 
 * @description : Convienient methodology to handle 5e specific resources from base classes and sub classes.
 * @todo :
 *    build basic resource management
 *    build Sorcerer Points Control Schema
 *    build Monk Ki Point Control Schema
 *    build Fighter Battle Master Control Schema
 */
export class Resources{
  /*
    Register Sub Module Methods
  */
  static register(){
    this.settings();
    this.defaults();
    this.hooks();
    this.patch();
    this.global();
  }

  static settings(){
  }

  static defaults(){
  }

  static hooks(){
  }

  static patch(){
  }

  static global(){
  }
}

class Sorcerer{

}

class BattleMaster{

}

class Monk{

}