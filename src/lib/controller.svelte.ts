import {
  DEFAULT_REPORT_ID,
  DEFAULT_REPORT_LEN,
  FLYDIGI_VID,
  USAGE_PAGE_CMD,
} from './hid/constants';
import { buildTriggerFrame } from './hid/frame';
import { buildGripFrame, unbindParams, type GripBindParams } from './hid/gripbind';
import { TriggerMode, TriggerSide } from './hid/triggers';
import { sleep, toHex } from './hid/util';
import {
  CMD_APPLY,
  CMD_READ_MAPPING,
  CMD_SAVE,
  CMD_WRITE_PACK,
  CMD_WRITE_START,
  PKG_COUNT,
  PKG_SIZE,
  buildApplyFrame,
  buildReadMappingFrame,
  buildSaveFrame,
  buildWritePackFrame,
  buildWriteStartFrame,
  extractPackFromAck,
  isAck,
} from './hid/config';

export type LogLevel = 'info' | 'tx' | 'rx' | 'warn' | 'error';
export interface LogEntry {
  id: number;
  ts: number;
  level: LogLevel;
  text: string;
}

/** 某个 reportId 的最新输入报文快照（供原始监视器渲染）。 */
export interface ReportSnapshot {
  reportId: number;
  bytes: number[];
  /** 与上一帧相比发生变化的字节位（用于高亮）。 */
  changed: boolean[];
  /** 收到该 reportId 的累计帧数。 */
  count: number;
  lastTs: number;
}

export interface TriggerCommand {
  mode: TriggerMode;
  side: TriggerSide;
  values: Record<string, number>;
  match: boolean;
}

const MAX_LOGS = 250;

class FlydigiController {
  /** 浏览器是否支持 WebHID。 */
  readonly supported = 'hid' in navigator;

  connected = $state(false);
  productName = $state('');
  /** 设备 collections / 输出报文概览，连接后填充。 */
  deviceInfo = $state('');
  /** 是否枚举到 0xFFA0 命令接口。 */
  hasCmdInterface = $state(false);

  reportId = $state(DEFAULT_REPORT_ID);
  reportLen = $state(DEFAULT_REPORT_LEN);

  logs = $state<LogEntry[]>([]);
  /** 按 reportId 排序的最新输入报文快照。 */
  reports = $state<ReportSnapshot[]>([]);

  // —— 非响应式内部状态 ——
  /** 用于下发命令的设备（含 0xFFA0 命令接口）。 */
  private device: HIDDevice | null = null;
  /** 全部已打开的设备（命令接口 + 输入接口可能是不同 collection/HIDDevice）。 */
  private devices: HIDDevice[] = [];
  private rawBuf = new Map<number, ReportSnapshot>();
  private dirty = false;
  private rafId = 0;
  private logSeq = 0;
  private readonly onInput = (e: HIDInputReportEvent) => this.handleInput(e);
  private readonly onDisconnect = (e: HIDConnectionEvent) => {
    if (this.devices.includes(e.device)) this.teardown('设备已拔出');
  };

  log(level: LogLevel, text: string): void {
    const entry: LogEntry = { id: ++this.logSeq, ts: Date.now(), level, text };
    const next = this.logs.length >= MAX_LOGS ? this.logs.slice(this.logs.length - MAX_LOGS + 1) : this.logs.slice();
    next.push(entry);
    this.logs = next;
  }

  clearLogs(): void {
    this.logs = [];
  }

  /** 用户手势触发：弹设备选择框并连接命令接口。 */
  async connect(): Promise<void> {
    if (!this.supported) {
      this.log('error', '当前浏览器不支持 WebHID，请用 Chrome / Edge。');
      return;
    }
    try {
      const devices = await navigator.hid.requestDevice({ filters: [{ vendorId: FLYDIGI_VID }] });
      if (!devices.length) {
        this.log('info', '未选择设备');
        return;
      }
      await this.attachAll(devices);
    } catch (err) {
      this.log('error', '连接失败: ' + errMsg(err));
    }
  }

  /** 页面加载时尝试恢复已授权设备（无需用户手势）。 */
  async tryRestore(): Promise<void> {
    if (!this.supported) return;
    try {
      const granted = (await navigator.hid.getDevices()).filter((d) => d.vendorId === FLYDIGI_VID);
      if (granted.length) {
        await this.attachAll(granted);
        this.log('info', '已自动恢复上次授权的设备');
      }
    } catch {
      /* 静默：恢复失败不影响首次连接 */
    }
  }

  async disconnect(): Promise<void> {
    await this.teardown('已断开');
  }

