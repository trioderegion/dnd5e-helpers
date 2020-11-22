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
