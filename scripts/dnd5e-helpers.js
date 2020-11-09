Hooks.on('init', () => {
  /** should surges be tested */
  game.settings.register("dnd5e-helpers", "wmEnabled", {
    name: "Wild Magic Auto-Detect",
    hint: "Enables or disables this feature for the current user.",
    scope: "client",
    config: true,
    default: false,
    type: Boolean,
  });

  /** want more surges? you know you do */
  game.settings.register("dnd5e-helpers", "wmMoreSurges", {
    name: "MORE Surges (homebrew)",
    hint: "A surge will occur on a d20 roll <= the spell level just cast, rather than only on a 1.",
    scope: "client",
    config: true,
    default: false,
    type: Boolean,
  });

  /** name of the feature to trigger on */
  game.settings.register("dnd5e-helpers", "wmFeatureName", {
    name: "Wild Magic Feature Name",
    hint: "Name of feature that represents the Sorcerer's Wild Magic Surge (default: Wild Magic Surge)",
    scope: "client",
    config: true,
    default: "Wild Magic Surge",
    type: String,
  });

  /** name of the table on which to roll if a surge occurs */
  game.settings.register("dnd5e-helpers", "wmTableName", {
    name: "Wild Magic Surge Table Name",
    hint: "Name of table that should be rolled on if a surge occurs (default: Wild-Magic-Surge-Table). Leave empty to skip this step.",
    scope: "client",
    config: true,
    default: "Wild-Magic-Surge-Table",
    type: String,
  });

  /** toggle result gm whisper for WM */
  game.settings.register("dnd5e-helpers", "wmWhisper", {
    name: "Blind Table Draw",
    hint: "Hides table results of a successful surge. Viewable by GM only.",
    scope: "world",
    config: true,
    default: false,
    type: Boolean,
  });
  /** enable auto reaction reset */
  game.settings.register("dnd5e-helpers", "cbtReactionEnable", {
    name: "Start of turn reaction reset.",
    hint: "Enables or disables this feature (global)",
    scope: "world",
    config: true,
    default: true,
    type: Boolean,
  });

  game.settings.register("dnd5e-helpers", "cbtReactionStatus", {
    name: "Reaction status icon path",
    hint: "Icon path representing the used reaction status effect name (default: downgrade)",
    scope: "world",
    config: true,
    default: "downgrade",
    type: String,
  });

  /** enable auto legact reset */
  game.settings.register("dnd5e-helpers", "cbtLegactEnable", {
    name: "Start of turn legendary action reset.",
    hint: "Enables or disables this feature (global)",
    scope: "world",
    config: true,
    default: true,
    type: Boolean,
  });

  /** enable auto ability charge roll */
  game.settings.register("dnd5e-helpers", "cbtAbilityRecharge", {
    name: "Automatically roll any uncharged abilities with a d6 recharge.",
    hint: "Enables or disables this feature (global)",
    scope: "world",
    config: true,
    default: true,
    type: Boolean,
  });
  game.settings.register("dnd5e-helpers", "gwTableName", {
    name: "Great Wound Table",
    hint: "Name of table that should be rolled on if a Great Wound occurs.",
    scope: "world",
    config: true,
    default: "",
    type: String,
  });
  game.settings.register("dnd5e-helpers", "gwEnable", {
    name: 'Great Wound',
    hint: 'Rolls on a specified table when a token takes over 50% max hp in a single blow',
    scope: 'world',
    type: Boolean,
    default: false,
    config: true,
  });
  game.settings.register("dnd5e-helpers", "autoProf", {
    name: 'Auto Proficiency',
    hint: 'Checks newly added items and labels as proficient if needed',
    scope: 'world',
    type: Boolean,
    default: true,
    config: true,
  });
  game.settings.register("dnd5e-helpers", "autoRegen", {
    name: 'Automatic regeneration ',
    hint: 'Automaticly prompts for regeneration rolls for the GM',
    scope: 'world',
    type: Boolean,
    default: false,
    config: true,
  });

  game.settings.register("dnd5e-helpers", "undeadFort", {
    name: 'Undead Fortitude',
    hint: 'Automaticly prompts for Undead Fortitude Checks for the GM',
    scope: 'world',
    type: String,
    choices: {
      "0": "No checks",
      "1": "Quick Saves",
      "2": "Advanced Saves",
    },
    default: "0",
    config: true,
  });
  game.settings.register("dnd5e-helpers", "debug", {
    name: 'Debugging',
    hint: 'Adds a few console logs for debugging purposes',
    scope: 'world',
    type: Boolean,
    default: false,
    config: true,
  });
});

