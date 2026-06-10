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

src/lib/components/
  ConnectionCard        — connect / disconnect / device info display
  TriggerConfigCard     — cmd 0x51 UI (mode selector + param sliders + send)
  GripBindCard          — cmd 0x52 UI (SyncWithGrip / unbind)
  TelemetryCard         — placeholder for force-feedback telemetry (planned)
  InputViewer           — decoded gamepad state (via gamepad singleton)
  RawMonitor            — per-reportId raw byte grid (changed bytes highlighted)
  LogPanel              — scrollable tx/rx/info/warn/error log
  ControllerView        — SVG overlay of K5 controller shape

src/App.svelte          — tab shell; uses CSS hidden (not unmount) to preserve tab state
```

### Key design decisions

- **Dual-collection pattern**: K5 dongle exposes two HID collections (usagePage `0x0001` input + usagePage `0xFFA0` command output). Both must be opened; `attachAll()` in the controller opens every granted device. The device with `0xFFA0` is used for `sendReport()`; all devices receive `inputreport` events.
- **rAF throttle**: `handleInput()` writes to a non-reactive `rawBuf: Map` and sets `dirty = true`; `startRaf()` flushes to `$state reports[]` only once per animation frame to avoid overwhelming Svelte reactivity on high-frequency HID input.
- **Both-side trigger**: `sendTrigger()` with `TriggerSide.Both` splits into two sequential frames with a 100 ms delay — this replicates a firmware quirk discovered during reverse engineering.
- **Report ID auto-detect**: `pickReportConfig()` reads `device.collections[].outputReports` at connect time to find the correct `reportId` and `reportLen`; defaults are `0x03` / 31 bytes.

### Protocol reference

See `飞智空间站HID输入识别协议.md` in this directory for byte-level layout of input reports and output command frames. Upstream reverse-engineering notes are in the parent repo (`../飞智自适应扳机分析.md`, `../知识库-*.md`).

### Browser requirement

WebHID is only available in Chrome / Edge on a secure context (`https` or `localhost`). The controller checks `'hid' in navigator` at runtime and gates all operations on it.
