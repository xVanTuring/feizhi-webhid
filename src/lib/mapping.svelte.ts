import { controller } from './controller.svelte';
import {
  ControllerKey,
  MAPPABLE_KEYS,
  MotionMapType,
  bumpDataVersion,
  getDataVersion,
  getKeyMap,
  getMotionMap,
  setKeyMap,
  setMotionMap,
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

  /** 各物理键 → 映射目标（null = 不映射/默认）。 */
  mappings = $state<Record<number, number | null>>({});
  motionMode = $state<MotionMapType>(MotionMapType.Off);
  motionSens = $state(50);
  motionDead = $state(10);

  get loaded(): boolean {
    return this.rawConfig !== null;
  }

  private refreshFromRaw() {
    const raw = this.rawConfig;
    if (!raw) return;
    const next: Record<number, number | null> = {};
    for (const k of MAPPABLE_KEYS) next[k] = getKeyMap(raw, k);
    this.mappings = next;
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
    this.dirty = false;
    this.status = '';
    if (controller.connected) await this.read();
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
      this.status = `已读取档位 ${this.cfgId + 1} · 版本 ${this.version}`;
    } catch (e) {
      this.status = '读取失败: ' + (e instanceof Error ? e.message : String(e));
    } finally {
      this.busy = false;
    }
  }

  updateMap(from: ControllerKey, to: number | null) {
    const raw = this.rawConfig;
    if (!raw) return;
    const t = to == null || to === ControllerKey.None ? null : to;
    setKeyMap(raw, from, t);
    this.rawConfig = raw;
    this.mappings = { ...this.mappings, [from]: t };
    this.dirty = true;
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
