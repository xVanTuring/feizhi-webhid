// 飞智八爪鱼5 (k5) HID 协议常量。来源：反编译 Flydigi.Hid.dll / SpaceStationService.dll（见根目录《飞智自适应扳机分析.md》§7、§9）。

/** 飞智厂商 VID（八爪鱼5 / Apex5 / Vader5 dongle 共用） */
export const FLYDIGI_VID = 0x37d7;

/** 八爪鱼5 dongle PID（仅用于信息展示，过滤用 VID 即可） */
export const FLYDIGI_PID_K5 = 0x2501;

/** 厂商命令接口的 usage page。命令/配置/扳机全走这个接口的 output report。 */
export const USAGE_PAGE_CMD = 0xffa0;

/** 标准游戏手柄 usage page（Generic Desktop），输入报文从这里来。 */
export const USAGE_PAGE_GENERIC = 0x0001;

/** cmd 81 (0x51)：设置自适应扳机效果。 */
export const CMD_FORCE_TRIGGER = 81;

/** cmd 82 (0x52)：SyncWithGrip，固件托管 rumble→扳机（内置震动型）。 */
export const CMD_SYNC_WITH_GRIP = 82;

/** 帧头魔数。 */
export const FRAME_MAGIC = [0x5a, 0xa5] as const;

/** 默认输出报文 ID（连接后按设备 collections 自动校正）。 */
export const DEFAULT_REPORT_ID = 0x03;

/** 默认报文长度（字节），连接后按设备自动校正。 */
export const DEFAULT_REPORT_LEN = 31;