function RollForSurge(spellLevel, moreSurges, rollType = null) {

  const surgeThreshold = moreSurges ? spellLevel : 1;
  const roll = new Roll("1d20").roll();
  const d20result = roll["result"];
  if (d20result <= surgeThreshold) {
    ChatMessage.create({
      content: "<i>surges as a level " + spellLevel + " spell is cast!</i> ([[/r " + d20result + " #1d20 result]])",
      speaker: ChatMessage.getSpeaker({ alias: "The Weave" })
    });

    /** roll on the provided table */
    const wmTableName = game.settings.get('dnd5e-helpers', 'wmTableName');
    if (wmTableName !== "") {
      game.tables.getName(wmTableName).draw({ roll: null, results: [], displayChat: true, rollMode: rollType });
    }
  }
  else {
    ChatMessage.create({
      content: "<i>remains calm as a level " + spellLevel + " spell is cast...</i> ([[/r " + d20result + " #1d20 result]])",
      speaker: ChatMessage.getSpeaker({ alias: "The Weave" })
    });
  }
}

function NeedsRecharge(recharge = { value: 0, charged: false }) {
  return (recharge.value !== null &&
    (recharge.value > 0) &&
    recharge.charged !== null &&
    recharge.charged == false);
}

function CollectRechargeAbilities(token) {
  const rechargeItems = token.actor.items.filter(e => NeedsRecharge(e.data.data.recharge));
  return rechargeItems;
}

async function RechargeAbilities(token) {
  const rechargeItems = CollectRechargeAbilities(token);

  for (item of rechargeItems) {
    await item.rollRecharge();
  }
}
/** Wild Magic Surge Handling */
function WildMagicSuge_preUpdateActor(actor, update, options, userId) {
  const origSlots = actor.data.data.spells;

  /** find the spell level just cast */
  const spellLvlNames = ["spell1", "spell2", "spell3", "spell4", "spell5", "spell6", "spell7", "spell8", "spell9"];
  let lvl = spellLvlNames.findIndex(name => { return getProperty(update, "data.spells." + name) });

  const preCastSlotCount = getProperty(origSlots, spellLvlNames[lvl] + ".value");
  const postCastSlotCount = getProperty(update, "data.spells." + spellLvlNames[lvl] + ".value");
  const bWasCast = preCastSlotCount - postCastSlotCount > 0;

  const wmFeatureName = game.settings.get('dnd5e-helpers', 'wmFeatureName');
  const wmFeature = actor.items.find(i => i.name === wmFeatureName) !== null

  lvl++;
  console.log("A level " + lvl + " slot was expended(" + bWasCast + ") by a user with the Wild Magic Feature(" + wmFeatureName + ")");
  if (wmFeature && bWasCast && lvl > 0) {
    /** lets go baby lets go */
    console.log("Rolling for surge...");

    const moreSurges = game.settings.get('dnd5e-helpers', 'wmMoreSurges');

    const rollMode = game.settings.get('dnd5e-helpers', 'wmWhisper') ? "blindroll" : "roll";
    RollForSurge(lvl, moreSurges, rollMode);
  }
}

/** sets current legendary actions to max (or current if higher) */
async function ResetLegAct(token) {
  if (token.actor == null) {
    return;
  }
  let legact = token.actor.data.data.resources.legact;
  if (legact && legact.value !== null) {
    /** only reset if needed */
    if (legact.value < legact.max) {
      legact.value = legact.max;
      await token.actor.update({ 'data.resources.legact': legact });
      token.actor.sheet.render(false);
    }
  }
}

