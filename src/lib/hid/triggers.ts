// 自适应扳机效果模式定义。
// createParams 语义来自反编译 SpaceStationService.dll 的 CreateForceAdapterConfig（《分析》§7.7 / §7.9）。
// wire 序列：[side, modeByte, ...mode 专属字节, matchStroke]

/** 扳机侧：左 / 右 / 双。Both 在固件层需拆成两帧分别下发（见 controller.sendTrigger）。 */
export enum TriggerSide {
  Left = 1,
  Right = 2,
  Both = 3,
}

/** 效果模式编号，与固件 modeByte 一致。 */
export enum TriggerMode {
  Normal = 0, // 关闭/释放
  Race = 1, // 阻力
  Sniper = 2, // 脉冲
  Recoil = 3, // 后坐
  Lock = 4, // 扳机锁
  Vibration = 5, // 震动
}

export interface TriggerParamDef {
  key: string;
  label: string;
  min: number;
  max: number;
  def: number;
}

export interface TriggerModeDef {
  mode: TriggerMode;
  name: string;
  hint: string;
  params: TriggerParamDef[];
  /** 返回 createParams：[side, modeByte, ...]，不含帧头/cmd/len/apply。 */
  build(side: number, v: Record<string, number>, match: 0 | 1): number[];
}

const clampMin1 = (n: number) => Math.max(1, n | 0);

export const TRIGGER_MODES: Record<TriggerMode, TriggerModeDef> = {
  [TriggerMode.Normal]: {
    mode: TriggerMode.Normal,
    name: 'Normal 关闭/释放',
    hint: '清除扳机效果，恢复线性。',
    params: [],
    build: (s) => [s, 0],
  },
  [TriggerMode.Race]: {
    mode: TriggerMode.Race,
    name: 'Race 阻力',
    hint: '从起始行程起施加恒定阻力（油门/刹车手感）。',
    params: [
      { key: 'stroke', label: '起始行程', min: 0, max: 255, def: 0 },
      { key: 'resistance', label: '阻力', min: 1, max: 255, def: 120 },
    ],
    build: (s, v, m) => [s, 1, v.stroke, clampMin1(v.resistance), m],
  },
  [TriggerMode.Sniper]: {
    mode: TriggerMode.Sniper,
    name: 'Sniper 脉冲',
    hint: '到达压力点后给一段震动脉冲（开镜/换弹打断感）。',
    params: [
      { key: 'stroke', label: '起始行程', min: 0, max: 255, def: 0 },
      { key: 'press', label: '压力', min: 1, max: 255, def: 160 },
      { key: 'strength', label: '震动强度', min: 1, max: 255, def: 120 },
      { key: 'freq', label: '震动频率', min: 1, max: 255, def: 16 },
    ],
    build: (s, v, m) => [s, 2, v.stroke, clampMin1(v.press), clampMin1(v.strength), clampMin1(v.freq), m],
  },
  [TriggerMode.Recoil]: {
    mode: TriggerMode.Recoil,
    name: 'Recoil 后坐',
    hint: '从起始到后坐行程区间内施加冲击（枪械后坐）。',
    params: [
      { key: 'stroke', label: '起始行程', min: 0, max: 255, def: 0 },
      { key: 'end', label: '后坐行程', min: 0, max: 255, def: 120 },
      { key: 'strength', label: '强度', min: 1, max: 255, def: 200 },
    ],
    build: (s, v, m) => [s, 3, v.stroke, v.end, clampMin1(v.strength), 0, m],
  },
  [TriggerMode.Lock]: {
    mode: TriggerMode.Lock,
    name: 'Lock 扳机锁',
    hint: '在指定位置硬性锁死扳机行程。',
    params: [
      { key: 'stroke', label: '锁死位置', min: 0, max: 255, def: 128 },
      { key: 'strength', label: '强度', min: 0, max: 255, def: 255 },
    ],
    build: (s, v, m) => [s, 4, v.stroke, v.strength, m],
  },
  [TriggerMode.Vibration]: {
    mode: TriggerMode.Vibration,
    name: 'Vibration 震动',
    hint: '全行程持续震动反馈。',
    params: [
      { key: 'stroke', label: '起始行程', min: 0, max: 255, def: 0 },
      { key: 'press', label: '压力', min: 1, max: 255, def: 1 },
      { key: 'strength', label: '震动强度', min: 1, max: 255, def: 5 },
      { key: 'freq', label: '震动频率', min: 1, max: 255, def: 60 },
    ],
    build: (s, v, m) => [s, 5, v.stroke, clampMin1(v.press), clampMin1(v.strength), clampMin1(v.freq), m],
  },
};

/** UI 下拉框展示顺序（与原测试页一致）。 */
export const MODE_ORDER: TriggerMode[] = [
  TriggerMode.Race,
  TriggerMode.Recoil,
  TriggerMode.Sniper,
  TriggerMode.Vibration,
  TriggerMode.Lock,
  TriggerMode.Normal,
];

/** 取某模式参数的默认值对象。 */
export function defaultValues(mode: TriggerMode): Record<string, number> {
  const v: Record<string, number> = {};
  for (const p of TRIGGER_MODES[mode].params) v[p.key] = p.def;
  return v;
}
