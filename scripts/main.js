import { VisionBlurFilter } from "./filter.js";

const MODULE_ID = "vision-blur";
let visionFilter;

console.log(`${MODULE_ID} | Initializing module`);

Hooks.on("init", function () {
  console.log(`${MODULE_ID} | Hook: init`);

  // Register Settings
  game.settings.register(MODULE_ID, "visionRange", {
    name: "Vision Range (Grid Units)",
    hint: "The distance in grid units a player can see clearly.",
    scope: "world",
    config: true,
    type: Number,
    default: 10
  });

  game.settings.register(MODULE_ID, "blurStrength", {
    name: "Blur Strength",
    hint: "Intensity of the blur effect (1-10).",
    scope: "world",
    config: true,
    type: Number,
    default: 2
  });

  game.settings.register(MODULE_ID, "gmBlurEnabled", {
    name: "Enable Blur for GM",
    hint: "If enabled, the GM will see the blur when controlling a token. When no token is controlled, the GM will have full vision.",
    scope: "world",
    config: true,
    type: Boolean,
    default: false
  });

  game.settings.register(MODULE_ID, "darkvisionBlurOnly", {
    name: "Enable Only with Darkvision",
    hint: "If enabled, the blur effect will only activate when the token is using Darkvision (e.g. in darkness).",
    scope: "world",
    config: true,
    type: Boolean,
    default: false
  });
});

Hooks.on("canvasReady", async function () {
  console.log(`${MODULE_ID} | Hook: canvasReady - Initializing Filter`);

  // Load shader source
  const fragSrc = await fetch(`modules/${MODULE_ID}/scripts/shader.frag`).then(r => r.text());

  // Create Filter
  visionFilter = new VisionBlurFilter(undefined, fragSrc);

  // Add to canvas stage
  canvas.app.stage.filters = [visionFilter];

  // Add Ticker to update uniforms relative to token position
  canvas.app.ticker.add(updateFilter);
});

// State variables for transition
let currentBlurFactor = 0; // 0 to 1
let targetBlurFactor = 0;  // 0 or 1
let frameCounter = 0;
const LOGIC_THROTTLE = 10; // Check logic every 10 frames (~6 times/sec @ 60fps)
const BLUR_SPEED = 0.05;   // Transition speed (lower is slower)

// Store the calculated token data for the shader
let activeTokensData = [];

function updateFilter() {
  if (!visionFilter || !canvas.ready) return;

  // 1. Logic Check (Throttled)
  // We need to run this periodically to update which tokens are relevant and their states
  frameCounter++;
  if (frameCounter >= LOGIC_THROTTLE) {
    frameCounter = 0;
    updateTokenLogic();
  }

  // 2. Transition Logic (Every Frame)
  if (Math.abs(currentBlurFactor - targetBlurFactor) > 0.001) {
    currentBlurFactor += (targetBlurFactor - currentBlurFactor) * BLUR_SPEED;
  } else {
    currentBlurFactor = targetBlurFactor;
  }

  // Optimize: Disable filter if effectively off
  if (currentBlurFactor < 0.01 && targetBlurFactor === 0) {
    if (visionFilter.enabled) visionFilter.enabled = false;
    return;
  }

  // Enable filter if it should be visible
  if (!visionFilter.enabled && currentBlurFactor > 0.01) {
    visionFilter.enabled = true;
  }

  // If filter is disabled, skip uniform updates
  if (!visionFilter.enabled) return;

  // 3. Update Uniforms
  // We need to re-calculate screen positions every frame because the camera or tokens might move
  const tokensForShader = [];
  const renderer = canvas.app.renderer;
  const rangeUnits = game.settings.get(MODULE_ID, "visionRange");
  const rangeWorldPixels = rangeUnits * canvas.dimensions.size;
  const scale = canvas.stage.scale.x;
  // Normalize range by the MIN dimension, matching the shader's aspect logic
  const baseRangeUV = (rangeWorldPixels * scale) / Math.min(renderer.width, renderer.height);

  for (const tData of activeTokensData) {
    const token = tData.token;
    if (!token || !token.visible) continue;

    // Calculate Screen Position
    const screenPos = canvas.stage.transform.worldTransform.apply(token.center);
    const normX = screenPos.x / renderer.width;
    const normY = screenPos.y / renderer.height;

    // If token has "Infinite Vision" (e.g. in Light), we pass a huge range
    // effectively clearing the screen for this token's contribution.
    // Otherwise, use the standard configured range.
    let effectiveRange = baseRangeUV;
    if (tData.hasClearVision) {
      effectiveRange = 10.0; // Huge value (10x screen size) to clear everything
    }

    tokensForShader.push({
      pos: [normX, normY],
      range: effectiveRange
    });
  }

  const maxStrength = game.settings.get(MODULE_ID, "blurStrength");

  visionFilter.update({
    tokens: tokensForShader,
    blur: maxStrength * currentBlurFactor
  });
}

