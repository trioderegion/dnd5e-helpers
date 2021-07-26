import { MODULE } from './module.js';
import { logger } from './logger.js';
import { DnDWildMagic } from './modules/DnDWildMagic.js';
import { RestEffects } from './modules/RestEffects.js';
import { CoverCalculator } from './modules/CoverCalculator.js';
import { ActionManagement } from './modules/ActionManagement.js';
import { TemplateScaling } from './modules/TemplateScaling.js';
import { AbilityRecharge } from './modules/AbilityRecharge.js';

const SUB_MODULES = {
  MODULE,
  logger,
  DnDWildMagic,
  RestEffects,
  CoverCalculator,
  ActionManagement,
  TemplateScaling,
  AbilityRecharge
};

/*
  Initialize Module
*/
MODULE.build();

/*
  Initialize all Sub Modules
*/
Hooks.on(`setup`, () => {
  Object.values(SUB_MODULES).forEach(cl => cl.register());

  //GlobalTesting
  Object.entries(SUB_MODULES).forEach(([key, cl])=> window[key] = cl);
});
