import { FLYDIGI_VID } from './hid/constants';
import type { DecodedPad } from './hid/decode';

// 标准映射（Standard Gamepad）按钮索引 → 名称，用于解码视图。
// 八爪鱼5 在 XInput 模式下走标准映射；非标准映射时退化为按序号展示。
export const STANDARD_BUTTON_NAMES = [
  'A', 'B', 'X', 'Y',
  'LB', 'RB', 'LT', 'RT',
  'Back', 'Start', 'L3', 'R3',
  '↑', '↓', '←', '→',
  'Home',
];

export interface PadButton {
  pressed: boolean;
  value: number;
}

const vidHex = FLYDIGI_VID.toString(16).padStart(4, '0');

class GamepadReader {
  connected = $state(false);
  id = $state('');
  index = $state<number | null>(null);
  mapping = $state('');
  axes = $state<number[]>([]);
  buttons = $state<PadButton[]>([]);

  private rafId = 0;
  private running = false;
  private readonly onConnect = (e: GamepadEvent) => this.adopt(e.gamepad);
  private readonly onDisconnect = (e: GamepadEvent) => {
    if (this.index === e.gamepad.index) this.reset();
  };

  /** 开始监听并轮询手柄状态（需在浏览器环境调用）。 */
  start(): void {
    if (this.running || typeof navigator.getGamepads !== 'function') return;
    this.running = true;
    window.addEventListener('gamepadconnected', this.onConnect);
    window.addEventListener('gamepaddisconnected', this.onDisconnect);
    // 已连接的手柄不会补发 connected 事件，先扫一遍。
    for (const gp of navigator.getGamepads()) {
      if (gp) this.adopt(gp);
    }
    this.loop();
  }

  stop(): void {
    this.running = false;
    window.removeEventListener('gamepadconnected', this.onConnect);
    window.removeEventListener('gamepaddisconnected', this.onDisconnect);
    if (this.rafId) cancelAnimationFrame(this.rafId);
    this.rafId = 0;
    this.reset();
  }

  buttonName(i: number): string {
    if (this.mapping === 'standard') return STANDARD_BUTTON_NAMES[i] ?? `B${i}`;
    return `B${i}`;
  }

  /**
   * 解码成 DecodedPad（基础模式：映射后的标准手柄）。
   * 标准映射下 LT/RT 是模拟按钮(索引 6/7 的 value)，摇杆在 axes[0..3]，Y 已是“下为正”。
   * 不含飞智专属键 M1-M6（标准手柄没有）。
   */
  get pad(): DecodedPad | null {
    if (!this.connected) return null;
    const pressed = (i: number) => this.buttons[i]?.pressed ?? false;
    return {
      reportId: -1,
      protocol: 'gamepad',
      offset: 0,
      hasXInputHeader: false,
      buttons: STANDARD_BUTTON_NAMES.map((name, i) => ({ name, pressed: pressed(i) })),
      lt: this.buttons[6]?.value ?? 0,
      rt: this.buttons[7]?.value ?? 0,
      lx: this.axes[0] ?? 0,
      ly: this.axes[1] ?? 0,
      rx: this.axes[2] ?? 0,
      ry: this.axes[3] ?? 0,
    };
  }

  private adopt(gp: Gamepad): void {
    // 优先认飞智设备；否则认第一个出现的。
    if (this.index !== null && !gp.id.toLowerCase().includes(vidHex)) return;
    this.index = gp.index;
    this.id = gp.id;
    this.mapping = gp.mapping;
    this.connected = true;
  }

  private reset(): void {
    this.connected = false;
    this.index = null;
    this.id = '';
    this.mapping = '';
    this.axes = [];
    this.buttons = [];
  }

  private loop(): void {
    const tick = () => {
      if (!this.running) return;
      // 未锁定手柄时主动扫描：原始映射独占释放后，系统常不补发 gamepadconnected，
      // 死等事件会一直无响应；这里每帧轮询，手柄一旦重新出现就自动接管。
      if (this.index === null) {
        const gps = navigator.getGamepads();
        const pick = gps.find((g) => g?.id.toLowerCase().includes(vidHex)) ?? gps.find((g) => g);
        if (pick) this.adopt(pick);
      }
      if (this.index !== null) {
        const gp = navigator.getGamepads()[this.index];
        if (gp) {
          this.axes = Array.from(gp.axes);
          this.buttons = gp.buttons.map((b) => ({ pressed: b.pressed, value: b.value }));
        } else {
          // 手柄消失（被独占/拔出），重置以便下一帧重新扫描恢复。
          this.reset();
        }
      }
      this.rafId = requestAnimationFrame(tick);
    };
    this.rafId = requestAnimationFrame(tick);
  }
}

export const gamepad = new GamepadReader();
