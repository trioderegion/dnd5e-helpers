import { D5HSettingsConfig, PATH, MODULE } from "./modules/config-app.js";
import { queueEntityUpdate } from "./modules/update-queue.js";

// Import Features
import { D5HCoverCalculator } from "./modules/cover-calculator.js";
import { D5HGreatWounds, D5HWounds, D5HOpenWounds } from "./modules/wounds.js";
import { D5HLairActions } from "./modules/lair-actions.js"
import { D5HProficiencyDetection } from "./modules/proficiency-detection.js";
import { D5HRecharge } from "./modules/recharge.js";
import { D5HRegeneration } from "./modules/regeneration.js";
import { D5HScalingTemplate } from "./modules/template-scaling.js";
import { D5HUndeadFortitude } from "./modules/undead-fortitude.js";
import { D5HWildMagicSurge } from "./modules/wild-magic-surge.js";
// Import System Extensions
import { D5HCombatEnhancements } from "./modules/combat-enhancements.js";
import { D5HDiceExtensions } from "./modules/dice-extensions.js";


Hooks.on("init", () => {
  console.log("DnD5e Helpers | Initializing DnD5e Helpers Module");
  D5HSettingsConfig.onInit();
  // Add the feature config to the Settings Config menu.
  D5HCombatEnhancements.onInit();
  D5HCoverCalculator.onInit();
  D5HGreatWounds.onInit();
  D5HLairActions.onInit();
  D5HOpenWounds.onInit();
  D5HProficiencyDetection.onInit();
  D5HRecharge.onInit();
  D5HRegeneration.onInit();
  D5HScalingTemplate.onInit();
  D5HUndeadFortitude.onInit();
  D5HWildMagicSurge.onInit();

  // Init system extensions
  D5HDiceExtensions.onInit();
  // game.settings.register("dnd5e-helpers", "debug", {
  //   name: game.i18n.format("DND5EH.OpenWoundDebug_name"),
  //   hint: game.i18n.format("DND5EH.OpenWoundDebug_hint"),
  //   scope: 'world',
  //   type: Boolean,
  //   group: "system",
  //   default: false,
  //   config: false,
  // });
});

Hooks.on("ready", () => {
  D5HWounds.onReady();
});

Hooks.on("renderChatMessage", (app, html, data) => {
  let coverBackground;
  switch (game.settings.get("dnd5e-helpers", "coverTint")) {
    case 0:
      coverBackground = "DarkRed";
      break;
    case 1:
      coverBackground = "CadetBlue";
      break;
    case 2:
      coverBackground = "DimGrey";
      break;
    case 3:
      coverBackground =
        "linear-gradient(to right, orange , yellow, green, cyan, blue, violet)";
  }
  let whisperContent = html.find(".whisper-to")[0];
  if (whisperContent) whisperContent.textContent = "";
  let half = html.find(".dnd5ehelpersHalfCover")[0];
  let three = html.find(".dnd5ehelpersQuarterCover")[0];
  if (!half || !three) return;
  half.addEventListener("click", function () {
    AddCover(half, three);
  });
  three.addEventListener("click", function () {
    AddCover(three, half);
  });
  let active = html.find(".cover-button.active")[0];
  active.style.background = coverBackground;
  active.childNodes[0].style.opacity = 0.8;
  let message = game.messages.entries.find((m) => m.id === app.id);
  message.setFlag("dnd5e-helpers", "coverMessage", true);
});

//collate all preUpdateActor hooked functions into a single hook call
Hooks.on("preUpdateActor", async (actor, update, options, userId) => {
  //check what property is updated to prevent unnessesary function calls
  let hp = getProperty(update, "data.attributes.hp.value");
  let spells = getProperty(update, "data.spells");
  if (game.settings.get("dnd5e-helpers", "debug")) {
    console.log(
      game.i18n.format("DND5EH.Hooks_preUpdateActor_updatelog", {
        actorName: actor.name,
        hp: hp,
        spells: spells,
      })
    );
  }

  /** WM check, are we enabled for the current user? */
  const wmSelectedOption = game.settings.get("dnd5e-helpers", "wmOptions");
  if (wmSelectedOption !== 0 && spells !== undefined) {
    await DnDWildMagic.WildMagicSurge_preUpdateActor(
      actor,
      update,
      wmSelectedOption
    );
  }

  /** Great wound checks */
  if (game.settings.get("dnd5e-helpers", "gwEnable") && hp !== undefined) {
    DnDWounds.GreatWound_preUpdateActor(actor, update);
  }

  /** Open wound checks */
  if (game.settings.get("dnd5e-helpers", "owHp0") && hp === 0) {
    DnDWounds.OpenWounds(
      actor.data.name,
      game.i18n.format("DND5EH.OpenWound0HP_reason")
    );
  }
});

/** All preUpdateCombat hooks are managed here */
Hooks.on("updateCombat", async (combat, changed, options, userId) => {
  if (changed.round === 1 && combat.started) {
    let tokenIds = combat.data.combatants.reduce(
      (a, v) => a.concat(v.tokenId),
      []
    );
    let tokenArray = canvas.tokens.placeables.filter((i) =>
      tokenIds.includes(i.id)
    );
    DnDActionManagement.AddActionMarkers(tokenArray);
  }

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
    // early return if no combatants active
    let thisCombat = game.combats.get(combat.id);
    if (thisCombat.data.combatants.length == 0) return;

    /** begin removal logic for the _next_ token */
    const nextTurn = combat.turns[changed.turn];
    const previousTurn =
      combat.turns[
        changed.turn - 1 > -1 ? changed.turn - 1 : combat.turns.length - 1
      ];

    /** data structure for 0.6 */
    let nextTokenId = null;
    if (getProperty(nextTurn, "tokenId")) {
      nextTokenId = nextTurn.tokenId;
    } else {
      nextTokenId = getProperty(nextTurn, "token._id");
    }

    let currentToken = canvas.tokens.get(nextTokenId);
    let previousToken = canvas.tokens.get(previousTurn.tokenId);

    /** we dont care about tokens without actors */
    if (!currentToken?.actor) {
      return;
    }
    let option1 = game.i18n.format("DND5EH.AutoRegen_Regneration");
    let option2 = game.i18n.format("DND5EH.AutoRegen_SelfRepair");
    let regen = currentToken.actor.items.find(
      (i) => i.name === option1 || i.name === option2
    );

    if (game.settings.get("dnd5e-helpers", "debug")) {
      let regenSett = !!regen;
      console.log(
        game.i18n.format("DND5EH.Hooks_updateActor_updatelog", {
          currentTokenName: currentToken.name,
          regenSett: regenSett,
        })
      );
    }

    if (game.settings.get("dnd5e-helpers", "lairHelperEnable")) {
      let pastLair = false;
      if (nextTurn?.initiative && previousTurn?.initiative) {
        pastLair =
          nextTurn.initiative < 20 && combat.turns.indexOf(nextTurn) === 0
            ? true
            : nextTurn.initiative < 20 && previousTurn.initiative > 20
            ? true
            : false;
      }

      if (pastLair) {
        const lairActions = combat.getFlag("dnd5e-helpers", "Lair Actions");
        if (lairActions?.length ?? [] > 0) {
          DnDCombatUpdates.RunLairActions(lairActions);
        }
      }
    }
    if (game.settings.get("dnd5e-helpers", "LegendaryHelperEnable")) {
      const LegActions = combat.getFlag("dnd5e-helpers", "Legendary Actions");
      if (LegActions?.length ?? [] > 0) {
        DnDCombatUpdates.RunLegendaryActions(LegActions, previousToken.id);
      }
    }

    /** @todo data vs _data -- multiple updates reset changes made by previous updates */
    if (currentToken) {
      if (game.settings.get("dnd5e-helpers", "cbtLegactEnable") == true) {
        await DnDCombatUpdates.ResetLegAct(
          currentToken.actor,
          currentToken.name
        );
      }

      if (
        game.settings.get("dnd5e-helpers", "cbtAbilityRecharge") === "start"
      ) {
        await DnDCombatUpdates.RechargeAbilities(currentToken);
      }

      if (game.settings.get("dnd5e-helpers", "autoRegen") && !!regen === true) {
        await DnDCombatUpdates.Regeneration(currentToken);
      }

      const reactMode = game.settings.get("dnd5e-helpers", "cbtReactionEnable");
      if (reactMode === 1) {
        await DnDActionManagement.ReactionRemove(currentToken);
      }
    }
    if (previousToken) {
      if (game.settings.get("dnd5e-helpers", "cbtAbilityRecharge") === "end") {
        await DnDCombatUpdates.RechargeAbilities(previousToken);
      }
      removeCover(undefined, previousToken);
    }
  }
});

/** all preUpdateToken hooks handeled here */
Hooks.on("preUpdateToken", (_scene, tokenData, update, options) => {
  let hp = getProperty(update, "actorData.data.attributes.hp.value");
  if (
    game.settings.get("dnd5e-helpers", "gwEnable") &&
    hp !== (null || undefined)
  ) {
    DnDWounds.GreatWound_preUpdateToken(tokenData, update);
  }

  let Actor = game.actors.get(tokenData.actorId);
  let fortitudeFeature = Actor?.items.find(
    (i) => i.name === game.i18n.format("DND5EH.UndeadFort_name")
  );
  let fortSett = !!fortitudeFeature;

  /** output debug information -- @todo scope by feature */
  if (game.settings.get("dnd5e-helpers", "debug")) {
    console.log(
      game.i18n.format("DND5EH.Hooks_preupdateToken_updatelog", {
        ActorName: Actor.name,
        hp: hp,
        fortSett: fortSett,
      })
    );
  }

  if (game.settings.get("dnd5e-helpers", "undeadFort") === "1") {
    if (hp === 0 && fortitudeFeature !== null) {
      DnDCombatUpdates.UndeadFortCheckQuick(tokenData, update, options);
    }
  }
  if (game.settings.get("dnd5e-helpers", "undeadFort") === "2") {
    if (hp === 0 && fortitudeFeature !== null) {
      DnDCombatUpdates.UndeadFortCheckSlow(tokenData, update, options);
    }
  }
});

/** all createOwnedItem hooks handeled here */
Hooks.on("createOwnedItem", (actor, item, sheet, id) => {
  let type = item.type;
  if (
    game.settings.get("dnd5e-helpers", "autoProf") &&
    actor.data.type === "character"
  ) {
    switch (type) {
      case "weapon":
        DnDProf.AutoProfWeapon_createOwnedItem(actor, item);
        break;
      case "equipment":
        DnDProf.AutoProfArmor_createOwnedItem(actor, item);
        break;
      case "tool":
        DnDProf.AutoProfTool_createOwnedItem(actor, item);
        break;
      default:
        break;
    }
  }
});

Hooks.on("preCreateChatMessage", async (msg, options, userId) => {
  const reactMode = game.settings.get("dnd5e-helpers", "cbtReactionEnable");
  if (reactMode === 1) {
    await DnDActionManagement.ReactionDetect_preCreateChatMessage(msg);
  }

  let rollType = getProperty(msg, "flags.dnd5e.roll.type");
  let itemRoll = getProperty(msg, "flags.dnd5e.roll.itemId");
  if (
    rollType === "death" &&
    game.settings.get("dnd5e-helpers", "owDeathSave")
  ) {
    if (parseInt(msg.content) < 6) {
      let actor = game.actors.get(msg.speaker.actor);
      DnDWounds.OpenWounds(
        actor.data.name,
        game.i18n.format("DND5EH.OpenWoundDeathSave_reason")
      );
    }
  }

  if (
    rollType === "attack" &&
    itemRoll !== undefined &&
    game.settings.get("dnd5e-helpers", "owCrit")
  ) {
    let rollData = JSON.parse(msg.roll);
    const critMin = rollData.terms[0].options.critical;
    const rollTotal = rollData.terms[0].results.find((i) => i.active).result;

    if (rollTotal >= critMin) {
      let targetArray = game.users.get(msg.user).targets;
      for (let targets of targetArray) {
        DnDWounds.OpenWounds(
          targets.actor.data.name,
          game.i18n.format("DND5EH.OpenWoundCrit_reason")
        );
      }
    }
  }
});

