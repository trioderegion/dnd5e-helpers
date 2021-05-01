export class D5HCoverCalculator {
  static onInit() {
    /** report cover value to chat on target */
    game.settings.register("dnd5e-helpers", "losOnTarget", {
      name: game.i18n.format("DND5EH.LoSOnTarget_name"),
      hint: game.i18n.format("DND5EH.LoSOnTarget_hint"),
      scope: "world",
      config: false,
      group: "system",
      default: 0,
      type: Number,
      choices: {
        0: game.i18n.format("DND5EH.Default_disabled"),
        1: game.i18n.format("DND5EH.LoSOnTarget_center"),
        2: game.i18n.format("DND5EH.LoSOnTarget_corner"),
      },
    });
    game.settings.register("dnd5e-helpers", "losWithTokens", {
      name: game.i18n.format("DND5EH.LoSWithTokens_name"),
      hint: game.i18n.format("DND5EH.LoSWithTokens_hint"),
      scope: "world",
      config: false,
      group: "system",
      default: false,
      type: Boolean,
    });
    game.settings.register("dnd5e-helpers", "losKeybind", {
      name: game.i18n.format("DND5EH.LoSKeybind_name"),
      hint: game.i18n.format("DND5EH.LoSWithTokens_hint"),
      scope: "world",
      config: false,
      group: "system",
      default: "",
      type: String,
    });
    game.settings.register("dnd5e-helpers", "coverApplication", {
      name: game.i18n.format("DND5EH.LoSCover_name"),
      hint: game.i18n.format("DND5EH.LoSCover_hint"),
      scope: "world",
      config: false,
      group: "system",
      default: 0,
      type: Number,
      choices: {
        0: game.i18n.format("DND5EH.Default_disabled"),
        1: game.i18n.format("DND5EH.LoSCover_manual"),
        2: game.i18n.format("DND5EH.LoSCover_auto"),
      },
    });
    game.settings.register("dnd5e-helpers", "coverTint", {
      name: game.i18n.format("DND5EH.LoSTint_name"),
      hint: game.i18n.format("DND5EH.LoSTint_hint"),
      scope: "world",
      config: false,
      group: "system",
      default: 0,
      type: Number,
      choices: {
        0: game.i18n.format("DND5EH.LoSTint_red"),
        1: game.i18n.format("DND5EH.LoSTint_blue"),
        2: game.i18n.format("DND5EH.LoSTint_grey"),
        3: game.i18n.format("DND5EH.LoSTint_rainbow"),
      },
    });
    game.settings.register("dnd5e-helpers", "losMaskNPCs", {
      name: game.i18n.format("DND5EH.LoSMaskNPCs_name"),
      hint: game.i18n.format("DND5EH.LoSMaskNPCs_hint"),
      scope: "world",
      config: false,
      group: "system",
      default: false,
      type: Boolean,
    });
  }
}
