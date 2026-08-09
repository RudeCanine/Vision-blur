# Vision Blur: Foundry VTT V14 Architectural & Migration Plan

This document outlines the architectural changes incorporated in Foundry VTT V14 that affect the **Vision Blur** module, along with proposed enhancements to ensure full compatibility, stability, and future-proofing.

---

## 1. Overview of V14 Changes Affecting Vision Blur

Foundry VTT V14 introduces major upgrades to the rendering engine (PixiJS v8 transition), scene environment model, and UI application framework (ApplicationV2). Below is a breakdown of how these changes map to the Vision Blur codebase:

### A. PixiJS v8 & Filter Architecture (`filter.js` & `shader.frag`)
- **PixiJS v8 Engine:** Foundry V14 leverages PixiJS v8 under the hood, which redesigned shader and filter pipelines for WebGPU/WebGL2 compatibility.
- **`AbstractBaseFilter` Deprecation:** `foundry.canvas.rendering.filters.AbstractBaseFilter` continues to serve as the compatibility bridge in V14 for custom shaders (using GLSL 300 ES syntax with `in vec2 vTextureCoord`, `out vec4 fragColor`, and `texture()`). However, `AbstractBaseFilter` is marked deprecated (scheduled for removal in V15).
- **Uniform Data Binding:** PixiJS v8 handles uniform buffers and scratch arrays (`_tokenPosScratch`, `_distanceScratch`) with stricter typed arrays (`Float32Array`).

### B. ApplicationV2 & Scene Configuration (`main.js`)
- **Native DOM vs. jQuery (`renderSceneConfig`):** In V14, core sheets like `SceneConfig` utilize ApplicationV2, where `app.element` is a native `HTMLElement` rather than a jQuery object.
- **Tab Selection:** Scene configuration tabs in V14 use `ambience` or `lighting` data-tabs (`div[data-tab="lighting"]`, `section[data-tab="lighting"]`, `div[data-tab="ambience"]`, `section[data-tab="ambience"]`).
- **Dynamic Field Injection:** Direct DOM construction with `fieldset` elements ensures standard form behavior across both V13 and V14 sheets.

### C. Environment, Lighting & Vision APIs (`main.js`)
- **Scene Environment:** Foundry V14 refined global illumination models via `canvas.scene.environment` and fallback `canvas.environment`.
- **Light & Darkness Sources:** Light sources are queried via `canvas.effects.lightSources` (or `canvas.effects.illumination?.sources`), while darkness sources are checked against `canvas.effects.darknessSources`.
- **Token Sight Modes:** Sight checking evaluates `token.document.sight.visionMode` and `token.vision?.mode?.id` to distinguish Darkvision from default vision.

---

## 2. Proposed Changes & Verification Plan

### Component Modifications

#### [MODIFY] [scripts/filter.js](file:///c:/Users/Rudec/Desktop/vision-blur/Vision-blur/scripts/filter.js)
- Ensure GLSL 300 ES shader source is formatted cleanly for PixiJS v8.
- Verify uniform updates (`uTokenPos`, `uDistance`, `uTokenCount`, `uBlurStrength`, `uResolution`) update correctly on PixiJS v8 uniform groups.

#### [MODIFY] [scripts/main.js](file:///c:/Users/Rudec/Desktop/vision-blur/Vision-blur/scripts/main.js)
- Review token candidate evaluation for GM and player modes in V14.
- Verify `canvas.app.stage.filters` array operations in PixiJS v8.
- Ensure smooth frame-rate updates using `canvas.app.ticker`.

#### [MODIFY] [module.json](file:///c:/Users/Rudec/Desktop/vision-blur/Vision-blur/module.json)
- Confirm compatibility block specifies minimum V13 and verified V14.

---

## 3. Verification Plan

### Automated / Code Quality Verification
- Validate JavaScript syntax and ES module exports across `main.js` and `filter.js`.
- Check JSON schema structure of `module.json`.

### Manual / Foundry V14 Integration Verification
- Verify that `renderSceneConfig` injects settings into both V13 and V14 Scene Configuration dialogs.
- Confirm canvas blur filter applies correctly when controlling tokens with limited vision / Darkvision.
- Ensure filter gracefully disables when no tokens require blur or when scene blur is disabled.
