import { logger } from '../logger.js';
import { MODULE } from '../module.js';
import { queueUpdate } from './update-queue.js';

const NAME = "UndeadFort";

export class UndeadFort {
    static register() {
        logger.info("Registering Undead Fortitude Calculations");
        UndeadFort.settings();
        UndeadFort.hooks();
    }
    static settings() {
        const config = false;
        const settingsData = {
            UndeadFortEnable: {
                scope: "world", config, group: "npc-features", default: "0", type: String,
                choices: {
                    "0": MODULE.localize("DND5EH.UndeadFort_none"),
                    "1": MODULE.localize("DND5EH.UndeadFort_quick"),
                    "2": MODULE.localize("DND5EH.UndeadFort_advanced"),
                }
            },
            UndeadFortDamageTypes: {
                scope: "world", config, group: "npc-features", default: "Radiant", type: String,
            },
            UndeadFortName: {
                scope: "world", config, group: "npc-features", default: "Undead Fortitude", type: String,
            },
            UndeadFortDC: {
                scope: "world", config, group: "npc-features", default: 5, type: Number,
            },
        };

        MODULE.applySettings(settingsData);
    }

    static hooks() {
        Hooks.on("updateToken", UndeadFort._updateToken)
    }

    static _updateToken(token, update, options) {

        if (!MODULE.isFirstGM()) {
            //get out of here, puny user!
            return true;
        }

        let hp = getProperty(update, "actorData.data.attributes.hp.value");

        let Actor = token.actor
        const featName = MODULE.setting("UndeadFortName")
        let fortitudeFeature = Actor.items.getName(featName);
        let fortSett = !!fortitudeFeature;

        /** output debug information -- @todo scope by feature */

        logger.debug(MODULE.format("DND5EH.Hooks_preupdateToken_updatelog", { ActorName: Actor.name, hp: hp, fortSett: fortSett }))

        if (hp === 0 && fortSett) {
            switch (MODULE.setting('UndeadFortEnable')) {
                case "1": {
                    queueUpdate(async () => { UndeadFort.UndeadFortCheckQuick(token, update, options) })
                }
                    break;
                case "2": {
                    queueUpdate(async () => { UndeadFort.UndeadFortCheckSlow(token, update, options) })

                }
            }
        }
    }

    static async UndeadFortCheckQuick(token, update, options) {

        const tokenData = token.data;

        const data = {
            actorData: token.actor.data,
            updateData: update,
            actorId: tokenData.actorId,
            actorHp: token.actor.data.data.attributes.hp.value,
            updateHP: update.actorData.data.attributes.hp.value,
        }
        const ignoredDamageTypes = MODULE.setting("UndeadFortDamageTypes")
        const baseSave = MODULE.setting("UndeadFortDC")
        const hpChange = (data.actorHp - data.updateHP)

        if (!data.actorHp) {
            logger.error("Cannot read token HP", { token: token })
        }

        if (options.skipUndeadCheck)
            return;

        new Dialog({
            title: MODULE.localize("DND5EH.UndeadFort_dialogname"),
            content: MODULE.localize("DND5EH.UndeadFort_quickdialogcontent"),
            buttons: {
                one: {
                    label: MODULE.format("DND5EH.UndeadFort_quickdialogprompt1", { types: ignoredDamageTypes }),
                    callback: async () => {
                        await token.update({ hp: 0 }, { skipUndeadCheck: true })
                        logger.notify(MODULE.localize("DND5EH.UndeadFort_insantdeathmessage"))
                    },
                },
                two: {
                    label: MODULE.localize("DND5EH.UndeadFort_quickdialogprompt2"),
                    callback: async () => {
                        let { total } = await token.actor.rollAbilitySave("con")
                        if (total >= (baseSave + hpChange)) {
                            logger.notify(MODULE.format("DND5EH.UndeadFort_surivalmessage", { tokenName: token.name, total: total }))
                            await token.actor.update({ "data.attributes.hp.value": 1 }, { skipUndeadCheck: true });
                        } else if (total < (5 + hpChange)) {
                            logger.notify(MODULE.format("DND5EH.UndeadFort_deathmessage", { tokenName: token.name, total: total }))
                            await token.actor.update({ "data.attributes.hp.value": 0 }, { skipUndeadCheck: true })
                        }
                    },
                },
            },
        }).render(true);
    }

    static async UndeadFortCheckSlow(token, update, options) {
        const ignoredDamageTypes = MODULE.setting("UndeadFortDamageTypes")
        const baseSave = MODULE.setting("UndeadFortDC")
        if (!options.skipUndeadCheck) return;

        let damageQuery = MODULE.format("DND5EH.UndeadFort_slowdialogcontentquery")
        let content = `
        <form>
                <div class="form-group">
                    <label for="num">${damageQuery} </label>
                    <input id="num" name="num" type="number" min="0"></input>
                </div>
            </form>`;
        new Dialog({
            title: MODULE.format("DND5EH.UndeadFort_dialogname"),
            content: content,
            buttons: {
                one: {
                    label: MODULE.format("DND5EH.UndeadFort_quickdialogprompt1", { types: ignoredDamageTypes }),
                    callback: async () => {
                        await tokenDocument.update({ hp: 0 }, { skipUndeadCheck: true })
                        logger.notify(MODULE.format("DND5EH.UndeadFort_insantdeathmessage"))
                    },
                },
                two: {
                    label: MODULE.format("DND5EH.UndeadFort_quickdialogprompt2"),
                    callback: async (html) => {
                        const { total } = await tokenDocument.actor.rollAbilitySave("con")
                        const number = Number(html.find("#num")[0].value);
                        if (total >= (baseSave + number)) {
                            logger.notify(MODULE.format("DND5EH.UndeadFort_surivalmessage", { tokenName: token.name, total: total }))
                            await token.actor.update({ "data.attributes.hp.value": 1 }, { skipUndeadCheck: true });
                        } else if (total < (5 + number)) {
                            logger.notify(MODULE.format("DND5EH.UndeadFort_deathmessage", { tokenName: token.name, total: total }))
                            await token.actor.update({ "data.attributes.hp.value": 0 }, { skipUndeadCheck: true })
                        }
                    },
                },
            },
        }).render(true);
    }
}