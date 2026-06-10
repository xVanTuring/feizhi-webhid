import { FRAME_MAGIC } from './constants';

// 八爪鱼5 (NewXInput) 映射配置命令字。来源：Flydigi.ControllerSdk.cs
export const CMD_READ_MAPPING = 0xa3; // 163
export const CMD_WRITE_START = 0xa4; // 164
export const CMD_WRITE_PACK = 0xa5; // 165
export const CMD_SAVE = 0xa6; // 166
export const CMD_APPLY = 0xa2; // 162

export const PKG_SIZE = 20; // NewXInput 每包字节数
export const PKG_COUNT = 84; // V3.1 总包数

export enum ControllerKey {
  Up = 0,
  Right = 1,
  Down = 2,
  Left = 3,
  A = 4,
  B = 5,
  Select = 6,
  X = 7,
  Y = 8,
  Start = 9,
  Lb = 10,
  Rb = 11,
  Lt = 12,
  Rt = 13,
  Thl = 14, // L3
  Thr = 15, // R3
  C = 16,
  Z = 17,
  M1 = 18,
  M2 = 19,
  M3 = 20,
  M4 = 21,
  M5 = 22,
  M6 = 23,
  Menu = 24,
  Turbo = 25,
  Home = 27,
  Back = 28,
  None = 255,
}

export enum KeyMapType {
  Key = 0,
  Continuous = 1,
  Macro = 2,
  MultiFunction = 3,
  Keyboard = 4,
}

export enum MotionMapType {
  Off = 0,
  LeftJoystick = 1,
  RightJoystick = 2,
  Mouse = 3,
}

export enum MotionEnableType {
  Click = 0,
  Press = 1,
}

export enum MotionUseMode {
  Fps = 0,
  Racer = 1,
}

export const KEY_LABELS: Record<number, string> = {
  [ControllerKey.Up]: '↑',
  [ControllerKey.Right]: '→',
  [ControllerKey.Down]: '↓',
  [ControllerKey.Left]: '←',
  [ControllerKey.A]: 'A',
  [ControllerKey.B]: 'B',
  [ControllerKey.Select]: 'Select',
  [ControllerKey.X]: 'X',
  [ControllerKey.Y]: 'Y',
  [ControllerKey.Start]: 'Start',
  [ControllerKey.Lb]: 'LB',
  [ControllerKey.Rb]: 'RB',
  [ControllerKey.Lt]: 'LT',
  [ControllerKey.Rt]: 'RT',
  [ControllerKey.Thl]: 'L3',
  [ControllerKey.Thr]: 'R3',
  [ControllerKey.C]: 'C',
  [ControllerKey.Z]: 'Z',
  [ControllerKey.M1]: 'M1',
  [ControllerKey.M2]: 'M2',
  [ControllerKey.M3]: 'M3',
  [ControllerKey.M4]: 'M4',
  [ControllerKey.M5]: 'M5',
  [ControllerKey.M6]: 'M6',
  [ControllerKey.Menu]: 'Menu',
  [ControllerKey.Turbo]: 'Turbo',
  [ControllerKey.Home]: 'Home',
  [ControllerKey.Back]: 'Back',
  [ControllerKey.None]: '不映射',
};

export const MAPPABLE_KEYS = [
  ControllerKey.Up,
  ControllerKey.Right,
  ControllerKey.Down,
  ControllerKey.Left,
  ControllerKey.A,
  ControllerKey.B,
  ControllerKey.Select,
  ControllerKey.X,
  ControllerKey.Y,
  ControllerKey.Start,
  ControllerKey.Lb,
  ControllerKey.Rb,
  ControllerKey.Lt,
  ControllerKey.Rt,
  ControllerKey.Thl,
  ControllerKey.Thr,
  ControllerKey.C,
  ControllerKey.Z,
  ControllerKey.M1,
  ControllerKey.M2,
  ControllerKey.M3,
  ControllerKey.M4,
  ControllerKey.M5,
  ControllerKey.M6,
  ControllerKey.Menu,
  ControllerKey.Turbo,
  ControllerKey.Home,
  ControllerKey.Back,
];

/** 单字节 CRC = cmd + len + payload 累加取低 8 位。 */
function crc8(data: Uint8Array): number {
  let sum = 0;
  // data[2] 起、到倒数第二个字节（CRC 之前）累加
  for (let i = 2; i < data.length - 1; i++) sum += data[i];
  return sum & 0xff;
}

