# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
pnpm dev          # dev server at http://localhost:5173
pnpm build        # svelte-check type check + vite production build → dist/
pnpm check        # type check only (svelte-check)
pnpm preview      # preview the dist/ build
```

No test suite exists yet. Type-check with `pnpm check` before committing.

## Architecture

**Stack:** Svelte 5 (runes), TypeScript, Vite. Package manager: pnpm.

### Layer map

```
src/lib/hid/          ← pure TS, no Svelte, no side effects
  constants.ts        — VID/PID, usage pages, cmd IDs, frame magic, report defaults
  triggers.ts         — TriggerMode/TriggerSide enums + createParams() semantic builder
  frame.ts            — buildTriggerFrame(): serialises cmd 0x51 output report bytes
  gripbind.ts         — buildGripFrame(): serialises cmd 0x52 (SyncWithGrip) bytes
  decode.ts           — pickGamepadReport() + decodeXInput(): raw bytes → DecodedPad
  util.ts             — toHex(), sleep()

src/lib/
  controller.svelte.ts  — FlydigiController singleton; owns the HIDDevice handles,
                          log ring, and raw→rAF→$state input pipeline
  gamepad.svelte.ts     — Gamepad API polling singleton
  mapping.svelte.ts     — MappingStore singleton: shared key-map + motion config state
                          (cfgId / rawConfig / read / save) for the 按键 + 体感 tabs
  ui.svelte.ts          — UiState singleton: active tab id + devMode toggle

src/lib/ui/             ← presentational primitives (no domain logic)
  Switch.svelte         — on/off toggle
  Slider.svelte         — label + (− range +) + value, matches original control style
  Segmented.svelte      — segmented button group (generic over value type)
  Panel.svelte          — tab-panel chrome: title / desc / badge / actions slot

src/lib/components/
  Sidebar.svelte        — brand, device/connection card, config slots (1-4) +
                          read/save, dev-mode toggle, hint footer
  HeroController.svelte — controller centrepiece: input-source select (raw vs Gamepad),
                          raw-input toggle, format badge, pressed-key chips, ControllerView
  ControllerView.svelte — SVG overlay of K5 controller shape (live highlights)
  TabBar.svelte         — bottom icon tab bar (扳机/震动/按键/体感/遥测)
  DevPanel.svelte       — developer drawer (devMode only): reportId/len + RawMonitor + LogPanel
  RawMonitor.svelte     — per-reportId raw byte grid (changed bytes highlighted)
  LogPanel.svelte       — scrollable tx/rx/info/warn/error log
  panels/
    TriggerPanel        — cmd 0x51 adaptive-trigger UI (side / mode / param sliders / send)
    VibrationPanel      — cmd 0x52 SyncWithGrip built-in vibration (game preset + bind/unbind)
    KeyMapPanel         — grouped key-remap grid (binds to mapping store)
    MotionPanel         — gyro/motion mode + sensitivity/deadzone (binds to mapping store)
    TelemetryPanel      — roadmap for force-feedback telemetry (planned)

src/App.svelte          — app shell: Sidebar + Hero + TabBar + panels + DevPanel.
                          Panels use CSS hidden (not unmount) to preserve per-tab state;
                          active tab ↔ URL hash. ui.tab is seeded from the hash
                          synchronously in script init so the hash-writing $effect
                          doesn't clobber a deep link on first run.
```

### Key design decisions

- **Dual-collection pattern**: K5 dongle exposes two HID collections (usagePage `0x0001` input + usagePage `0xFFA0` command output). Both must be opened; `attachAll()` in the controller opens every granted device. The device with `0xFFA0` is used for `sendReport()`; all devices receive `inputreport` events.
- **Folded technical surface**: report ID/length, frame-hex previews, raw byte monitor, and the tx/rx log are hidden behind the sidebar **开发者模式** toggle (`ui.devMode`) so the default view stays consumer-friendly.
- **Shared mapping store**: 按键 and 体感 are separate tabs but edit one in-memory `rawConfig` (read once → mutate → write-all + save + apply). `mapping.svelte.ts` owns that state and the cfgId selected via the sidebar config slots.
- **Key-map entry = 3 bytes** at `13 + keyIndex*3` (`readKeyMap`/`writeKeyMap` in `hid/config.ts`, mirroring `Flydigi.ControllerSdk.cs:4493-4573`): `b0==32` → 宏(Macro); `b2>0` → 连发(Continuous) `[target, enableType, freq]`; `b0==0xFE`/`>31` → 键盘/鼠标/多功能(marker only). 单键 + 连发 are fully read/write.
- **Macros are firmware-executed and editable.** They live in the SAME blob: region `230..767` (`readMacros`/`writeMacros`, mirroring `MappingConfigParserV30.ParseMacroConfigToArray`) + a 5-byte cycle table at `820`. Layout: `[count][5B offset-table]` then ≤5 self-describing units `[keyId, count(LE16), MacroEnableType]` each followed by 4-byte steps `[time(LE16, cumulative, ×10ms @V3.1), button, MacroEvent]`; key↔macro is linked by the keyId inside the unit (the key entry stays `32 00 00`). `macrosRoundTripOk()` is a safety gate: if parse→serialize can't reproduce the device's existing macro bytes, macro editing is disabled (read-only) so an unknown firmware variant is never corrupted. `MacroEditor.svelte` records via live physical-key presses or manual step editing.
- **Keyboard / mouse / MultiFunction mapping is NOT feasible in pure WebHID** and is intentionally read-only. The blob stores only a `0xFE` marker; the real key id lives in the PC service's RAM and is emitted by injecting OS events through kernel drivers (`FeizVKB64.sys`/`FeizVMO64.sys`) — a browser cannot do this, and the firmware never emits keyboard/mouse itself (`SpaceStationService.cs:4615-4682`, `5720-5843`). We detect + preserve these entries byte-for-byte but never claim to edit them.
- **Mapping selection** lives in the store (`selectedKey`): clicking a virtual button on the hero `ControllerView` (interactive mode on the 按键 tab) or pressing the physical key (live input → `KEY_BY_LABEL` → `focusKey`) selects it; `KeyMapPanel` edits the selected key.
- **rAF throttle**: `handleInput()` writes to a non-reactive `rawBuf: Map` and sets `dirty = true`; `startRaf()` flushes to `$state reports[]` only once per animation frame to avoid overwhelming Svelte reactivity on high-frequency HID input.
- **Both-side trigger**: `sendTrigger()` with `TriggerSide.Both` splits into two sequential frames with a 100 ms delay — this replicates a firmware quirk discovered during reverse engineering.
- **Report ID auto-detect**: `pickReportConfig()` reads `device.collections[].outputReports` at connect time to find the correct `reportId` and `reportLen`; defaults are `0x03` / 31 bytes.

### Protocol reference

See `飞智空间站HID输入识别协议.md` in this directory for byte-level layout of input reports and output command frames. Upstream reverse-engineering notes are in the parent repo (`../飞智自适应扳机分析.md`, `../知识库-*.md`).

### Browser requirement

WebHID is only available in Chrome / Edge on a secure context (`https` or `localhost`). The controller checks `'hid' in navigator` at runtime and gates all operations on it.