/** checks for Unlinked Token Great Wounds */
function GreatWound_preUpdateToken(scene, tokenData, update) {

  //find update data and original data
  let actor = game.actors.get(tokenData.actorId)
  let data = {
    actorData: canvas.tokens.get(tokenData._id).actor.data,
    updateData: update,
    actorHP: getProperty(tokenData, "actorData.data.attributes.hp.value"),
    actorMax: getProperty(tokenData, "actorData.data.attributes.hp.max"),
    updateHP: update.actorData.data.attributes.hp.value,
  }
  if (data.actorMax == undefined) {
    data.actorMax = actor.data.data.attributes.hp.max;
  }
  if (data.actorHP == undefined) {
    data.actorHP = data.actorMax;
  }
  let hpChange = (data.actorHP - data.updateHP)
  // check if the change in hp would be over 50% max hp
  if (hpChange >= Math.ceil(data.actorMax / 2) && data.updateHP !== 0) {
    new Dialog({
      title: `Great Wound roll for ${actor.name}`,
      buttons: {
        one: {
          label: "Roll",
          callback: () => {
            (async () => {
              let { total } = await actor.rollAbilitySave("con")
              if (total < 15) {
                DrawGreatWound(data.actor);
              }
            })()
          }
        }
      }
    }).render(true)
  }
}


/** checks for Linked Token Great Wounds */
function GreatWound_preUpdateActor(actor, update) {

  //find update data and original data
  let data = {
    actor: actor,
    actorData: actor.data,
    updateData: update,
    actorHP: actor.data.data.attributes.hp.value,
    actorMax: actor.data.data.attributes.hp.max,
    updateHP: (hasProperty(update, "data.attributes.hp.value") ? update.data.attributes.hp.value : 0),
    hpChange: (actor.data.data.attributes.hp.value - (hasProperty(update, "data.attributes.hp.value") ? update.data.attributes.hp.value : actor.data.data.attributes.hp.value))
  };

  // check if the change in hp would be over 50% max hp
  if (data.hpChange >= Math.ceil(data.actorMax / 2) && data.updateHP !== 0) {
    new Dialog({
      title: `Great Wound roll for ${actor.name}`,
      buttons: {
        one: {
          label: "Roll",
          callback: () => {
            (async () => {
              let { total } = await actor.rollAbilitySave("con")
              if (total < 15) {
                DrawGreatWound(data.actor);
              }
            })()
          }
        }
      }
    }).render(true)
  }
}

/** rolls on specified Great Wound Table */
function DrawGreatWound(actor) {

  const greatWoundTable = game.settings.get('dnd5e-helpers', 'gwTableName')
  if (greatWoundTable !== "") {
    game.tables.getName(greatWoundTable).draw({ roll: null, results: [], displayChat: true });
  } else {
    ChatMessage.create({ content: "Looks like you havnt setup a table to use for Great Wounds yet" });
  }
}

/** Prof array check */
function includes_array(arr, comp) {
  //Ignore empty array
  if(arr.toString()==[""]){
    return false;
  }
  return arr.reduce((acc, str) => comp.toLowerCase().includes(str.toLowerCase()) || acc, false);
}

/** auto prof Weapon*/
function AutoProfWeapon_createOwnedItem(actor, item, sheet, id) {

  //finds item data and actor proficiencies 
  let { weaponType } = item.data;
  let { name } = item;
  let { weaponProf } = actor.data.data.traits;
  let proficient = false;

  // finds weapon simple/martial type
  let pass_type = (weaponType === 'simpleM' || weaponType === 'simpleR') ? 'sim'
    : (weaponType === 'martialM' || weaponType === 'martialR') ? 'mar' : null;

  //if weapon type maches actor sim/mar prof then prof = true
  if (weaponProf.value.includes(pass_type)) proficient = true;

  //if item name matches custom prof lis then prof = true
  /** @todo consider making this more permissive ex. Dagger vs Daggers vs dagger vs daggers */
  if (includes_array(weaponProf.custom.split(" ").map(s => s.slice(0, -1)), name)) proficient = true;

  // update item to match prof
  if (proficient) {
    actor.updateOwnedItem({ _id: item._id, "data.proficient": true });
    console.log(name + " is marked as proficient")
  } else {
    //Remove proficiency if actor is not proficient and the weapon has proficiency set.
    if (!proficient && item.data.proficient){
      actor.updateOwnedItem({ _id: item._id, "data.proficient": false });
      console.log(name + " is marked as not proficient")
    }else {
      ui.notifications.notify(name + " could not be matched to proficiency, please adjust manually.");
    }
  }
}

