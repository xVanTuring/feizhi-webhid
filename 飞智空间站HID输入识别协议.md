# 飞智空间站 USB HID 原始输入识别协议

来源：反编译 Flydigi.Hid.dll / SpaceStationService.dll + WebHID 真机抓包验证。

---

## 1. 设备枚举

飞智八爪鱼5（K5）dongle 以 **VID=0x37D7, PID=0x2501** 接入系统。

- Windows：`Flydigi.Hid.dll` 通过 `HidD_GetHidGuid` + `SetupDiEnumDeviceInterfaces` 枚举，再按 VID 过滤
- WebHID：`navigator.hid.requestDevice({ filters: [{ vendorId: 0x37D7 }] })`
- Linux：xpad 驱动按 VID+PID 识别为 Xbox 360 兼容设备

---

## 2. 双 Collection 架构

设备暴露两个 HID Collection，WebHID 侧可同时打开两者：

| Collection | UsagePage | 方向   | 用途 |
|-----------|-----------|--------|------|
| Generic Desktop | **0x0001** | Input  | 游戏手柄输入（XInput 兼容格式） |
| Vendor Specific | **0xFFA0** | Output | 扳机效果/震动绑定/固件配置命令 |

> WebHID 里这两个 collection 可能是不同的 `HIDDevice` 实例，必须全部 `open()` 才能既收输入又发命令。

---

## 3. 输入报文字节布局（XInput 兼容）

reportId 不含在 `e.data.buffer` 中（WebHID 规范），下表为 buffer 内偏移：

```
偏移  字段        宽度  取值范围         说明
────────────────────────────────────────────────────────────
 0   header_0    1 B   0x00            XInput 头，填充/状态字节
 1   header_1    1 B   0x14 (=20)      XInput 头，报文有效段长度标识
 2   btn_byte1   1 B   bit field       按键组1（见 §4）
 3   btn_byte2   1 B   bit field       按键组2（见 §4）
 4   LT          1 B   0~255           左扳机，线性值
 5   RT          1 B   0~255           右扳机，线性值
 6~7  LX         2 B   int16 LE        左摇杆水平（-32768~32767）
 8~9  LY         2 B   int16 LE        左摇杆垂直（XInput 向上为正）
10~11 RX         2 B   int16 LE        右摇杆水平
12~13 RY         2 B   int16 LE        右摇杆垂直
14+  (扩展字节)   -     设备特定        电量、陀螺仪、触摸板等（可选解析）
```

### 头部判定与偏移

`decodeXInput()` 先探测是否有 `00 14` 头部：
- `bytes[0] === 0x00 && bytes[1] === 0x14` → **offset = 2**，数据从 byte2 起读
- 否则 → **offset = 0**，从 byte0 直接读（部分接口/固件版本不带头）

---

## 4. 按键位编码

### btn_byte1（offset+0）

| Bit | 按键 | 说明 |
|-----|------|------|
| 0 | D-pad ↑ | 方向键上 |
| 1 | D-pad ↓ | 方向键下 |
| 2 | D-pad ← | 方向键左 |
| 3 | D-pad → | 方向键右 |
| 4 | Start / Menu | 开始键 |
| 5 | Back / View | 返回键 |
| 6 | L3 | 左摇杆按下 |
| 7 | R3 | 右摇杆按下 |

### btn_byte2（offset+1）

| Bit | 按键 | 说明 |
|-----|------|------|
| 0 | LB | 左肩键 |
| 1 | RB | 右肩键 |
| 2 | Home / Guide | 飞智键（中央按键） |
| 3 | (保留) | XInput 未定义 |
| 4 | A | 面键 A（绿） |
| 5 | B | 面键 B（红） |
| 6 | X | 面键 X（蓝） |
| 7 | Y | 面键 Y（黄） |

---

## 5. 输入报文自动识别逻辑（pickGamepadReport）

WebHID 连接后可能同时收到多个 reportId 的报文。识别优先级：

1. **XInput 头部匹配**：`bytes[1] === 0x14 && length >= 14` → 确定是手柄输入报文
2. **长度匹配**：`length >= 20` → 覆盖完整摇杆数据，很可能是手柄输入
3. **兜底**：取所有报文中最长的一条

---

## 6. 轴值归一化

| 字段 | 原始类型 | 归一化公式 | 输出范围 |
|------|---------|-----------|---------|
| LT / RT | uint8 (0~255) | `raw / 255` | 0.0 ~ 1.0 |
| LX / RX | int16 LE | `clamp(raw / 32767, -1, 1)` | -1.0 ~ 1.0 |
| LY / RY | int16 LE | `-(clamp(raw / 32767, -1, 1))` | -1.0 ~ 1.0（转屏幕坐标系，下为正）|

---

## 7. 命令下发格式（Output Report）

走 0xFFA0 collection 的 outputReport（默认 reportId=0x03，31 字节，连接时按设备自动校正）：

```
[reportId]  5A A5  [cmd]  [payload_len]  [payload…]  [padding to reportLen]
```

| cmd  | 名称 | 用途 |
|------|------|------|
| 0x51 (81) | SetForceTrigger | 自适应扳机效果（mode + 参数） |
| 0x52 (82) | SyncWithGrip | 固件托管 XInput rumble → 扳机耦合 |

cmd=0x51 payload（10 字节）：
```
01(apply)  side(L=01/R=02)  mode  p1 p2 p3 p4 p5 p6 p7
```

cmd=0x52 payload（11 字节）：
```
01(apply)  side  bindType  filter  scale  stroke  pressure  strength  freq  reserved×2
```

---

## 8. WebHID 输入流水线

```
设备 USB 帧
  ↓
HIDInputReportEvent  {reportId, data: DataView}
  ↓ handleInput()
差分计算 changed[] (与上帧逐字节对比，用于 UI 高亮)
  ↓
rawBuf: Map<reportId, ReportSnapshot>   (非响应式，高频安全)
  ↓  rAF 批量刷新（避免高频输入压垮 Svelte 响应式）
reports: ReportSnapshot[]   ($state，驱动 UI 更新)
  ↓
pickGamepadReport()  →  选最佳 reportId
  ↓
decodeXInput()  →  探测头部 → offset → 解析按键/扳机/摇杆
  ↓
DecodedPad  {hasXInputHeader, offset, buttons[], lt, rt, lx, ly, rx, ry}
  ↓
InputViewer.svelte 渲染
```

---

## 9. 已知 reportId 分配（K5 dongle，firmware 参考值）

| reportId | 方向   | 内容 |
|---------|--------|------|
| 0x01    | Input  | 通常为手柄 XInput 报文（部分固件版本） |
| 0x03    | Input + Output | dongle 模式主 reportId；输出命令也走此 ID |
| 其他    | Input  | 扩展功能（陀螺仪/触摸/电量）按需解析 |

命令接口检测：`device.collections.some(c => c.usagePage === 0xFFA0)`；
若未检测到，手柄可能处于 Standard（非 NewXInput/增强）模式，无法接收 cmd 81/82。
