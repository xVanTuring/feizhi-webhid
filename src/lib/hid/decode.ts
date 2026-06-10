import type { ReportSnapshot } from '../controller.svelte';

// 把 WebHID 原始输入报文解码成手柄状态。
// 默认按标准 XInput / Xbox360 20 字节报文布局（37D7:2501 被 Linux xpad 识别为 Xbox360）：
//   00 14 b1 b2 LT RT LXlo LXhi LYlo LYhi RXlo RXhi RYlo RYhi  …
// 真机若布局不同，用原始监视器核对后改这里的偏移即可。

export interface DecodedButton {
  name: string;
  pressed: boolean;
}

export interface DecodedPad {
  reportId: number;
  /** 解码采用的字节起点（跳过 00 14 头则为 2）。 */
  offset: number;
  /** 是否检测到 XInput 头部 (bytes[0]===0x00 && bytes[1]===0x14)。 */
  hasXInputHeader: boolean;
  buttons: DecodedButton[];
  lt: number; // 0..1
  rt: number; // 0..1
  lx: number; // -1..1
  ly: number; // -1..1（已转成屏幕系：下为正）
  rx: number;
  ry: number;
}

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

/**
 * 从所有收到的报文里挑出最像手柄输入的那个：
 * 优先含 XInput 头(byte1=0x14) 或长度≥20 的；否则取最长的。
 */
export function pickGamepadReport(reports: ReportSnapshot[]): ReportSnapshot | null {
  if (reports.length === 0) return null;
  const xinput = reports.find((r) => r.bytes[1] === 0x14 && r.bytes.length >= 14);
  if (xinput) return xinput;
  const long = reports.find((r) => r.bytes.length >= 20);
  if (long) return long;
  return reports.reduce((a, b) => (b.bytes.length > a.bytes.length ? b : a));
}

/** 按 XInput 布局解码一个报文快照。 */
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
