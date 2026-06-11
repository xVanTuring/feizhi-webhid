import { FRAME_MAGIC } from './constants';

// NewXInput 实时输入「激活」命令。来源：Flydigi.ControllerSdk.cs
// + app.asar(koffi FFI)。飞智「手柄测试」页面靠这套让设备上报 0xEF 操作数据帧
// (含 M1-M6/C/Z 等物理键)。流程：AcquireController(接管) → EnableRawData(开数据)，
// 期间周期发 HeartBeat 保活；退出时反向释放。

export const CMD_HEARTBEAT = 0x01; // 1  心跳 / 保活
export const CMD_ACQUIRE = 0x1c; // 28  获取(独占)/释放控制器
export const CMD_ENABLE_RAWDATA = 0x11; // 17 启用数据上报

/** NewXInput 操作数据帧标识：data[2]===0xEF。 */
export const OPERATOR_FRAME = 0xef;

/** 帧 CRC = cmd+len+payload 逐字节累加取低 8 位。 */
function crc8(data: Uint8Array, end: number): number {
  let sum = 0;
  for (let i = 2; i < end; i++) sum += data[i];
  return sum & 0xff;
}

/**
 * 拼一帧命令 data（不含 reportId，由 sendReport 单独传）：
 * 5A A5 | cmd | len | payload… | CRC，len = payload.length + 2，CRC 落在 data[2+len]。
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
  data[2 + len] = crc8(data, 2 + len);
  return data;
}

/** AcquireController(cmd28)：acquire=true 接管(独占)，false 释放。tag≤20B ASCII。 */
export function buildAcquireFrame(
  acquire: boolean,
  tag: string,
  reportLen: number,
): Uint8Array<ArrayBuffer> {
  const tagBytes: number[] = [];
  for (let i = 0; i < 20; i++) tagBytes.push(i < tag.length ? tag.charCodeAt(i) & 0xff : 0);
  return buildFrame(CMD_ACQUIRE, [acquire ? 1 : 0, ...tagBytes], reportLen);
}

/**
 * EnableRawDataTransportIn(cmd17)：开关设备各路数据。undefined=255(不改)，true=1，false=0。
 * 参数名有误导性 —— 实际对应(见 ReadRawDataReportStatus 的 ACK data[5..9])：
 *   controllerData → **XInputEnabled**：给系统的标准手柄输出(关掉系统就收不到手柄!)
 *   rawData        → **PrivateDataEnabled**：私有 0xEF/0xF7 操作数据上报(我们要的实时全键)
 *   keyboard/mouse → 键盘/鼠标映射输出   thirdParty → 第三方接管标志
 * 所以：开实时全键(0xEF)用 rawData=true；务必保持 controllerData=true 别关系统输出。
 */
export function buildEnableRawDataFrame(
  opts: {
    controllerData?: boolean;
    rawData?: boolean;
    keyboard?: boolean;
    mouse?: boolean;
    thirdParty?: boolean;
  },
  reportLen: number,
): Uint8Array<ArrayBuffer> {
  const f = (v?: boolean) => (v === undefined ? 0xff : v ? 1 : 0);
  return buildFrame(
    CMD_ENABLE_RAWDATA,
    [f(opts.controllerData), f(opts.rawData), f(opts.keyboard), f(opts.mouse), f(opts.thirdParty)],
    reportLen,
  );
}

/** HeartBeat(cmd1)：保活。飞智软件周期发，停发后设备会停止上报。 */
export function buildHeartbeatFrame(reportLen: number): Uint8Array<ArrayBuffer> {
  return buildFrame(CMD_HEARTBEAT, [], reportLen);
}
