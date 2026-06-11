// 全局 UI 状态：当前标签页 + 开发者模式开关。
// tab 与 URL hash 双向同步在 App.svelte 处理，这里只持有值。

export type TabId = 'trigger' | 'vibration' | 'buttons' | 'motion' | 'telemetry';

export const TAB_IDS: TabId[] = ['trigger', 'vibration', 'buttons', 'motion', 'telemetry'];

class UiState {
  tab = $state<TabId>('trigger');
  /** 开发者模式：展开报文/原始字节/日志等技术面板。 */
  devMode = $state(false);
}

export const ui = new UiState();
