# Changelog

## [1.3.1] - 2026-09-07

### Bug Fixes & Improvements

- **Scene Configuration Layout Fix (#6)**: Fixed Scene Configuration window layout corruption in Foundry V13 by scoping Vision Blur override controls strictly to the Visibility tab content panel (`<div class="tab" data-tab="visibility">`).
- **ApplicationV2 Sheet Handling**: Guarded window positioning in `renderSceneConfig` to prevent sheet layout distortion in V13/V14 ApplicationV2 sheets.
- **Passive Perception Integration**: Added option for clear vision range to equal character tokens' Passive Perception score in DnD 5e, with per-scene override options.

## [1.3.0] - 2026-08-09

### Foundry V14 Compatibility & Improvements

- **Foundry VTT V14 Verification**: Updated compatibility metadata to support Foundry V14.
- **PixiJS v8 GLSL 100 Shader Compatibility**: Refactored `VisionBlurFilter` fragment shader syntax (`varying`, `gl_FragColor`, `texture2D`) to ensure seamless WebGL shader compilation and prevent gray screen canvas errors.
- **High-DPI / Retina Screen Scaling**: Updated screen UV calculations to use `renderer.screen` dimensions, ensuring pixel-perfect blur circles on high-DPI/4K displays.
- **Instant GM Blur Release**: Registered `controlToken` hook and updated early returns so when a GM deselects a token, the blur filter immediately disables without full-screen transition flashes.
- **Canvas Ticker Lifecycle Guard**: Added `canvasTearDown` hook listener and ticker cleanup on `canvasReady` to prevent duplicate frame tickers and memory leaks during scene transitions.

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
