# Task Checklist: Vision Blur V14 Integration & Feature Enhancements

- [x] Analyze Foundry VTT V14 architectural changes affecting Vision Blur
- [x] Create Implementation Plan for V14 support
- [x] Execute V14 compatibility review and code enhancements
  - [x] Verify GLSL shader integration in `filter.js` and `shader.frag`
  - [x] Verify ApplicationV2 DOM handling and hook integration in `main.js`
  - [x] Verify environment, sight mode, and lighting source checks in `main.js`
  - [x] Verify `module.json` manifest compatibility declaration
- [x] Implement Passive Perception Vision Range setting (DnD 5e)
  - [x] Register global setting `usePassivePerception`
  - [x] Add scene override control in `renderSceneConfig`
  - [x] Calculate per-token clear vision radius based on Passive Perception score (`system.skills.prc.passive`)
  - [x] Add localization keys to `languages/en.json`
- [x] Run verification tests and update documentation
  - [x] Perform node syntax checks
  - [x] Create `walkthrough.md` artifact