/**
 * 拼一帧 NewXInput 配置命令的 data（不含 reportId）。
 * 格式：5A A5 | cmd | len | payload… | CRC
 * len = payload.length + 2（包含 len 自身与 CRC）。
 * 输出会补 0 到 reportLen。
 *
 * 注意：CRC 落在 `cmd 下标 + len` = `2 + len` 处。反编译源码里数组首字节是
 * reportId（cmd 在 index 3，CRC 在 3+len），但 WebHID 的 reportId 由 sendReport
 * 单独传，data 里 cmd 在 index 2，整体左移 1，所以这里必须是 `2 + len` 而非 `3 + len`。
 */
function buildFrame(cmd: number, payload: number[], reportLen: number): Uint8Array<ArrayBuffer> {
  const len = payload.length + 2;
  const total = Math.max(reportLen, 3 + len);
  const data = new Uint8Array(new ArrayBuffer(total));
  data[0] = FRAME_MAGIC[0];
  data[1] = FRAME_MAGIC[1];
  data[2] = cmd;
  data[3] = len;
  for (let i = 0; i < payload.length; i++) data[4 + i] = payload[i] & 0xff;
  data[2 + len] = crc8(data); // = data[4 + payload.length]，紧跟 payload 之后
  return data;
}

/** 读取映射配置帧：cmd=A3，payload=[cfgId, packetSize]。 */
export function buildReadMappingFrame(cfgId: number, reportLen: number): Uint8Array<ArrayBuffer> {
  return buildFrame(CMD_READ_MAPPING, [cfgId & 0xff, PKG_SIZE], reportLen);
}

/** 写配置开始帧：cmd=A4，payload=[cfgId, startIndex, packetNum, packetSize]。 */
export function buildWriteStartFrame(
  cfgId: number,
  startIndex: number,
  packetNum: number,
  reportLen: number,
): Uint8Array<ArrayBuffer> {
  return buildFrame(
    CMD_WRITE_START,
    [cfgId & 0xff, startIndex & 0xff, packetNum & 0xff, PKG_SIZE],
    reportLen,
  );
}

/** 写配置分包帧：cmd=A5，payload=[packNum, 20bytes pack]。 */
export function buildWritePackFrame(
  packNum: number,
  pack: Uint8Array,
  reportLen: number,
): Uint8Array<ArrayBuffer> {
  const payload: number[] = [packNum & 0xff];
  for (let i = 0; i < pack.length; i++) payload.push(pack[i]);
  return buildFrame(CMD_WRITE_PACK, payload, reportLen);
}

/** 应用配置帧：cmd=A2，payload=[cfgId]。 */
export function buildApplyFrame(cfgId: number, reportLen: number): Uint8Array<ArrayBuffer> {
  return buildFrame(CMD_APPLY, [cfgId & 0xff], reportLen);
}

/** 保存配置帧：cmd=A6，payload=[versionLo, versionHi]。 */
export function buildSaveFrame(version: number, reportLen: number): Uint8Array<ArrayBuffer> {
  return buildFrame(CMD_SAVE, [version & 0xff, (version >> 8) & 0xff], reportLen);
}

/** 判断输入报文是否是期望命令的 ACK。 */
export function isAck(bytes: Uint8Array, cmd: number): boolean {
  return bytes.length >= 5 && bytes[0] === FRAME_MAGIC[0] && bytes[1] === FRAME_MAGIC[1] && bytes[2] === cmd;
}

/** 从 read-mapping 的连续 ACK 中拆出一包 20 字节数据。 */
export function extractPackFromAck(bytes: Uint8Array): { total: number; num: number; payload: Uint8Array } | null {
  if (!isAck(bytes, CMD_READ_MAPPING) || bytes.length < 6 + PKG_SIZE) return null;
  return {
    total: bytes[3],
    num: bytes[4],
    payload: bytes.slice(6, 6 + PKG_SIZE),
  };
}

/** 初始化空白的 1680 字节配置缓冲区（全 0xFF）。 */
export function createEmptyRawConfig(): Uint8Array {
  const raw = new Uint8Array(PKG_COUNT * PKG_SIZE);
  raw.fill(0xff);
  return raw;
}

