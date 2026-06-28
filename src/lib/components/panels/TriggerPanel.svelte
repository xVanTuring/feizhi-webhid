<script lang="ts">
  import { controller } from '../../controller.svelte';
  import { ui } from '../../ui.svelte';
  import { buildTriggerFrame } from '../../hid/frame';
  import { byte2 } from '../../hid/util';
  import { MODE_ORDER, TRIGGER_MODES, TriggerMode, TriggerSide, defaultValues } from '../../hid/triggers';
  import Panel from '../../ui/Panel.svelte';
  import Segmented from '../../ui/Segmented.svelte';
  import Slider from '../../ui/Slider.svelte';
  import Switch from '../../ui/Switch.svelte';

  // —— 面板设置持久化：刷新后保留上次选择（侧/模式/参数/匹配/实时），不再重置回 Race ——
  const STORE_KEY = 'feizhi.trigger';
  type SavedTrigger = {
    side: TriggerSide;
    mode: TriggerMode;
    match: boolean;
    live: boolean;
    values: Record<string, number>;
  };
  function loadSaved(): SavedTrigger | null {
    try {
      const raw = localStorage.getItem(STORE_KEY);
      if (!raw) return null;
      const o = JSON.parse(raw) as Partial<SavedTrigger>;
      if (!o || typeof o !== 'object' || o.mode == null || !(o.mode in TRIGGER_MODES)) return null;
      return o as SavedTrigger;
    } catch {
      return null;
    }
  }
  const saved = loadSaved();
  const initMode = saved?.mode ?? TriggerMode.Race;

  let side = $state<TriggerSide>(saved?.side ?? TriggerSide.Left);
  let mode = $state<TriggerMode>(initMode);
  let match = $state(saved?.match ?? true);
  let live = $state(saved?.live ?? true);
  // 默认值打底，再覆盖已存值，避免旧数据缺键。
  let values = $state<Record<string, number>>({ ...defaultValues(initMode), ...(saved?.values ?? {}) });

  // 任一设置变化即写回 localStorage。
  $effect(() => {
    const data: SavedTrigger = { side, mode, match, live, values: { ...values } };
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify(data));
    } catch {
      /* 持久化失败不影响使用 */
    }
  });

  const modeDef = $derived(TRIGGER_MODES[mode]);
  const previewHex = $derived(
    Array.from(
      buildTriggerFrame({ mode, side, values, match, reportLen: controller.reportLen }).slice(0, 14),
      byte2,
    ).join(' '),
  );

  const SIDES = [
    { value: TriggerSide.Left, label: '左扳机' },
    { value: TriggerSide.Right, label: '右扳机' },
    { value: TriggerSide.Both, label: '双扳机' },
  ];

  let liveTimer = 0;
  function scheduleLive() {
    if (!live || !controller.connected) return;
    clearTimeout(liveTimer);
    liveTimer = window.setTimeout(() => controller.sendTrigger({ mode, side, values, match }), 40);
  }
  // 关掉「实时下发」时取消待发帧，避免关闭后仍多发一帧。
  function onLiveChange(v: boolean) {
    if (!v) clearTimeout(liveTimer);
  }
  function setMode(next: TriggerMode) {
    mode = next;
    values = defaultValues(next);
    scheduleLive();
  }
</script>

<Panel
  title="自适应扳机"
  desc="直接给手柄下发扳机效果（cmd81）。调参即时手感，无需游戏支持 —— 选侧、选模式、拖动参数即可。"
