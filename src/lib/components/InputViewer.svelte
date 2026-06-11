<script lang="ts">
  import { controller } from '../controller.svelte';
  import { gamepad } from '../gamepad.svelte';
  import { decodePad, pickGamepadReport } from '../hid/decode';
  import { byte2 } from '../hid/util';
  import ControllerView from './ControllerView.svelte';

  let pick = $state<'auto' | number>('auto');

  const target = $derived.by(() => {
    if (pick === 'auto') return pickGamepadReport(controller.reports);
    return controller.reports.find((r) => r.reportId === pick) ?? null;
  });
  const webhidPad = $derived(target ? decodePad(target) : null);
  // 原始映射开启 → NewXInput（全物理键，独占）；否则 → Gamepad API（基础，映射后标准键）
  const pad = $derived(controller.rawInputActive ? webhidPad : gamepad.pad);

  const formatBadge = $derived.by(() => {
    if (!pad) return null;
    if (pad.protocol === 'gamepad') return `基础 · Gamepad API（${gamepad.mapping || '?'}）`;
    if (pad.protocol === 'newxinput') return `原始映射 · NewXInput · 物理键`;
    if (pad.protocol === 'xinput') return `XInput · ID ${byte2(pad.reportId)}`;
    return `RAW · ID ${byte2(pad.reportId)}`;
  });
  const decoded = $derived(
    pad?.protocol === 'newxinput' || pad?.protocol === 'gamepad' || pad?.protocol === 'xinput',
  );
</script>

<div class="card">
  <h2>手柄输入</h2>

  {#if controller.connected}
    <div class="row" style="margin-top:0; margin-bottom:6px">
      <button
        class="toggle"
        class:on={controller.rawInputActive}
        onclick={() =>
          controller.rawInputActive ? controller.disableRawInput() : controller.enableRawInput()}
      >
        {controller.rawInputActive ? '✓ 原始映射开启中' : '开启原始映射'}
      </button>
      {#if formatBadge}
        <span class="badge" class:xinput={decoded}>{formatBadge}</span>
      {/if}
    </div>
    <div class="hint" style="margin-bottom:10px">
      基础模式走系统手柄（Gamepad API，映射后标准键）；原始映射读 M1-M6 等飞智键，需独占（开启时系统/游戏暂收不到该手柄）
    </div>
  {/if}

  <!-- 解码源选择（仅原始映射下有意义） -->
  {#if controller.connected && controller.rawInputActive && controller.reports.length > 0}
    <div class="row" style="margin-top:0; margin-bottom:10px">
      <span class="f">解码源</span>
      <select bind:value={pick}>
        <option value="auto">自动</option>
        {#each controller.reports as r (r.reportId)}
          <option value={r.reportId}>ID {byte2(r.reportId)}（{r.bytes.length} 字节）</option>
        {/each}
      </select>
    </div>
  {/if}

  <!-- 连接提示：基础模式没识别到手柄时，引导开启原始映射 -->
  {#if controller.connected && !pad}
    <div class="note" style="margin-bottom:8px">
      ⚠ 基础模式（Gamepad API）未识别此手柄（macOS Chrome 常见）。点上方
      <b>「开启原始映射」</b>经飞智通道读取<b>全部物理键（含 M1-M6）</b>。
    </div>
  {/if}

  <!-- 控制器贴图视图（始终显示，断连时所有指示灯熄灭） -->
  <ControllerView {pad} />

  <!-- 所有按下的键（含 ControllerView 没画的 M1-M4/C/Z 等） -->
  {#if pad}
    <div class="keys">
      {#each pad.buttons.filter((x) => x.pressed) as x (x.name)}
        <span class="chip">{x.name}</span>
      {/each}
      {#if !pad.buttons.some((x) => x.pressed)}<span class="hint">（无按键按下）</span>{/if}
    </div>
  {/if}

  <!-- 未连接时的提示覆盖 -->
  {#if !controller.connected}
    <div class="overlay-hint note">未连接 — 连接后指示灯实时亮起</div>
  {/if}

  <div class="secondary note">
    Gamepad API：{gamepad.connected ? `${gamepad.id}（${gamepad.mapping}）` : '未识别此设备（macOS 上 Chrome 仅识别已知厂商手柄，属正常）'}
  </div>
</div>

<style>
  .badge {
    font-size: 11px;
    font-family: var(--mono);
    padding: 2px 8px;
    border-radius: 4px;
    background: var(--card-2);
    border: 1px solid var(--border-2);
    color: var(--muted-2);
  }
  .badge.xinput {
    background: #1a2d1a;
    border-color: #3c8c3c;
    color: #5fd98a;
  }
  .overlay-hint {
    text-align: center;
    margin-top: 4px;
    opacity: 0.5;
  }
  .toggle {
    font-size: 13px;
    padding: 6px 12px;
  }
  .toggle.on {
    background: #1a2d1a;
    border-color: #3c8c3c;
    color: #5fd98a;
  }
  .hint {
    font-size: 11px;
    color: var(--muted);
  }
  .keys {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    margin-top: 10px;
  }
  .chip {
    font-size: 12px;
    font-family: var(--mono);
    padding: 3px 9px;
    border-radius: 10px;
    background: #1d4ed8;
    color: #dbeafe;
  }
  .secondary {
    margin-top: 12px;
    padding-top: 10px;
    border-top: 1px solid var(--border);
  }
</style>
