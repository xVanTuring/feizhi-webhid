<script lang="ts">
  import { controller } from '../controller.svelte';
  import { mapping } from '../mapping.svelte';
  import { ui } from '../ui.svelte';
  import Switch from '../ui/Switch.svelte';

  const slots = [0, 1, 2, 3];

  function selectSlot(i: number) {
    void mapping.selectSlot(i);
  }
</script>

<aside class="sidebar">
  <div class="brand">
    <svg viewBox="0 0 32 32" class="mark" aria-hidden="true">
      <path
        d="M16 2 L29 9.5 V22.5 L16 30 L3 22.5 V9.5 Z"
        fill="none"
        stroke="url(#bg)"
        stroke-width="1.6"
      />
      <path d="M9 13 L16 9 L23 13 M16 9 V21" stroke="url(#bg)" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round" />
      <defs>
        <linearGradient id="bg" x1="0" y1="0" x2="32" y2="32">
          <stop offset="0" stop-color="#5b9dff" />
          <stop offset="1" stop-color="#3b82f6" />
        </linearGradient>
      </defs>
    </svg>
    <div class="brand-txt">
      <div class="brand-title">八爪鱼<span>5</span></div>
      <div class="brand-sub">WebHID 配置台</div>
    </div>
  </div>

  <div class="scroll">
    <!-- 设备 / 连接 -->
    <section class="block">
      <div class="block-h">我的设备</div>
      <div class="device" class:on={controller.connected}>
        <div class="dev-glyph">🎮</div>
        <div class="dev-info">
          <div class="dev-name">{controller.connected ? controller.productName || '八爪鱼5' : '八爪鱼5 · APEX5'}</div>
          <div class="dev-state">
            <span class="dot" class:live={controller.connected}></span>
            {controller.connected ? '已连接' : '未连接'}
          </div>
        </div>
      </div>

      {#if !controller.supported}
        <div class="warn">浏览器不支持 WebHID，请用 Chrome / Edge。</div>
      {:else if controller.connected && !controller.hasCmdInterface}
        <div class="warn">未发现命令接口 — 手柄可能不在 NewXInput / 增强模式。</div>
      {/if}

      <div class="dev-actions">
        {#if controller.connected}
          <button class="btn btn-ghost full" onclick={() => controller.disconnect()}>断开连接</button>
        {:else}
          <button class="btn btn-primary full" disabled={!controller.supported || controller.connecting} onclick={() => controller.connect()}>
            {controller.connecting ? '连接中…' : '连接手柄'}
          </button>
        {/if}
      </div>
    </section>

    <!-- 配置档案（按键 / 体感） -->
    <section class="block">
      <div class="block-h">
        配置档案
        <span class="block-tag">按键 / 体感</span>
      </div>
      <div class="slots">
        {#each slots as i (i)}
          <button
            class="slot"
            class:on={mapping.cfgId === i}
            disabled={mapping.busy}
            onclick={() => selectSlot(i)}
          >
            <span class="slot-n">{i + 1}</span>
            <span class="slot-l">配置{i + 1}</span>
            {#if mapping.cfgId === i && mapping.dirty}<span class="slot-dirty" title="有未保存改动"></span>{/if}
          </button>
        {/each}
      </div>
      <div class="slot-actions">
        <button class="btn btn-ghost sm" disabled={!controller.connected || mapping.busy} onclick={() => mapping.read()}>
          读取
        </button>
        <button
          class="btn btn-primary sm"
          disabled={!controller.connected || !mapping.loaded || mapping.busy || !mapping.dirty}
          onclick={() => mapping.save()}
        >
          保存到手柄
        </button>
      </div>
      {#if mapping.status}
        <div class="status" class:bad={mapping.status.includes('失败')}>{mapping.status}</div>
      {/if}
    </section>
  </div>

  <!-- 底部：开发者模式 + 提示 -->
  <div class="foot">
    <label class="dev-toggle">
      <span>开发者模式</span>
      <Switch bind:checked={ui.devMode} label="开发者模式" />
    </label>
    <div class="hints note">
      需 <b>NewXInput / 增强模式</b> · 勿同开飞智空间站 · 跑在 <code>localhost</code> · VID <code>0x37D7</code>
    </div>
  </div>
</aside>

<style>
  .sidebar {
    display: flex;
    flex-direction: column;
    height: 100vh;
    position: sticky;
    top: 0;
    border-right: 1px solid var(--line);
    background: linear-gradient(180deg, rgba(19, 24, 38, 0.85), rgba(10, 13, 22, 0.7));
    backdrop-filter: blur(8px);
  }

  .brand {
    display: flex;
    align-items: center;
    gap: 11px;
    padding: 18px 18px 16px;
    border-bottom: 1px solid var(--line);
  }
  .mark {
    width: 34px;
    height: 34px;
    flex: none;
    filter: drop-shadow(0 0 10px var(--accent-glow));
  }
  .brand-title {
    font-family: var(--display);
    font-weight: 800;
    font-size: 19px;
    letter-spacing: 0.5px;
    line-height: 1.1;
  }
  .brand-title span {
    color: var(--accent-2);
  }
  .brand-sub {
    font-size: 11px;
    color: var(--muted);
    letter-spacing: 1.5px;
    text-transform: uppercase;
    font-family: var(--mono);
  }

  .scroll {
    flex: 1;
    overflow-y: auto;
    padding: 16px 14px;
    display: flex;
    flex-direction: column;
    gap: 20px;
  }

  .block-h {
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 1.5px;
    text-transform: uppercase;
    color: var(--muted);
    margin-bottom: 10px;
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .block-tag {
    font-size: 9.5px;
    font-weight: 600;
    letter-spacing: 0.5px;
    color: var(--accent-2);
    background: var(--accent-soft);
    border-radius: 5px;
    padding: 1px 6px;
    text-transform: none;
  }

  /* 设备卡 */
  .device {
    display: flex;
    align-items: center;
    gap: 11px;
    padding: 12px;
    border-radius: var(--radius-sm);
    background: var(--panel-2);
    border: 1px solid var(--line);
    transition: border-color 0.2s, box-shadow 0.2s;
  }
  .device.on {
    border-color: var(--accent-line);
    box-shadow: 0 0 0 1px var(--accent-soft), 0 6px 20px rgba(0, 0, 0, 0.35);
  }
  .dev-glyph {
    width: 38px;
    height: 38px;
    flex: none;
    border-radius: 9px;
    background: var(--inset);
    border: 1px solid var(--line-2);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 19px;
    filter: grayscale(0.3);
  }
  .device.on .dev-glyph {
    filter: none;
  }
  .dev-name {
    font-size: 13.5px;
    font-weight: 600;
    color: var(--text);
  }
  .dev-state {
    font-size: 11.5px;
    color: var(--muted-2);
    display: flex;
    align-items: center;
    gap: 6px;
    margin-top: 2px;
  }
  .dot {
    width: 7px;
    height: 7px;
    border-radius: 50%;
    background: var(--muted);
  }
  .dot.live {
    background: var(--ok);
    box-shadow: 0 0 8px var(--ok);
    animation: pulse 2s ease-in-out infinite;
  }
  @keyframes pulse {
    50% {
      opacity: 0.5;
    }
  }

  .warn {
    margin-top: 9px;
    font-size: 11.5px;
    color: var(--warn);
    background: var(--warn-bg);
    border: 1px solid rgba(251, 191, 36, 0.25);
    border-radius: 8px;
    padding: 7px 9px;
  }

  .dev-actions {
    margin-top: 10px;
  }
  .full {
    width: 100%;
  }

  /* 配置档位 */
  .slots {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 7px;
  }
  .slot {
    position: relative;
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 9px 10px;
    border-radius: 9px;
    background: var(--panel-2);
    border: 1px solid var(--line);
    color: var(--text-2);
    font-size: 12.5px;
    transition: border-color 0.15s, background 0.15s, color 0.15s;
  }
  .slot:hover:not(:disabled):not(.on) {
    border-color: var(--line-hi);
    color: var(--text);
  }
  .slot.on {
    border-color: var(--accent-line);
    background: var(--accent-soft);
    color: var(--text);
  }
  .slot-n {
    font-family: var(--mono);
    font-weight: 700;
    font-size: 13px;
    width: 18px;
    height: 18px;
    border-radius: 5px;
    background: var(--inset);
    display: grid;
    place-items: center;
    color: var(--muted-2);
  }
  .slot.on .slot-n {
    background: var(--accent);
    color: #fff;
  }
  .slot-dirty {
    position: absolute;
    top: 7px;
    right: 7px;
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: var(--warn);
    box-shadow: 0 0 6px var(--warn);
  }
  .slot-actions {
    display: flex;
    gap: 7px;
    margin-top: 9px;
  }
  .slot-actions .btn {
    flex: 1;
  }
  .btn.sm {
    padding: 7px 10px;
    font-size: 12.5px;
  }
  .status {
    margin-top: 9px;
    font-size: 11.5px;
    color: var(--ok);
  }
  .status.bad {
    color: var(--bad);
  }

  .foot {
    border-top: 1px solid var(--line);
    padding: 13px 16px 16px;
    display: flex;
    flex-direction: column;
    gap: 11px;
  }
  .dev-toggle {
    display: flex;
    align-items: center;
    justify-content: space-between;
    font-size: 12.5px;
    color: var(--text-2);
    cursor: pointer;
  }
  .hints {
    font-size: 10.5px;
    line-height: 1.7;
    color: var(--muted);
  }
  .hints b {
    color: var(--text-2);
    font-weight: 600;
  }
</style>
