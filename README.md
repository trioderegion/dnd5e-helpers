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
- Will automatically mark a newly added weapon, armor or tool 'proficient' if it is part of the actor's listed proficiencies
- Note: specific weapon or armor proficiencies should match their intended name (ex. "Dagger" proficiency for a weapon called"Dagger").
- For Tools, it tries to match the tool name with the proficiency (Ex. "Flute" will not be detected by checking "Musical Instrument" Tool Proficiency textbox, but "Musical Instrument: Flute" will. To detect "Flute", add "Flute" as a special Tool Proficiency).
## Authors:
- honeybadger (https://github.com/trioderegion)
- Kandashi (https://github.com/kandashi)
