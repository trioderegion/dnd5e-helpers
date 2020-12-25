# DnD5e Helpers
Little helpers for little 5e tasks.

## Current Features

### Automatic Wild Magic Surge
- Triggers on *any* reduction in current spell slots from a character with the indicated feature (default: Wild Magic Surge)
- Optional homebrew: MORE Surges - a surge triggers on a roll <= spell level.
- Blind roll surge table results (GM only)

![WildSurge](https://github.com/trioderegion/dnd5e-helpers/raw/master/.github/surge-output.webp)

### Reaction Status Management
- Detects when an action is taken outside of a token's turn and applies a configurable status as a visual reminder. The following details when this will be detected during combat:
   - 1) Whenever a token uses an item with activation of "1 Reaction".
   - 2) Whenever a token uses an item with activation of "1 Action" outside of their turn.
   - 3) Any other item activation will be ignored. For example "0 Action" or "1 Bonus Action"
- Will remove the configured status at the beginning of the token's turn.
- This status used is configurable and should match the name when hovered over in the token hud.
- Supports Combat Utility Belt's custom statuses.
- If auto remove is enabled these statuses will be removed at the end of combat as well.

### Legendary Action Reset on Start of Turn
- All legendary action uses of a creature will reset to their max on the start of their turn in combat.

### Recharge Abilities on Start of Turn
- GM only
- For abilities with a "d6 recharge" on every turn.

### Diagonal Template Scaling
- _I cast...Firesquare!_
- Scales line, cone, and circle type templates upon placement to better fit to the 5/5/5 diagonal rule.
- Line and cone scaling can be enabled independently from circle scaling.
  - Circle templates less than 1 grid unit in radius will not be converted. These small templates are often useful for creating quick token-like markers on the board or used for macros which need the centerpoint maintained.

![Line Scaling](https://github.com/trioderegion/dnd5e-helpers/raw/master/.github/ray_scaling.gif)
![Circle Scaling](https://github.com/trioderegion/dnd5e-helpers/raw/master/.github/circle_scaling.gif)

### Cover Calculator (Beta)
- When a user with a selected token targets another token, the target's cover will be calcuated following the rules presented in DMG pg. 251
- A message in chat will be posted concerning the target's cover in relation to the selected token(s).
- Prioritizes walls, specially flaged tiles, then tokens.
  - Tiles have a new option in their configuration dialog that sets the cover granted by them.
  - Two tiles are now included from game-icons.net that are configured automatically for half and three-quarters cover in modules/dnd5e-helpers/assets/cover-tiles.
- Has two modes for cover in relation to walls: Center Point and Four Corner. Cover from tiles and tokens are (currently) only calculated from Center Point.
  - Center Point - a target token's cover is based on foundry's player vision rendering (center point of self to 4 corners of target)
  - Four Corner - direct implementation of DMG rules, where vision is computed from each occupied grid point and the corner granting the target the least cover is chosen.
  - A more detailed discussion of this can be found on our Wiki
- A new method has been added as ``Token#computeTargetCover``. The usage of it has been detailed in the source code, but is still a work in progress. Basic usage is calling with no arguments with both a selected and targeted token. The return value is a promise of the raw cover data from visibility tests.

![Cover Calculation](https://github.com/trioderegion/dnd5e-helpers/raw/master/.github/los_calc.gif)

### Auto Proficiency Detection
- Will automatically mark a newly added weapon, armor or tool 'proficient' if it is part of the actor's listed proficiencies
- Note: specific weapon or armor proficiencies should match their intended name (ex. "Dagger" proficiency for a weapon called"Dagger").
- For Tools, it tries to match the tool name with the proficiency (Ex. "Flute" will not be detected by checking "Musical Instrument" Tool Proficiency textbox, but "Musical Instrument: Flute" will. To detect "Flute", add "Flute" as a special Tool Proficiency).

### Auto Regeneration
- Automatically checks actors with the Regeneration or Self-Repair features
- Searches the these features for the phrase "X hit points", where X can be a static value or a dice formula
- At the start of their turn, prompts the GM for a roll for the regen and auto applies the healing

### Undead Fortitude
- Automatically checks actors with the Undead Fortitude feature
- When they are reduced to 0hp it will prompt the GM to choose the type of damage that was applied
- Then prompts the GM for a Con save for that actor, and will auto heal the NPC if the roll beats the save needed
- There are two settings for levels of checks:
    - Quick saves will just measure the change in hp and will not measure "overkill"
    - Advanced saves will query the GM for the amount of damage taken as a more complex system

### Open Wounds
- Rolls on an "Injury Table" when specific customisable criteria are met; currently: 
  - Failing a Death Saving Throw by 5 or more
  - Getting critically hit (customisable value)
  - Falling to 0hp
  - Falling to 0hp from a Great Wound

### Great Wound Detection
- Triggers on a reduction of >50% of a token/actor's health.
- Configurable Great Wound table to draw from.
- This will ask for a Great Wound Roll, and will prompt the owner of the token to make a Con Save then roll on the table

## Debug Setting
- Option to add debug logs for troubleshooting

## Authors:
- honeybadger (https://github.com/trioderegion)
- Kandashi (https://github.com/kandashi)
