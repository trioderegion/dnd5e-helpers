export class D5HHelpers {
  static isFirstGM() {
    return game.user === game.users.find((u) => u.isGM && u.active);
  }

  static getKeyByValue(object, value) {
    return Object.keys(object).find((key) => object[key] === value);
  }

  // find status effect based on passed name
  static getStatusEffect(statusName) {
    /** Core Status Effects -- pass displayed name backwards through localization to match to status.label */
    const { EFFECT } = game.i18n.translations;

    /** find the key (will be label) from the value */
    const statusLabel = this.getKeyByValue(EFFECT, statusName);
    let statusEffect = CONFIG.statusEffects.find(
      (st) => st.label === `EFFECT.${statusLabel}`
    );

    if (statusEffect) {
      /** first match is core, always prefer core */
      return statusEffect;
    } else {
      /** cant find it, it still may be available via other modules/methods */

      /** CUB Compatibility -- statusName matches displayed CUB name (status.label) */
      if (!statusEffect && game.modules.get("combat-utility-belt")?.active) {
        /** if we find it, pick it */
        statusEffect = CONFIG.statusEffects.find(
          (st) => st.label === statusName
        );
      }

      // note: other module compatibilities should check for a null statusEffect before
      //      changing the current statusEffect. Priority based on evaluation order.
    }

    /** return the best label we found */
    return statusEffect;
  }

  /**
   * Return the sanatizedName of a Actor if fature enabled
   * @param {string} name        A name string
   * @param {string} feature     The featured to be checked enable: owMaskNPCs
   * @param {string} label       The i18n label to replace the creature name: DND5EH.GreatAndOpenWoundMaskNPC_mask
   * @return {string}            Return the sanitized name.
   * @static
   */
  static sanitizeName(name, feature, label) {
    return game.settings.get("dnd5e-helpers", feature)
      ? game.i18n.format(label)
      : name;
  }

  // toggle core status effects
  static async toggleStatus(token, status) {
    return await token.toggleEffect(status);
  }

  // apply a CUB status effect
  static async applyCUB(token, cubStatus) {
    return await game.cub.addCondition(cubStatus, token);
  }

  // remove a CUB status effect
  static async removeCUB(token, cubStatus) {
    return await game.cub.removeCondition(cubStatus, token);
  }
}