Hooks.on("deleteCombat", async (combat, settings, id) => {
  const reactMode = game.settings.get("dnd5e-helpers", "cbtReactionEnable");
  if (reactMode === 1) {
    for (let combatant of combat.data.combatants) {
      await DnDActionManagement.RemoveActionMarkers(combatant.tokenId);
    }
  }

  if (
    game.settings.get("dnd5e-helpers", "losOnTarget") > 0 &&
    DnDHelpers.IsFirstGM()
  ) {
    for (let combatant of combat.data.combatants) {
      let token = canvas.tokens.get(combatant.tokenId);
      await removeCover(undefined, token);
    }
  }

  DnDCombatUpdates.cleanUpCover(combat);
});

Hooks.on("deleteCombatant", async (combat, combatant) => {
  const reactMode = game.settings.get("dnd5e-helpers", "cbtReactionEnable");

  if (reactMode === 1) {
    await DnDActionManagement.RemoveActionMarkers(combatant.tokenId);
  }

  if (game.settings.get("dnd5e-helpers", "lairHelperEnable")) {
    DnDCombatUpdates.RemoveLairMapping(combat, combatant);
  }

  if (game.settings.get(MODULE, "LegendaryHelperEnable")) {
    DnDCombatUpdates.RemoveLegMapping(combat, combatant);
  }

  if (
    game.settings.get("dnd5e-helpers", "losOnTarget") > 0 &&
    DnDHelpers.IsFirstGM()
  ) {
    let token = canvas.tokens.get(combatant.tokenId);
    removeCover(undefined, token);
  }
});

/** Measured template 5/5/5 scaling */
Hooks.on("preCreateMeasuredTemplate", async (scene, template) => {
  /** range 0-3
   *  b01 = line/cone,
   *  b10 = circles,
   *  b11 = both
   */
  const templateMode = game.settings.get(
    "dnd5e-helpers",
    "gridTemplateScaling"
  );

  if (templateMode == 0) {
    /** template adjusting is not enabled, bail out */
    return;
  }

  if (
    !!(templateMode & 0b01) &&
    (template.t == "ray" || template.t == "cone")
  ) {
    /** scale rays after placement to cover the correct number of squares based on 5e diagonal distance */
    let diagonalScale =
      Math.abs(Math.sin(Math.toRadians(template.direction))) +
      Math.abs(Math.cos(Math.toRadians(template.direction)));
    template.distance = diagonalScale * template.distance;
  } else if (
    !!(templateMode & 0b10) &&
    template.t == "circle" &&
    !(template.distance / scene.data.gridDistance < 0.9)
  ) {
    /** Convert circles to equivalent squares (e.g. fireball is square)
     *  if the template is 1 grid unit or larger (allows for small circlar
     *  templates as temporary "markers" of sorts
     */

    /** convert to a rectangle */
    template.t = "rect";

    /** convert radius in grid units to radius in pixels */
    let radiusPx =
      (template.distance / scene.data.gridDistance) * scene.data.grid;

    /** shift origin to top left in prep for converting to rectangle */
    template.x -= radiusPx;
    template.y -= radiusPx;

    /** convert the "distance" to the squares hypotenuse */
    const length = template.distance * 2;
    template.distance = Math.hypot(length, length);

    /** always measured top left to bottom right */
    template.direction = 45;
  }
});

/** adding cover dropdown to the tile config dialog */
Hooks.on("renderTileConfig", onRenderTileConfig);

/** calculating cover when a token is targeted */
Hooks.on("targetToken", (user, target, onOff) => {
  if (game.user !== user) return; // only fire once
  const k = game.keyboard;
  const keybind = game.settings.get("dnd5e-helpers", "losKeybind");
  const confirmCover = k._downKeys.has(keybind) || keybind === "";
  const oneTarget = user.targets.size == 1;
  switch (oneTarget) {
    case true:
      {
        if (confirmCover) {
          onTargetToken(user, target, onOff);
        }
      }
      break;
    case false:
      {
        removeCover(user);
      }
      break;
  }
});

Hooks.on("preCreateTile", onPreCreateTile);

Hooks.on("ready", () => {
  const reactMode = game.settings.get("dnd5e-helpers", "cbtReactionEnable");
  if (reactMode === 1) {
    let combat = game.combats.active;
    let tokenIds =
      combat?.data.combatants.reduce((a, v) => a.concat(v.tokenId), []) ?? [];
    let tokenArray = canvas.tokens.placeables.filter((i) =>
      tokenIds.includes(i.id)
    );
    DnDActionManagement.AddActionMarkers(tokenArray);
  }
});

Hooks.on("createCombatant", async (combat, token) => {
  const reactMode = game.settings.get("dnd5e-helpers", "cbtReactionEnable");
  const lairHelperEnable = game.settings.get(
    "dnd5e-helpers",
    "lairHelperEnable"
  );
  const legHelperEnable = game.settings.get(
    "dnd5e-helpers",
    "LegendaryHelperEnable"
  );

  let tokenInstance = canvas.tokens.get(token.tokenId);

  if (combat.data.active && reactMode === 1) {
    DnDActionManagement.AddActionMarkers([tokenInstance]);
  }

  if (lairHelperEnable) {
    DnDCombatUpdates.LairActionMapping(tokenInstance, combat);
  }

  if (legHelperEnable) {
    DnDCombatUpdates.LegendaryActionMapping(tokenInstance, combat);
  }
});

Hooks.on("updateToken", (scene, token, update) => {
  if (
    "tint" in update ||
    "width" in update ||
    "height" in update ||
    "img" in update
  ) {
    const reactMode = game.settings.get("dnd5e-helpers", "cbtReactionEnable");
    let tokenIds = game.combats.active?.data.combatants.reduce(
      (a, v) => a.concat(v.tokenId),
      []
    );
    if (tokenIds.includes(token._id) && reactMode === 1) {
      let tokenInstance = canvas.tokens.get(token._id);
      DnDActionManagement.AddActionMarkers([tokenInstance]);
    }
  }
});

Hooks.on("controlToken", (token, state) => {
  const reactMode = game.settings.get("dnd5e-helpers", "cbtReactionEnable");
  if (reactMode === 1) {
    const actionCont = token.children.find((i) => i.Helpers);
    if (actionCont) {
      actionCont.visible = state;
    }
  }
});

Hooks.on("renderTokenHUD", (app, html, data) => {
  DnDActionManagement.AddActionHud(app, html, data);
});

Hooks.on("midi-qol.AttackRollComplete", (workflow) => {
  if (game.settings.get("dnd5e-helpers", "owCrit")) {
    if (workflow.isCritical) {
      DnDWounds.OpenWounds(
        Array.from(workflow.targets)[0],
        game.i18n.format("DND5EH.OpenWoundCrit_reason")
      );
    }
  }
});

Hooks.on("createCombat", (combat) => {
  combat.setFlag("dnd5e-helpers", "chatLength", game.messages.size);
});

/** helper functions */

class DnDHelpers {
  static IsFirstGM() {
    return game.user === game.users.find((u) => u.isGM && u.active);
  }

  static GetKeyByValue(object, value) {
    return Object.keys(object).find((key) => object[key] === value);
  }

  //find status effect based on passed name
  static GetStatusEffect(statusName) {
    /** Core Status Effects -- pass displayed name backwards through localization to match to status.label */
    const { EFFECT } = game.i18n.translations;

    /** find the key (will be label) from the value */
    let statusLabel = DnDHelpers.GetKeyByValue(EFFECT, statusName);
    let statusEffect = CONFIG.statusEffects.find(
      (st) => st.label === `EFFECT.${statusLabel}`
    );

    if (statusEffect) {
      /** first match is core, always prefer core */
      return statusEffect;
    } else {
      /** cant find it, it still may be available via other modules/methods */

      /** CUB Compatibility -- statusName matches displayed CUB name (status.label) */
      if (!statusEffect && game.modules.get("combat-utility-belt")?.active) {
        /** if we find it, pick it */
        statusEffect = CONFIG.statusEffects.find(
          (st) => st.label === statusName
        );
      }

      //note: other module compatibilities should check for a null statusEffect before
      //      changing the current statusEffect. Priority based on evaluation order.
    }

    /** return the best label we found */
    return statusEffect;
  }

  /**
   * Return the sanatizedName of a Actor if fature enabled
   * @param {string} name        A name string
   * @param {string} feature     The featured to be checked enable: owMaskNPCs
   * @param {string} label       The i18n label to replace the creature name: DND5EH.GreatAndOpenWoundMaskNPC_mask
   * @return {string}            Return the sanitized name.
   * @static
   */
  static sanitizeName(name, feature, label) {
    return game.settings.get("dnd5e-helpers", feature)
      ? game.i18n.format(label)
      : name;
  }

  //toggle core status effects
  static async ToggleStatus(token, status) {
    return await token.toggleEffect(status);
  }

  //apply a CUB status effect
  static async ApplyCUB(token, cubStatus) {
    return await game.cub.addCondition(cubStatus, token);
  }

  //remove a CUB status effect
  static async RemoveCUB(token, cubStatus) {
    return await game.cub.removeCondition(cubStatus, token);
  }

  /** Prof array check */
  static includes_array(arr, comp) {
    //Ignore empty array
    if (arr.toString() == [""]) {
      return false;
    }
    return arr.reduce(
      (acc, str) => comp.toLowerCase().includes(str.toLowerCase()) || acc,
      false
    );
  }
}

/** Wild Magic Surge Handling */
class DnDWildMagic {
  /** roll on the provided table */
  static async RollOnWildTable(rollType) {
    const wmTableName =
      game.settings.get("dnd5e-helpers", "wmTableName") !== ""
        ? game.settings.get("dnd5e-helpers", "wmTableName")
        : wmSurgeTableDefault;

    if (wmTableName !== "") {
      const table = game.tables.getName(wmTableName);
      await table.draw({
        roll: null,
        results: [],
        displayChat: true,
        rollMode: rollType,
      });
    } else {
      if (game.settings.get("dnd5e-helpers", "debug")) {
        console.log(game.i18n.format("DND5EH.WildMagicTableError"));
      }
    }
  }

  static GetTidesOfChaosFeatureName() {
    return game.settings.get("dnd5e-helpers", "wmToCFeatureName") !== ""
      ? game.settings.get("dnd5e-helpers", "wmToCFeatureName")
      : wmToCFeatureDefault;
  }

