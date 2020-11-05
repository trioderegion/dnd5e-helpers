# DnD5e Helpers
Little helpers for little 5e tasks.

## Current Features

### Automatic Wild Magic Surge
- Per user
- Triggers on *any* reduction in current spell slots from a character with the indicated feature (default: Wild Magic Surge)
- Optional homebrew: MORE Surges - a surge triggers on a roll <= spell level.
- Blind roll surge table results (GM only)

![WildSurge](https://github.com/trioderegion/dnd5e-helpers/raw/master/.github/surge-output.webp)

### Reaction Reset on Start of Turn
- GM only
- status is configurable (note: for 0.6.x users, this should be the icon path; /icons/svg/hazard.svg)

### Legendary Action Reset on Start of Turn
- GM only

### Recharge Abilities on Start of Turn
- GM only
- For abilities with a "d6 recharge" on every turn.

### Great Wound Detection
- GM only
- Triggers on a reduction of 50% of a token/actor's health.
- Configurable Great Wound table to draw from.

### Auto Proficiency Detection
- Will automatically mark a newly added weapon 'proficient' if it is part of the actor's listed proficiencies
- Note: specific weapon proficiencies should match their intended weapon name (ex. "Dagger" proficiency for a weapon called"Dagger")

### Auto Regeneration
- Automaticly checks actors with the Regeneration feature
- At the start of their turn, prompts the GM for a roll for the regen and auto applies the healing

### Undead Fortitude
- Automaticly checks actors with the Undead Fortitude feature
- When they are reduced to 0hp it will prompt the GM to choose the type of damage that was applied
- Then prompts the GM for a Con save for that actor, and will auto heal the NPC if the roll beats the save needed
- There are two settings for levels of checks
    - Quick saves will just measure the change in hp and will not measure "overkill"
    - Advanced saves will query the GM for the amount of damage taken as a more complex system

## Debug Setting
- Option to add debug logs for troubleshooting

## Authors:
- honeybadger (https://github.com/trioderegion)
- Kandashi (https://github.com/kandashi)
