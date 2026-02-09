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