/** 按键映射在原始字节中的偏移（V3.1）。 */
const KEY_TABLE_OFFSET = 13;
const KEY_ENTRY_SIZE = 3;
const MOTION_OFFSET = 137;
const MOTION_EXTRA_OFFSET = 830;

/** 设置单个按键的映射。toKey = null 表示恢复默认（不映射/自身）。 */
export function setKeyMap(raw: Uint8Array, fromKey: ControllerKey, toKey: ControllerKey | null): void {
  const off = KEY_TABLE_OFFSET + fromKey * KEY_ENTRY_SIZE;
  if (toKey === null || toKey === fromKey) {
    raw[off] = 0xff;
    raw[off + 1] = 0;
    raw[off + 2] = 0;
  } else {
    raw[off] = toKey & 0xff;
    raw[off + 1] = 0;
    raw[off + 2] = 0;
  }
}

/** 读取当前按键映射目标。返回 null 表示未映射/默认。 */
export function getKeyMap(raw: Uint8Array, fromKey: ControllerKey): ControllerKey | null {
  const off = KEY_TABLE_OFFSET + fromKey * KEY_ENTRY_SIZE;
  const v = raw[off];
  if (v === 0xff) return null;
  if (v === 0xfe) return null; // Keyboard
  if (v === 32) return null; // Macro
  if (v > 31) return null; // 保留/越界
  return v;
}

export interface MotionOptions {
  enableKey0?: ControllerKey;
  enableKey1?: ControllerKey;
  enableType?: MotionEnableType;
  sensitivity?: number;
  deadZone?: number;
  useMode?: MotionUseMode;
}

/** 设置体感映射。mode=Off 即关闭陀螺仪。 */
export function setMotionMap(raw: Uint8Array, mode: MotionMapType, opts: MotionOptions = {}): void {
  const off = MOTION_OFFSET;
  if (mode === MotionMapType.Off) {
    raw[off] = MotionMapType.Off;
    raw[off + 1] = 0xff;
    raw[off + 2] = 0;
    raw[off + 3] = 0xff;
    raw[off + 4] = 0;
    raw[off + 5] = 0;
    raw[off + 6] = 0;
    raw[off + 7] = 0xff;
  } else {
    const enableKey0 = opts.enableKey0 ?? ControllerKey.M5;
    const enableKey1 = opts.enableKey1 ?? ControllerKey.None;
    const enableType = opts.enableType ?? MotionEnableType.Click;
    const sensitivity = opts.sensitivity ?? 50;
    const deadZone = opts.deadZone ?? 10;
    const useMode = opts.useMode ?? MotionUseMode.Fps;
    raw[off] = mode & 0xff;
    raw[off + 1] = enableKey0 & 0xff;
    raw[off + 2] = enableType & 0xff;
    raw[off + 3] = deadZone & 0xff;
    raw[off + 4] = sensitivity & 0xff;
    raw[off + 5] = sensitivity & 0xff;
    raw[off + 6] = useMode & 0xff;
    raw[off + 7] = enableKey1 & 0xff;
  }
}

/** 读取当前体感映射模式。 */
export function getMotionMap(raw: Uint8Array): { mode: MotionMapType; sensitivity: number; deadZone: number } {
  return {
    mode: raw[MOTION_OFFSET] as MotionMapType,
    sensitivity: raw[MOTION_OFFSET + 4],
    deadZone: raw[MOTION_OFFSET + 3],
  };
}

/** 把原始配置按 PKG_SIZE 拆成包数组。 */
export function splitRawToPacks(raw: Uint8Array): Uint8Array[] {
  const packs: Uint8Array[] = [];
  for (let i = 0; i < raw.length; i += PKG_SIZE) packs.push(raw.slice(i, i + PKG_SIZE));
  return packs;
}

/** 从原始配置中读取 DataVersion（偏移 225/226，小端）。 */
export function getDataVersion(raw: Uint8Array): number {
  return raw[225] | (raw[226] << 8);
}

/** 把 DataVersion +1 后写回（写配置前一般需要更新版本号）。 */
export function bumpDataVersion(raw: Uint8Array): void {
  const v = getDataVersion(raw) + 1;
  raw[225] = v & 0xff;
  raw[226] = (v >> 8) & 0xff;
}
