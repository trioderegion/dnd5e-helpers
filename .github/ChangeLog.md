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