  // @todo turn these parameters into a config object. Compress spellLevel and onlyLevelOne into a single "target number" field.
  /**
   * Roll for a surge as per D&D 5e standard rules, with support for several optional rules: recharge ToC if spent, compare against spell level instead of 1, adding a bonus to spell level for comparison.
   * @param spellLevel {number}
   * @param rollType {string}
   * @param actor {Actor}
   * @param onlyLevelOne {boolean}
   * @param rechargeToC {boolean}
   * @param bonus {number}
   * @param debugLog {string}
   * @returns {Promise<void>}
   */
  static async RollForSurge(
    spellLevel,
    rollType,
    actor,
    onlyLevelOne,
    rechargeToC,
    bonus,
    debugLog
  ) {
    let d20result = new Roll("1d20").roll().total;
    let surges = game.i18n.format("DND5EH.WildMagicConsoleSurgesSurge");
    let calm = game.i18n.format("DND5EH.WildMagicConsoleSurgesCalm");

    if (game.settings.get("dnd5e-helpers", "debug")) {
      console.log(
        game.i18n.format(debugLog, {
          d20result: d20result,
          d4result: bonus,
          spellLevel: onlyLevelOne ? 1 : spellLevel,
        })
      );
    }

    //apply the bonus as a penalty to the d20 roll (easier to parse visually)
    d20result -= bonus;

    //@todo adapt this to be more flexible for bonuses to d20 roll
    const bonusString = bonus !== 0 ? `-1d4` : ``;
    let promise;

    if (onlyLevelOne ? d20result === 1 : d20result <= spellLevel + bonus) {
      await DnDWildMagic.ShowSurgeResult(
        surges,
        spellLevel,
        `( [[/r ${d20result} #1d20${bonusString} result]] )`
      );
      promise = DnDWildMagic.RollOnWildTable(rollType);

      if (rechargeToC) {
        /** recharge TOC if we surged */
        const tocName = DnDWildMagic.GetTidesOfChaosFeatureName();
        if (!tocName && game.settings.get("dnd5e-helpers", "debug")) {
          console.log(game.i18n.format("DND5EH.WildMagicTidesOfChaos_error"));
        }

        if (DnDWildMagic.IsTidesOfChaosSpent(actor, tocName)) {
          promise = DnDWildMagic.ResetTidesOfChaos(actor, tocName);
        }
      }
    } else {
      promise = DnDWildMagic.ShowSurgeResult(
        calm,
        spellLevel,
        `( [[/r ${d20result} #1d20${bonusString} result]] )`
      );
    }

    return promise;
  }
  /** show surge result in chat (optionally whisper via module settings) */
  static async ShowSurgeResult(action, spellLevel, resultText, extraText = "") {
    const gmWhisper = game.settings.get("dnd5e-helpers", "wmWhisper");

    return ChatMessage.create({
      content: game.i18n.format("DND5EH.WildMagicConsoleSurgesMessage", {
        action: action,
        spellLevel: spellLevel,
        extraText: extraText,
        resultText: resultText,
      }),
      speaker: ChatMessage.getSpeaker({
        alias: game.i18n.format("DND5EH.WildMagicChatSpeakerName"),
      }),
      whisper: gmWhisper ? ChatMessage.getWhisperRecipients("GM") : false,
    });
  }

  /** is the tides of chaos feature used */
  static IsTidesOfChaosSpent(actor, wmToCFeatureName) {
    const tocItem = actor.items.getName(wmToCFeatureName);

    if (tocItem) {
      return tocItem.data.data.uses.value === 0;
    } else {
      return false;
    }
  }

  /** reset the tides of chaose feature also reset the resource if that is also used */
  static async ResetTidesOfChaos(actor, wmToCFeatureName) {
    const tocItem = actor?.items.getName(wmToCFeatureName);

    if (tocItem) {
      const item = await tocItem.update({
        "data.uses.value": tocItem.data.data.uses.max,
      });
      actor.sheet.render(false);
      return item;
    }

    return tocItem;
  }
  /** Wild Magic Surge Handling */
  static async WildMagicSurge_preUpdateActor(actor, update, selectedOption) {
    const origSlots = actor.data.data.spells;

    /** find the spell level just cast */
    const spellLvlNames = [
      "spell1",
      "spell2",
      "spell3",
      "spell4",
      "spell5",
      "spell6",
      "spell7",
      "spell8",
      "spell9",
    ];
    let lvl = spellLvlNames.findIndex((name) => {
      return getProperty(update, "data.spells." + name);
    });

    const preCastSlotCount = getProperty(
      origSlots,
      spellLvlNames[lvl] + ".value"
    );
    const postCastSlotCount = getProperty(
      update,
      "data.spells." + spellLvlNames[lvl] + ".value"
    );
    const bWasCast = preCastSlotCount - postCastSlotCount > 0;

    const wmFeatureName =
      game.settings.get("dnd5e-helpers", "wmFeatureName") !== ""
        ? game.settings.get("dnd5e-helpers", "wmFeatureName")
        : wmFeatureDefault;
    const wmFeature =
      actor.items.find((i) => i.name === wmFeatureName) !== null;

    lvl++;
    console.log(
      game.i18n.format("DND5EH.WildMagicChatSurgesMessage", {
        lvl: lvl,
        bWasCast: bWasCast,
        wmFeatureName: wmFeatureName,
      })
    );

    let promise = false;
    if (wmFeature && bWasCast && lvl > 0) {
      /** lets go baby lets go */
      console.log(game.i18n.format("DND5EH.WildMagicConsoleSurgesroll"));

      const rollMode = game.settings.get("dnd5e-helpers", "wmWhisper")
        ? "blindroll"
        : "roll";
      const rechargeToC = game.settings.get("dnd5e-helpers", "wmToCRecharge");
      if (selectedOption === 1) {
        promise = DnDWildMagic.RollForSurge(
          lvl,
          rollMode,
          actor,
          true,
          rechargeToC,
          0,
          "DND5EH.WildMagicConsoleNormalSurgeLog"
        );
      } else if (selectedOption === 2) {
        promise = DnDWildMagic.RollForSurge(
          lvl,
          rollMode,
          actor,
          false,
          rechargeToC,
          0,
          "DND5EH.WildMagicConsoleMoreSurgeLog"
        );
      } else if (selectedOption === 3) {
        promise = DnDWildMagic.RollForSurge(
          lvl,
          rollMode,
          actor,
          false,
          rechargeToC,
          new Roll("1d4").roll().total,
          "DND5EH.WildMagicConsoleVolatileSurgeLog"
        );
      }
    }

    return promise;
  }
}

class DnDCombatUpdates {
  /**
   *
   * @param {Object} recharge data from item
   * @returns
   */
  static NeedsRecharge(recharge = { value: 0, charged: false }) {
    return (
      recharge.value !== null &&
      recharge.value > 0 &&
      recharge.charged !== null &&
      recharge.charged == false
    );
  }

  /**
   *
   * @param {Object} token
   * @returns
   */
  static CollectRechargeAbilities(token) {
    const rechargeItems = token.actor.items.filter((e) =>
      DnDCombatUpdates.NeedsRecharge(e.data.data.recharge)
    );
    return rechargeItems;
  }

  /**
   *
   * @param {Object} token
   */
  static async RechargeAbilities(token) {
    const rechargeItems = DnDCombatUpdates.CollectRechargeAbilities(token);

    for (item of rechargeItems) {
      await DnDCombatUpdates.CustomRollRecharge(item);
    }
  }
  /**
   *
   * @param {Object} token
   */
  static async Regeneration(token) {
    if (token.actor == null) {
      return;
    }
    let option1 = game.i18n.format("DND5EH.AutoRegen_Regneration");
    let option2 = game.i18n.format("DND5EH.AutoRegen_SelfRepair");
    let regen = token.actor.items.find(
      (i) => i.name === option1 || i.name === option2
    );
    let blockEffect = token.actor.effects?.find(
      (e) => e.data.label === game.settings.get("dnd5e-helpers", "regenBlock")
    );
    if (!!blockEffect) return;
    let data = {
      tokenHP: getProperty(token, "data.actorData.data.attributes.hp.value"),
      actorMax: token.actor.data.data.attributes.hp.max,
    };

    if (token.data.actorLink === true) {
      data.tokenHP = token.actor.data.data.attributes.hp.value;
    }

    // if token isnt damaged, set tokenHP to max
    if (data.tokenHP == undefined) {
      data.tokenHP = data.actorMax;
    }
    // parse the regeneration item to locate the formula to use

    const regenRegExp = new RegExp("([0-9]+|[0-9]*d0*[1-9][0-9]*) hit points");
    let match = regen.data.data.description.value.match(regenRegExp);
    if (!match) return;
    let regenAmout = match[1];

    //dialog choice to heal or not
    if (regenAmout !== null) {
      new Dialog({
        title: game.i18n.format("DND5EH.AutoRegenDialog_name", {
          tokenName: token.name,
        }),
        content: game.i18n.format("DND5EH.AutoRegenDialog_content", {
          tokenName: token.name,
          tokenHP: data.tokenHP,
          actorMax: data.actorMax,
        }),
        buttons: {
          one: {
            label: game.i18n.format("DND5EH.AutoRegenDialog_healingprompt", {
              regenAmout: regenAmout,
            }),
            callback: () => {
              let regenRoll = new Roll(regenAmout).roll().total;
              token.actor.applyDamage(-regenRoll);
              ChatMessage.create({
                content: game.i18n.format(
                  "DND5EH.AutoRegenDialog_healingmessage",
                  { tokenName: token.name, regenRoll: regenRoll }
                ),
                whisper: ChatMessage.getWhisperRecipients("gm").map(
                  (o) => o.id
                ),
              });
            },
          },
          two: {
            label: game.i18n.format("DND5EH.AutoRegenDialog_stopprompt"),
          },
        },
      }).render(true);
    }
  }

  /**
   *
   * @param {Object} item
   * @returns
   * custom recharge roll for private rolls
   */
  static async CustomRollRecharge(item) {
    const data = item.data.data;
    if (!data.recharge.value) return;

    // Roll the check
    const roll = new Roll("1d6").roll();
    const success = roll.total >= parseInt(data.recharge.value);
    const rollMode =
      game.settings.get("dnd5e-helpers", "cbtAbilityRechargeHide") == true
        ? "selfroll"
        : "";
    // Display a Chat Message
    const promises = [
      roll.toMessage({
        flavor: `${game.i18n.format("DND5E.ItemRechargeCheck", {
          name: item.name,
        })} - ${game.i18n.localize(
          success ? "DND5E.ItemRechargeSuccess" : "DND5E.ItemRechargeFailure"
        )}`,
        speaker: ChatMessage.getSpeaker({
          actor: item.actor,
          token: item.actor.token,
        }),
        rollMode: rollMode,
      }),
    ];

    // Update the Item data
    if (success) promises.push(item.update({ "data.recharge.charged": true }));
    return Promise.all(promises).then(() => roll);
  }

  /**
   *
   * @param {Object} actor
   * @param {String} tokenName
   * @returns Actor
   * sets current legendary actions to max (or current if higher)
   */
  static async ResetLegAct(actor, tokenName) {
    if (actor == null) {
      return null;
    }
    let legact = actor.data.data.resources.legact;
    if (legact && legact.value !== null) {
      /** only reset if needed */
      if (legact.value < legact.max) {
        ui.notifications.info(
          game.i18n.format("DND5EH.CombatLegendary_notification", {
            max: legact.max,
            tokenName: tokenName,
          })
        );
        let newActor = await actor.update({
          "data.resources.legact.value": legact.max,
        });
        newActor.sheet.render(false);
        return newActor;
      }

      return actor;
    }
  }