  /** 发送扳机效果。Both 拆成左右两帧，间隔 100ms（复刻固件 quirk）。 */
  async sendTrigger(cmd: TriggerCommand): Promise<void> {
    if (!this.device?.opened) {
      this.log('warn', '未连接，无法发送');
      return;
    }
    const sides = cmd.side === TriggerSide.Both ? [TriggerSide.Left, TriggerSide.Right] : [cmd.side];
    for (let i = 0; i < sides.length; i++) {
      const data = buildTriggerFrame({
        mode: cmd.mode,
        side: sides[i],
        values: cmd.values,
        match: cmd.match,
        reportLen: this.reportLen,
      });
      try {
        await this.device.sendReport(this.reportId, data);
        this.log('tx', `[${hexId(this.reportId)}] ${toHex(data.slice(0, 12))}`);
      } catch (err) {
        this.log('error', 'sendReport 失败: ' + errMsg(err) + '（试着改 Report ID / 报文长度）');
        return;
      }
      if (i < sides.length - 1) await sleep(100);
    }
  }

  /** 释放扳机（Normal）。 */
  async release(side: TriggerSide): Promise<void> {
    await this.sendTrigger({ mode: TriggerMode.Normal, side, values: {}, match: false });
  }

  /**
   * 内置震动绑定 SyncWithGrip（cmd82）—— ③类(WRC7 等)用法。
   * 发一次即让固件把游戏 XInput rumble 实时耦合进扳机；之后启动游戏即可，主机零循环。
   * 左右各发一帧（复刻 OnTriggerBindGrip 同时下发 leftConfig/rightConfig）。
   */
  async bindGrip(p: GripBindParams): Promise<void> {
    if (!this.device?.opened) {
      this.log('warn', '未连接，无法发送');
      return;
    }
    for (const side of [TriggerSide.Left, TriggerSide.Right]) {
      const data = buildGripFrame(side, p, this.reportLen);
      try {
        await this.device.sendReport(this.reportId, data);
        this.log('tx', `[${hexId(this.reportId)}] Grip ${toHex(data.slice(0, 12))}`);
      } catch (err) {
        this.log('error', 'sendReport 失败: ' + errMsg(err) + '（试改 Report ID / 长度）');
        return;
      }
    }
  }

  /** 解绑内置震动（bindType=0），对应游戏退出时的 OnCloseGameVibMode。 */
  async unbindGrip(p: GripBindParams): Promise<void> {
    await this.bindGrip(unbindParams(p));
  }

  // ===== 映射配置（按键映射 + 陀螺仪开关） =====

  /** 读取指定 cfgId 的完整映射配置原始字节（84 * 20 = 1680 bytes）。 */
  async readMappingConfig(cfgId: number): Promise<Uint8Array> {
    if (!this.device?.opened) throw new Error('未连接');
    const dev = this.device;

    const raw = new Uint8Array(PKG_COUNT * PKG_SIZE);
    let received = 0;
    // 先挂监听再发请求：首包 ACK 可能早于 sendReport 返回，挂晚了会丢包。
    const done = this.waitForAck(
      CMD_READ_MAPPING,
      (bytes) => {
        const info = extractPackFromAck(bytes);
        if (!info) return false;
        if (info.total !== PKG_COUNT) return false;
        raw.set(info.payload, info.num * PKG_SIZE);
        received++;
        if (info.num + 1 >= info.total) return raw;
        return false;
      },
      6000,
    );
    const frame = buildReadMappingFrame(cfgId, this.reportLen);
    await dev.sendReport(this.reportId, frame);
    this.log('tx', `[${hexId(this.reportId)}] ReadMapping cfg=${cfgId}`);
    const result = await done;
    this.log('rx', `ReadMapping 完成，共 ${received}/${PKG_COUNT} 包`);
    return result as Uint8Array;
  }

