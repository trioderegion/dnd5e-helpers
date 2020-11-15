# DnD5e Helpers
Little helpers for little 5e tasks.

## Current Features

### Automatic Wild Magic Surge
- Per user
- Triggers on *any* reduction in current spell slots from a character with the indicated feature (default: Wild Magic Surge)
- Optional homebrew: MORE Surges - a surge triggers on a roll <= spell level.
- Blind roll surge table results (GM only)

![WildSurge](https://github.com/trioderegion/dnd5e-helpers/raw/master/.github/surge-output.webp)

### Reaction Status Management
- GM only
- Detects when an action is taken outside of a token's turn and applies a configurable status as a visual reminder. The following details when this will be detected during combat:
   - 1) Whenever a token uses an item with activation of "1 Reaction".
   - 2) Whenever a token uses an item with activation of "1 Action" outside of their turn.
   - 3) Any other item activation will be ignored. For example "0 Action" or "1 Bonus Action"
- Will remove the configured status at the beginning of the token's turn.
- This status used is configurable and should match the name when hovered over in the token hud.
- Supports Combat Utility Belt's custom statuses.

### Legendary Action Reset on Start of Turn
- GM only
- All legendary action uses of a creature will reset to their max on the start of their turn in combat.

### Recharge Abilities on Start of Turn
- GM only
- For abilities with a "d6 recharge" on every turn.

### Great Wound Detection
- GM only
- Triggers on a reduction of 50% of a token/actor's health.
- Configurable Great Wound table to draw from.
- This will ask for a Great Wound Roll, and will prompt the owner of the token to make a Con Save then roll on the table

### Auto Proficiency Detection
- GM Only
- Will automatically mark a newly added weapon, armor or tool 'proficient' if it is part of the actor's listed proficiencies
- Note: specific weapon or armor proficiencies should match their intended name (ex. "Dagger" proficiency for a weapon called"Dagger").
- For Tools, it tries to match the tool name with the proficiency (Ex. "Flute" will not be detected by checking "Musical Instrument" Tool Proficiency textbox, but "Musical Instrument: Flute" will. To detect "Flute", add "Flute" as a special Tool Proficiency).

### Auto Regeneration
- GM Only
- Automaticly checks actors with the Regeneration feature
- Searches the Regeneration Feature for the phrase "X hit points", where X can be a static value or a dice formula
- At the start of their turn, prompts the GM for a roll for the regen and auto applies the healing

### Undead Fortitude
- GM Only
- Automaticly checks actors with the Undead Fortitude feature
- When they are reduced to 0hp it will prompt the GM to choose the type of damage that was applied
- Then prompts the GM for a Con save for that actor, and will auto heal the NPC if the roll beats the save needed
- There are two settings for levels of checks
    - Quick saves will just measure the change in hp and will not measure "overkill"
    - Advanced saves will query the GM for the amount of damage taken as a more complex system

## Debug Setting
- GM Only
- Option to add debug logs for troubleshooting

## Authors:
- honeybadger (https://github.com/trioderegion)
- Kandashi (https://github.com/kandashi)
