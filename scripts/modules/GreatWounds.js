import { logger } from '../logger.js';
import { MODULE } from '../module.js';
import { queueUpdate } from './update-queue.js';
import { OpenWounds } from './OpenWounds.js';

const NAME = "GreatWounds";

class GWData {

  constructor(actor, update = {}) {
    this.actor = actor;
    this.data = {
      updateData: update,
      actorHP: actor.data.data.attributes.hp.value,
      actorMax: actor.data.data.attributes.hp.max,
      updateHP: (hasProperty(update, "data.attributes.hp.value") ? update.data.attributes.hp.value : 0),
      hpChange: (actor.data.data.attributes.hp.value - (hasProperty(update, "data.attributes.hp.value") ? update.data.attributes.hp.value : actor.data.data.attributes.hp.value))
    };

    this.chatLabel = MODULE.setting("GreatWoundFeatureName");
    this.saveDC = MODULE.setting("GreatWoundSaveValue");
  }

  thresholdCheck() {
    let pass = false;
    const tPct = MODULE.setting('GreatWoundTriggerPct');
    const tFlat = MODULE.setting('GreatWoundTriggerFlat');

    if (tPct > 0) {
      pass ||= this.data.hpChange >= Math.ceil(this.data.actorMax * tPct/100);
    }

    if (tFlat > 0) {
      pass ||= this.data.hpChange >= tFlat;
    }

    return pass;
  }

  get tableName() {
    return MODULE.setting("GreatWoundTableName");
  }

  get dialogTitle() {
    return MODULE.format("DND5EH.GreatWoundDialogTitle", { gwFeatureName: this.chatLabel, actorName: this.actor.name });
  }

  get dialogContent() {
    return MODULE.format("DND5EH.GreatWoundDialogContents", { actorName: this.actor.name, DC: MODULE.setting("GreatWoundSaveValue") });
  }

  get socketData() {
    return { 
      users: this.actor.data._source.permission,
      actorId: this.actor.id,
      greatwound: true,
      hp: this.data.updateHP,
    }
  }

  get sanitizedName() {
    return MODULE.sanitizeActorName(this.actor, "GreatAndOpenWoundMaskNPC", "DND5EH.GreatAndOpenWoundMaskNPC_mask")
  }

  get failMsgData() {
    return {
      content: MODULE.format("DND5EH.GreatWoundDialogFailMessage", {
        actorName: this.sanitizedName,
        gwFeatureName: this.chatLabel,
      })
    }
  }

  get passMsgData() {
    return {
      content: MODULE.format("DND5EH.GreatWoundDialogSuccessMessage", {
        actorName: this.sanitizedName,
        gwFeatureName: this.chatLabel,
      })
    }
  }
}

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
        scope: "world", config, group: "system", default: false, type: Boolean,
      },
      GreatWoundTriggerPct: {
        scope: "world", config, group: "combat", default: 50, type: Number,
      },
      GreatWoundTriggerFlat: {
        scope: "world", config, group: "combat", default: 0, type: Number,
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
    let gwData = new GWData(actor, update);
    logger.debug("Great Wound update Data", gwData);

    // check if the change in hp would be over 50% max hp
    if (gwData.thresholdCheck()) {
      new Dialog({
        title: gwData.dialogTitle,
        content: gwData.dialogContent,
        buttons: {
          one: {
            label: MODULE.localize("DND5EH.Default_roll"),
            callback: () => {

              /** draw locally if we are the one prompting the change OR if not owned by any players */
              if (game.user.data.role !== 4 || !actor.hasPlayerOwner) {
                GreatWound.DrawGreatWound(gwData);
                return;
              }

              const socketData = gwData.socketData;

              logger.info(MODULE.format("DND5EH.Default_SocketSend", { socketData }))
              game.socket.emit(`module.dnd5e-helpers`, socketData)
            }
          }
        }
      }).render(true)
    }
  }

  static async DrawGreatWound(gwData) {

    const saveTest = gwData.saveDC; 
    let gwSave = saveTest > 0 ? await gwData.actor.rollAbilitySave("con") : {total: -5};

    if (gwSave.total < saveTest) {
      await ChatMessage.create(gwData.failMsgData)
      
      if (gwData.tableName !== "") {
        let { results } = await game.tables
          .getName(gwData.tableName)
          .draw({ roll: null, results: [], displayChat: true });
        if (MODULE.setting("GreatWoundItemSetting") != '0') {
          await GreatWound.itemResult(gwData.actor, results)
        }
      } else {
        await ChatMessage.create({
          content: MODULE.format("DND5EH.GreatWoundDialogError", {
            gwFeatureName: gwData.chatLabel,
          }),
        });
      }
    } else {
      await ChatMessage.create(gwData.passMsgData);
    }

  }

  static greatWoundSocket(socketData) {
    if (!socketData.greatwound && socketData.hp > 0) return
    //Rolls Saves for owned tokens
    const gwData = new GWData(game.actors.get(socketData.actorId));

    for (const [key, value] of Object.entries(socketData.users)) {
      if (value === 3 && game.users.get(`${key}`).data.role !== 4) {
        if (game.user.data._id === `${key}`) {
          GreatWound.DrawGreatWound(gwData);
        }
      }

    }
    if (socketData.hp === 0 && MODULE.setting("OpenWounds0HPGW")) {
      DnDWounds.OpenWounds(
        actor,
        MODULE.format("DND5EH.OpenWoundSocketMessage", {
          gwFeatureName: gwData.chatLabel,
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