  /**
   * 把完整映射配置写回手柄（全量写）。
   * 逐包发送并等待本包 0xA5 ACK 再发下一包，复刻原版串行命令队列
   * （WriteMappingConfigCommandFactory 把每个分包当独立单 ACK 命令排队）。
   */
  async writeAllMappingConfig(cfgId: number, raw: Uint8Array): Promise<void> {
    if (!this.device?.opened) throw new Error('未连接');
    if (raw.length !== PKG_COUNT * PKG_SIZE) throw new Error('配置长度错误');
    const dev = this.device;

    // 写头(A4)：先挂监听再发。
    const startAck = this.waitForAck(CMD_WRITE_START, (b) => isAck(b, CMD_WRITE_START), 2000);
    const startFrame = buildWriteStartFrame(cfgId, 0, PKG_COUNT, this.reportLen);
    await dev.sendReport(this.reportId, startFrame);
    this.log('tx', `[${hexId(this.reportId)}] WriteStart cfg=${cfgId} pkts=${PKG_COUNT}`);
    await startAck;

    // 84 个分包(A5)：发一包→等本包 ACK→发下一包。
    for (let i = 0; i < PKG_COUNT; i++) {
      const pack = raw.slice(i * PKG_SIZE, (i + 1) * PKG_SIZE);
      const packFrame = buildWritePackFrame(i, pack, this.reportLen);
      const packAck = this.waitForAck(CMD_WRITE_PACK, (b) => isAck(b, CMD_WRITE_PACK), 1500);
      await dev.sendReport(this.reportId, packFrame);
      await packAck;
    }
    this.log('tx', `[${hexId(this.reportId)}] WritePack ×${PKG_COUNT} 完成`);
  }

  /** 应用配置（切档）。 */
  async applyMappingConfig(cfgId: number): Promise<void> {
    if (!this.device?.opened) throw new Error('未连接');
    const ack = this.waitForAck(CMD_APPLY, (b) => isAck(b, CMD_APPLY), 2000);
    const frame = buildApplyFrame(cfgId, this.reportLen);
    await this.device.sendReport(this.reportId, frame);
    this.log('tx', `[${hexId(this.reportId)}] Apply cfg=${cfgId}`);
    await ack;
  }

  /** 保存配置到手柄 Flash。 */
  async saveMappingConfig(version: number): Promise<void> {
    if (!this.device?.opened) throw new Error('未连接');
    const ack = this.waitForAck(CMD_SAVE, (b) => isAck(b, CMD_SAVE), 5000);
    const frame = buildSaveFrame(version, this.reportLen);
    await this.device.sendReport(this.reportId, frame);
    this.log('tx', `[${hexId(this.reportId)}] Save version=${version}`);
    await ack;
  }

  /**
   * 一键读取→修改→写入→保存→应用。
   * 顺序复刻原版：先 Save 落 flash，再 Apply 切档（原版 SaveSwitch 把二者合并成
   * 一条命令，语义即“先持久化再激活”），避免 apply-before-save 时固件从旧 flash 重载。
   */
  async commitMappingConfig(
    cfgId: number,
    modify: (raw: Uint8Array) => void,
  ): Promise<void> {
    const raw = await this.readMappingConfig(cfgId);
    modify(raw);
    // 版本号 +1，保证 != 当前，否则固件可能拒写
    const nextVersion = (raw[225] | (raw[226] << 8)) + 1;
    raw[225] = nextVersion & 0xff;
    raw[226] = (nextVersion >> 8) & 0xff;
    await this.writeAllMappingConfig(cfgId, raw);
    await this.saveMappingConfig(nextVersion);
    await this.applyMappingConfig(cfgId);
    this.log('info', '配置已写入并保存');
  }

  // —— 内部实现 ——

  /**
   * 等待带有指定 cmd 的 ACK 输入报文。
   * predicate 返回 truthy 时 resolve；返回的值会作为 Promise 结果。
   * 超时则 reject。
   */
  private waitForAck<T>(
    expectedCmd: number,
    predicate: (bytes: Uint8Array) => T | false,
    timeoutMs = 2000,
  ): Promise<NonNullable<T>> {
    return new Promise((resolve, reject) => {
      const onReport = (e: HIDInputReportEvent) => {
        const bytes = new Uint8Array(e.data.buffer);
        if (bytes.length < 5 || bytes[0] !== 0x5a || bytes[1] !== 0xa5 || bytes[2] !== expectedCmd) {
          return;
        }
        const result = predicate(bytes);
        if (result !== false) {
          cleanup();
          resolve(result as NonNullable<T>);
        }
      };
      let timer = setTimeout(() => {
        cleanup();
        reject(new Error(`等待 0x${expectedCmd.toString(16).toUpperCase()} ACK 超时`));
      }, timeoutMs);
      const cleanup = () => {
        clearTimeout(timer);
        for (const dev of this.devices) dev.removeEventListener('inputreport', onReport);
      };
      for (const dev of this.devices) dev.addEventListener('inputreport', onReport);
    });
  }

