import { FLYDIGI_VID } from './hid/constants';

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
      if (this.index !== null) {
        const gp = navigator.getGamepads()[this.index];
        if (gp) {
          this.axes = Array.from(gp.axes);
          this.buttons = gp.buttons.map((b) => ({ pressed: b.pressed, value: b.value }));
        }
      }
      this.rafId = requestAnimationFrame(tick);
    };
    this.rafId = requestAnimationFrame(tick);
  }
}

export const gamepad = new GamepadReader();