/** Auto prof Armor*/
function AutoProfArmor_createOwnedItem(actor, item, sheet, id) {

  //finds item data and actor proficiencies 
  let { type } = item.data.armor;
  let { name } = item;
  let { armorProf } = actor.data.data.traits;
  let proficient = false;

  // finds weapon simple/martial type
  let pass_type = type === 'light' ? 'lgt'
    : type === 'medium' ? 'med' 
    : type === 'heavy' ? 'hvy' 
    : type === 'shield' ? 'shl'
    : null;

  //if armor type maches actor armor prof then prof = true
  if (armorProf.value.includes(pass_type)) proficient = true;

  //if item name matches custom prof lis then prof = true
  if (includes_array(armorProf.custom.split(" ").map(s => s.slice(0, -1)), name)) proficient = true;

  // update item to match prof
  //For items that are not armors (trinkets, clothing) we assume prof = true 
  if (proficient || pass_type == null) {
    actor.updateOwnedItem({ _id: item._id, "data.proficient": true });
    console.log(name + " is marked as proficient")
  } else {
    //remove armor proficiency if actor does not have it.
    if (!proficient && item.data.proficient){
      actor.updateOwnedItem({ _id: item._id, "data.proficient": false });
      console.log(name + " is marked as not proficient")
    } else {
      ui.notifications.notify(name + " could not be matched to proficiency , please adjust manually");
    }
  }
}

/**Auto Prof Tools*/
function AutoProfTool_createOwnedItem(actor, item, sheet, id) {

  //finds item data and actor proficiencies 
  let { name } = item;
  let { toolProf } = actor.data.data.traits;
  let proficient = false;

  //pass_name is here to match some of the toolProf strings
  const pass_name = name.toLowerCase().replace("navi","navg").replace("thiev","thief");

  if (includes_array(toolProf.value, pass_name)) proficient = true;

  //if item name matches custom prof lis then prof = true
  if (includes_array(toolProf.custom.split(" ").map(s => s.slice(0, -1)), name)) proficient = true;

  // update item to match prof
  //For items that are not armors (trinkets, clothing) we assume prof = true 
  if (proficient) {
    actor.updateOwnedItem({ _id: item._id, "data.proficient": 1 });
    console.log(name + " is marked as proficient")
  } else {
    ui.notifications.notify(name + " could not be matched to proficiency , please adjust manually");
  }
}

/** auto regeneration on turn start */
async function Regeneration(token) {
  console.log(token)
  if (token.actor == null) {
    return;
  }
  let regen = token.actor.items.find(i => i.name === "Regeneration")

  //find token hp value and max hp value 
  let data = {
    tokenHP: getProperty(token, "data.actorData.data.attributes.hp.value"),
    actorMax: token.actor.data.data.attributes.hp.max,
  }
  // if token isnt damaged, set tokenHP to max
  if (data.tokenHP == undefined) {
    data.tokenHP = data.actorMax
  }
  // parse the regeration item to locate the formula to use 

  const regenRegExp = new RegExp("([0-9]+|[0-9]*d0*[1-9][0-9]*) hit points");
  let match = regen.data.data.description.value.match(regenRegExp);
  if (!match) return undefined
  let regenAmout = match[1]

  //dialog choice to heal or not
  if (regenAmout !== null) {
    new Dialog({
      title: "Regeneration for " + token.name,
      content: token.name + ` currently has ${data.tokenHP}/${data.actorMax} Hp`,
      buttons: {
        one: {
          label: `Apply healing of ${regenAmout}`,
          callback: () => {
            let regenRoll = new Roll(regenAmout).roll().total
            token.actor.applyDamage(- regenRoll)
            ChatMessage.create({ content: token.name + ` was healed for ${regenRoll}`, whisper: ChatMessage.getWhisperRecipients('gm').map(o => o.id) })
          }
        },
        two: {
          label: "Do not heal"
        }
      }
    }).render(true)

  }
}

