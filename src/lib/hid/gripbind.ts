import { CMD_SYNC_WITH_GRIP, FRAME_MAGIC } from './constants';

// 内置震动 / SyncWithGrip (cmd 82) —— ③类游戏(WRC7 等)用法。
// 发一次绑定后，手柄固件自己把游戏的 XInput rumble 实时耦合进扳机马达，主机零循环。
// 协议来源：反编译 Flydigi.ControllerSdk(ForceTriggerControllerCommandNewXInput.CreateCommand)
// + SpaceStationService.OnTriggerBindGrip + AdapterTriggerService.OnStartGameVibMode（《分析》§7.7/§7.8）。
//
// wire(NewXInput)：5A A5 | 52(82) | 0B(len) | side bindType filter scale stroke pressureLevel strength frequency
//   bindType = VibType；filter = VibFilter；scale = PwmScal；
//   stroke/pressureLevel/strength/frequency = VibParams 逗号拆的前 4 个（第 5 个不进报文）。
// 注意 cmd82 没有 cmd81 那个 applyFlag 字节，params 直接从 byte5(data 里 byte4) 开始；无 CRC。

export interface GripBindParams {
  bindType: number; // VibType
  filter: number; // VibFilter
  scale: number; // PwmScal
  stroke: number; // VibParams[0]
  pressure: number; // VibParams[1]
  strength: number; // VibParams[2]
  frequency: number; // VibParams[3]
}

export interface GripPreset extends GripBindParams {
  name: string;
  /** 进程名(ProcessGameName)，给将来做进程自动检测 daemon 用。 */
  proc: string;
}

/**
 * 飞智游戏库里全部 31 款③类(内置震动)游戏的原版绑定参数。
 * 提取自 adapterTriggerGames.json（IsMod && !IsPS5 && ModDownLoadUrl=="" && VibType==2），
 * 每款 PwmScal 都是 10、左右一致；filter/params 逐游戏不同。
 */
