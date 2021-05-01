export class D5HLegendaryActions {
  static onInit() {
    /** Legendary action helper enable */
    game.settings.register("dnd5e-helpers", "LegendaryHelperEnable", {
      name: game.i18n.format("DND5EH.CombatLegendary_Prompt_name"),
      hint: game.i18n.format("DND5EH.CombatLegendary_Prompt_hint"),
      scope: "world",
      config: false,
      group: "combat",
      default: false,
      type: Boolean,
    });

    /** enable auto legact reset */
    game.settings.register("dnd5e-helpers", "cbtLegactEnable", {
      name: game.i18n.format("DND5EH.CombatLegendary_name"),
      hint: game.i18n.format("DND5EH.CombatLegendary_hint"),
      scope: "world",
      config: false,
      group: "combat",
      default: true,
      type: Boolean,
    });
  }
}
