// 全局 UI 状态：当前标签页 + 开发者模式开关。
// tab 与 URL hash 双向同步在 App.svelte 处理，这里只持有值。

export type TabId = 'trigger' | 'vibration' | 'buttons' | 'motion' | 'telemetry';

export const TAB_IDS: TabId[] = ['trigger', 'vibration', 'buttons', 'motion', 'telemetry'];

const DEV_MODE_KEY = 'feizhi.devMode';

function loadDevMode(): boolean {
  try {
    return localStorage.getItem(DEV_MODE_KEY) === '1';
  } catch {
    return false; // localStorage 不可用（隐私模式等）时退默认
  }
}

class UiState {
  tab = $state<TabId>('trigger');
  /** 开发者模式：展开报文/原始字节/日志等技术面板。读自 localStorage，跨刷新保留。 */
  #devMode = $state(loadDevMode());

  get devMode(): boolean {
    return this.#devMode;
  }
  set devMode(v: boolean) {
    this.#devMode = v;
    try {
      localStorage.setItem(DEV_MODE_KEY, v ? '1' : '0');
    } catch {
      /* 持久化失败不影响当前会话 */
    }
  }
}

export const ui = new UiState();