export const GRIP_PRESETS: GripPreset[] = [
  { name: 'WRC7', proc: 'WRC7', bindType: 2, filter: 82, scale: 10, stroke: 0, pressure: 1, strength: 5, frequency: 110 },
  { name: 'WRC8', proc: 'WRC8', bindType: 2, filter: 82, scale: 10, stroke: 0, pressure: 1, strength: 5, frequency: 110 },
  { name: 'WRC9', proc: 'WRC9', bindType: 2, filter: 82, scale: 10, stroke: 0, pressure: 1, strength: 5, frequency: 110 },
  { name: 'WRC10', proc: 'WRC10', bindType: 2, filter: 82, scale: 10, stroke: 0, pressure: 1, strength: 5, frequency: 110 },
  { name: 'EA WRC', proc: 'WRC', bindType: 2, filter: 30, scale: 10, stroke: 0, pressure: 1, strength: 100, frequency: 110 },
  { name: '尘埃拉力赛2.0', proc: 'dirtrally2', bindType: 2, filter: 50, scale: 10, stroke: 0, pressure: 1, strength: 150, frequency: 65 },
  { name: '神力科莎：竞速', proc: 'AC2-Win64-Shipping', bindType: 2, filter: 30, scale: 10, stroke: 165, pressure: 1, strength: 10, frequency: 80 },
  { name: '极品飞车：不羁', proc: 'NeedForSpeedUnbound', bindType: 2, filter: 20, scale: 10, stroke: 0, pressure: 1, strength: 255, frequency: 70 },
  { name: '极品飞车：复仇', proc: 'NeedForSpeedPayback', bindType: 2, filter: 4, scale: 10, stroke: 0, pressure: 1, strength: 255, frequency: 70 },
  { name: '极品飞车：热度', proc: 'NeedForSpeedHeat', bindType: 2, filter: 10, scale: 10, stroke: 0, pressure: 1, strength: 255, frequency: 70 },
  { name: '极品飞车：宿敌', proc: 'NFS14', bindType: 2, filter: 4, scale: 10, stroke: 0, pressure: 1, strength: 255, frequency: 70 },
  { name: '刺客信条：影', proc: 'ACShadows', bindType: 2, filter: 1, scale: 10, stroke: 0, pressure: 1, strength: 100, frequency: 125 },
  { name: '空洞骑士：丝之歌', proc: 'Hollow Knight Silksong', bindType: 2, filter: 1, scale: 10, stroke: 0, pressure: 1, strength: 100, frequency: 125 },
  { name: '鸣潮', proc: 'Wuthering Waves', bindType: 2, filter: 22, scale: 10, stroke: 0, pressure: 1, strength: 55, frequency: 100 },
  { name: '燕云十六声', proc: 'yysls', bindType: 2, filter: 1, scale: 10, stroke: 0, pressure: 10, strength: 30, frequency: 150 },
  { name: '第一后裔', proc: 'M1-Win64-Shipping', bindType: 2, filter: 1, scale: 10, stroke: 0, pressure: 1, strength: 245, frequency: 70 },
  { name: '双影奇境', proc: 'SplitFiction', bindType: 2, filter: 1, scale: 10, stroke: 0, pressure: 1, strength: 245, frequency: 70 },
  { name: '死亡搁浅2：冥滩之上', proc: 'DS2', bindType: 2, filter: 8, scale: 10, stroke: 1, pressure: 25, strength: 20, frequency: 20 },
  { name: '生化危机9：安魂曲', proc: 're9', bindType: 2, filter: 45, scale: 10, stroke: 1, pressure: 200, strength: 200, frequency: 12 },
  { name: '七龙珠 电光炸裂！ZERO', proc: 'SparkingZERO-Win64-Shipping', bindType: 2, filter: 15, scale: 10, stroke: 1, pressure: 200, strength: 200, frequency: 80 },
  { name: '三角洲行动', proc: 'DeltaForceClient-Win64-Shipping', bindType: 2, filter: 1, scale: 10, stroke: 0, pressure: 1, strength: 120, frequency: 20 },
  { name: '战地风云™ 6', proc: 'bf6', bindType: 2, filter: 1, scale: 10, stroke: 0, pressure: 1, strength: 100, frequency: 15 },
  { name: '战锤40k：星际战士2', proc: 'Warhammer 40000 Space Marine 2 - Retail', bindType: 2, filter: 85, scale: 10, stroke: 0, pressure: 1, strength: 20, frequency: 15 },
  { name: '严阵以待', proc: 'ReadyOrNot', bindType: 2, filter: 10, scale: 10, stroke: 0, pressure: 1, strength: 100, frequency: 15 },
  { name: '僵尸世界大战', proc: 'wwzRetail', bindType: 2, filter: 100, scale: 10, stroke: 0, pressure: 1, strength: 1, frequency: 15 },
  { name: '泰坦陨落2', proc: 'Titanfall2', bindType: 2, filter: 60, scale: 10, stroke: 0, pressure: 1, strength: 60, frequency: 15 },
  { name: '无主之地4', proc: 'Borderlands4', bindType: 2, filter: 50, scale: 10, stroke: 0, pressure: 1, strength: 5, frequency: 20 },
  { name: '遗迹2', proc: 'Remnant2', bindType: 2, filter: 55, scale: 10, stroke: 0, pressure: 1, strength: 1, frequency: 18 },
  { name: '史莱姆牧场 2', proc: 'SlimeRancher2', bindType: 2, filter: 10, scale: 10, stroke: 0, pressure: 1, strength: 130, frequency: 128 },
  { name: '终极角逐', proc: 'Discovery', bindType: 2, filter: 55, scale: 10, stroke: 25, pressure: 1, strength: 25, frequency: 17 },
  { name: '远光84', proc: 'SolarlandClient', bindType: 2, filter: 10, scale: 10, stroke: 0, pressure: 1, strength: 100, frequency: 15 },
];

/** WRC7 原版参数（adapterTriggerGames.json Id=83，反编译核对）。默认预设。 */
export const WRC7_PRESET: GripBindParams = paramsOf(GRIP_PRESETS[0]);

/** 取预设里的 7 个绑定字段（去掉 name/proc）。 */
export function paramsOf(p: GripBindParams): GripBindParams {
  return {
    bindType: p.bindType,
    filter: p.filter,
    scale: p.scale,
    stroke: p.stroke,
    pressure: p.pressure,
    strength: p.strength,
    frequency: p.frequency,
  };
}

const u8 = (n: number) => Math.max(0, Math.min(255, n | 0));

/** 拼一帧 cmd82 SyncWithGrip 的 data（不含 reportId）。 */
export function buildGripFrame(side: number, p: GripBindParams, reportLen: number): Uint8Array<ArrayBuffer> {
  const frame = [
    ...FRAME_MAGIC,
    CMD_SYNC_WITH_GRIP,
    0x0b,
    u8(side),
    u8(p.bindType),
    u8(p.filter),
    u8(p.scale),
    u8(p.stroke),
    u8(p.pressure),
    u8(p.strength),
    u8(p.frequency),
  ];
  const len = Math.max(reportLen, frame.length);
  const data = new Uint8Array(new ArrayBuffer(len));
  data.set(frame, 0);
  return data;
}

/** 解绑帧：bindType=0、各 param 归零（保留 filter/scale），对应 OnCloseGameVibMode。 */
export function unbindParams(p: GripBindParams): GripBindParams {
  return { bindType: 0, filter: p.filter, scale: p.scale, stroke: 0, pressure: 0, strength: 0, frequency: 0 };
}
