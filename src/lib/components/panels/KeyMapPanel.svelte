<script lang="ts">
  import { controller } from '../../controller.svelte';
  import { mapping } from '../../mapping.svelte';
  import { ContinuousEnable, ControllerKey, KEY_LABELS, MAPPABLE_KEYS, type KeyMapping } from '../../hid/config';
  import Panel from '../../ui/Panel.svelte';
  import Segmented from '../../ui/Segmented.svelte';

  // 手柄图上画不出的键，放这里当 chip 选择（与 ControllerView 的 HIT 表互补）。
  const OFF_KEYS = [ControllerKey.Menu, ControllerKey.Turbo, ControllerKey.Back, ControllerKey.C, ControllerKey.Z];

  const MODE_OPTS = [
    { value: 'key', label: '单键' },
    { value: 'turbo', label: '连发' },
  ];
  const ENABLE_OPTS = [
    { v: ContinuousEnable.Press, label: '按住连发' },
    { v: ContinuousEnable.Click, label: '单击切换' },
  ];

  const sel = $derived(mapping.selectedKey);
  const cur = $derived(sel != null ? mapping.mappings[sel] : undefined);
  const readonly = $derived(cur?.kind === 'macro' || cur?.kind === 'special');
  const mapped = $derived(MAPPABLE_KEYS.filter((k) => mapping.mappings[k] && mapping.mappings[k].kind !== 'none'));

  // 编辑器本地状态，仅在「选中键变化」时从当前映射回填，避免与用户输入打架。
  let mode = $state<'key' | 'turbo'>('key');
  let target = $state<number>(255); // 255 = 未选目标
  let enable = $state<ContinuousEnable>(ContinuousEnable.Press);
  let freq = $state(12);
  let lastSel: ControllerKey | null = null;

  $effect(() => {
    const k = mapping.selectedKey;
    if (k === lastSel) return;
    lastSel = k;
    const c = k != null ? mapping.mappings[k] : undefined;
    if (c?.kind === 'turbo') {
      mode = 'turbo';
      target = c.target;
      enable = c.enable;
      freq = c.freq;
    } else if (c?.kind === 'key') {
      mode = 'key';
      target = c.target;
    } else {
      mode = 'key';
      target = 255;
      enable = ContinuousEnable.Press;
      freq = 12;
    }
  });

  function commit() {
    if (sel == null) return;
    if (target === 255) {
      mapping.clearMapping(sel);
    } else if (mode === 'turbo') {
      mapping.setMapping(sel, { kind: 'turbo', target, enable, freq });
    } else {
      mapping.setMapping(sel, { kind: 'key', target });
    }
  }

  function shortTarget(m: KeyMapping): string {
    if (m.kind === 'key' || m.kind === 'turbo') return KEY_LABELS[m.target] ?? '';
    if (m.kind === 'macro') return '宏';
    if (m.kind === 'special') return 'KB';
    return '';
  }
  function describe(m: KeyMapping): string {
    if (m.kind === 'turbo') return `连发 → ${KEY_LABELS[m.target]} · ${m.freq}/s`;
    if (m.kind === 'key') return KEY_LABELS[m.target] ?? '';
    if (m.kind === 'macro') return '宏（只读）';
    if (m.kind === 'special') return '键盘 / 多功能（只读）';
    return '';
  }
</script>

