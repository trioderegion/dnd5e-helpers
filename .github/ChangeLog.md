#DnD5e Helpers Changelog

##1.1
- Added functionality for reseting number of legendary actions to max when a creature with legendary action counts starts their turn in combat.

##1.2
- tokens with actors that own a d6 recharge item will have its recharge rolled at the beginning of the token's turn in combat. This functions the same as if recharge was manually pressed on the sheet itself.

##1.3
- New co-author! Welcome, Kandashi!
- Great Wound detection on 50% loss of max hp.
- Automatic proficiency detection on newly added weapons.

###1.3.1
- Pushed fix for Great Wounds not reading token Hp correctly

###1.4.0
- Undead Fortitude detection and prompt on "death".
- Automatically prompt for regeneration rolls by creatures with the "Regeneration" feature. (see readme for details)

###1.4.1
- Quick pass at supporting CUB conditions. Note: the status name should be lowercase in 5e helpers config.
- Contributed by Szefo09#1005. Big thanks!
-- Auto proficiency detection has been expanded to include Armor and Tool proficiencies

###1.5.0
- Big addition to the feature-previously-known-as auto reaction removal. Now includes options to not only remove, but apply as well depending on the item that is used.

###1.5.1
- Bugfix for using a reaction ability *on* your turn. You can blame badger.

###1.5.2
- Bug fixes for Great Wound not correctly showing the con saving throw on the players screen. This will now automaticly occur. The "Roll for Great Wound" will happen on the users screen that edited the HP value.
- Configured the Reaction setting to play nicely with CUB Conditions, no more work-arounds
- Bug fixes for the Reaction Application to prevent multiple applications of the same status
- Cleared up Hooks to make the execution a bit easier 
- @todo Automaticly remove all reaction status' at the end of a combat

###1.5.3
- Fixed string === integer comparison bug. Whoops.

###1.5.4
- Officially dropping support for versions <0.7.5. Unofficially, only the Reaction management system is unsupported by 0.6.x.
- Major rework to reaction management internally:
  - Moved hook to preCreateMessage for direct access to the item being used (if any).
  - Now triggers when an item has a usage of "1 Action" or "1 Reaction". All others are ignored (e.g. 0 Action, 1 Bonus Action).
  - Plays nicely with Combat Utility Belt with either custom or core conditions.  - Put in considerations for localization. The status effect name you see when hovering over the icon should be the string you enter in configuration.
  
###1.6.0
-  Launched the Open Wounds Feature
- Rolls on an "Injury Table" when specific customisable criteria are met; currently: 
  - Failing a Death Saving Throw by 5 or more
  - Getting critically hit (customisable value)
  - Falling to 0hp
- Fixed some of the previous errors with non-assigned values and actorless tokens.
- Reaction Management is feature complete with the addition of clearing reaction statuses when combat is ended.

###1.6.1
- Fixed silly bug for reaction detection that caused it only to work for the first GM. (Thanks, Blackbeard)
- Better support for multiple combats. However, a systemic issue was revealed.  Combat-based features of helpers may not work when multiple encounters exist. combats.active does not always appear to have a valid value during multiple encounters.

###1.7.0
- Implemented template scaling for the 5/5/5 diagonal movement rule. Define your spell ranges as usual. When a template is place that sits on a diagonal, the resulting template will be scaled to more accurately cover the diagonal squares. This also means that _all_ circle type AOEs will be converted to an equivalent square template after placement. See examples in readme.

###1.7.1
- Corrected a hook used for reaction, recharge, and legendary action that would cause these functions not to fire if a player advanced the turn.

###1.7.2
- Circlular templates with a radius less than 1 grid unit will no longer be converted to square templates as these are often useful for quick token-like markers on the board or used for macros operating on the templates centerpoint.

###1.8.0
- Initial Line of Sight (Cover) calculator implemented.
    - Will trigger when a user has a selected token(s) and targets any token.
    - Currently only considers vision blocking walls when computing cover.
    - Additionally, a method was added to the Token object for direct use -- Token#computeTargetCover(target = null, visualize = false)
      - A null token wil grab the first target in the user's targets list
      - Return value is number of visible corners from most visible occupied square
###1.8.1
- A few fixes for Open Wounds and Great Wounds not correctly displaying/calculating 
- Added Self-Repair as an example of Rengeration 
- Added ui notification for legendary action recharge

###1.8.2
- Removed overlapping proficiency marking with the latest dnd5e 1.2.0 system. No backwards compat provided for <1.2.0.  Retains specific proficiency marking like "Daggers" or "Longswords".
- Quick fix for Auto Regen not working

###1.8.3
- Cover Calculator (beta)
  - Now considers tiles and tokens during cover caluclations
  - Added dropdown just above the save button in the tile configuration dialog to set the cover level granted by a collision with this tile. Default is "no cover".
  - Includes two premade tiles for half and three quarters cover that will be automatically set upon placement on the map. Useful for marking obstacles on maps with baked doo-dads.
  - First pass at abstracting and working towards splitting this off as a standalone API that 5e helpers will hook into.
    - Token#computeTargetCover now returns a promise of raw cover data which can be interpretted according to your needs

###1.8.4
- Fixed several race conditions relating to token updates on new combat turns.

