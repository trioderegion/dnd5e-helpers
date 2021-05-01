export class D5HProficiencyDetection {
  static onInit() {
    game.settings.register("dnd5e-helpers", "autoProf", {
      name: game.i18n.format("DND5EH.AutoProf_name"),
      hint: game.i18n.format("DND5EH.AutoProf_hint"),
      scope: "world",
      type: Boolean,
      group: "system",
      default: true,
      config: false,
    });
  }
}
