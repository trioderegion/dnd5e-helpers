export class D5HWounds{
  static onReady(){
    console.log("DnD5e Helpers | Initializing websocket connection");
  //   game.socket.on(`module.dnd5e-helpers`, (socketData) => {
  //     console.log(game.i18n.format("DND5EH.Default_SocketSetup"));
  //     // Rolls Saves for owned tokens
  //     if (socketData.greatwound === true) {
  //       const actor = game.actors.get(socketData.actorId);
  //       for (const [key, value] of Object.entries(socketData.users)) {
  //         if (value === 3 && game.users.get(`${key}`).data.role !== 4) {
  //           if (game.user.data._id === `${key}`) {
  //             if (socketData.hp !== 0) {
  //               DnDWounds.DrawGreatWound(actor);
  //             }
  //             if (
  //               socketData.hp === 0 &&
  //               game.settings.get("dnd5e-helpers", "owHp0GW") === true
  //             ) {
  //               const gwFeatureName = game.settings.get(
  //                 "dnd5e-helpers",
  //                 "gwFeatureName"
  //               );
  //               let sanitizedTokenName = actor.data.name;
  //               if (actor.data.type === "npc") {
  //                 sanitizedTokenName = DnDHelpers.sanitizeName(
  //                   actor.data.name,
  //                   "owMaskNPCs",
  //                   "DND5EH.GreatAndOpenWoundMaskNPC_mask"
  //                 );
  //               }
  //               DnDWounds.OpenWounds(
  //                 sanitizedTokenName,
  //                 game.i18n.format("DND5EH.OpenWoundSocketMessage", {
  //                   gwFeatureName: gwFeatureName,
  //                 })
  //               );
  //             }
  //           }
  //         }
  //       }
  //     }
  //     if (socketData.actionMarkers) {
  //       DnDActionManagement.UpdateOpacities(socketData.tokenId);
  //     }
  //   });
  }
}

export class D5HOpenWounds {
  static onInit() {
    game.settings.register("dnd5e-helpers", "gowMaskNPCs", {
      name: game.i18n.format("DND5EH.GreatAndOpenWoundMaskNPC_name"),
      hint: game.i18n.format("DND5EH.GreatAndOpenWoundMaskNPC_hint"),
      scope: "world",
      config: false,
      group: "combat",
      default: false,
      type: Boolean,
    });

    game.settings.register("dnd5e-helpers", "owFeatureName", {
      name: game.i18n.format("DND5EH.OpenWoundFeaturename_name"),
      hint: game.i18n.format("DND5EH.OpenWoundFeaturename_hint"),
      scope: "world",
      config: false,
      group: "combat",
      default: "Open Wound",
      type: String,
    });

    game.settings.register("dnd5e-helpers", "owDeathSave", {
      name: game.i18n.format("DND5EH.OpenWoundDeathSave_name"),
      hint: game.i18n.format("DND5EH.OpenWoundDeathSave_hint"),
      scope: "world",
      type: Boolean,
      group: "combat",
      default: false,
      config: false,
    });

    game.settings.register("dnd5e-helpers", "owCrit", {
      name: game.i18n.format("DND5EH.OpenWoundCrit_name"),
      hint: game.i18n.format("DND5EH.OpenWoundCrit_hint"),
      scope: "world",
      config: false,
      group: "combat",
      default: false,
      type: Boolean,
    });

    game.settings.register("dnd5e-helpers", "owHp0", {
      name: game.i18n.format("DND5EH.OpenWound0HP_name"),
      hint: game.i18n.format("DND5EH.OpenWound0HP_hint"),
      scope: "world",
      type: Boolean,
      group: "combat",
      default: false,
      config: false,
    });

    game.settings.register("dnd5e-helpers", "owHp0GW", {
      name: game.i18n.format("DND5EH.OpenWound0HPGW_name"),
      hint: game.i18n.format("DND5EH.OpenWound0HPGW_hint"),
      scope: "world",
      type: Boolean,
      group: "combat",
      default: false,
      config: false,
    });

    game.settings.register("dnd5e-helpers", "owTable", {
      name: game.i18n.format("DND5EH.OpenWoundTableName_name"),
      hint: game.i18n.format("DND5EH.OpenWoundTableName_hint"),
      scope: "world",
      config: false,
      group: "combat",
      default: "",
      type: String,
    });
  }
}

export class D5HGreatWounds {
  static onInit() {
    game.settings.register("dnd5e-helpers", "gwEnable", {
      name: game.i18n.format("DND5EH.GreatWoundEnable_name"),
      hint: game.i18n.format("DND5EH.GreatWoundEnable_hint"),
      scope: "world",
      type: Boolean,
      group: "combat",
      default: false,
      config: false,
    });

    game.settings.register("dnd5e-helpers", "gwFeatureName", {
      name: game.i18n.format("DND5EH.GreatWoundFeatureName_name"),
      hint: game.i18n.format("DND5EH.GreatWoundFeatureName_hint"),
      scope: "world",
      config: false,
      group: "combat",
      default: "Great Wound",
      type: String,
    });

    game.settings.register("dnd5e-helpers", "gwTableName", {
      name: game.i18n.format("DND5EH.GreatWoundTableName_name"),
      hint: game.i18n.format("DND5EH.GreatWoundTableName_hint"),
      scope: "world",
      config: false,
      group: "combat",
      default: "",
      type: String,
    });
  }
}
