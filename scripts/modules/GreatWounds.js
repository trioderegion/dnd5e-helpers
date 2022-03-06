import { logger } from '../logger.js';
import { MODULE } from '../module.js';
import { queueUpdate } from './update-queue.js';
import { OpenWounds } from './OpenWounds.js';

const NAME = "GreatWounds";

export class GreatWound {
    static register() {
        logger.info("Registering Great-Wound Calculations");
        GreatWound.settings();
        GreatWound.hooks();
    }

    static settings() {
        const config = false;
        const settingsData = {
            GreatWoundEnable: {
                scope: "world", config, group: "system", default: false, type: Boolean,
            },
            GreatWoundFeatureName: {
                scope: "world", config, group: "system", default: "Great Wound", type: String,
            },
            GreatWoundTableName: {
                scope: "world", config, group: "system", default: "", type: String,
            },
            GreatAndOpenWoundMaskNPC: {
                scope: "world", config, group: "combat", default: false, type: Boolean,
            },
            GreatWoundSaveValue: {
                scope: "world", config, group: "combat", default: 15, type: Number,
            },
            GreatWoundItemSetting: {
                scope: "world", config, group: "combat", default: 0, type: String,
                choices: {
                    0: MODULE.localize("option.GreatWoundItemSetting.none"),
                    1: MODULE.localize("option.GreatWoundItemSetting.item"),
                    2: MODULE.localize("option.GreatWoundItemSetting.effect")
                }
            },
        };

        MODULE.registerSubMenu(NAME, settingsData, {tab: 'combat'});
    }

    static hooks() {
        Hooks.on("ready", () => {
            logger.info("DnD5e Helpers socket setup")
            game.socket.on(`module.dnd5e-helpers`, GreatWound.greatWoundSocket);

        });
        Hooks.on("preUpdateActor", GreatWound._preUpdateActor)
    }

    static _preUpdateActor(actor, update) {
        let hp = getProperty(update, "data.attributes.hp.value");
        if (hp !== undefined) {
            GreatWound.calculation(actor, update);
        }
    }

    static calculation(actor, update) {
        if(!MODULE.setting("GreatWoundEnable")) {return}
        let data = {
            actor: actor,
            actorData: actor.data,
            updateData: update,
            actorHP: actor.data.data.attributes.hp.value,
            actorMax: actor.data.data.attributes.hp.max,
            updateHP: (hasProperty(update, "data.attributes.hp.value") ? update.data.attributes.hp.value : 0),
            hpChange: (actor.data.data.attributes.hp.value - (hasProperty(update, "data.attributes.hp.value") ? update.data.attributes.hp.value : actor.data.data.attributes.hp.value))
        };
        logger.debug("Great Wound update Data", { data });

        const gwFeatureName = MODULE.setting("GreatWoundFeatureName");
        // check if the change in hp would be over 50% max hp
        if (data.hpChange >= Math.ceil(data.actorMax / 2)) {
            new Dialog({
                title: MODULE.format("DND5EH.GreatWoundDialogTitle", { gwFeatureName: gwFeatureName, actorName: actor.name }),
                content: MODULE.format("DND5EH.GreatWoundDialogContents", { actorName: actor.name, DC: MODULE.setting("GreatWoundSaveValue") }),
                buttons: {
                    one: {
                        label: MODULE.localize("DND5EH.Default_roll"),
                        callback: () => {
                            /** draw locally if we are the one prompting the change OR if not owned by any players */
                            if (game.user.data.role !== 4 || !actor.hasPlayerOwner) {
                                GreatWound.DrawGreatWound(actor);
                                return;
                            }
                            const socketData = {
                                users: actor.data._source.permission,
                                actorId: actor.id,
                                greatwound: true,
                                hp: data.updateHP,
                            }
                            logger.info(MODULE.format("DND5EH.Default_SocketSend", { socketData: socketData }))
                            game.socket.emit(`module.dnd5e-helpers`, socketData)
                        }
                    }
                }
            }).render(true)
        }
    }

    static async DrawGreatWound(actor) {
        const gwFeatureName = MODULE.setting("GreatWoundFeatureName");
        const saveTest = MODULE.setting("GreatWoundSaveValue");
        let gwSave = saveTest > 0 ? await actor.rollAbilitySave("con") : {total: -5};
        let sanitizedTokenName = MODULE.sanitizeTokenName(actor, "GreatAndOpenWoundMaskNPC", "gwFeatureName")
        if (gwSave.total < saveTest) {
            const greatWoundTable = MODULE.setting("GreatWoundTableName");
            ChatMessage.create({
                content: MODULE.format("DND5EH.GreatWoundDialogFailMessage", {
                    actorName: sanitizedTokenName,
                    gwFeatureName: gwFeatureName,
                }),
            });
            if (greatWoundTable !== "") {
                let { results } = await game.tables
                    .getName(greatWoundTable)
                    .draw({ roll: null, results: [], displayChat: true });
                if (MODULE.setting("GreatWoundItemSetting") != '0') {
                    GreatWound.itemResult(actor, results)
                }
            } else {
                ChatMessage.create({
                    content: MODULE.format("DND5EH.GreatWoundDialogError", {
                        gwFeatureName: gwFeatureName,
                    }),
                });
            }
        } else {
            ChatMessage.create({
                content: MODULE.format("DND5EH.GreatWoundDialogSuccessMessage", {
                    actorName: sanitizedTokenName,
                    gwFeatureName: gwFeatureName,
                }),
            });
        }

    }

    static greatWoundSocket(socketData) {
        if (!socketData.greatwound && socketData.hp > 0) return
        //Rolls Saves for owned tokens
        let actor = game.actors.get(socketData.actorId);
        for (const [key, value] of Object.entries(socketData.users)) {
            if (value === 3 && game.users.get(`${key}`).data.role !== 4) {
                if (game.user.data._id === `${key}`) {
                    GreatWound.DrawGreatWound(actor);
                }
            }

        }
        if (socketData.hp === 0 && MODULE.setting("OpenWounds0HPGW")) {
            const gwFeatureName = MODULE.setting("GreatWoundFeatureName");
            DnDWounds.OpenWounds(
                actor,
                MODULE.format("DND5EH.OpenWoundSocketMessage", {
                    gwFeatureName: gwFeatureName,
                })
            );
        }
    }

    static async itemResult(actor, results) {
      const roll = results[0].data
      const item = await MODULE.getItem(roll.collection, roll.resultId)
      if (item) {
        queueUpdate(async () => {
          switch (MODULE.setting("GreatWoundItemSetting")) {
            case "1": await actor.createEmbeddedDocuments("Item", [item.toObject()])
              break;
            case "2": await actor.createEmbeddedDocuments("ActiveEffect", item.getEmbeddedCollection('ActiveEffect').map( doc => doc.toObject() ));
              break;
          }
        })
      }
    }

}