###1.8.5
- Additions to Wild Magic Surge - Volatile Surges
  - Contributed directly by Werner (https://github.com/Werner-Dohse). Big thanks.
  - These homebrew surges will trigger similarly to the More Surges option, except when the sorcerer's Tides of Chaos feature has been expended. In this case, the spell level will be increased by 1d4 for the sake of the d20 target number (i.e. surge if ``d20 <= spell level + 1d4``).
    - Additionally, if a Volatile Surge occurs, you will regain one use of Tides of Chaos immediately.
  - More Surges homebrew and wild magic surge enable configuration options have been rolled into a single dropdown to select the mode or disable this helper entirely.
- More Surges now also will recharge Tides of Chaos when a surge occurs like it always should have. Was extremely easy to implement with Werner's additions.

###1.8.6
- Regeneration fixed for linked actors
- Added bonus reminder to cover output (ex. "Half Cover (+2)" )

###1.8.7
- Player reactions should now properly apply the status effect.
- Properly denoted dnd5e system requirement.

###1.8.8
- Can now optionally "mask" NPC names in cover chat cards
- Fixed noisy error when adding armor and detecting specific proficiencies (`pass_type undefined`)

###1.9.0
- Localization support! Finally! Oh yea, and you owe Kandashi a beer.
  - `es` and `fr` translations provided by github users MS-PBS and Elfenduil (respectively). Huge thanks to both!
  - MRs for fixes and additional languages welcome.

###1.9.1
- Missed a localization string in Wild Magic surge output. Corrected and functionality restored.
- Brazilian Portuguese localization added! Thanks brnmuller!

###1.9.2
- Missed a localization string in Volatile Wild Magic surge output. Corrected and functionality restored. (I can see where this is going, lol)

###1.9.3
- Mask NPC names in cover output now also whispers the cover result to the GM instead of being public (i.e. hide GM info from players)
- Localization Changes: `LoSMaskNPCs_name`, `LoSMaskNPCs_hint`

###1.9.4
- `Blind Table Draw` for wild magic surges has been expanded to hide _all_ wild magic results from the players. Initial d20 roll, flavor text, and table outputs will be whispered to the GM.
  - KNOWN ISSUE: The message is whispered from the player's client, so the player casting the spell will be aware of its results. I need to rework some things, bear with me.
  - This option is now called `Hide Wild Magic from Players`.
  - Localization changes (sorry):
    - `WildMagicWisper_name`
    - `WildMagicWisper_hint`
- Addressed a few async oversights. Wild magic results should be better synchronized between clients now. Surge Roll -> Surge Result -> Spell.

###1.9.5
- Korean language support added.
  - Contributed by KLO#1490, big thanks!

###1.9.6
- Ability recharge rolls can now be whispered to the GM (i.e. hidden from players)
- Ability recharge rolls can now be rolled at the _end_ of a creature's turn, if desired, rather than at the beginning (RAW).
- Localization changes:
  - `DND5EH.CombatAbilityRecharge_hint`
  - `DND5EH.CombatAbilityRechargeHide_name`
  - `DND5EH.CombatAbilityRechargeHide_hint`
  - `DND5EH.CombatAbilityRecharge_Off`
  - `DND5EH.CombatAbilityRecharge_Start`
  - `DND5EH.CombatAbilityRecharge_End`

###1.10.0
- Rejoice! For cole has provided a solution for Elemental Adept!
- New die roll modifier added: `mr` (minimum roll)
  - Example: `1d6mr2` will replace any rolls less than 2 with 2s, `1d2mr10` will replace any rolls less than 10 with 10!
  - Spell and Cantrip scaling works as expected. `1d6mr2` in the scaling field will ensure upcasting of Burning Hands will replace 1s with 2s. Cantrip scaling can be left blank in most cases (as per stock dnd5e operation) as the first damage field of the cantrip will be used as the scaling formula.
  - Note: There is no toggle option for this functionality.
- Translation updates provided by github users MS-PBS and brnmuller. We are thankful, as always.

###1.10.1
- Japanese localization provided by `togue`!

###1.10.2
- Additional Wild Magic Surge homebrew added, courtesy of `xdy`. All wild magic surge options can now optionally recharge Tides of Chaos when a surge occurs. This is added as a seperate 'Recharge Tides of Chaos on surge' option to decouple it from the Surge variations already present.
- Translation changes/additions (denoted `[*]` and `[EN]` respectively in the packs):
  - `DND5EH.WildMagicOptions_hint` has been updated to remove reference to recharging Tides of Chaos
  - `DND5EH.WildMagicTidesOfChaos_name` added
  - Several French translation strings were missing the untranslated `[EN]` flag.
    - Note: French translation is beginning to fall behind in updates. Any help is appreciated on this front <3

###1.10.3
- Small tweak to token/tile cover calculations -- the hitbox size has been reduced by 10% of the grid square size. This should address the erroneous half cover when targeting a token diagonally due to degenerate collisions.

###1.11.0
- Action Management 
  - Updated "Reaction settings" to include all aciton types, Action, Reaction, Bonus action are all tracked through HUD elements
  - These elements are only applied to tokens currently in combat
  - Icons are "hidden" when the action is taken, and recovered upon starting a tokens turn.
- Lair Actions.
  - Added lair action tracking, upon adding actors to the combat tracker it will scan for actions with the `uses lair action` action type and add them to a combat-specific pool
  - This lair action pool will be given to the GM as combat advances past initiative 20, with the option to jump to the actor, or directly roll the action

