import { logger } from '../logger.js';
import { MODULE } from '../module.js';
import { queueUpdate } from './update-queue.js';

const NAME = "OpenWounds";

export class OpenWounds {
    static register() {
        logger.info("Registering Great-Wound Calculations");
        OpenWounds.settings();
        OpenWounds.hooks();
    }
    static settings() {
        const config = false;
        const settingsData = {
            OpenWound0HP: {
                scope: "world", config, group: "system", default: false, type: Boolean,
            },
            OpenWound0HPGW: {
                scope: "world", config, group: "system", default: false, type: Boolean,
            },
            OpenWoundsFeatureName: {
                scope: "world", config, group: "system", default: "Open Wound", type: String,
            },
            OpenWoundPcOnlyName: {
                scope: "world", config, group: "combat", default: false, type: Boolean
            },
            OpenWoundTableName: {
                scope: "world", config, group: "system", default: "", type: String,
            },
            OpenWoundDeathSave: {
                scope: "world", config, group: "combat", default: 0, type: Number,
            },
            OpenWoundCrit: {
                scope: "world", config, group: "combat", default: false, type: Boolean,
            },
            OpenWoundItemSetting: {
                scope: "world", config, group: "system", default: false, type: Boolean,
            },
        };

        MODULE.registerSubMenu(NAME, settingsData, {tab: 'combat'});
    }

    static hooks() {
        Hooks.on("preUpdateActor", OpenWounds._preUpdateActor)
        Hooks.on("preCreateChatMessage", OpenWounds._preCreateChatMessage);
        Hooks.on("midi-qol.AttackRollComplete", OpenWounds._attackRollComplete)
    }


    static _preUpdateActor(actor, update) {
        let hp = getProperty(update, "data.attributes.hp.value");
        if ((MODULE.setting('OpenWound0HP')) && (hp <= 0)) {
            OpenWounds.OpenWounds(actor, MODULE.localize("DND5EH.OpenWound0HP_reason"))
        }
    }

    static _preCreateChatMessage(msgDocument, msgData) {
        let rollType = getProperty(msgData, "flags.dnd5e.roll.type");
        let itemRoll = getProperty(msgData, "flags.dnd5e.roll.itemId");
        let saveTest = MODULE.setting("OpenWoundDeathSave")
        if (rollType === "death" && !!saveTest) {
            if (parseInt(msgData.content) < saveTest) {
                let actor = game.actors.get(msgData.speaker.actor);
                OpenWounds.OpenWounds(actor, game.i18n.format("DND5EH.OpenWoundDeathSave_reason"));
            }
        }

        if (rollType === "attack" && itemRoll !== undefined && MODULE.setting('OpenWoundCrit')) {

            let rollData = JSON.parse(msgData.roll)
            const critMin = rollData.terms[0].options.critical
            const rollTotal = rollData.terms[0].results.find(i => i.active).result

            if (rollTotal >= critMin) {
                let targetArray = game.users.get(msgData.user).targets;
                for (let targets of targetArray) {
                    OpenWounds.OpenWounds(targets.actor, MODULE.localize("DND5EH.OpenWoundCrit_reason"))
                }
            }
        }
    }

    static _attackRollComplete(workflow) {
        if (MODULE.setting('OpenWoundCrit')) {
            if (workflow.isCritical) {
                OpenWounds.OpenWounds(Array.from(workflow.targets)[0], MODULE.localize("DND5EH.OpenWoundCrit_reason"))
            }
        }
    }

    static async OpenWounds(actor, woundType) {
        if(MODULE.setting("OpenWoundPcOnlyName") && !actor.hasPlayerOwner) return
        logger.debug("Open Wounds info", { actor: actor, woundType: woundType })
        const owFeatureName = MODULE.setting("OpenWoundsFeatureName");
        const openWoundTable = MODULE.setting("OpenWoundTableName");
        ChatMessage.create({
            content: MODULE.format("DND5EH.OpenWoundFeaturename_chatoutput", {
                actorName: actor.data.name,
                owFeatureName: owFeatureName,
                woundType: woundType,
            }),
        });
        if (openWoundTable !== "") {
            let { results } = await game.tables
                .getName(openWoundTable)
                .draw({ roll: null, results: [], displayChat: true });
            if (MODULE.setting("OpenWoundItemSetting")) {
                OpenWounds.itemResult(actor, results)
            }
        } else {
            ChatMessage.create({
                content: MODULE.format("DND5EH.OpenWoundTableName_error", {
                    owFeatureName: owFeatureName,
                }),
            });
        }
    }

    static async itemResult(actor, results) {
        let roll = results[0].data
        const item = await MODULE.getItem(roll.collection, roll.resultId)
        queueUpdate(async () => {
            await actor.createEmbeddedDocuments("Item", [item.data])
        })
    }
}
