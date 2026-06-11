import { controller } from './controller.svelte';
import {
  ControllerKey,
  MAPPABLE_KEYS,
  MAX_MACROS,
  MacroEnableType,
  MotionMapType,
  bumpDataVersion,
  getDataVersion,
  getMotionMap,
  macrosRoundTripOk,
  readKeyMap,
  readMacros,
  setMotionMap,
  writeKeyMap,
  writeMacros,
  type KeyMapping,
  type MacroItem,
  type MacroStep,
} from './hid/config';

/**
 * 映射配置共享状态（按键映射 + 体感）。
 * 「按键」「体感」两个标签页都绑这一份：读一次完整配置 → 在内存原始字节上改 →
 * 写回并保存。cfgId 即左侧「配置档案」选中的档位（0..3）。
 */
class MappingStore {
  /** 当前配置档 ID（0..3）。 */
  cfgId = $state(0);
  /** 已读取的完整原始配置字节；null = 尚未读取。 */
  rawConfig = $state<Uint8Array | null>(null);
  busy = $state(false);
  status = $state('');
  /** 标记是否有未写入手柄的本地改动。 */
  dirty = $state(false);
  version = $state(0);

  /** 各物理键 → 映射形态（单键/连发/宏/键盘…）。 */
  mappings = $state<Record<number, KeyMapping>>({});
  /** 当前配置里的宏列表（≤5），按 keyId 归属。 */
  macros = $state<MacroItem[]>([]);
  /** 宏区能否安全编辑（parse→serialize 可复现现有字节）。否则只读保留。 */
  macroEditable = $state(true);
  /** 当前在手柄图上选中、正在编辑映射的物理键（null = 未选）。 */
  selectedKey = $state<ControllerKey | null>(null);
  motionMode = $state<MotionMapType>(MotionMapType.Off);
  motionSens = $state(50);
  motionDead = $state(10);

  get loaded(): boolean {
    return this.rawConfig !== null;
  }

  private refreshFromRaw() {
    const raw = this.rawConfig;
    if (!raw) return;
    const next: Record<number, KeyMapping> = {};
    for (const k of MAPPABLE_KEYS) next[k] = readKeyMap(raw, k);
    this.mappings = next;
    this.macros = readMacros(raw);
    this.macroEditable = macrosRoundTripOk(raw);
    const m = getMotionMap(raw);
    this.motionMode = m.mode;
    this.motionSens = m.sensitivity;
    this.motionDead = m.deadZone;
    this.version = getDataVersion(raw);
  }

  /** 选择档位；已连接则顺手读取。 */
  async selectSlot(id: number) {
    this.cfgId = id;
    this.rawConfig = null;
    this.macros = [];
    this.dirty = false;
    this.selectedKey = null;
    this.status = '';
    if (controller.connected) await this.read();
  }

  /** 点击手柄图上的按键：选中 / 再点取消。 */
  selectKey(key: ControllerKey) {
    this.selectedKey = this.selectedKey === key ? null : key;
  }

  /** 在真实手柄上按下某键：直接选中（不切换），供「按键选择」用。 */
  focusKey(key: ControllerKey) {
    this.selectedKey = key;
  }

  async read() {
    if (!controller.connected) {
      this.status = '未连接';
      return;
    }
    this.busy = true;
    this.status = '正在读取配置…';
    try {
      this.rawConfig = await controller.readMappingConfig(this.cfgId);
      this.refreshFromRaw();
      this.dirty = false;
      this.selectedKey = null;
      this.status = `已读取档位 ${this.cfgId + 1} · 版本 ${this.version}`;
    } catch (e) {
      this.status = '读取失败: ' + (e instanceof Error ? e.message : String(e));
    } finally {
      this.busy = false;
    }
  }

