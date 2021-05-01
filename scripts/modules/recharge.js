export class D5HRecharge {
  static onInit() {
    /** enable auto ability charge roll */
    game.settings.register("dnd5e-helpers", "cbtAbilityRecharge", {
      name: game.i18n.format("DND5EH.CombatAbilityRecharge_name"),
      hint: game.i18n.format("DND5EH.CombatAbilityRecharge_hint"),
      scope: "world",
      default: "off",
      type: String,
      choices: {
        off: game.i18n.format("DND5EH.CombatAbilityRecharge_Off"),
        start: game.i18n.format("DND5EH.CombatAbilityRecharge_Start"),
        end: game.i18n.format("DND5EH.CombatAbilityRecharge_End"),
      },
    });
    /** hide ability recharge roll */
    game.settings.register("dnd5e-helpers", "cbtAbilityRechargeHide", {
      name: game.i18n.format("DND5EH.CombatAbilityRechargeHide_name"),
      hint: game.i18n.format("DND5EH.CombatAbilityRechargeHide_hint"),
      scope: "world",
      config: false,
      group: "combat",
      default: true,
      type: Boolean,
    });
  }
}
