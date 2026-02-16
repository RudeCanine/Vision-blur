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
    default: 25
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

  game.settings.register(MODULE_ID, "dimBlurOnly", {
    name: "Enable Only in Dim Light",
    hint: "If enabled, the blur effect will only activate when the token is in dim light or darkness.",
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

function updateFilter() {
  if (!visionFilter || !canvas.ready) return;

  const isGM = game.user.isGM;
  const gmEnabled = game.settings.get(MODULE_ID, "gmBlurEnabled");
  const dimOnly = game.settings.get(MODULE_ID, "dimBlurOnly");

  // GM Logic
  if (isGM) {
    if (!gmEnabled) {
      if (visionFilter.enabled) visionFilter.enabled = false;
      return;
    }

    // If enabled for GM: Only apply if a token is CONTROLLED.
    // If no token is controlled, disable filter (Full Vision).
    if (canvas.tokens.controlled.length === 0) {
      if (visionFilter.enabled) visionFilter.enabled = false;
      return;
    }
  }

  // 1. Controlled Token (Priority for both GM and Player)
  let token = canvas.tokens.controlled[0];

  // 2. Persistence Logic (PLAYER ONLY)
  // If not GM, and no token controlled, fall back to character/owned
  if (!isGM && !token) {
    // A. Assigned Character Token
    if (game.user.character) {
      const charTokens = game.user.character.getActiveTokens();
      if (charTokens.length) token = charTokens[0];
    }

    // B. First Owned Token (Fallback)
    if (!token) {
      token = canvas.tokens.placeables.find(t => t.isOwner);
    }
  }

  // If still no token (e.g. player has no tokens), disable filter
  if (!token) {
    if (visionFilter.enabled) visionFilter.enabled = false;
    return;
  }

  // Check Lighting Conditions if 'dimOnly' is enabled
  if (dimOnly) {
    let inBrightLight = false;

    // 1. Check Point Sources (Lights)
    // V13 Compatibility: canvas.effects.illumination.sources might be a Map or Collection.
    const lightSources = canvas.effects.illumination.sources;

    // Helper to get iterator safely
    const getSources = (sources) => {
      if (sources instanceof Map) return sources.values();
      if (sources instanceof Set) return sources.values();
      if (Array.isArray(sources)) return sources;
      // In some Foundry versions it might be a Collection which is a Map
      if (sources.contents) return sources.contents;
      return [];
    };

    const sourcesIterator = getSources(lightSources);

    for (const source of sourcesIterator) {
      if (!source.active) continue;

      // Compatibility Check: V13 might change data structure
      const data = source.document ? source.document : source.data;

      if (data.bright > 0 && source.shape.contains(token.center.x, token.center.y)) {
        inBrightLight = true;
        break;
      }
    }

    // 2. Check Global Illumination (Daylight)
    // If not already in a bright source, check if the global environment is bright.
    if (!inBrightLight) {
      // canvas.environment.globalLight is true if GI is active (e.g. Daytime)
      // However, we must also check if we are inside a "Darkness Source" which suppresses GI.

      if (canvas.environment.globalLight) {
        // Check if inside a darkness source (which suppresses global light)
        let inDarknessSource = false;

        // Re-use iterator safely
        const darknessSourcesIterator = getSources(lightSources); // Re-use the helper

        for (const source of darknessSourcesIterator) {
          if (!source.active) continue;
          const data = source.document ? source.document : source.data;

          // If light source is "Darkness" (luminosity < 0)
          if (data.luminosity < 0 && source.shape.contains(token.center.x, token.center.y)) {
            inDarknessSource = true;
            break;
          }
        }

        if (!inDarknessSource) {
          inBrightLight = true;
        }
      }
    }

    // If we are in bright light, DISABLE blur.
    // Meaning: Blur is ENABLED only in Dim Light or Darkness.
    if (inBrightLight) {
      if (visionFilter.enabled) visionFilter.enabled = false;
      return;
    }
  }

  visionFilter.enabled = true;

  // Calculate Token Screen Position (Normalized 0-1)
  const screenPos = canvas.stage.transform.worldTransform.apply(token.center);
  const normalizedPos = [
    screenPos.x / canvas.app.renderer.width,
    screenPos.y / canvas.app.renderer.height
  ];

  // Calculate Range in "Screen/UV Space"
  const rangeUnits = game.settings.get(MODULE_ID, "visionRange");
  const rangeWorldPixels = rangeUnits * canvas.dimensions.size;

  const scale = canvas.stage.scale.x;
  const rangeScreenPixels = rangeWorldPixels * scale;

  const rangeUV = rangeScreenPixels / canvas.app.renderer.width;

  visionFilter.update({
    pos: normalizedPos,
    range: rangeUV,
    blur: game.settings.get(MODULE_ID, "blurStrength")
  });
}
