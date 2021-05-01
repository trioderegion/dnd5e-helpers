export class D5HCombatEnhancements {
  static onInit() {
    /** enable auto reaction reset */
    game.settings.register("dnd5e-helpers", "cbtReactionEnable", {
      name: game.i18n.format("DND5EH.CombatReactionEnable_name"),
      hint: game.i18n.format("DND5EH.CombatReactionEnable_hint"),
      scope: "world",
      type: Number,
      choices: {
        0: game.i18n.format("DND5EH.Default_none"),
        1: game.i18n.format("DND5EH.Default_enabled"),
      },
      group: "combat",
      default: 0,
      config: false,
      onChange: () => window.location.reload(),
    });
  }
}