  /** 设置某键的映射形态（单键/连发/宏/清除…）。 */
  setMapping(from: ControllerKey, m: KeyMapping) {
    const raw = this.rawConfig;
    if (!raw) return;

    if (m.kind === 'macro') {
      if (!this.macros.find((x) => x.key === from)) {
        if (this.macros.length >= MAX_MACROS) {
          this.status = `最多 ${MAX_MACROS} 个宏，先清除其它宏`;
          return;
        }
        this.macros = [...this.macros, { key: from, type: MacroEnableType.Once, intervalMs: 0, steps: [] }];
      }
      writeKeyMap(raw, from, m);
      writeMacros(raw, this.macros);
    } else {
      // 若原本是宏，移除对应宏单元
      if (this.macros.find((x) => x.key === from)) {
        this.macros = this.macros.filter((x) => x.key !== from);
        writeMacros(raw, this.macros);
      }
      writeKeyMap(raw, from, m);
    }

    this.rawConfig = raw;
    this.mappings = { ...this.mappings, [from]: m };
    this.dirty = true;
    this.status = '';
  }

  /** 清除某键映射（恢复默认）。 */
  clearMapping(from: ControllerKey) {
    this.setMapping(from, { kind: 'none' });
  }

  // —— 宏编辑（改完即写回 rawConfig 的宏区，保存时随整包下发） ——

  getMacro(key: ControllerKey): MacroItem | undefined {
    return this.macros.find((m) => m.key === key);
  }

  /** 改完宏列表后同步回原始字节并置脏。 */
  private syncMacros() {
    const raw = this.rawConfig;
    if (!raw) return;
    writeMacros(raw, this.macros);
    this.rawConfig = raw;
    this.macros = [...this.macros];
    this.dirty = true;
  }

  setMacroType(key: ControllerKey, type: MacroEnableType) {
    const m = this.getMacro(key);
    if (!m) return;
    m.type = type;
    this.syncMacros();
  }

  setMacroInterval(key: ControllerKey, intervalMs: number) {
    const m = this.getMacro(key);
    if (!m) return;
    m.intervalMs = Math.max(0, intervalMs);
    this.syncMacros();
  }

  addMacroStep(key: ControllerKey, step: MacroStep) {
    const m = this.getMacro(key);
    if (!m) return;
    m.steps.push(step);
    this.syncMacros();
  }

  updateMacroStep(key: ControllerKey, idx: number, patch: Partial<MacroStep>) {
    const m = this.getMacro(key);
    if (!m || !m.steps[idx]) return;
    m.steps[idx] = { ...m.steps[idx], ...patch };
    this.syncMacros();
  }

  removeMacroStep(key: ControllerKey, idx: number) {
    const m = this.getMacro(key);
    if (!m) return;
    m.steps.splice(idx, 1);
    this.syncMacros();
  }

  clearMacroSteps(key: ControllerKey) {
    const m = this.getMacro(key);
    if (!m) return;
    m.steps = [];
    this.syncMacros();
  }

  updateMotionMode(mode: MotionMapType) {
    const raw = this.rawConfig;
    if (!raw) return;
    if (mode === MotionMapType.Off) {
      setMotionMap(raw, MotionMapType.Off);
    } else {
      setMotionMap(raw, mode, { sensitivity: this.motionSens, deadZone: this.motionDead });
    }
    this.rawConfig = raw;
    this.motionMode = mode;
    this.dirty = true;
  }

  updateMotionParams() {
    const raw = this.rawConfig;
    if (!raw || this.motionMode === MotionMapType.Off) return;
    setMotionMap(raw, this.motionMode, { sensitivity: this.motionSens, deadZone: this.motionDead });
    this.rawConfig = raw;
    this.dirty = true;
  }

  async save() {
    const raw = this.rawConfig;
    if (!raw) {
      this.status = '请先读取配置';
      return;
    }
    if (!controller.connected) {
      this.status = '未连接';
      return;
    }
    this.busy = true;
    this.status = '正在写入并保存…';
    try {
      bumpDataVersion(raw);
      await controller.writeAllMappingConfig(this.cfgId, raw);
      const version = getDataVersion(raw);
      await controller.saveMappingConfig(version);
      await controller.applyMappingConfig(this.cfgId);
      this.version = version;
      this.dirty = false;
      this.status = `已保存到手柄 · 版本 ${version}`;
    } catch (e) {
      this.status = '写入失败: ' + (e instanceof Error ? e.message : String(e));
    } finally {
      this.busy = false;
    }
  }
}

export const mapping = new MappingStore();
