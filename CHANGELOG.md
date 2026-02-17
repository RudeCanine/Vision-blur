# Changelog

## [1.1.0] - 2026-02-17

### Initial Release

- **Core Feature**: Adds a configurable Gaussian blur effect to player vision beyond a certain range.
- **Vision Range Setting**: Configurable "clear vision" distance (in grid units).
- **Blur Strength Setting**: Adjustable intensity (1-10) for the blur effect.
- **GM Mode**: Option to enable blur for the GM when controlling a token (defaults to full vision).

### New Features & Improvements

- **Darkvision Mode**: Added "Enable Only with Darkvision" setting. When active, blur is only applied if the token is using Darkvision and is in darkness (no light sources present).
- **Multi-Token Support**: The blur effect now correctly calculates the union of clear vision areas for all controlled tokens (e.g. Character + Familiar).
- **Anti-Metagaming**: When "Darkvision Only" is enabled, if *any* controlled token is in darkness (requiring blur), the blur effect is enforced on *all* controlled tokens. This prevents using a secondary token in light to clear the screen for a token in darkness.
- **Aspect Ratio Correction**: Fixed vision range calculation to be consistent across different aspect ratios (e.g., Ultrawide monitors vs standard). The blur radius is now normalized based on the smallest screen dimension.
- **Smooth Transitions**: Added a fade-in/fade-out transition for the blur effect activation to avoid jarring snaps when moving between lighting conditions.
- **Optimization**: Logic checks are now throttled to run less frequently (every 10 frames) to minimize performance impact.
- **Changed Default**: Default Vision Range changed from 25 to 10 grid units.