<Panel title="按键映射" desc="点击上方手柄图上的按键、或直接在手柄上按下来选择，再设置映射。已映射的键会在手柄上高亮显示目标。">
  {#if !mapping.loaded}
    <div class="empty">
      <div class="empty-icon">🎛️</div>
      <div class="empty-t">尚未读取配置</div>
      <div class="empty-d">在左侧「配置档案」选择档位，点「读取」载入当前手柄配置后即可编辑。</div>
      <button class="btn btn-primary" disabled={!controller.connected || mapping.busy} onclick={() => mapping.read()}>
        读取配置档 {mapping.cfgId + 1}
      </button>
    </div>
  {:else}
    <!-- 选中键的映射编辑条 -->
    <div class="editor" class:active={sel != null}>
      {#if sel == null}
        <span class="ehint">未选择按键 — 点击上方手柄图上任意按键，或在手柄上按下该键。</span>
      {:else if readonly}
        <span class="ekey">{KEY_LABELS[sel]}</span>
        <span class="ro">{cur?.kind === 'macro' ? '宏映射' : '键盘 / 多功能映射'} — 本工具暂只读（数据存于独立区域）</span>
        <button class="btn btn-ghost sm" disabled={mapping.busy} onclick={() => mapping.clearMapping(sel)}>清除</button>
      {:else}
        <span class="ekey">{KEY_LABELS[sel]}</span>
        <Segmented value={mode} options={MODE_OPTS} onchange={(m) => { mode = m as 'key' | 'turbo'; commit(); }} />
        <select value={target} onchange={(e) => { target = Number((e.currentTarget as HTMLSelectElement).value); commit(); }} disabled={mapping.busy}>
          <option value={255}>不映射（默认）</option>
          {#each MAPPABLE_KEYS as to (to)}
            {#if to !== sel}<option value={to}>{KEY_LABELS[to]}</option>{/if}
          {/each}
        </select>
        {#if mode === 'turbo'}
          <select value={enable} onchange={(e) => { enable = Number((e.currentTarget as HTMLSelectElement).value); commit(); }} disabled={target === 255}>
            {#each ENABLE_OPTS as o (o.v)}<option value={o.v}>{o.label}</option>{/each}
          </select>
          <label class="freq">
            <input type="number" min="1" max="30" bind:value={freq} oninput={commit} disabled={target === 255} />
            次/秒
          </label>
        {/if}
        <button class="btn btn-ghost sm" disabled={target === 255 || mapping.busy} onclick={() => { target = 255; commit(); }}>清除</button>
      {/if}
    </div>

    <!-- 手柄图上没有的功能键 -->
    <div class="section">
      <h3>其它功能键</h3>
      <div class="chips">
        {#each OFF_KEYS as k (k)}
          {@const m = mapping.mappings[k]}
          <button
            class="kchip"
            class:on={sel === k}
            class:mapped={m && m.kind !== 'none'}
            disabled={mapping.busy}
            onclick={() => mapping.selectKey(k)}
          >
            {KEY_LABELS[k]}
            {#if m && m.kind !== 'none'}<span class="kt">→ {shortTarget(m)}</span>{/if}
          </button>
        {/each}
      </div>
    </div>

    <!-- 当前所有自定义映射 -->
    <div class="section">
      <h3>当前映射 {#if mapped.length}<span class="cnt">{mapped.length}</span>{/if}</h3>
      {#if mapped.length}
        <div class="maplist">
          {#each mapped as k (k)}
            {@const m = mapping.mappings[k]}
            <div class="mrow" class:on={sel === k} class:turbo={m.kind === 'turbo'}>
              <button class="mrow-main" onclick={() => mapping.selectKey(k)}>
                <span class="mk">{KEY_LABELS[k]}</span>
                <span class="mar">→</span>
                <span class="mt">{describe(m)}</span>
              </button>
              <button class="mx" aria-label="清除映射" disabled={mapping.busy} onclick={() => mapping.clearMapping(k)}>×</button>
            </div>
          {/each}
        </div>
      {:else}
        <p class="note none">暂无自定义映射 — 所有按键保持默认。</p>
      {/if}
    </div>

    <p class="legend note">
      <span class="lg key"></span> 单键 ·
      <span class="lg turbo"></span> 连发 ·
      <span class="lg opaque"></span> 宏 / 键盘（来自原版配置，本工具暂只读但会原样保留）
    </p>
  {/if}
</Panel>

<style>
  .empty {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 9px;
    text-align: center;
    padding: 40px 20px;
  }
  .empty-icon {
    font-size: 36px;
    opacity: 0.7;
  }
  .empty-t {
    font-size: 15px;
    font-weight: 600;
  }
  .empty-d {
    font-size: 12.5px;
    color: var(--muted-2);
    max-width: 360px;
    margin-bottom: 6px;
  }

  /* 编辑条 */
  .editor {
    display: flex;
    align-items: center;
    gap: 10px;
    flex-wrap: wrap;
    padding: 14px 16px;
    border-radius: var(--radius-sm);
    background: var(--panel-2);
    border: 1px solid var(--line);
    margin-bottom: 22px;
    transition: border-color 0.15s, box-shadow 0.15s;
  }
  .editor.active {
    border-color: var(--accent-line);
    box-shadow: 0 0 0 1px var(--accent-soft);
  }
  .ekey {
    font-family: var(--mono);
    font-weight: 700;
    font-size: 15px;
    color: #fff;
    background: linear-gradient(180deg, var(--accent-2), var(--accent));
    padding: 5px 13px;
    border-radius: 8px;
    box-shadow: 0 2px 10px rgba(59, 130, 246, 0.35);
  }
  .editor select {
    font-size: 13.5px;
  }
  .ehint,
  .ro {
    font-size: 13px;
    color: var(--muted-2);
  }
  .ro {
    color: var(--warn);
  }
  .freq {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    font-size: 12px;
    color: var(--muted-2);
  }
  .freq input {
    width: 58px;
  }
  .btn.sm {
    padding: 7px 12px;
    font-size: 12.5px;
  }

  .section {
    margin-top: 4px;
    margin-bottom: 20px;
  }
  h3 {
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 1.2px;
    text-transform: uppercase;
    color: var(--muted);
    margin: 0 0 11px;
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .cnt {
    font-family: var(--mono);
    font-size: 10.5px;
    color: var(--accent-2);
    background: var(--accent-soft);
    border-radius: 99px;
    padding: 1px 8px;
  }

  /* 功能键 chips */
  .chips {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }
  .kchip {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 8px 13px;
    border-radius: 9px;
    background: var(--panel-2);
    border: 1px solid var(--line);
    color: var(--text-2);
    font-size: 13px;
    font-weight: 600;
    transition: border-color 0.15s, background 0.15s, color 0.15s;
  }
  .kchip:hover:not(:disabled) {
    border-color: var(--line-hi);
    color: var(--text);
  }
  .kchip.mapped {
    border-color: var(--accent-line);
    color: var(--accent-2);
  }
  .kchip.on {
    background: var(--accent-soft);
    border-color: var(--accent-2);
    color: #fff;
    box-shadow: 0 0 0 1px var(--accent-soft);
  }
  .kt {
    font-family: var(--mono);
    font-size: 11px;
    opacity: 0.85;
  }

  /* 映射列表 */
  .maplist {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(190px, 1fr));
    gap: 8px;
  }
  .mrow {
    display: flex;
    align-items: stretch;
    background: var(--panel-2);
    border: 1px solid var(--line);
    border-radius: 9px;
    overflow: hidden;
    transition: border-color 0.15s;
  }
  .mrow.on {
    border-color: var(--accent-2);
  }
  .mrow.turbo .mt {
    color: var(--violet);
  }
  .mrow-main {
    flex: 1;
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 9px 11px;
    color: var(--text);
    font-size: 12.5px;
    min-width: 0;
  }
  .mrow-main:hover {
    background: rgba(255, 255, 255, 0.02);
  }
  .mk {
    font-family: var(--mono);
    font-weight: 700;
    flex: none;
  }
  .mar {
    color: var(--muted);
    flex: none;
  }
  .mt {
    font-family: var(--mono);
    font-weight: 700;
    color: var(--accent-2);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .mx {
    flex: none;
    width: 32px;
    color: var(--muted);
    font-size: 17px;
    border-left: 1px solid var(--line);
    transition: color 0.15s, background 0.15s;
  }
  .mx:hover:not(:disabled) {
    color: var(--bad);
    background: var(--bad-bg);
  }
  .none {
    margin: 0;
  }
  .legend {
    margin: 4px 0 0;
    display: flex;
    align-items: center;
    gap: 6px;
    flex-wrap: wrap;
  }
  .lg {
    display: inline-block;
    width: 10px;
    height: 10px;
    border-radius: 3px;
    vertical-align: -1px;
  }
  .lg.key {
    background: var(--accent);
  }
  .lg.turbo {
    background: var(--violet);
  }
  .lg.opaque {
    background: #4b5570;
  }
</style>