function UndeadFortCheckQuick(tokenData, update, options) {
  let data = {
    actorData: canvas.tokens.get(tokenData._id).actor.data,
    updateData: update,
    actorId: tokenData.actorId,
    actorHP: getProperty(tokenData, "actorData.data.attributes.hp.value"),
    updateHP: update.actorData.data.attributes.hp.value,
  }
  if (data.actorHp == null) {
    data.actorHp = game.actors.get(data.actorId).data.data.attributes.hp.max
  }
  let hpChange = (data.actorHp - data.updateHP)
  let token = canvas.tokens.get(tokenData._id)
  if (!options.skipUndeadCheck) {
    new Dialog({
      title: "Undead Fortitude Save",
      content: "<p>What was the damage source</p>",
      buttons: {
        one: {
          label: "Radiant Damage or Critical Hit",
          callback: () => {
            token.update({ hp: 0 }, { skipUndeadCheck: true })
            ui.notifications.notify("The target dies outright")
            return;
          },
        },
        two: {
          label: "Normal Damage",
          callback: async () => {
            let { total } = await token.actor.rollAbilitySave("con")
            if (total >= (5 + hpChange)) {
              ui.notifications.notify(`${token.name} survives with a ${total}`)
              token.update({ "actorData.data.attributes.hp.value": 1 }, { skipUndeadCheck: true });
            } else if (total < (5 + hpChange)) {
              ui.notifications.notify(`${token.name} dies as it rolls a ${total} `)
              token.update({ "actorData.data.attributes.hp.value": 0 }, { skipUndeadCheck: true })
            }
          },
        },
      },
    }).render(true);
    return false;
  } else return true;
}

function UndeadFortCheckSlow(tokenData, update, options) {
  let data = {
    actorData: canvas.tokens.get(tokenData._id).actor.data,
    updateData: update,
    actorHP: tokenData.actorData.data.attributes.hp.value,
    updateHP: update.actorData.data.attributes.hp.value,
    hpChange: (tokenData.actorData.data.attributes.hp.value - update.actorData.data.attributes.hp.value)
  }
  let token = canvas.tokens.get(tokenData._id)
  if (!options.skipUndeadCheck) {
    let content = `
    <form>
            <div class="form-group">
                <label for="num">Damage to target: </label>
                <input id="num" name="num" type="number" min="0"></input>
            </div>
        </form>`;
    new Dialog({
      title: "Undead Fortitude Save",
      content: content,
      buttons: {
        one: {
          label: "Radiant Damage or Critical Hit",
          callback: () => {
            token.update({ hp: 0 }, { skipUndeadCheck: true })
            ui.notifications.notify("The target dies outright")
            return;
          },
        },
        two: {
          label: "Normal Damage",
          callback: async (html) => {
            let { total } = await token.actor.rollAbilitySave("con")
            let number = Number(html.find("#num")[0].value);
            if (total >= (5 + number)) {
              ui.notifications.notify(`${token.name} survives with a ${total}`)
              token.update({ "actorData.data.attributes.hp.value": 1 }, { skipUndeadCheck: true });
            } else if (total < (5 + number)) {
              ui.notifications.notify(`${token.name} dies as it rolls a ${total} `)
              token.update({ "actorData.data.attributes.hp.value": 0 }, { skipUndeadCheck: true })
            }
          },
        },
      },
    }).render(true);
    return false;
  } else return true;
}

//collate all preUpdateActor hooked functions into a single hook call
Hooks.on("preUpdateActor", async (actor, update, options, userId) => {
  //check what property is updated to prevent unnessesary function calls
  let hp = getProperty(update, "data.attributes.hp.value");
  let spells = getProperty(update, "data.spells");
  if (game.settings.get('dnd5e-helpers', 'debug')) {
    console.log(`Dnd5e Helpers: ${actor.name}'s update contains hp: ${hp}, spells: ${spells}`)
  }
  /** WM check, are we enabled for the current user? */
  if ((game.settings.get('dnd5e-helpers', 'wmEnabled') == true) && (spells !== undefined)) {
    WildMagicSuge_preUpdateActor(actor, update, options, userId)
  }
  // GW check 
  if ((game.settings.get('dnd5e-helpers', 'gwEnable')) && (hp !== undefined)) {
    GreatWound_preUpdateActor(actor, update);
  }

});