  /**
   * 打开授权到的全部设备并监听各自的输入报文。
   * 命令接口(0xFFA0)与手柄输入在某些平台是不同的 HIDDevice，全开才既能下发又能读输入。
   */
  private async attachAll(devices: HIDDevice[]): Promise<void> {
    for (const dev of devices) {
      try {
        if (!dev.opened) await dev.open();
      } catch (err) {
        this.log('warn', `打开 collection 失败(${describe(dev)}): ${errMsg(err)}`);
        continue;
      }
      dev.addEventListener('inputreport', this.onInput);
      this.devices.push(dev);
    }
    if (this.devices.length === 0) {
      this.log('error', '没有可打开的接口');
      return;
    }
    // 选含 0xFFA0 命令接口的设备用于下发；没有则退化为第一个。
    this.device = this.devices.find((d) => hasCmd(d)) ?? this.devices[0];
    navigator.hid.addEventListener('disconnect', this.onDisconnect);
    this.pickReportConfig(this.device);
    this.connected = true;
    this.productName = this.device.productName || 'Flydigi';
    this.hasCmdInterface = hasCmd(this.device);
    this.startRaf();
    this.log(
      'info',
      `✓ 已连接 ${this.productName} · VID=0x${FLYDIGI_VID.toString(16).toUpperCase()} · 打开 ${this.devices.length} 个接口`,
    );
    if (!this.hasCmdInterface) {
      this.log('warn', '未发现 0xFFA0 命令接口 —— 手柄可能不在 NewXInput/增强模式。');
    }
  }

  private async teardown(reason: string): Promise<void> {
    for (const dev of this.devices) {
      dev.removeEventListener('inputreport', this.onInput);
      try {
        if (dev.opened) await dev.close();
      } catch {
        /* ignore */
      }
    }
    if (this.supported) navigator.hid.removeEventListener('disconnect', this.onDisconnect);
    if (this.rafId) cancelAnimationFrame(this.rafId);
    this.rafId = 0;
    this.device = null;
    this.devices = [];
    this.rawBuf.clear();
    this.reports = [];
    this.connected = false;
    this.hasCmdInterface = false;
    this.productName = '';
    this.deviceInfo = '';
    this.log('info', reason);
  }

  /** 从设备 collections 推断输出报文 ID 与长度。 */
  private pickReportConfig(dev: HIDDevice): void {
    const outputs = (dev.collections ?? []).flatMap((c) => c.outputReports ?? []);
    const chosen = outputs.find((r) => r.reportId === DEFAULT_REPORT_ID) ?? outputs[0];
    if (chosen?.reportId != null) this.reportId = chosen.reportId;
    if (chosen) {
      const bits = (chosen.items ?? []).reduce(
        (n, it) => n + (it.reportCount ?? 0) * (it.reportSize ?? 0),
        0,
      );
      if (bits) this.reportLen = Math.ceil(bits / 8);
    }
    const pages = (dev.collections ?? [])
      .map((c) => '0x' + (c.usagePage ?? 0).toString(16).toUpperCase())
      .join(', ');
    const ids = outputs.map((r) => r.reportId).join(', ') || '无';
    this.deviceInfo = `usagePages: ${pages} · 输出报文ID: ${ids}`;
  }

  private handleInput(e: HIDInputReportEvent): void {
    const bytes = Array.from(new Uint8Array(e.data.buffer));
    const prev = this.rawBuf.get(e.reportId);
    const prevBytes = prev?.bytes;
    const changed = bytes.map((b, i) => (prevBytes ? b !== prevBytes[i] : false));
    this.rawBuf.set(e.reportId, {
      reportId: e.reportId,
      bytes,
      changed,
      count: (prev?.count ?? 0) + 1,
      lastTs: e.timeStamp,
    });
    this.dirty = true; // 实际刷新到响应式状态在 rAF 里做，避免高频输入压垮 UI
  }

  private startRaf(): void {
    const tick = () => {
      if (this.dirty) {
        this.dirty = false;
        this.reports = [...this.rawBuf.values()].sort((a, b) => a.reportId - b.reportId);
      }
      this.rafId = requestAnimationFrame(tick);
    };
    this.rafId = requestAnimationFrame(tick);
  }
}

function hasCmd(dev: HIDDevice): boolean {
  return (dev.collections ?? []).some((c) => c.usagePage === USAGE_PAGE_CMD);
}

const hexId = (id: number) => id.toString(16).padStart(2, '0').toUpperCase();
const errMsg = (err: unknown) => (err instanceof Error ? err.message : String(err));
const describe = (dev: HIDDevice) =>
  (dev.collections ?? []).map((c) => '0x' + (c.usagePage ?? 0).toString(16).toUpperCase()).join('/') || '?';

/** 全局单例控制器。 */
export const controller = new FlydigiController();
