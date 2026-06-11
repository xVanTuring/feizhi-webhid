import type { ReportSnapshot } from '../controller.svelte';

// 把 WebHID 原始输入报文解码成手柄状态。
//
// APEX5(NewXInput) 实时输入走厂商接口(0xFFA0)上报的 **NewXInput 帧**：
//   5A A5 EF | LXlo LXhi LYlo LYhi RXlo RXhi RYlo RYhi | btn1 btn2 btn3 btn4 | LT RT | gyro/acc…
// 来源：反编译 OperatorDataParser.Parse + IsButtonPressed（ControllerType.NewXInput 分支）。
// 这是 **物理原始按键**(OriginData)，含 M1-M6/C/Z 等飞智专属键，不受映射影响。
//
// 旧的 XInput 兼容布局(00 14 头)仅在某些固件/接口下出现，保留 decodeXInput() 作兜底。

export interface DecodedButton {
  name: string;
  pressed: boolean;
}

export interface DecodedMotion {
  gx: number;
  gy: number;
  gz: number;
  ax: number;
  ay: number;
  az: number;
}

export interface DecodedPad {
  reportId: number;
  /** 解码采用的协议。 */
  protocol: 'newxinput' | 'xinput' | 'raw' | 'gamepad';
  /** 解码采用的字节起点。 */
  offset: number;
  /** 兼容旧字段：是否 XInput(00 14)头。NewXInput 为 false。 */
  hasXInputHeader: boolean;
  buttons: DecodedButton[];
  lt: number; // 0..1
  rt: number; // 0..1
  lx: number; // -1..1
  ly: number; // -1..1（屏幕系：下为正）
  rx: number;
  ry: number;
  /** 仅 NewXInput 提供：陀螺仪/加速度原始 int16。 */
  motion?: DecodedMotion;
}

// ── NewXInput 帧 ─────────────────────────────────────────────────────────────
const NX_MAGIC = [0x5a, 0xa5, 0xef] as const; // 帧头 + data[2]=0xEF(操作数据)

/** NewXInput 按键位：[字节下标, bit, 名称]（下标基于去掉 reportId 的 data）。 */
const NX_BUTTONS: [number, number, string][] = [
  [11, 0, '↑'], [11, 1, '→'], [11, 2, '↓'], [11, 3, '←'],
  [11, 4, 'A'], [11, 5, 'B'], [11, 6, 'Select'], [11, 7, 'X'],
  [12, 0, 'Y'], [12, 1, 'Start'], [12, 2, 'LB'], [12, 3, 'RB'],
  [12, 4, 'LT'], [12, 5, 'RT'], [12, 6, 'L3'], [12, 7, 'R3'],
  [13, 0, 'C'], [13, 1, 'Z'], [13, 2, 'M1'], [13, 3, 'M2'],
  [13, 4, 'M3'], [13, 5, 'M4'], [13, 6, 'M5'], [13, 7, 'M6'],
  [14, 0, 'Menu'], [14, 1, 'Turbo'], [14, 3, 'Home'], [14, 4, 'Back'],
];

// ── XInput 兼容帧（兜底） ─────────────────────────────────────────────────────
const BTN1 = [
  { bit: 0, name: '↑' },
  { bit: 1, name: '↓' },
  { bit: 2, name: '←' },
  { bit: 3, name: '→' },
  { bit: 4, name: 'Start' },
  { bit: 5, name: 'Back' },
  { bit: 6, name: 'L3' },
  { bit: 7, name: 'R3' },
];
const BTN2 = [
  { bit: 0, name: 'LB' },
  { bit: 1, name: 'RB' },
  { bit: 2, name: 'Home' },
  { bit: 4, name: 'A' },
  { bit: 5, name: 'B' },
  { bit: 6, name: 'X' },
  { bit: 7, name: 'Y' },
];

const s16 = (lo: number, hi: number): number => {
  const v = ((hi << 8) | lo) & 0xffff;
  return v >= 0x8000 ? v - 0x10000 : v;
};
const axis = (lo: number, hi: number): number => Math.max(-1, Math.min(1, s16(lo, hi) / 32767));

