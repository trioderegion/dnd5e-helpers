//type BaseHPI = import("./scripts/managers/HPI.mjs").default;
//type BaseIntercom = import("./scripts/managers/Intercom.mjs").default;
type MODULE = import('./scripts/module.js').MODULE;

//var Intercom = class extends BaseIntercom {
//  static off: typeof Hooks.off;
//  static once: typeof Hooks.once;
//}

export declare global {

  namespace Util {
    const isFirstGM: typeof MODULE.isFirstGM; 
  }

  namespace Intercom {
    const off: typeof Hooks.off;
  }

  namespace HPI {
    let hooks: Intercom;
    let util: Util;
  }
  //interface HPI extends BaseHPI {
  //  public static hooks: Intercom;
  //  public static util: Util;
  //}


}

export {};