  /**
   *
   * @param {Object} tokenData token.data
   * @param {Object} update hp to check
   * @param {Object} options.skipUndeadCheck  skip from previous failed check
   * @returns
   * quick undead fort check, just checks change in np, not total damage
   */
  static async UndeadFortCheckQuick(tokenData, update, options) {
    let data = {
      actorData: canvas.tokens.get(tokenData._id).actor.data,
      updateData: update,
      actorId: tokenData.actorId,
      actorHp: await getProperty(
        tokenData,
        "actorData.data.attributes.hp.value"
      ),
      updateHP: update.actorData.data.attributes.hp.value,
    };

    if (data.actorHp == null) {
      data.actorHp = game.actors.get(data.actorId).data.data.attributes.hp.max;
    }
    let hpChange = data.actorHp - data.updateHP;
    let token = canvas.tokens.get(tokenData._id);
    if (!options.skipUndeadCheck) {
      new Dialog({
        title: game.i18n.format("DND5EH.UndeadFort_dialogname"),
        content: game.i18n.format("DND5EH.UndeadFort_quickdialogcontent"),
        buttons: {
          one: {
            label: game.i18n.format("DND5EH.UndeadFort_quickdialogprompt1"),
            callback: () => {
              token.update({ hp: 0 }, { skipUndeadCheck: true });
              ui.notifications.notify(
                game.i18n.format("DND5EH.UndeadFort_insantdeathmessage")
              );
              return;
            },
          },
          two: {
            label: game.i18n.format("DND5EH.UndeadFort_quickdialogprompt2"),
            callback: async () => {
              let { total } = await token.actor.rollAbilitySave("con");
              if (total >= 5 + hpChange) {
                ui.notifications.notify(
                  game.i18n.format("DND5EH.UndeadFort_surivalmessage", {
                    tokenName: token.name,
                    total: total,
                  })
                );
                token.update(
                  { "actorData.data.attributes.hp.value": 1 },
                  { skipUndeadCheck: true }
                );
              } else if (total < 5 + hpChange) {
                ui.notifications.notify(
                  game.i18n.format("DND5EH.UndeadFort_deathmessage", {
                    tokenName: token.name,
                    total: total,
                  })
                );
                token.update(
                  { "actorData.data.attributes.hp.value": 0 },
                  { skipUndeadCheck: true }
                );
              }
            },
          },
        },
      }).render(true);
      return false;
    } else return true;
  }

  /**
   *
   * @param {Object} tokenData - token.data
   * @param {Object} update - change in HP
   * @param {Object} options.skipUndeadCheck - skip check from previous failure
   * @returns
   * undead fort check, requires manual input
   */
  static UndeadFortCheckSlow(tokenData, update, options) {
    let token = canvas.tokens.get(tokenData._id);
    if (!options.skipUndeadCheck) {
      let damageQuery = game.i18n.format(
        "DND5EH.UndeadFort_slowdialogcontentquery"
      );
      let content = `
    <form>
            <div class="form-group">
                <label for="num">${damageQuery} </label>
                <input id="num" name="num" type="number" min="0"></input>
            </div>
        </form>`;
      new Dialog({
        title: game.i18n.format("DND5EH.UndeadFort_dialogname"),
        content: content,
        buttons: {
          one: {
            label: game.i18n.format("DND5EH.UndeadFort_quickdialogprompt1"),
            callback: () => {
              token.update({ hp: 0 }, { skipUndeadCheck: true });
              ui.notifications.notify(
                game.i18n.format("DND5EH.UndeadFort_insantdeathmessage")
              );
              return;
            },
          },
          two: {
            label: game.i18n.format("DND5EH.UndeadFort_quickdialogprompt2"),
            callback: async (html) => {
              let { total } = await token.actor.rollAbilitySave("con");
              let number = Number(html.find("#num")[0].value);
              if (total >= 5 + number) {
                ui.notifications.notify(
                  game.i18n.format("DND5EH.UndeadFort_surivalmessage", {
                    tokenName: token.name,
                    total: total,
                  })
                );
                token.update(
                  { "actorData.data.attributes.hp.value": 1 },
                  { skipUndeadCheck: true }
                );
              } else if (total < 5 + number) {
                ui.notifications.notify(
                  game.i18n.format("DND5EH.UndeadFort_deathmessage", {
                    tokenName: token.name,
                    total: total,
                  })
                );
                token.update(
                  { "actorData.data.attributes.hp.value": 0 },
                  { skipUndeadCheck: true }
                );
              }
            },
          },
        },
      }).render(true);
      return false;
    } else return true;
  }

  /**
   *
   * @param {Object} token - token to check for lair actions
   * @param {Object} combat - combat instance to save lair array to
   * @returns
   * Generate lair action array
   */
  static LairActionMapping(token, combat) {
    if (!DnDHelpers.IsFirstGM) return;
    const updateFn = async () => {
      let tokenItems = getProperty(token, "items") || token.actor.items;
      let lairActions = tokenItems.filter(
        (i) => i.data?.data?.activation?.type === "lair"
      );
      if (lairActions.length > 0) {
        let combatLair = duplicate(
          combat.getFlag("dnd5e-helpers", "Lair Actions") || []
        );
        combatLair.push([token.data.name, lairActions, token.id]);
        return combat.setFlag("dnd5e-helpers", "Lair Actions", combatLair);
      }

      return true;
    };

    queueEntityUpdate(combat.entity, updateFn);
  }

  /**
   *
   * @param {Object} token - token to check for Legendary actions
   * @param {Object} combat - combat instance to save Legendary actions array to
   * @returns
   * Generate Legendary action array
   */
  static LegendaryActionMapping(token, combat) {
    if (!DnDHelpers.IsFirstGM) return;

    const updateFn = async () => {
      let tokenItems = getProperty(token, "items") || token.actor.items;
      let LegAction = tokenItems.filter(
        (i) => i.data?.data?.activation?.type === "legendary"
      );
      if (LegAction.length > 0) {
        let comabtLeg = duplicate(
          combat.getFlag("dnd5e-helpers", "Legendary Actions") || []
        );
        //console.log(`Adding ${token.name}'s leg acts. Current array = ${comabtLeg}`);
        comabtLeg.push([token.data.name, LegAction, token.id]);
        //console.log(`...updated array: ${comabtLeg}`);
        return combat.setFlag("dnd5e-helpers", "Legendary Actions", comabtLeg);
      }

      return true;
    };

    queueEntityUpdate(combat.entity, updateFn);
  }

  /**
   *
   * @param {Combat} combat
   * @param {Combatant} combatant
   * @returns
   */
  static async RemoveLairMapping(combat, combatant) {
    if (!DnDHelpers.IsFirstGM) return;
    const updateFn = async () => {
      /** get the actual token */
      const tokenId = combat.scene.getEmbeddedEntity("Token", combatant.tokenId)
        ?._id;

      /** error, could not find token referenced by combatant */
      if (!tokenId) {
        if (game.settings.get(MODULE, "debug")) {
          console.log(
            `${MODULE} | could not locate ${combatant.name} with token ID ${combatant.tokenId} in scene ${combat.scene.id}`
          );
        }

        return;
      }

      /** check for a removal of a lair actor */
      const combatLair = duplicate(
        combat.getFlag("dnd5e-helpers", "Lair Actions") || []
      );
      const updatedList = combatLair.filter((entry) => entry[2] !== tokenId);

      if (combatLair.length != updatedList.length) {
        /** a change occured, update the flag */
        return combat.setFlag("dnd5e-helpers", "Lair Actions", updatedList);
      }

      return true;
    };

    queueEntityUpdate(combat.entity, updateFn);
  }

  /**
   *
   * @param {Combat} combat
   * @param {Combatant} combatant
   * @returns
   */
  static async RemoveLegMapping(combat, combatant) {
    if (!DnDHelpers.IsFirstGM) return;
    const updateFn = async () => {
      /** get the actual token */
      const tokenId = combat.scene.getEmbeddedEntity("Token", combatant.tokenId)
        ?._id;

      /** error, could not find token referenced by combatant */
      if (!tokenId) {
        if (game.settings.get(MODULE, "debug")) {
          console.log(
            `${MODULE} | could not locate ${combatant.name} with token ID ${combatant.tokenId} in scene ${combat.scene.id}`
          );
        }

        return;
      }

      /** check for a removal of a lair actor */
      const combatLeg = duplicate(
        combat.getFlag("dnd5e-helpers", "Legendary Actions") || []
      );
      const updatedList = combatLeg.filter((entry) => entry[2] !== tokenId);

      if (combatLeg.length != updatedList.length) {
        /** a change occured, update the flag */
        return combat.setFlag(
          "dnd5e-helpers",
          "Legendary Actions",
          updatedList
        );
      }

      return true;
    };

    queueEntityUpdate(combat.entity, updateFn);
  }

  /**
   *
   * @param {Array} lairActionArray
   * @returns
   */
  static RunLairActions(lairActionArray) {
    if (!lairActionArray) return;

    let lairContents = ``;

    function getActionList(actionArray, tokenId) {
      let actionList = actionArray.reduce((a, v) => {
        return (a += `
        <div class="form-group">
          <div class="desc"> ${v.data.description.value}</div>
          <label>${v.name}</label>
          <button type="button" id="${v._id}" value="${tokenId},${
          v._id
        }" onClick="DnDCombatUpdates.runItem('${tokenId}', '${
          v._id
        }')">${game.i18n.format("DND5E.Use")}</button>
        </div>`);
      }, "");
      return actionList;
    }

    for (let lairActor of lairActionArray) {
      let token = canvas.tokens.get(lairActor[2]);
      let tokenImg = token.data.img;
      let actionList = getActionList(lairActor[1], lairActor[2]);
      lairContents += `
      <form>
        <div class="container">
          <div class="row">
            <div class="col">
                <button type="button" class="img-button" onClick="DnDCombatUpdates.runItem('${lairActor[2]}')">
                <img src="${tokenImg}" title="${lairActor[0]}">
              </button>
            </div>
              <div class="row">
                <div class="container">
                  <div class="col">
                  ${actionList}
                  </div>
                </div>
              </div>
            </div>
        </div>
        </form>`;
    }

    let d = new Dialog(
      {
        title: game.i18n.format("DND5E.LairAct"),
        content: lairContents,

        buttons: {
          one: {
            label: game.i18n.format("Close"),
            callback: () => {},
          },
        },
        default: "one",
        close: () => {
          ui.notify;
        },
      },
      { classes: ["dnd5ehelpers legendary-action-dialog"], resizable: true }
    );
    d.render(true);
  }

  static async RunLegendaryActions(legActionArray, previousTokenId) {
    let actorList = "";

    function getActionList(actionArray, tokenId, available) {
      let actionList = actionArray.reduce((a, v) => {
        let disabled = v.data.activation.cost > available ? "disabled" : "";
        return (a += `
        <div class="form-group">
          <div class="desc"> ${v.data.description.value}</div>
          <label>${v.name}</label>
          <button type="button" id="${v._id}" value="${tokenId},${
          v._id
        }" onClick="DnDCombatUpdates.runItem('${tokenId}', '${
          v._id
        }')" ${disabled} >${game.i18n.format("DND5E.Uses")} ${
          v.data.activation.cost
        }/${available}</button>
        </div>`);
      }, "");
      return actionList;
    }

    let anyActions = false;
    for (let LegActor of legActionArray) {
      let token = canvas.tokens.get(LegActor[2]);

      /** we can have multiple leg actors in the same combat -- do not allow
       *  leg actions to be used by the token who JUST ended their turn */
      if (token.id === previousTokenId) continue;

      let actionsAvailable = token.actor.data.data.resources.legact.value;

      /** do not add actions from an actor without remaining legendary actions to use */
      if (actionsAvailable < 1) continue;

      /** if we have gotten to here, we have some valid leg acts to show */
      anyActions = true;
      let tokenImg = token.data.img;
      let actionList = getActionList(
        LegActor[1],
        LegActor[2],
        actionsAvailable
      );
      actorList += `
      <form>
        <div class="container">
          <div class="row">
            <div class="col">
                <button type="button" class=" img-button" onClick="DnDCombatUpdates.runItem('${LegActor[2]}')">
                <img src="${tokenImg}" title="${LegActor[0]}">
              </button>
            </div>
              <div class="row">
                <div class="container">
                  <div class="col">
                  ${actionList}
                  </div>
                </div>
              </div>
            </div>
        </div>
        </form>`;
    }

    /** do not display the dialog if we have no legendary actions available to show */
    if (!anyActions) return;

    let d = new Dialog(
      {
        title: `${game.i18n.format("DND5E.LegAct")}`,
        content: actorList,

        buttons: {
          one: {
            label: game.i18n.format("Close"),
            callback: () => {},
          },
        },
        default: "one",
        close: () => {
          ui.notify;
        },
      },
      { classes: ["dnd5ehelpers legendary-action-dialog"], resizable: true }
    );
    d.render(true);
  }

