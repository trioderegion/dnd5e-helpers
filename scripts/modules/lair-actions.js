export class D5HLairActions {
  static onInit() {
    game.settings.register("dnd5e-helpers", "lairHelperEnable", {
      name: game.i18n.format("DND5EH.LairHelper_name"),
      hint: game.i18n.format("DND5EH.LairHelper_hint"),
      scope: "world",
      config: false,
      group: "combat",
      default: false,
      type: Boolean,
    });
  }
}
