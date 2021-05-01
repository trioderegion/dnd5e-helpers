export class D5HScalingTemplate {
  static onInit() {
    game.settings.register("dnd5e-helpers", "gridTemplateScaling", {
      name: game.i18n.format("DND5EH.GridTemplateScaling_name"),
      hint: game.i18n.format("DND5EH.GridTemplateScaling_hint"),
      scope: "world",
      config: false,
      group: "system",
      default: 0,
      type: Number,
      choices: {
        0: game.i18n.format("DND5EH.GridTemplateScaling_none"),
        1: game.i18n.format("DND5EH.GridTemplateScaling_lineCone"),
        2: game.i18n.format("DND5EH.GridTemplateScaling_circle"),
        3: game.i18n.format("DND5EH.GridTemplateScaling_all"),
      },
    });
  }
}