/** All preUpdateCombat hooks are managed here */
Hooks.on("preUpdateCombat", async (combat, changed, options, userId) => {

  /** only concerned with turn changes */
  if (!("turn" in changed)) {
    return;
  }

  /** just want this to run for GMs */
  /** features to be executed _only_ by the first gm:
   *  Legenadry Action reset
   *  d6 ability recharge
   *  reaction status clear
   */
  const firstGm = game.users.find((u) => u.isGM && u.active);
  if (firstGm && game.user === firstGm) {

    /** begin removal logic for the _next_ token */
    const nextTurn = combat.turns[changed.turn];
    /** data structure for 0.6 */
    let nextTokenId = null;
    if (getProperty(nextTurn, "tokenId")) {
      nextTokenId = nextTurn.tokenId;
    }
    else {
      nextTokenId = nextTurn.token._id;
    }


    let currentToken = canvas.tokens.get(nextTokenId);
    let regen = currentToken.actor.items.find(i => i.name === "Regeneration")

    if (game.settings.get('dnd5e-helpers', 'debug')) {
      let regenSett = !!regen
      console.log(`Dnd5e Helpers: ${currentToken.name}'s update contains regen: ${regenSett}`)
    }

    if (currentToken) {
      if (game.settings.get('dnd5e-helpers', 'cbtLegactEnable') == true) {
        ResetLegAct(currentToken);
      }

      if (game.settings.get('dnd5e-helpers', 'cbtAbilityRecharge') == true) {
        RechargeAbilities(currentToken);
      }

      if ((game.settings.get('dnd5e-helpers', 'autoRegen')) && (regen !== null)) {
        Regeneration(currentToken)
      }

      /** hb@todo: functionalize this similar to the other cbt operations */
      if (game.settings.get('dnd5e-helpers', 'cbtReactionEnable')) {

        const reactionStatus = game.settings.get('dnd5e-helpers', 'cbtReactionStatus');

        const isv6 = game.data.version.includes("0.6.");
        const isv7 = game.data.version.includes("0.7.");
        if (isv6) {
          if (currentToken.data.effects.includes(reactionStatus)) {
            await currentToken.toggleEffect(reactionStatus);
          }
        }
        else if (isv7) {
          /** latest version, attempt to play nice with active effects and CUB statuses */
          let statusEffect = CONFIG.statusEffects.find(e => e.id === reactionStatus || e.id === "combat-utility-belt."+reactionStatus)
          if (!statusEffect) {
            console.log("dnd5e-helpers: could not located active effect named: " + reactionStatus);
            return;
          }

          /** Remove an existing effect (stoken from foundy.js:44223 */
          const existing = currentToken.actor.effects.find(e => e.getFlag("core", "statusId") === statusEffect.id);
          if (existing) {
            await currentToken.toggleEffect(statusEffect);
          }

        }
        else {
          console.log("dnd5e-helpers: UNSUPPORTED VERSION FOR REACTION HANDLING");
        }
      }
    }

  }

});

/** all preUpdateToken hooks handeled here */
Hooks.on("preUpdateToken", (scene, tokenData, update, options) => {

  if ((game.settings.get('dnd5e-helpers', 'gwEnable'))) {
    GreatWound_preUpdateToken(scene, tokenData, update);
  }

  let hp = getProperty(update, "actorData.data.attributes.hp.value");
  let Actor = game.actors.get(tokenData.actorId);
  let fortitudeFeature = Actor.items.find(i => i.name === "Undead Fortitude");
  let fortSett = !!fortitudeFeature;

  /** output debug information -- @todo scope by feature */
  if (game.settings.get('dnd5e-helpers', 'debug')) {
    console.log(`Dnd5e Helpers: ${Actor.name}'s update contains hp: ${hp}, and Fort: ${fortSett}`)
  }
  
  if (game.settings.get('dnd5e-helpers', 'undeadFort') === "1") {
    if (hp === 0 && fortitudeFeature !== null) {
      UndeadFortCheckQuick(tokenData, update, options)
    }
  }
  if (game.settings.get('dnd5e-helpers', 'undeadFort') === "2") {
    if (hp === 0 && fortitudeFeature !== null) {
      UndeadFortCheckSlow(tokenData, update, options)
    }
  }
});

/** all createOwnedItem hooks handeled here */
Hooks.on("createOwnedItem", (actor, item, sheet, id) => {
  let type = item.type
  if(game.settings.get('dnd5e-helpers', 'autoProf')){
    switch(type){
      case "weapon":
        AutoProfWeapon_createOwnedItem(actor, item, sheet, id);
        break;
      case "equipment":
        AutoProfArmor_createOwnedItem(actor, item, sheet, id);
        break;
      case "tool":
        AutoProfTool_createOwnedItem(actor, item, sheet, id);
        break;
      default:
        break;
    }
  }
});

