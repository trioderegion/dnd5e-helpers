export class D5HUndeadFortitude {
  static onInit() {
    game.settings.register("dnd5e-helpers", "undeadFort", {
      name: game.i18n.format("DND5EH.UndeadFort_name"),
      hint: game.i18n.format("DND5EH.UndeadFort_hint"),
      scope: "world",
      type: String,
      choices: {
        0: game.i18n.format("DND5EH.UndeadFort_none"),
        1: game.i18n.format("DND5EH.UndeadFort_quick"),
        2: game.i18n.format("DND5EH.UndeadFort_advanced"),
      },
      default: "0",
      config: false,
    });
  }
}
