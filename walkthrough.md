# Vision Blur V14 Migration & Verification Walkthrough

## Summary of Completed Work

We conducted a complete architectural audit, implemented V14 code enhancements, resolved WebGL shader compilation, and fixed the full-screen blur ramp on token release in **Vision Blur** on **Foundry VTT V14**.

---

## ⚡ Instant GM Blur Release Fix (Resolved Video Issue)

### Root Cause Analysis
Watching the demonstration video revealed the exact mechanism causing the full-screen blur ramp when releasing a token:
1. **Logic Throttling Delay:** `updateTokenLogic()` was throttled to run every 10 frames (`LOGIC_THROTTLE = 10`), causing up to a 160ms lag before the module registered token deselection.
2. **Early Return Bypass:** In `updateTokenLogic()`, when `candidates.length === 0` (token deselected), an early `return;` was executed. This set `targetBlurFactor = 0`, but bypassed resetting `currentBlurFactor = 0` and `visionFilter.enabled = false`.
3. **Empty Token Array Blur:** When `activeTokensData` became `[]` (`uTokenCount = 0`), the shader had no token clear circles (`minBlurFactor = 1.0`), resulting in 100% full-screen blur. Because `currentBlurFactor` was interpolating down from 1.0 to 0 over 30 frames, the entire screen flashed full blur during the fade.

### Resolution
1. **Registered `controlToken` Hook:** Added `Hooks.on("controlToken", ...)` so token selection and deselection trigger `updateTokenLogic()` instantly without frame delays.
2. **Instant Filter Disable on Deselect:** Updated early returns in `updateTokenLogic()` so when a GM releases/deselects tokens (`candidates.length === 0`), `currentBlurFactor` is immediately reset to `0` and `visionFilter.enabled` is immediately set to `false`.

---

## 🛠️ WebGL Shader Gray Screen Fix

### Root Cause Analysis
The WebGL shader compiler in PixiJS v8 / `AbstractBaseFilter` compiles custom fragment shaders using **GLSL ES 1.00** by default. Using GLSL 3.00 ES keywords (`in`, `out`, `texture()`) caused shader compilation failure:
- `ERROR: 0:8: 'in' : storage qualifier supported in GLSL ES 3.00 and above only`
- `ERROR: 0:17: 'out' : storage qualifier supported in GLSL ES 3.00 and above only`

### Resolution
Updated [scripts/filter.js](file:///c:/Users/Rudec/Desktop/vision-blur/Vision-blur/scripts/filter.js) and [scripts/shader.frag](file:///c:/Users/Rudec/Desktop/vision-blur/Vision-blur/scripts/shader.frag) to standard **GLSL 100** syntax (`varying vec2 vTextureCoord`, `gl_FragColor`, `texture2D`).

---

## 1. Canvas Rendering Engine & High-DPI Support (PixiJS v8 Integration)
- **Shader Compatibility:** Updated fragment shaders to standard GLSL 100 syntax (`varying vec2 vTextureCoord`, `gl_FragColor`, `texture2D()`).
- **High-DPI / Retina Screen Resolution:** Updated screen UV coordinate calculations and `uResolution` uniform in [main.js](file:///c:/Users/Rudec/Desktop/vision-blur/Vision-blur/scripts/main.js) and [filter.js](file:///c:/Users/Rudec/Desktop/vision-blur/Vision-blur/scripts/filter.js) to leverage `renderer.screen.width` and `renderer.screen.height`.

## 2. Lifecycle & Ticker Management
- **Ticker Duplication Guard:** Fixed potential ticker duplication by adding `canvas.app.ticker.remove(updateFilter)` prior to `add(updateFilter)` in `canvasReady`.
- **`canvasTearDown` Hook:** Added explicit `canvasTearDown` hook listener in [main.js](file:///c:/Users/Rudec/Desktop/vision-blur/Vision-blur/scripts/main.js) to detach the ticker listener during scene changes.

---

## Verification Results

### Code Syntax Verification
Ran Node.js syntax checks on all module scripts:
```powershell
node --check scripts/filter.js
node --check scripts/main.js
```
**Status:** PASSED (Zero syntax or compilation errors).