function updateTokenLogic() {
  const { isGM } = game.user;
  const gmEnabled = game.settings.get(MODULE_ID, "gmBlurEnabled");
  const darkvisionOnly = game.settings.get(MODULE_ID, "darkvisionBlurOnly");

  activeTokensData = []; // Reset list

  // GM Logic: If disabled for GM, we just stop here (targetBlurFactor = 0)
  if (isGM && !gmEnabled) {
    targetBlurFactor = 0;
    return;
  }

  // Gather Candidate Tokens
  let candidates = [];

  // A. Controlled Tokens (Primary)
  if (canvas.tokens.controlled.length > 0) {
    candidates = [...canvas.tokens.controlled];
  }
  // B. Fallback to Owned Tokens (Player only)
  else if (!isGM) {
    if (game.user.character) {
      // Active tokens for the assigned character
      const charTokens = game.user.character.getActiveTokens();
      if (charTokens.length) candidates = [...charTokens];
    }

    // If still none, try any owned token
    if (candidates.length === 0) {
      // This can be expensive if map is huge, but usually active tokens are few
      candidates = canvas.tokens.placeables.filter(t => t.isOwner);
    }
  }

  // If no candidates, disable blur
  if (candidates.length === 0) {
    targetBlurFactor = 0;
    return;
  }

  // Process Each Candidate
  let atLeastOneNeedsBlur = false;

  // Helper for Light Checks
  const getSources = (sources) => {
    if (!sources) return [];
    if (sources instanceof Map || sources instanceof Set) return sources.values();
    if (Array.isArray(sources)) return sources;
    if (sources.contents) return sources.contents;
    return [];
  };

  const lightSourcesFn = canvas.effects.lightSources || canvas.effects.illumination?.sources;
  const darknessSourcesFn = canvas.effects.darknessSources || canvas.effects.illumination?.sources;

  // Check Global Illumination
  let globalLight = false;
  if (canvas.scene?.environment?.globalLight) {
    if (typeof canvas.scene.environment.globalLight.enabled !== 'undefined') {
      globalLight = canvas.scene.environment.globalLight.enabled;
    } else {
      globalLight = !!canvas.scene.environment.globalLight;
    }
  } else if (typeof canvas.environment?.globalLight !== 'undefined') {
    globalLight = canvas.environment.globalLight;
  }

  for (const token of candidates) {
    // Logic per token
    // Default assumption: The token is subject to blur (limited vision)
    // unless "Darkvision Only" logic says otherwise.

    let hasClearVision = false; // "Clear Vision" means effectively no blur limit

    if (darkvisionOnly) {
      const activeModeId = token.document.sight.visionMode || token.vision?.mode?.id;

      // 1. Not Darkvision? -> Clear Vision
      if (activeModeId !== "darkvision") {
        hasClearVision = true;
      }
      // 2. Darkvision but In Light? -> Clear Vision
      else {
        let inLight = false;

        // Point Sources
        for (const source of getSources(lightSourcesFn)) {
          if (!source.active) continue;
          const data = source.document ? source.document : source.data;
          if ((data.dim > 0 || data.bright > 0) && source.shape.contains(token.center.x, token.center.y)) {
            inLight = true;
            break;
          }
        }

        // Global Light (if not suppressed)
        if (!inLight && globalLight) {
          let inDarknessSource = false;
          for (const source of getSources(darknessSourcesFn)) {
            if (!source.active) continue;
            const data = source.document ? source.document : source.data;
            if (data.luminosity < 0 && source.shape.contains(token.center.x, token.center.y)) {
              inDarknessSource = true;
              break;
            }
          }
          if (!inDarknessSource) inLight = true;
        }

        if (inLight) {
          hasClearVision = true;
        }
      }
    }

    // If "Darkvision Only" is OFF, then ALL tokens are subject to blur (hasClearVision = false).
    // If ON, only those failing the check are subject to blur.

    activeTokensData.push({ token, hasClearVision });

    // If at least one token is in a state that requires blur (i.e. NOT clear vision),
    // we generally want the blur effect active (masking the unknown).
    // Wait, if I have Token A (Dark, needs blur) and Token B (Light, clear),
    // The filter SHOULD be active, but Token B will punch a huge hole in it.
    // So yes, we need the filter ON.
    // The filter is only OFF if *everyone* has clear vision? 
    // Actually, if everyone has clear vision (radius 10.0), the filter effectively does nothing,
    // so we can disable it for performance.
    if (!hasClearVision) {
      atLeastOneNeedsBlur = true;
    }
  }

  // However, if "Darkvision Only" is NOT enabled, then `hasClearVision` is always false.
  // In that case, we definitely need blur.
  // If "Darkvision Only" IS enabled:
  // - A (Dark): hasClearVision = false.
  // - B (Light): hasClearVision = true.
  // We want filter ON. A contributes small hole, B contributes huge hole.
  // If all are Light -> All true -> Filter effectively invisible -> Can be OFF.

  // So, if we have active tokens, we generally want the filter ON, 
  // unless we can prove it's useless.
  // For simplicity, let's keep it ON if there are candidates, 
  // and let the optimization in updateFilter (currentBlurFactor) handle fading out 
  // if we set target to 0?
  // No, we need to decide targetBlurFactor here.

  // Logic: "Hinder Metagaming"
  // If "Enable Only with Darkvision" is ON:
  // If ANY token is in the Dark (needs blur), we must enforce the blur for everyone.
  // We only disable the blur if ALL tokens are in the Light (clear vision).

  if (darkvisionOnly) {
    const anyInDark = activeTokensData.some(t => !t.hasClearVision);

    if (anyInDark) {
      // Rule: If ANY in dark, we enforce blur on ALL.
      // This prevents the "Light" token from clearing the screen.
      for (const tData of activeTokensData) {
        tData.hasClearVision = false;
      }
      targetBlurFactor = 1;
    } else {
      // ALL are in light (or don't have Darkvision mode)
      // To ensure a smooth fade OUT, we must NOT snap the range to infinite.
      // We keep 'hasClearVision = false' (Normal Range) and let 
      // the opacity (uBlurStrength) fade to 0.
      for (const tData of activeTokensData) {
        tData.hasClearVision = false;
      }
      targetBlurFactor = 0;
    }
  } else {
    // Normal Mode: Always blur
    targetBlurFactor = 1;
  }
}
