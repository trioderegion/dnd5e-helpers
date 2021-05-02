import { D5HHelpers } from "./helpers.js";

export class D5HWounds {
  static onReady() {
    console.log("DnD5e Helpers | Initializing websocket connection");
    game.socket.on(`module.dnd5e-helpers`, (socketData) => {
      console.log(game.i18n.format("DND5EH.Default_SocketSetup"));
      // Rolls Saves for owned tokens
      if (socketData.greatwound === true) {
        const actor = game.actors.get(socketData.actorId);
        for (const [key, value] of Object.entries(socketData.users)) {
          if (value === 3 && game.users.get(`${key}`).data.role !== 4) {
            if (game.user.data._id === `${key}`) {
              if (socketData.hp !== 0) {
                D5HGreatWounds._drawGreatWound(actor);
              }
              if (
                socketData.hp === 0 &&
                game.settings.get("dnd5e-helpers", "owHp0GW") === true
              ) {
                const gwFeatureName = game.settings.get(
                  "dnd5e-helpers",
                  "gwFeatureName"
                );
                let sanitizedTokenName = actor.data.name;
                if (actor.data.type === "npc") {
                  sanitizedTokenName = D5HHelpers.sanitizeName(
                    actor.data.name,
                    "gowMaskNPCs",
                    "DND5EH.GreatAndOpenWoundMaskNPC_mask"
                  );
                }
                D5HOpenWounds.applyOpenWounds(
                  sanitizedTokenName,
                  game.i18n.format("DND5EH.OpenWoundSocketMessage", {
                    gwFeatureName: gwFeatureName,
                  })
                );
              }
            }
          }
        }
      }
      if (socketData.actionMarkers) {
        // TODO replace DnDActionManagement with D5H class.
        DnDActionManagement.UpdateOpacities(socketData.tokenId);
      }
    });
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

  static async onPreUpdateActor(actor, update, options, userId) {
    const hp = getProperty(update, "data.attributes.hp.value");
    if (game.settings.get("dnd5e-helpers", "owHp0") && hp === 0) {
      this.applyOpenWounds(
        actor.data.name,
        game.i18n.format("DND5EH.OpenWound0HP_reason")
      );
    }
  }

  static applyOpenWounds(actorName, woundType) {
    const owFeatureName = game.settings.get("dnd5e-helpers", "owFeatureName");
    const openWoundTable = game.settings.get("dnd5e-helpers", "owTable");
    ChatMessage.create({
      content: game.i18n.format("DND5EH.OpenWoundFeaturename_chatoutput", {
        actorName: actorName,
        owFeatureName: owFeatureName,
        woundType: woundType,
      }),
    });
    if (openWoundTable !== "") {
      game.tables
        .getName(openWoundTable)
        .draw({ roll: null, results: [], displayChat: true });
    } else {
      ChatMessage.create({
        content: game.i18n.format("DND5EH.OpenWoundTableName_error", {
          owFeatureName: owFeatureName,
        }),
      });
    }
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

  static async onPreUpdateActor(actor, update, options, userId) {
    const hp = getProperty(update, "data.attributes.hp.value");
    if (game.settings.get("dnd5e-helpers", "gwEnable") && hp !== undefined) {
      this.applyGreatWoundActor(actor, update);
    }
  }

  static async onPreUpdateToken(scene, tokenData, update, options) {
    const hp = getProperty(update, "actorData.data.attributes.hp.value");
    if (game.settings.get("dnd5e-helpers", "gwEnable") && hp !== undefined) {
      this.applyGreatWoundToken(tokenData, update);
    }
  }

  /**
   *
   * @param {Object} actor
   */
  static _drawGreatWound(actor) {
    const gwFeatureName = game.settings.get("dnd5e-helpers", "gwFeatureName");
    (async () => {
      const gwSave = await actor.rollAbilitySave("con");
      let sanitizedTokenName = actor.name;
      if (actor.data.type === "npc") {
        sanitizedTokenName = D5HHelpers.sanitizeName(
          actor.name,
          "gowMaskNPCs",
          "DND5EH.GreatAndOpenWoundMaskNPC_mask"
        );
      }
      if (gwSave.total < 15) {
        const greatWoundTable = game.settings.get(
          "dnd5e-helpers",
          "gwTableName"
        );
        ChatMessage.create({
          content: game.i18n.format("DND5EH.GreatWoundDialogFailMessage", {
            actorName: sanitizedTokenName,
            gwFeatureName: gwFeatureName,
          }),
        });
        if (greatWoundTable !== "") {
          game.tables
            .getName(greatWoundTable)
            .draw({ roll: null, results: [], displayChat: true });
        } else {
          ChatMessage.create({
            content: game.i18n.format("DND5EH.GreatWoundDialogError", {
              gwFeatureName: gwFeatureName,
            }),
          });
        }
      } else {
        ChatMessage.create({
          content: game.i18n.format("DND5EH.GreatWoundDialogSuccessMessage", {
            actorName: sanitizedTokenName,
            gwFeatureName: gwFeatureName,
          }),
        });
      }
    })();
  }

  /**
   * REFACTOR WITH TOKEN AS THEY SHARE CODE
   * Check if the change in HP would be over 50% max hp
   *
   * @param {Object} actor
   * @param {Object} update
   */
  static applyGreatWoundActor(actor, update) {
    // find update data and original data
    const data = {
      actor: actor,
      actorData: actor.data,
      updateData: update,
      actorHP: actor.data.data.attributes.hp.value,
      actorMax: actor.data.data.attributes.hp.max,
      updateHP: hasProperty(update, "data.attributes.hp.value")
        ? update.data.attributes.hp.value
        : 0,
      hpChange:
        actor.data.data.attributes.hp.value -
        (hasProperty(update, "data.attributes.hp.value")
          ? update.data.attributes.hp.value
          : actor.data.data.attributes.hp.value),
    };

    const gwFeatureName = game.settings.get("dnd5e-helpers", "gwFeatureName");
    if (data.hpChange >= Math.ceil(data.actorMax / 2)) {
      new Dialog({
        title: game.i18n.format("DND5EH.GreatWoundDialogTitle", {
          gwFeatureName: gwFeatureName,
          actorName: actor.name,
        }),
        buttons: {
          one: {
            label: game.i18n.format("DND5EH.Default_roll"),
            callback: () => {
              if (game.user.data.role !== 4) {
                this._drawGreatWound(actor);
                return;
              }

              const socketData = {
                users: actor._data.permission,
                actorId: actor._id,
                greatwound: true,
                hp: data.updateHP,
              };
              console.log(
                game.i18n.format("DND5EH.Default_SocketSend", {
                  socketData: socketData,
                })
              );
              game.socket.emit(`module.dnd5e-helpers`, socketData);
            },
          },
        },
      }).render(true);
    }
  }

  /**
   * REFACTOR WITH ACTOR AS THEY SHARE CODE
   * @param {Object} tokenData
   * @param {Object} update
   */
  static applyGreatWoundToken(tokenData, update) {
    // find update data and original data
    const actor = game.actors.get(tokenData.actorId);
    const data = {
      actorData: canvas.tokens.get(tokenData._id).actor.data,
      actorHP: getProperty(tokenData, "actorData.data.attributes.hp.value"),
      actorMax: getProperty(tokenData, "actorData.data.attributes.hp.max"),
      updateHP: update.actorData.data.attributes.hp.value,
    };
    if (data.actorMax === undefined) {
      data.actorMax = actor.data.data.attributes.hp.max;
    }
    if (data.actorHP === undefined) {
      data.actorHP = data.actorMax;
    }
    const hpChange = data.actorHP - data.updateHP;
    // check if the change in hp would be over 50% max hp
    if (hpChange >= Math.ceil(data.actorMax / 2) && data.updateHP !== 0) {
      const gwFeatureName = game.settings.get("dnd5e-helpers", "gwFeatureName");
      new Dialog({
        title: game.i18n.format("DND5EH.GreatWoundDialogTitle", {
          gwFeatureName: gwFeatureName,
          actorName: actor.name,
        }),
        buttons: {
          one: {
            label: game.i18n.format("DND5EH.Default_roll"),
            callback: () => {
              this._drawGreatWound(actor);
            },
          },
        },
      }).render(true);
    }
  }
}
