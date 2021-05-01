export class D5HRegeneration {
  static onInit() {
    game.settings.register("dnd5e-helpers", "autoRegen", {
      name: game.i18n.format("DND5EH.AutoRegen_name"),
      hint: game.i18n.format("DND5EH.AutoRegen_hint"),
      scope: "world",
      type: Boolean,
      group: "combat",
      default: false,
      config: false,
    });
    game.settings.register("dnd5e-helpers", "regenBlock", {
      name: game.i18n.format("DND5EH.regenBlock_name"),
      hint: game.i18n.format("DND5EH.regenBlock_hint"),
      scope: "world",
      type: String,
      default: `No Regen`,
      config: false,
      group: "combat",
    });
  }
}