>
  <div class="grid">
    <div class="field">
      <span class="flabel">作用扳机</span>
      <Segmented bind:value={side} options={SIDES} onchange={scheduleLive} />
    </div>
    <div class="field">
      <span class="flabel">效果模式</span>
      <select value={mode} onchange={(e) => setMode(Number((e.currentTarget as HTMLSelectElement).value))}>
        {#each MODE_ORDER as m (m)}
          <option value={m}>{TRIGGER_MODES[m].name}</option>
        {/each}
      </select>
    </div>
  </div>

  <p class="hint">{modeDef.hint}</p>

  {#if modeDef.params.length}
    <div class="sliders">
      {#each modeDef.params as p (p.key)}
        <Slider label={p.label} min={p.min} max={p.max} bind:value={values[p.key]} oninput={scheduleLive} />
      {/each}
    </div>
  {/if}

  <div class="match">
    <div>
      <div class="match-t">匹配行程 matchStroke</div>
      <div class="match-d">效果区间随实际扳机行程缩放，手感更跟手。</div>
    </div>
    <Switch bind:checked={match} label="匹配行程" onchange={scheduleLive} />
  </div>

  <div class="actions">
    <button class="btn btn-primary" disabled={!controller.connected} onclick={() => controller.sendTrigger({ mode, side, values, match })}>
      下发效果
    </button>
    <button class="btn btn-ghost" disabled={!controller.connected} onclick={() => controller.release(side)}>
      释放扳机
    </button>
    <label class="live">
      <Switch bind:checked={live} label="拖动实时下发" onchange={onLiveChange} />
      <span>拖动实时下发</span>
    </label>
  </div>

  {#if !controller.connected}
    <div class="offline">未连接 — 连接手柄后即可下发。参数可先行调好。</div>
  {/if}

  {#if ui.devMode}
    <div class="frame">
      <div class="frame-h">下发帧 · cmd81</div>
      <code class="frame-hex">{byte2(controller.reportId)} | {previewHex} …</code>
      <div class="note frame-note">
        <code>reportId | 5A A5 | 51 | len | apply | side mode p1…</code>
        {#if side === TriggerSide.Both}· 双扳机拆为左右两帧（间隔 100ms）{/if}
      </div>
    </div>
  {/if}
</Panel>

<style>
  .grid {
    display: grid;
    grid-template-columns: auto 1fr;
    gap: 14px 28px;
    align-items: center;
    margin-bottom: 14px;
  }
  .field {
    display: contents;
  }
  .flabel {
    font-size: 13px;
    color: var(--text-2);
    font-weight: 600;
  }
  .field select {
    justify-self: start;
    min-width: 220px;
  }
  /* 分段控件作为 1fr 网格项会被拉伸成满宽空框，让它只占内容宽度并左对齐。 */
  .grid :global(.seg) {
    justify-self: start;
  }
  .hint {
    margin: 0 0 18px;
    font-size: 12.5px;
    color: var(--muted-2);
    padding: 9px 12px;
    background: var(--panel-2);
    border-left: 2px solid var(--accent);
    border-radius: 0 8px 8px 0;
  }
  .sliders {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
    gap: 18px 28px;
    margin-bottom: 18px;
  }
  .match {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
    padding: 12px 14px;
    background: var(--panel-2);
    border: 1px solid var(--line);
    border-radius: var(--radius-sm);
    margin-bottom: 18px;
  }
  .match-t {
    font-size: 13px;
    font-weight: 600;
    color: var(--text);
  }
  .match-d {
    font-size: 11.5px;
    color: var(--muted-2);
    margin-top: 2px;
  }
  .actions {
    display: flex;
    align-items: center;
    gap: 12px;
    flex-wrap: wrap;
  }
  .live {
    display: inline-flex;
    align-items: center;
    gap: 9px;
    font-size: 12.5px;
    color: var(--text-2);
    cursor: pointer;
    margin-left: 2px;
  }
  .offline {
    margin-top: 12px;
    font-size: 12px;
    color: var(--muted);
  }
  .frame {
    margin-top: 18px;
    padding-top: 16px;
    border-top: 1px dashed var(--line-2);
  }
  .frame-h {
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 1px;
    text-transform: uppercase;
    color: var(--muted);
    margin-bottom: 8px;
  }
  .frame-hex {
    display: block;
    color: var(--accent-2);
    font-size: 13px;
    padding: 10px 12px;
    word-break: break-all;
  }
  .frame-note {
    margin-top: 8px;
  }
</style>
