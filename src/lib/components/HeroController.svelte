<script lang="ts">
  import { controller } from '../controller.svelte';
  import { gamepad } from '../gamepad.svelte';
  import { mapping } from '../mapping.svelte';
  import { ui } from '../ui.svelte';
  import { decodePad, pickGamepadReport } from '../hid/decode';
  import { ControllerKey, KEY_LABELS } from '../hid/config';
  import ControllerView from './ControllerView.svelte';

  // 输入源：原始映射开启 → NewXInput(全物理键，独占)；否则 → Gamepad API(基础)。
  const target = $derived(pickGamepadReport(controller.reports));
  const webhidPad = $derived(target ? decodePad(target) : null);
  const pad = $derived(controller.rawInputActive ? webhidPad : gamepad.pad);

  // 映射模式：在「按键」标签且已读取配置时，手柄图变为可点选的映射选择面。
  const mapMode = $derived(ui.tab === 'buttons' && mapping.loaded);
  const selLabel = $derived(mapping.selectedKey != null ? KEY_LABELS[mapping.selectedKey] : null);
  const pick = (key: ControllerKey) => mapping.selectKey(key);

  const formatBadge = $derived.by(() => {
    if (!controller.connected) return null;
    if (!pad) return '未识别输入';
    if (pad.protocol === 'newxinput') return '原始映射 · 物理全键';
    if (pad.protocol === 'gamepad') return '基础 · 系统手柄';
    return pad.protocol.toUpperCase();
  });

  const pressed = $derived(pad ? pad.buttons.filter((x) => x.pressed) : []);

  function toggleRaw() {
    controller.rawInputActive ? controller.disableRawInput() : controller.enableRawInput();
  }
</script>