/** 是否 NewXInput 帧（5A A5 EF）。 */
function isNewXInput(b: ArrayLike<number>): boolean {
  return b.length >= 17 && b[0] === NX_MAGIC[0] && b[1] === NX_MAGIC[1] && b[2] === NX_MAGIC[2];
}

/**
 * 从所有收到的报文里挑出最像「实时输入」的那个：
 * 优先 NewXInput 帧(5A A5 EF) → XInput 头(00 14) → 长度≥20 → 最长。
 */
export function pickGamepadReport(reports: ReportSnapshot[]): ReportSnapshot | null {
  if (reports.length === 0) return null;
  const nx = reports.find((r) => isNewXInput(r.bytes));
  if (nx) return nx;
  // 仅在明确的 XInput(00 14) 头时退回。不猜其它格式(如中心 0x8000 的 DirectInput 报文)，
  // 否则会被 decodeXInput 按错布局解成乱码。未开启全键监视时宁可返回 null(提示开启)。
  const xinput = reports.find(
    (r) => r.bytes[0] === 0x00 && r.bytes[1] === 0x14 && r.bytes.length >= 14,
  );
  return xinput ?? null;
}

/** 解码一个报文快照：自动识别 NewXInput / XInput。 */
export function decodePad(snap: ReportSnapshot): DecodedPad | null {
  if (isNewXInput(snap.bytes)) return decodeNewXInput(snap);
  return decodeXInput(snap);
}

/** 按 NewXInput(5A A5 EF) 布局解码 —— 物理原始按键 + 双摇杆 + 模拟扳机 + 体感。 */
export function decodeNewXInput(snap: ReportSnapshot): DecodedPad | null {
  const b = snap.bytes;
  if (!isNewXInput(b)) return null;
  if (b.length < 17) return null;

  const buttons: DecodedButton[] = NX_BUTTONS.map(([idx, bit, name]) => ({
    name,
    pressed: idx < b.length && (b[idx] & (1 << bit)) !== 0,
  }));

  const motion: DecodedMotion | undefined =
    b.length >= 29
      ? {
          gx: s16(b[17], b[18]),
          gy: s16(b[19], b[20]),
          gz: s16(b[21], b[22]),
          ax: s16(b[23], b[24]),
          ay: s16(b[25], b[26]),
          az: s16(b[27], b[28]),
        }
      : undefined;

  return {
    reportId: snap.reportId,
    protocol: 'newxinput',
    offset: 3,
    hasXInputHeader: false,
    buttons,
    lt: (b[15] ?? 0) / 255,
    rt: (b[16] ?? 0) / 255,
    lx: axis(b[3], b[4]),
    ly: -axis(b[5], b[6]), // 上为正→转屏幕系（下为正）
    rx: axis(b[7], b[8]),
    ry: -axis(b[9], b[10]),
    motion,
  };
}

/** 按 XInput(00 14) 布局解码（兜底；部分固件/接口）。 */
export function decodeXInput(snap: ReportSnapshot): DecodedPad | null {
  const b = snap.bytes;
  if (b.length < 14) return null;
  // 探测 00 14 头：在则数据从 byte2 起，不在则从 byte0 起。
  const hasXInputHeader = b[0] === 0x00 && b[1] === 0x14;
  const offset = hasXInputHeader ? 2 : 0;
  const o = offset;
  if (b.length < o + 12) return null;

  const b1 = b[o];
  const b2 = b[o + 1];
  const buttons: DecodedButton[] = [
    ...BTN1.map((x) => ({ name: x.name, pressed: (b1 & (1 << x.bit)) !== 0 })),
    ...BTN2.map((x) => ({ name: x.name, pressed: (b2 & (1 << x.bit)) !== 0 })),
  ];

  return {
    reportId: snap.reportId,
    protocol: hasXInputHeader ? 'xinput' : 'raw',
    offset,
    hasXInputHeader,
    buttons,
    lt: b[o + 2] / 255,
    rt: b[o + 3] / 255,
    lx: axis(b[o + 4], b[o + 5]),
    ly: -axis(b[o + 6], b[o + 7]), // XInput Y 向上为正；转成屏幕系下为正
    rx: axis(b[o + 8], b[o + 9]),
    ry: -axis(b[o + 10], b[o + 11]),
  };
}
