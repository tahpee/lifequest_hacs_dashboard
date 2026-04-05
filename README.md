# Lifequest Dashboard Card

A custom Lovelace card for Home Assistant that displays Lifequest player progress and quests.

## Requirements

Requires the [Lifequest integration](https://github.com/tahpee/lifequest_hacs) to be installed.

## Installation

1. Add this repository to HACS as a custom repository (Category: Dashboard)
2. Install "Lifequest Dashboard Card"
3. Add the card to your dashboard:

```yaml
type: custom:lifequest-card
```

## Features

- Player progress cards with level, points, and progress bar
- Tap to expand quest list per player
- Complete quests directly from the card
- Auto-updates when Lifequest data changes