<div class="hero">
  <div class="glow"></div>

  <div class="hero-top">
    <div class="ht-left">
      <span class="ht-title">实时输入</span>
      {#if formatBadge}
        <span class="badge" class:live={pad && controller.rawInputActive} class:basic={pad && !controller.rawInputActive}>
          {formatBadge}
        </span>
      {/if}
    </div>
    {#if controller.connected}
      <button class="raw-btn" class:on={controller.rawInputActive} onclick={toggleRaw}>
        <span class="raw-dot"></span>
        {controller.rawInputActive ? '原始映射 · 开' : '开启原始映射'}
      </button>
    {/if}
  </div>

  <div class="stage" class:mapping={mapMode}>
    <ControllerView
      {pad}
      interactive={mapMode}
      mappings={mapMode ? mapping.mappings : {}}
      selected={mapMode ? mapping.selectedKey : null}
      onpick={pick}
    />
    {#if !mapMode}
      {#if !controller.connected}
        <div class="overlay">
          <div class="ov-icon">🎮</div>
          <div class="ov-text">连接手柄后，按键 / 摇杆 / 扳机将在此实时点亮</div>
        </div>
      {:else if !pad}
        <div class="overlay subtle">
          <div class="ov-text">
            基础模式未识别此手柄（macOS Chrome 常见）。点上方<b>「开启原始映射」</b>读取全部物理键（含 M1-M6）。
          </div>
        </div>
      {/if}
    {/if}
  </div>

  <div class="keys">
    {#if mapMode}
      {#if selLabel}
        <span class="map-hint sel">已选中 <b>{selLabel}</b> — 在下方设置映射目标</span>
      {:else}
        <span class="map-hint">点击手柄上的按键来设置映射 · 已映射的按键会高亮并显示目标</span>
      {/if}
    {:else if pressed.length}
      {#each pressed as x (x.name)}
        <span class="chip">{x.name}</span>
      {/each}
    {:else if controller.connected && pad}
      <span class="keys-empty">等待按键…</span>
    {/if}
  </div>
</div>

<style>
  .hero {
    position: relative;
    border: 1px solid var(--line);
    border-radius: var(--radius);
    background: linear-gradient(180deg, rgba(15, 19, 32, 0.6), rgba(9, 11, 19, 0.4));
    padding: 16px 18px 18px;
    overflow: hidden;
  }
  .glow {
    position: absolute;
    top: -40%;
    left: 50%;
    width: 620px;
    height: 480px;
    transform: translateX(-50%);
    background: radial-gradient(closest-side, rgba(59, 130, 246, 0.16), transparent 70%);
    pointer-events: none;
  }

  .hero-top {
    position: relative;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
    margin-bottom: 6px;
  }
  .ht-left {
    display: flex;
    align-items: center;
    gap: 10px;
  }
  .ht-title {
    font-size: 13px;
    font-weight: 700;
    letter-spacing: 1px;
    color: var(--muted);
    text-transform: uppercase;
  }
  .badge {
    font-size: 11px;
    font-weight: 600;
    font-family: var(--mono);
    padding: 2px 9px;
    border-radius: 6px;
    background: var(--inset);
    border: 1px solid var(--line-2);
    color: var(--muted-2);
  }
  .badge.live {
    color: var(--ok);
    border-color: rgba(52, 211, 153, 0.4);
    background: var(--ok-bg);
  }
  .badge.basic {
    color: var(--accent-2);
    border-color: var(--accent-line);
    background: var(--accent-soft);
  }

  .raw-btn {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    font-size: 12.5px;
    font-weight: 600;
    padding: 7px 13px;
    border-radius: 9px;
    border: 1px solid var(--line-2);
    background: var(--panel-hi);
    color: var(--text-2);
    transition: all 0.15s;
  }
  .raw-btn:hover {
    border-color: var(--line-hi);
    color: var(--text);
  }
  .raw-btn.on {
    border-color: rgba(52, 211, 153, 0.45);
    background: var(--ok-bg);
    color: var(--ok);
  }
  .raw-dot {
    width: 7px;
    height: 7px;
    border-radius: 50%;
    background: var(--muted);
  }
  .raw-btn.on .raw-dot {
    background: var(--ok);
    box-shadow: 0 0 8px var(--ok);
  }

  .stage {
    position: relative;
    display: flex;
    justify-content: center;
    padding: 6px 0 4px;
  }
  .stage :global(.wrap) {
    max-width: 440px;
  }
  .overlay {
    position: absolute;
    inset: 0;
    pointer-events: none;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 10px;
    text-align: center;
    padding: 20px;
    background: radial-gradient(closest-side, rgba(7, 9, 16, 0.72), rgba(7, 9, 16, 0.4));
    backdrop-filter: blur(1.5px);
  }
  .overlay.subtle {
    background: none;
    backdrop-filter: none;
    align-items: flex-end;
    justify-content: flex-end;
  }
  .ov-icon {
    font-size: 34px;
    opacity: 0.5;
    filter: grayscale(0.5);
  }
  .ov-text {
    font-size: 12.5px;
    color: var(--muted-2);
    max-width: 340px;
  }
  .overlay.subtle .ov-text {
    background: var(--panel-2);
    border: 1px solid var(--line);
    border-radius: 9px;
    padding: 9px 12px;
  }
  .ov-text b {
    color: var(--accent-2);
  }

  .keys {
    position: relative;
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    justify-content: center;
    min-height: 26px;
    margin-top: 4px;
  }
  .chip {
    font-family: var(--mono);
    font-size: 12px;
    font-weight: 600;
    padding: 3px 11px;
    border-radius: 999px;
    background: linear-gradient(180deg, var(--accent-2), var(--accent));
    color: #fff;
    box-shadow: 0 2px 10px rgba(59, 130, 246, 0.35);
    animation: fade-up 0.12s ease;
  }
  .keys-empty {
    font-size: 11.5px;
    color: var(--muted);
    align-self: center;
  }
  .map-hint {
    font-size: 12px;
    color: var(--muted-2);
    align-self: center;
  }
  .map-hint.sel {
    color: var(--accent-2);
  }
  .map-hint b {
    font-family: var(--mono);
    font-weight: 700;
    color: var(--accent-2);
  }
</style>