  static runItem(tokenID, itemID) {
    let token = canvas.tokens.get(tokenID);
    if (itemID === undefined) {
      canvas.animatePan({
        x: token.center.x,
        y: token.center.y,
        duration: 250,
      });
      token.control();
    } else {
      let token = canvas.tokens.get(tokenID);
      let item = token.actor.items.get(itemID);
      item.roll();
    }
  }

  static async cleanUpCover(combat) {
    const chatLength = combat.getFlag("dnd5e-helpers", "chatLength");
    let chatSection = Array.from(ui.chat.collection);
    if (chatLength > chatSection.size) return;
    chatSection.splice(0, chatLength);
    let oldCover = chatSection.filter((m) =>
      m.getFlag("dnd5e-helpers", "coverMessage")
    );

    // @todo deleteMany?
    for (let message of oldCover) {
      await message.delete();
    }
  }
}

class DnDWounds {
  /**
   *
   * @param {Object} tokenData
   * @param {Object} update
   */
  static GreatWound_preUpdateToken(tokenData, update) {
    //find update data and original data
    let actor = game.actors.get(tokenData.actorId);
    let data = {
      actorData: canvas.tokens.get(tokenData._id).actor.data,
      actorHP: getProperty(tokenData, "actorData.data.attributes.hp.value"),
      actorMax: getProperty(tokenData, "actorData.data.attributes.hp.max"),
      updateHP: update.actorData.data.attributes.hp.value,
    };
    if (data.actorMax == undefined) {
      data.actorMax = actor.data.data.attributes.hp.max;
    }
    if (data.actorHP == undefined) {
      data.actorHP = data.actorMax;
    }
    let hpChange = data.actorHP - data.updateHP;
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
              DnDWounds.DrawGreatWound(actor);
            },
          },
        },
      }).render(true);
    }
  }

  /**
   *
   * @param {Object} actor
   * @param {Object} update
   */
  static GreatWound_preUpdateActor(actor, update) {
    //find update data and original data
    let data = {
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
    // check if the change in hp would be over 50% max hp
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
                DnDWounds.DrawGreatWound(actor);
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
   *
   * @param {Object} actor
   */
  static DrawGreatWound(actor) {
    const gwFeatureName = game.settings.get("dnd5e-helpers", "gwFeatureName");
    (async () => {
      let gwSave = await actor.rollAbilitySave("con");
      let sanitizedTokenName = actor.name;
      if (actor.data.type === "npc") {
        sanitizedTokenName = DnDHelpers.sanitizeName(
          actor.name,
          "gwMaskNPCs",
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
   *
   * @param {String} actorName
   * @param {String} woundType
   */
  static OpenWounds(actorName, woundType) {
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

class DnDProf {
  /**
   * auto prof Weapon ONLY for specific proficiencies (not covered by dnd5e 1.2.0)
   * @param {Object} actor
   * @param {Object} item item added
   */
  static AutoProfWeapon_createOwnedItem(actor, item) {
    //finds item data and actor proficiencies
    let { name } = item;
    let { weaponProf } = actor.data.data.traits;
    let proficient = false;

    //if item name matches custom prof lis then prof = true
    const weaponProfList = weaponProf.custom
      .split(" ")
      .map((s) => s.slice(0, -1));
    if (
      DnDHelpers.includes_array(weaponProfList, name) ||
      DnDHelpers.includes_array(weaponProfList, `${name}s`)
    )
      proficient = true;

    // update item to match prof, otherwise, leave as is (dnd5e system will handle generic profs)
    if (proficient) {
      actor.updateOwnedItem({ _id: item._id, "data.proficient": true });
      console.log(
        game.i18n.format("DND5EH.AutoProf_consolelogsuccess", { name: name })
      );
    } /* else {
    //Remove proficiency if actor is not proficient and the weapon has proficiency set.
    if (!proficient && item.data.proficient) {
      actor.updateOwnedItem({ _id: item._id, "data.proficient": false });
      console.log(name + " is marked as not proficient")
    } else {
      ui.notifications.notify(name + " could not be matched to proficiency, please adjust manually.");
    }
  }
  */
  }

  /**
   *
   * @param {Object} actor
   * @param {Object} item item added
   */
  static AutoProfArmor_createOwnedItem(actor, item) {
    //finds item data and actor proficiencies
    let { name } = item;
    let { armorProf } = actor.data.data.traits;
    let proficient = false;

    /* NOTE: I know of no examples of being granted "Studded Leather Armor" proficiency,
     *       but it does not make grammatical sense for them to be optionaly pluralized,
     *       so do not consider plurals when matching like weapons
     */

    //if item name matches custom prof lis then prof = true
    if (
      DnDHelpers.includes_array(
        armorProf.custom.split(" ").map((s) => s.slice(0, -1)),
        name
      )
    )
      proficient = true;

    // update item to match prof, otherwise, leave as is (dnd5e will handle generic profs)
    //For items that are not armors (trinkets, clothing) we assume prof = true
    if (proficient) {
      actor.updateOwnedItem({ _id: item._id, "data.proficient": true });
      console.log(
        game.i18n.format("DND5EH.AutoProf_consolelogsuccess", { name: name })
      );
    }
  }

  /**
   *
   * @param {Object} actor
   * @param {Object} item item added
   */
  static AutoProfTool_createOwnedItem(actor, item) {
    //finds item data and actor proficiencies
    let { name } = item;
    let { toolProf } = actor.data.data.traits;
    let proficient = false;

    //pass_name is here to match some of the toolProf strings
    const pass_name = name
      .toLowerCase()
      .replace("navi", "navg")
      .replace("thiev", "thief");

    if (DnDHelpers.includes_array(toolProf.value, pass_name)) proficient = true;

    //if item name matches custom prof lis then prof = true
    if (
      DnDHelpers.includes_array(
        toolProf.custom.split(" ").map((s) => s.slice(0, -1)),
        name
      )
    )
      proficient = true;

    // update item to match prof
    //For items that are not armors (trinkets, clothing) we assume prof = true
    if (proficient) {
      actor.updateOwnedItem({ _id: item._id, "data.proficient": 1 });
      console.log(
        game.i18n.format("DND5EH.AutoProf_consolelogsuccess", { name: name })
      );
    } else {
      ui.notifications.notify(
        game.i18n.format("DND5EH.AutoProf_consolelogfail", { name: name })
      );
    }
  }
}

class DnDActionManagement {
  /** Reads chat data and updates tokens Action HUD to display available actions */
  static async ReactionApply(castingActor, castingToken, itemId) {
    if (itemId !== undefined) {
      //const reactionStatus = game.settings.get('dnd5e-helpers', 'cbtReactionStatus');
      //let statusEffect = DnDHelpers.GetStatusEffect(reactionStatus);

      /**bail out if we can't find the status. 
     if (!statusEffect) {
       if (game.settings.get('dnd5e-helpers', 'debug')) {
         console.log(game.i18n.format("DND5EH.CombatReactionStatus_statuserror", { reactionStatus: reactionStatus }))
       }
       return;
     }*/

      //find the current token instance that called the roll card
      let currentCombatant = getProperty(
        game.combats,
        "active.current.tokenId"
      );
      if (
        !currentCombatant ||
        game.combats.active.scene.id !== canvas.scene.id
      ) {
        return;
      }

      if (castingToken === null && castingActor === null) {
        if (game.settings.get("dnd5e-helpers", "debug")) {
          console.log(
            game.i18n.format("DND5EH.CombatReactionStatus_actoritemerror")
          );
        }
        return; // not a item roll message, prevents unneeded errors in console
      }

      //find token for linked actor
      if (castingToken === null && castingActor !== null) {
        castingToken = canvas.tokens.placeables.find((i) =>
          i.actor?.data._id.includes(castingActor)
        ).data._id;
      }

      let effectToken = canvas.tokens.get(castingToken);

      let ownedItem = effectToken.actor.getOwnedItem(itemId);
      const { type, cost } = ownedItem?.data?.data?.activation;

      if (!type || !cost) {
        return true;
      }

      /** strictly defined activation types. 0 action (default) will not trigger, which is by design */
      const finalType =
        type == "action" && currentCombatant !== castingToken
          ? "reaction"
          : type;
      /** allow for negative values to re-gain use of the action type */
      const actionUse = cost === 0 ? false : cost;
      if (actionUse) {
        return DnDActionManagement.UpdateActionMarkers(
          effectToken,
          finalType,
          actionUse
        );
      }
    }
    return true;
  }

  /**
   * Resets Action HUD at start of turn
   * @param {Object <token5e} currentToken
   */
  static async ReactionRemove(currentToken) {
    const container = currentToken.children.find((i) => i.Helpers);
    container.children.forEach((i) => (i.alpha = 1));
    const resetActions = {
      action: 0,
      reaction: 0,
      bonus: 0,
    };
    await currentToken.setFlag(
      "dnd5e-helpers",
      "ActionManagement",
      resetActions
    );

    const socketData = {
      actionMarkers: true,
      tokenId: currentToken.id,
    };
    game.socket.emit(`module.dnd5e-helpers`, socketData);
  }

  /**
   * Reads chat data and hands off to ReactionApply
   * @param {Object} msg
   * @returns
   */
  static async ReactionDetect_preCreateChatMessage(msg) {
    /** Reactions are only important IF a combat is active. Bail early */
    if (!game.combats.find((combat) => combat.started)) {
      if (game.settings.get("dnd5e-helpers", "debug")) {
        console.log(
          game.i18n.format("DND5EH.CombatReactionStatus_combaterror")
        );
      }
      return;
    }

    if (msg.type == null) {
      /** some weird, freeform chat message...mainly our own */
      return;
    }

    const itemId = $(msg.content).attr("data-item-id");

    /** could not find the item id, must not have been an item */
    if (itemId == undefined) {
      return;
    }

    const speaker = getProperty(msg, "speaker");
    if (speaker) {
      /** hand over to reaction apply logic (checks combat state, etc) */
      await DnDActionManagement.ReactionApply(
        speaker.actor,
        speaker.token,
        itemId
      );
    }
  }

  /**
   * Add PIXI container and relevant assets to the token
   * @param {Array} tokenArray Tokens to add action markers too
   */
  static async AddActionMarkers(tokenArray) {
    const actionTexture = await loadTexture(
      "modules/dnd5e-helpers/assets/action-markers/ACTION2.png"
    );
    const reactionTexture = await loadTexture(
      "modules/dnd5e-helpers/assets/action-markers/reaction.png"
    );
    const bonusTexture = await loadTexture(
      "modules/dnd5e-helpers/assets/action-markers/bonus.png"
    );
    const backgroundTexture = await loadTexture(
      "modules/dnd5e-helpers/assets/action-markers/background.png"
    );
    let newOrig = { height: 150, width: 150, x: 0, y: 0 };
    actionTexture.orig = newOrig;
    reactionTexture.orig = newOrig;
    bonusTexture.orig = newOrig;

    for (let token of tokenArray) {
      if (!token.owner) continue;
      if (token.children.find((i) => i.Helpers)) continue;
      const actions = await token.getFlag("dnd5e-helpers", "ActionManagement");
      const action = new PIXI.Sprite(actionTexture);
      const reaction = new PIXI.Sprite(reactionTexture);
      const background = new PIXI.Sprite(backgroundTexture);
      const bonus = new PIXI.Sprite(bonusTexture);
      const textureSize = token.data.height * canvas.grid.size;

      let horiAlign = token.w / 10;
      let vertiAlign = token.h / 5;
      //generate scale for overlay (total HUD width is 600 pixels)
      const scale = 1 / (600 / textureSize);
      action.anchor.set(0.5);
      reaction.anchor.set(0.5);
      bonus.anchor.set(0.5);
      background.anchor.set(0.5);

      action.scale.set(scale);
      reaction.scale.set(scale);
      bonus.scale.set(scale);
      background.scale.set(scale);

      let ActionCont = new PIXI.Container();
      ActionCont.setParent(token);
      ActionCont.sortableChildren = true;
      ActionCont.Helpers = true;
      ActionCont.visible = token._controlled;
      let actionIcon = await ActionCont.addChild(action);
      let reactionIcon = await ActionCont.addChild(reaction);
      let bonusIcon = await ActionCont.addChild(bonus);
      let backgroundIcon = await ActionCont.addChild(background);

      actionIcon.position.set(horiAlign * 5, -vertiAlign);
      actionIcon.actionType = "action";
      actionIcon.tint = 13421772;
      actionIcon.alpha = actions?.action ? 0.2 : 1;

      reactionIcon.position.set(horiAlign * 2, -vertiAlign);
      reactionIcon.actionType = "reaction";
      reactionIcon.tint = 13421772;
      reactionIcon.alpha = actions?.reaction ? 0.2 : 1;

      bonusIcon.position.set(horiAlign * 8, -vertiAlign);
      bonusIcon.actionType = "bonus";
      bonusIcon.tint = 13421772;
      bonusIcon.alpha = actions?.bonus ? 0.2 : 1;

      backgroundIcon.position.set(horiAlign * 5, -vertiAlign);
      backgroundIcon.zIndex = -1000;

      const resetActions = {
        action: 0,
        reaction: 0,
        bonus: 0,
      };
      await token.setFlag("dnd5e-helpers", "ActionManagement", resetActions);
    }
  }

  /**
   * Update
   * @param {Object} token
   * @param {String} action action taken
   */
  static async UpdateActionMarkers(token, action, use) {
    const actionCont = token.children.find((i) => i.Helpers);
    switch (action) {
      case "action":
        {
          let actionIcon = actionCont.children.find(
            (i) => i.actionType === "action"
          );
          actionIcon.alpha = use > 0 ? 0.2 : 1;
          const actions = duplicate(
            (await token.getFlag("dnd5e-helpers", "ActionManagement")) || {}
          );
          actions[action] = use;
          await token.setFlag("dnd5e-helpers", "ActionManagement", actions);
        }
        break;
      case "reaction":
        {
          let reactionIcon = actionCont.children.find(
            (i) => i.actionType === "reaction"
          );
          reactionIcon.alpha = use > 0 ? 0.2 : 1;
          const actions = duplicate(
            (await token.getFlag("dnd5e-helpers", "ActionManagement")) || {}
          );
          actions[action] = use;
          await token.setFlag("dnd5e-helpers", "ActionManagement", actions);
        }
        break;
      case "bonus":
        {
          let bonusIcon = actionCont.children.find(
            (i) => i.actionType === "bonus"
          );
          bonusIcon.alpha = use > 0 ? 0.2 : 1;
          const actions = duplicate(
            (await token.getFlag("dnd5e-helpers", "ActionManagement")) || {}
          );
          actions[action] = use;
          await token.setFlag("dnd5e-helpers", "ActionManagement", actions);
        }
        break;
    }
    const socketData = {
      actionMarkers: true,
      tokenId: token.id,
    };
    game.socket.emit(`module.dnd5e-helpers`, socketData);
  }

  /**
   * Removes action markers from specific token
   * @param {String} tokenId
   * @returns
   */
  static async RemoveActionMarkers(tokenId) {
    let token = canvas.tokens.get(tokenId);
    if (!token.owner) return;
    const actionCont = token.children.find((i) => i.Helpers);
    actionCont.children.forEach((i) => i.destroy());
    actionCont.destroy();
    return token.unsetFlag("dnd5e-helpers", "ActionManagement");
  }

  static UpdateOpacities(tokenId) {
    let token = canvas.tokens.get(tokenId);
    if (!token.owner) return;
    const actionCont = token.children.find((i) => i.Helpers);
    let actions = token.getFlag("dnd5e-helpers", "ActionManagement");
    let actionIcon = actionCont.children.find((i) => i.actionType === "action");
    let reactionIcon = actionCont.children.find(
      (i) => i.actionType === "reaction"
    );
    let bonusIcon = actionCont.children.find((i) => i.actionType === "bonus");
    actionIcon.alpha = actions?.action ? 0.2 : 1;
    reactionIcon.alpha = actions?.reaction ? 0.2 : 1;
    bonusIcon.alpha = actions?.bonus ? 0.2 : 1;
  }

  static AddActionHud(app, html, data) {
    let tokenId = app.object.id;
    if (!game.combat?.combatants?.find((i) => i.tokenId === tokenId)) return;
    const actionButton = `<div class="control-icon actions" title="Configure Actions"> <i class="fas fa-clipboard-list"></i></div>`;
    let leftCol = html.find(".left");
    leftCol.append(actionButton);
    let button = html.find(".control-icon.actions");
    button.click((ev) => {
      DnDActionManagement.actionDialog(tokenId);
    });
  }

  static async actionDialog(tokenId) {
    const token = canvas.tokens.get(tokenId);
    const currentActions = token.getFlag("dnd5e-helpers", "ActionManagement");
    let { action, reaction, bonus } = currentActions;
    const content = `
    <form>
      <div class="form-group">
        <label for="action">${game.i18n.format("DND5E.Action")}: </label>
        <input id="action" name="action" type="checkbox" ${
          action === 1 ? "checked" : ""
        } ></input>
      </div> 
      <div class="form-group">
        <label for="reaction">${game.i18n.format("DND5E.Reaction")}: </label>
        <input id="reaction" name="reaction" type="checkbox" ${
          reaction === 1 ? "checked" : ""
        } ></input>
      </div>
      <div class="form-group">
        <label for="bonus">${game.i18n.format("DND5E.BonusAction")}: </label>
        <input id="bonus" name="bonus" type="checkbox" ${
          bonus === 1 ? "checked" : ""
        } ></input>
      </div>
    </form>
    `;
    new Dialog({
      title: game.i18n.format("DND5EH.CombatReactionActionDialogTitle"),
      content: content,
      buttons: {
        one: {
          label: game.i18n.format("DND5EH.CombatReactionConformation"),
          callback: async (html) => {
            let action = html.find("#action")[0].checked ? 1 : 0;
            let reaction = html.find("#reaction")[0].checked ? 1 : 0;
            let bonus = html.find("#bonus")[0].checked ? 1 : 0;
            let actionMapping = {
              action: action,
              bonus: bonus,
              reaction: reaction,
            };
            await token.setFlag(
              "dnd5e-helpers",
              "ActionManagement",
              actionMapping
            );
            DnDActionManagement.UpdateOpacities(tokenId);
            const socketData = {
              actionMarkers: true,
              tokenId: token.id,
            };
            game.socket.emit(`module.dnd5e-helpers`, socketData);
          },
        },
      },
    }).render(true);
  }
}

/**
 * Serves as a container for cover data, which is as agnostic as possible, allowing for system extensions
 * Note: Data must be "finalized" prior to chat message output. This finalization function is ripe for override.
 * @todo extract finalize and create chat message into CoverData5e to provide an example of
 * @class CoverData
 */
class CoverData {
  constructor(
    sourceToken,
    targetToken,
    visibleCorners,
    mostObscuringTile,
    mostObscuringToken
  ) {
    this.SourceToken = sourceToken;
    this.TargetToken = targetToken;
    this.VisibleCorners = visibleCorners;
    this.TileCover = mostObscuringTile;
    this.TokenCover = mostObscuringToken;

    // @todo this should possibly be a different class, will need a pass when my cover api is better
    this.Summary = {
      Text: "**UNPROCESSED**",
      Source: "**NONE**",
      FinalCoverLevel: -1,
      FinalCoverEntity: null,
    };
  }
  /**
   * 5e specific conversion of visible corners to a cover value
   * @todo implement in CoverData5e
   * @static
   * @param {Int} visibleCorners
   * @return {Int}
   * @memberof CoverData
   */
  static VisibleCornersToCoverLevel(visibleCorners) {
    switch (visibleCorners) {
      case 0:
        return 3;
      case 1:
        return 2;
      case 2:
      case 3:
        return 1;
      case 4:
        return 0;
      default:
        console.error(game.i18n.format("DND5EH.LoS_cornererror1"));
        return null;
    }
  }

  /**
   * 5e specific conversion of a generic "coverLevel" to the appropriate string
   * @todo implement in CoverData5e
   * @static
   * @param {Int} coverLevel
   * @return {String}
   * @memberof CoverData
   */
  static CoverLevelToText(coverLevel) {
    switch (coverLevel) {
      case 0:
        return game.i18n.format("DND5EH.LoS_nocover");
      case 1:
        return game.i18n.format("DND5EH.LoS_halfcover");
      case 2:
        return game.i18n.format("DND5EH.LoS_34cover");
      case 3:
        return game.i18n.format("DND5EH.LoS_fullcover");
      default:
        console.error(
          game.i18n.format("DND5EH.LoS_cornererror2", {
            coverLevel: coverLevel,
          })
        );
        return "";
    }
  }

  /**
   * 5e specific interpretation and consideration of all wall and object collisions to produce a final cover value
   * General flow: If line of sight and objects give same cover, prefer line of sight, and select the entity that gives
   *               the greatest amount of cover. Note: cover in 5e does not "sum".
   * @todo implement in CoverData5e
   * @memberof CoverData
   */
  FinalizeData() {
    /** always prefer line of sight because its more accurate at the moment (>= instead of >) */
    const losCoverLevel = CoverData.VisibleCornersToCoverLevel(
      this.VisibleCorners
    );

    /** assume LOS will be the main blocker */
    let internalCoverData = {
      level: losCoverLevel,
      source: `${this.VisibleCorners} visible corners`,
      entity: null,
    };

    /** prepare the secondary blocker information */
    const tileCoverData = {
      level: this.TileCover?.getFlag("dnd5e-helpers", "coverLevel") ?? -1,
      source: `an intervening object`,
      entity: this.TileCover,
    };
    const obstructionTranslation = game.i18n.format("DND5EH.LoS_obsruct");
    const displayedTokenName =
      (this.TokenCover?.actor?.data.type ?? "") == "npc"
        ? DnDHelpers.sanitizeName(
            this.TokenCover?.name,
            "losMaskNPCs",
            "DND5EH.LoSMaskNPCs_sourceMask"
          )
        : this.TokenCover?.name;
    const tokenCoverData = {
      level: !!this.TokenCover ? 1 : -1,
      source: `${displayedTokenName ?? ""}`,
      entity: this.TokenCover,
    };

    /** prefer walls -> tiles -> tokens in that order */
    if (tileCoverData.level > internalCoverData.level) {
      internalCoverData = tileCoverData;
    }

    if (tokenCoverData.level > internalCoverData.level) {
      internalCoverData = tokenCoverData;
      //if (tokenCoverData.level > -1 && (tokenCoverData.entity?.actor?.data.type ?? "") == "npc"){
      //  internalCoverData.source = DnDHelpers.sanitizeName(tokenCoverData.entity?.name, "losMaskNPCs", "DND5EH.LoSMaskNPCs_sourceMask");
      //}
    }

    this.Summary.FinalCoverEntity = internalCoverData.entity;
    this.Summary.FinalCoverLevel = internalCoverData.level;
    this.Summary.Source = internalCoverData.source;
    this.Summary.Text = CoverData.CoverLevelToText(internalCoverData.level);
  }

  /**
   * Base chat message output based on a finalized CoverData object. Can be extended if more system specific information
   * is needed in the message.
   *
   * @return {String}
   * @memberof CoverData
   */
  toMessageContent() {
    /** the cover data must be fully populated and finalized before anything else can happen */
    if (this.FinalCoverLevel < 0) {
      console.error(game.i18n.format("DND5EH.LoS_coverlevelerror1"));
      return "";
    }

    /** abuse the dice roll classes to make it look like I know how to UI ;) */
    let sightlineTranslation = game.i18n.format("DND5EH.LoS_outputmessage");
    let sanitizedSourceToken = this.SourceToken.name;
    let sanitizedSourceTokenCap =
      sanitizedSourceToken.charAt(0).toUpperCase() +
      sanitizedSourceToken.slice(1);
    let sanitizedTargetToken = this.TargetToken.name;
    if (this.SourceToken.actor?.data.type === "npc") {
      sanitizedSourceToken = DnDHelpers.sanitizeName(
        this.SourceToken.name,
        "losMaskNPCs",
        "DND5EH.LoSMaskNPCs_targetMask"
      );
    }
    if (this.TargetToken.actor?.data.type === "npc") {
      sanitizedTargetToken = DnDHelpers.sanitizeName(
        this.TargetToken.name,
        "losMaskNPCs",
        "DND5EH.LoSMaskNPCs_targetMask"
      );
    }
    const content = `
    <div class="dnd5ehelpers">
      <div class="dice-roll"><i>${sanitizedSourceTokenCap} ${sightlineTranslation} ${sanitizedTargetToken}</i>
        <div class="dice-result">
          <div class="dice-formula">${this.Summary.Text}
            <div class="desc">${this.Summary.Source}
            </div>
          </div>
        </div>
      </div>
    </div>`;
    return content;
  }

  calculateCoverBonus() {
    switch (this.Summary.FinalCoverLevel) {
      case 0:
        return false;
      case 1:
        return "-2";
      case 2:
        return "-5";
      case 3:
        return "-40";
    }
  }

  applyCoverEffect() {
    const content = `
  <button id="5eHelpersCover${id}" data-some-data="${coverLevel},${this.SourceToken.id}">Apply Cover</button>
  `;
    ChatMessage.create({ content: content, whisper: [game.user.id] });
  }
}

/**
 *
 * @param {Object} user
 * @param {Object} target
 * @param {Boolean} onOff
 * @returns
 */
async function onTargetToken(user, target, onOff) {
  /** bail immediately if LOS calc is disabled */
  if (game.settings.get("dnd5e-helpers", "losOnTarget") < 1) {
    return;
  }

  /** currently only concerned with adding a target for the current user */
  if (!onOff || user.id !== game.userId) {
    return;
  }

  for (const selected of canvas.tokens.controlled) {
    let coverData = await selected.computeTargetCover(target);

    /** if we got valid cover data back, finalize and output results */
    if (coverData) {
      coverData.FinalizeData();
      let content = coverData.toMessageContent();
      const coverSetting = game.settings.get(
        "dnd5e-helpers",
        "coverApplication"
      );
      const id = randomID();
      const coverLevel = coverData.calculateCoverBonus();
      let coverName, effDataIcon;
      switch (coverSetting) {
        case 0:
          break;
        case 1:
          content += `
        <div class="dnd5ehelpers">
        <button class="cover-button dnd5ehelpersHalfCover ${
          coverLevel === "-2" ? "active" : ""
        }" data-some-data="-2,${
            coverData.SourceToken.id
          },Half"><img src="modules/dnd5e-helpers/assets/cover-icons/Half_Cover.svg">${game.i18n.format(
            "DND5EH.LoS_halfcover"
          )}</button>
        <button class="cover-button dnd5ehelpersQuarterCover ${
          coverLevel === "-5" ? "active" : ""
        }" data-some-data="-5,${
            coverData.SourceToken.id
          },Three-Quarters"><img src="modules/dnd5e-helpers/assets/cover-icons/Full_Cover.svg">${game.i18n.format(
            "DND5EH.LoS_34cover"
          )}</button>
        </div>`;
          break;
        case 2: {
          /**
           * quit out if token has feature to ignore cover
           * @todo possible add in a check for features
           */

          if (
            coverData.SourceToken.actor.getFlag("dnd5e", "helpersIgnoreCover")
          )
            break;
          let coverLevel = coverData.calculateCoverBonus();
          if (!coverLevel) return;

          switch (coverLevel) {
            case "0":
              break;
            case "-2":
              {
                coverName = `${game.i18n.format("DND5EH.LoS_halfcover")}`;
                effDataIcon =
                  "modules/dnd5e-helpers/assets/cover-icons/Half_Cover.svg";
              }
              break;
            case "-5":
              {
                coverName = `${game.i18n.format("DND5EH.LoS_34cover")}`;
                effDataIcon =
                  "modules/dnd5e-helpers/assets/cover-icons/Full_Cover.svg";
              }
              break;
          }

          let changes = [
            { key: "data.bonuses.rwak.attack", mode: 2, value: coverLevel },
            { key: "data.bonuses.rsak.attack", mode: 2, value: coverLevel },
            { key: "data.bonuses.mwak.attack", mode: 2, value: coverLevel },
            { key: "data.bonuses.msak.attack", mode: 2, value: coverLevel },
          ];
          let effectData = {
            changes: changes,
            disabled: false,
            duration: { rounds: 1 },
            icon: effDataIcon,
            label: `DnD5e Helpers ${coverName}`,
            tint: "#747272",
          };
          let oldCover = coverData.SourceToken.actor.effects.find((i) =>
            i.data.label.includes("DnD5e Helpers")
          );
          if (oldCover) {
            coverData.SourceToken.actor.updateEmbeddedEntity("ActiveEffect", {
              _id: oldCover.id,
              changes: changes,
              label: `DnD5e Helpers ${coverName} ${game.i18n.format(
                "DND5EH.LoSCover_cover"
              )}`,
            });
          } else {
            coverData.SourceToken.actor.createEmbeddedEntity(
              "ActiveEffect",
              effectData
            );
          }

          content += `
          <div class="dnd5ehelpers">
        <button class="cover-button dnd5ehelpersHalfCover ${
          coverLevel === "-2" ? "active" : ""
        }" data-some-data="-2,${
            coverData.SourceToken.id
          },Half"><img src="modules/dnd5e-helpers/assets/cover-icons/Half_Cover.svg">${game.i18n.format(
            "DND5EH.LoS_halfcover"
          )}</button>
        <button class="cover-button dnd5ehelpersQuarterCover ${
          coverLevel === "-5" ? "active" : ""
        }" data-some-data="-5,${
            coverData.SourceToken.id
          },Three-Quarters"><img src="modules/dnd5e-helpers/assets/cover-icons/Full_Cover.svg">${game.i18n.format(
            "DND5EH.LoS_34cover"
          )}</button>
        </div>
        `;
        }
      }
      /** whisper the message if we are being a cautious GM */
      let recipients;
      if (game.user.isGM && game.settings.get("dnd5e-helpers", "losMaskNPCs")) {
        recipients = ChatMessage.getWhisperRecipients("GM");
      } else {
        recipients = game.users.map((u) => u.id);
      }

      ChatMessage.create(
        {
          content: content,
          whisper: recipients,
          speaker: { alias: "Helpers Cover" },
        },
        { dnd5ehelpersCover: true }
      );
    }
  }
}

function AddCover(d, d2) {
  let coverBackground;
  switch (game.settings.get("dnd5e-helpers", "coverTint")) {
    case 0:
      coverBackground = "DarkRed";
      break;
    case 1:
      coverBackground = "CadetBlue";
      break;
    case 2:
      coverBackground = "DimGrey";
      break;
    case 3:
      coverBackground =
        "linear-gradient(to right, orange , yellow, green, cyan, blue, violet)";
  }
  let effDataIcon;
  let data = d.dataset?.someData;
  const [coverLevel, sourceTokenId, coverName] = data.split(",");
  switch (coverLevel) {
    case "-2":
      effDataIcon = "modules/dnd5e-helpers/assets/cover-icons/Half_Cover.svg";
      break;
    case "-5":
      effDataIcon = "modules/dnd5e-helpers/assets/cover-icons/Full_Cover.svg";
      break;
  }
  const changes = [
    { key: "data.bonuses.rwak.attack", mode: 2, value: coverLevel },
    { key: "data.bonuses.rsak.attack", mode: 2, value: coverLevel },
    { key: "data.bonuses.mwak.attack", mode: 2, value: coverLevel },
    { key: "data.bonuses.msak.attack", mode: 2, value: coverLevel },
  ];
  let effectData = {
    changes: changes,
    disabled: false,
    duration: { rounds: 1 },
    icon: effDataIcon,
    label: `DnD5e Helpers ${coverName} ${game.i18n.format(
      "DND5EH.LoSCover_cover"
    )}`,
    tint: "#747272",
  };
  let token = canvas.tokens.get(sourceTokenId);
  let oldCover = token.actor.effects.find((i) =>
    i.data.label.includes("DnD5e Helpers")
  );
  if (oldCover?.data.label === effectData.label) {
    token.actor.deleteEmbeddedEntity("ActiveEffect", oldCover.id);
    d.style.background = "initial";
    d.childNodes[0].style.opacity = 0.3;
  } else if (oldCover) {
    token.actor.updateEmbeddedEntity("ActiveEffect", {
      _id: oldCover.id,
      icon: effDataIcon,
      changes: changes,
      label: `DnD5e Helpers ${coverName} ${game.i18n.format(
        "DND5EH.LoSCover_cover"
      )}`,
    });
    d.style.background = coverBackground;
    d.childNodes[0].style.opacity = 0.8;
    d2.style.background = "initial";
    d2.childNodes[0].style.opacity = 0.5;
  } else {
    token.actor.createEmbeddedEntity("ActiveEffect", effectData);
    d.style.background = coverBackground;
    d2.style.background = "initial";
    d.childNodes[0].style.opacity = 0.8;
    d2.childNodes[0].style.opacity = 0.3;
  }
}

async function removeCover(user, token) {
  if (game.settings.get("dnd5e-helpers", "losOnTarget") < 1) {
    return;
  }
  let testToken = token !== undefined ? token : canvas.tokens.controlled[0];
  let coverEffects = testToken?.actor.effects?.filter((i) =>
    i.data.label.includes("DnD5e Helpers")
  );
  if (!coverEffects) return;
  for (let effect of coverEffects) await effect.delete();
}

/**
 *
 * @param {Array}} drawingList
 */
async function DrawDebugRays(drawingList) {
  for (let squareRays of drawingList) {
    await canvas.drawings.createMany(squareRays);
  }
}

function getHitBoxPadding() {
  return canvas.grid.size * 0.05;
}

/**
 * For a given token, generates two types of grid points
 * GridPoints[]: Each grid intersection point contained within the token's occupied squares (unique)
 * Squares[][]: A list of point quads defining the four corners of each occupied square (points will repeat over shared grid intersections)
 *
 * @param {Token} token
 * @return {{GridPoints: [{x: Number, y: Number},...]}, {Squares: [[{x: Number, y: Number},...],...]}}
 */
function generateTokenGrid(token) {
  /** create a padding value to shrink the hitbox corners by -- total of 10% of the grid square size */
  /** this should help with diagonals and degenerate collisions */
  const padding = getHitBoxPadding();

  /** operate at the origin, then translate at the end */
  const tokenBounds = [token.w - padding, token.h - padding];

  /** use token bounds as the limiter */
  let boundingBoxes = [];
  let gridPoints = [];

  /** @todo this is hideous. I think a flatmap() or something is what i really want to do */

  /** stamp the points out left to right, top to bottom */
  for (let y = padding; y < tokenBounds[1]; y += canvas.grid.size) {
    for (let x = padding; x < tokenBounds[0]; x += canvas.grid.size) {
      gridPoints.push([x, y]);

      /** create the transformed bounding box. we dont have to do a final pass for that */
      /** note: we are offseting the "further" points by 2*padding due to the fact that the loop vars x and y already have a positive padding added */
      boundingBoxes.push([
        [token.x + x, token.y + y],
        [token.x + x + canvas.grid.size - 2 * padding, token.y + y],
        [token.x + x, token.y + y + canvas.grid.size - 2 * padding],
        [
          token.x + x + canvas.grid.size - 2 * padding,
          token.y + y + canvas.grid.size - 2 * padding,
        ],
      ]);
    }

    gridPoints.push([token.w - padding, y]);
  }

  /** the final grid point row in the token bounds will not be added */
  for (let x = padding; x < tokenBounds[0]; x += canvas.grid.size) {
    gridPoints.push([x, token.h - padding]);
  }

  /** stamp the final point, since we stopped short (handles non-integer sizes) */
  gridPoints.push(tokenBounds);

  /** offset the entire grid to the token's absolute position */
  gridPoints = gridPoints.map((localPoint) => {
    return [localPoint[0] + token.x, localPoint[1] + token.y];
  });

  return { GridPoints: gridPoints, Squares: boundingBoxes };
}

/**
 * Computes the cover value (num visible corners to any occupied grid square) of
 * the specified token if provided, otherwise, the first token in the user's
 * target list.  Can optionally draw each ray tested for cover.
 *
 * @param {Token} [targetToken=null]
 * @param {boolean} [visualize=false]
 * @return {*}
 */
Token.prototype.computeTargetCover = async function (
  targetToken = null,
  mode = game.settings.get("dnd5e-helpers", "losOnTarget"),
  includeTiles = game.settings.get("dnd5e-helpers", "losOnTarget") > 0,
  includeTokens = game.settings.get("dnd5e-helpers", "losWithTokens"),
  visualize = false
) {
  const myToken = this;

  /** if we were not provided a target token, grab the first one the current user has targeted */
  targetToken = !!targetToken
    ? targetToken
    : game.user.targets.values().next().value;

  if (!targetToken) {
    ui.noficiations.error(game.i18n.format("DND5EH.LoS_notargeterror"));
    return false;
  }

  /** dont compute cover on self */
  if (myToken.id == targetToken.id) {
    return false;
  }

  /** generate token grid points */
  /** if we have been called we are computing LOS, use the requested LOS mode (center vs 4 corners) */
  const myTestPoints =
    mode > 1
      ? generateTokenGrid(myToken).GridPoints
      : [[myToken.center.x, myToken.center.y]];
  const theirTestSquares = generateTokenGrid(targetToken).Squares;

  const results = myTestPoints.map((xyPoint) => {
    /** convert the box entries to num visible corners of itself */
    let individualTests = theirTestSquares.map((square) => {
      return pointToSquareCover(xyPoint, square, visualize);
    });

    /** return the most number of visible corners */
    return Math.max.apply(Math, individualTests);
  });

  const bestVisibleCorners = Math.max.apply(Math, results);

  if (_debugLosRays.length > 0) {
    await DrawDebugRays(_debugLosRays);
    _debugLosRays = [];
  }

  const bestCover = CoverFromObjects(
    myToken,
    targetToken,
    includeTiles,
    includeTokens
  );

  return new CoverData(
    myToken,
    targetToken,
    bestVisibleCorners,
    bestCover?.bestTile,
    bestCover?.bestToken
  );
};

var _debugLosRays = [];

/**
 * Calculate the number of visible corners of a target grid square from a source point
 *
 * @param {{x: Number, y: Number}} sourcePoint
 * @param {[{x: Number, y: Number}],...} targetSquare
 * @param {boolean} [visualize=false]
 * @return {Number}
 */
function pointToSquareCover(sourcePoint, targetSquare, visualize = false) {
  /** create pairs of points representing the test structure as source point to target array of points */
  let sightLines = {
    source: sourcePoint,
    targets: targetSquare,
  };

  /** Debug visualization */
  if (visualize) {
    let debugSightLines = sightLines.targets.map((target) => [
      sightLines.source,
      target,
    ]);

    const myCornerDebugRays = debugSightLines.map((ray) => {
      return {
        type: CONST.DRAWING_TYPES.POLYGON,
        author: game.user._id,
        x: 0,
        y: 0,
        strokeWidth: 2,
        strokeColor: "#FF0000",
        strokeAlpha: 0.75,
        textColor: "#00FF00",
        points: [ray[0], ray[1]],
      };
    });

    _debugLosRays.push(myCornerDebugRays);
  }
  /** \Debug visualization */

  /** only restrict vision based on sight blocking walls */
  const options = {
    blockMovement: false,
    blockSenses: true,
    mode: "any",
  };

  let hitResults = sightLines.targets.map((target) => {
    const ray = new Ray(
      { x: sightLines.source[0], y: sightLines.source[1] },
      { x: target[0], y: target[1] }
    );
    return WallsLayer.getRayCollisions(ray, options);
  });

  const numCornersVisible = hitResults.reduce(
    (total, x) => (x == false ? total + 1 : total),
    0
  );

  return numCornersVisible;
}

/**
 * Returns all entities in the list that collide with the ray (ray to bounding box)
 * Object must contain x, y, heigh, width fields.
 * @param {Ray} ray
 * @param {[object]} objectList
 * @return {*}
 */
function CollideAgainstObjects(ray, objectList) {
  /** terrible intersectors follow */

  /** create a padding value to shrink the hitbox corners by -- total of 10% of the grid square size */
  /** this should help with diagonals and degenerate collisions */
  const padding = getHitBoxPadding();

  //create an "x" based on the bounding box (cuts down on 2 collisions per blocker)
  const hitTiles = objectList.filter((tile) => {
    /** looking for any collision of this tile's bounds
     *  by creating an "x" from its bounding box
     *  and colliding against those lines */
    //as [[x0,y0,x1,y1],...]
    const boxGroup = [
      [
        tile.x + padding,
        tile.y + padding,
        tile.x + tile.width - padding,
        tile.y + tile.height - padding,
      ],
      [
        tile.x + tile.width - padding,
        tile.y + padding,
        tile.x + padding,
        tile.y + tile.height - padding,
      ],
    ];

    return !!boxGroup.find((boxRay) => {
      return ray.intersectSegment(boxRay) !== false;
    });
  });

  return hitTiles;
}

/**
 *
 *
 * @param {*} sourceToken
 * @param {*} targetToken
 * @return {*}
 */
function CoverFromObjects(
  sourceToken,
  targetToken,
  includeTiles,
  includeTokens
) {
  /** center to center allows us to run alongside cover calc
   * otherwise we should include cover in the optimal search of cover... */
  const ray = new Ray(sourceToken.center, targetToken.center);

  /** create the container to optionally populate with results based on config */
  let objectHitResults = { tiles: null, tokens: null };

  if (includeTiles) {
    /** collect "blocker" tiles (this could be cached on preCreateTile or preUpdateTile) */
    const coverTiles = canvas.tiles.placeables.filter(
      (tile) => tile.getFlag("dnd5e-helpers", "coverLevel") ?? 0 > 0
    );

    /** hits.length is number of blocker tiles hit */
    objectHitResults.tiles = CollideAgainstObjects(ray, coverTiles);
  }

  if (includeTokens) {
    /** collect tokens that are not ourselves OR the target token */
    const coverTokens = canvas.tokens.placeables.filter(
      (token) => token.id !== sourceToken.id && token.id !== targetToken.id
    );
    objectHitResults.tokens = CollideAgainstObjects(ray, coverTokens);
  }

  /** using reduce on an empty array with no starting value is a no go
   *  a starting value (fake tile) is also a no go
   *  so we test and early return null instead.
   */
  const maxCoverLevelTile =
    objectHitResults.tiles?.length ?? 0 > 0
      ? objectHitResults.tiles.reduce((bestTile, currentTile) => {
          return bestTile?.getFlag("dnd5e-helpers", "coverLevel") ??
            -1 > currentTile?.getFlag("dnd5e-helpers", "coverLevel") ??
            -1
            ? bestTile
            : currentTile;
        })
      : null;

  /** at the moment, we dont care what we hit, since all creatures give 1/2 cover */
  const maxCoverToken =
    objectHitResults.tokens?.length ?? 0 > 0
      ? objectHitResults.tokens[0]
      : null;

  return { bestTile: maxCoverLevelTile, bestToken: maxCoverToken };
}

/** attaches the cover dropdown to the tile dialog */
function onRenderTileConfig(tileConfig, html) {
  /** 0 = disabled, get out of here if we are disabled */
  if (game.settings.get("dnd5e-helpers", "losOnTarget") < 1) {
    return;
  }

  const currentCoverType = tileConfig.object.getFlag(
    "dnd5e-helpers",
    "coverLevel"
  );

  /** anchor our new dropdown at the bottom of the dialog */
  const saveButton = html.find($('button[type="submit"]'));
  const coverTranslation = game.i18n.format("DND5EH.LoS_providescover");
  const noCover = game.i18n.format("DND5EH.LoS_nocover");
  const halfCover = game.i18n.format("DND5EH.LoS_halfcover");
  const threeQuaterCover = game.i18n.format("DND5EH.LoS_34cover");
  const fullCover = game.i18n.format("DND5EH.LoS_fullcover");
  let checkboxHTML = `<div class="form-group"><label${coverTranslation}</label>
                        <select name="flags.dnd5e-helpers.coverLevel" data-dtype="Number">
                          <option value="0" ${
                            currentCoverType == 0 ? "selected" : ""
                          }>${noCover}</option>
                          <option value="1" ${
                            currentCoverType == 1 ? "selected" : ""
                          }>${halfCover}</option>
                          <option value="2" ${
                            currentCoverType == 2 ? "selected" : ""
                          }>${threeQuaterCover}</option>
                          <option value="3" ${
                            currentCoverType == 3 ? "selected" : ""
                          }>${fullCover}</option>
                        </select>
                      </div>`;

  html.css("height", "auto");

  saveButton.before(checkboxHTML);
}

/**
 *
 * @param {Object} _scene
 * @param {Object} tileData tile.data
 */
function onPreCreateTile(_scene, tileData, _options, _id) {
  const halfPath = "modules/dnd5e-helpers/assets/cover-tiles/half-cover.svg";
  const threePath =
    "modules/dnd5e-helpers/assets/cover-tiles/three-quarters-cover.svg";
  /** what else could it be? */
  if (
    tileData.type == "Tile" &&
    (tileData.img == halfPath || tileData.img == threePath)
  ) {
    /** its our sample tiles -- set the flag structure */
    const tileCover = tileData.img == halfPath ? 1 : 2;

    if (!tileData.flags) {
      tileData.flags = {};
    }

    tileData.flags["dnd5e-helpers"] = { coverLevel: tileCover };
  }
}

globalThis.DnDCombatUpdates = DnDCombatUpdates;
