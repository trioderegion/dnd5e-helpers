export class D5HWildMagicSurge {

  static onInit() {
    /** should surges be tested */
    game.settings.register("dnd5e-helpers", "wmOptions", {
      name: game.i18n.format("DND5EH.WildMagicOptions_name"),
      hint: game.i18n.format("DND5EH.WildMagicOptions_hint"),
      scope: "world",
      config: false,
      group: "features",
      default: 0,
      type: Number,
      choices: {
        0: game.i18n.format("DND5EH.Default_disabled"),
        1: game.i18n.format("DND5EH.WildMagicOptions_standard"),
        2: game.i18n.format("DND5EH.WildMagicOptions_more"),
        3: game.i18n.format("DND5EH.WildMagicOptions_volatile"),
      },
    });

    /** name of the feature to trigger on */
    game.settings.register("dnd5e-helpers", "wmFeatureName", {
      name: game.i18n.format("DND5EH.WildMagicFeatureName_name"),
      hint: game.i18n.format("DND5EH.WildMagicFeatureName_hint"),
      scope: "world",
      config: false,
      group: "features",
      default: "Wild Magic Surge",
      type: String,
    });

    /** name of the table on which to roll if a surge occurs */
    game.settings.register("dnd5e-helpers", "wmTableName", {
      name: game.i18n.format("DND5EH.WildMagicTableName_name"),
      hint: game.i18n.format("DND5EH.WildMagicTableName_hint"),
      scope: "world",
      config: false,
      group: "features",
      default: "Tides of Chaos",
      type: String,
    });

    /** name of the feature to trigger on */
    game.settings.register("dnd5e-helpers", "wmToCFeatureName", {
      name: game.i18n.format("DND5EH.WildMagicTidesOfChaos_name"),
      hint: game.i18n.format("DND5EH.WildMagicTidesOfChaos_hint"),
      scope: "world",
      config: false,
      group: "features",
      default: "Wild-Magic-Surge-Table",
      type: String,
    });

    /** should tides of chaos be recharged on a surge? */
    game.settings.register("dnd5e-helpers", "wmToCRecharge", {
      name: game.i18n.format("DND5EH.WildMagicTidesOfChaosRecharge_name"),
      scope: "world",
      config: false,
      group: "features",
      default: false,
      type: Boolean,
    });

    /** toggle result gm whisper for WM */
    game.settings.register("dnd5e-helpers", "wmWhisper", {
      name: game.i18n.format("DND5EH.WildMagicWisper_name"),
      hint: game.i18n.format("DND5EH.WildMagicWisper_hint"),
      scope: "world",
      config: false,
      group: "features",
      default: false,
      type: Boolean,
    });
  }
}
