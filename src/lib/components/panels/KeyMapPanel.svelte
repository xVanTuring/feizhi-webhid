<script lang="ts">
  import { controller } from '../../controller.svelte';
  import { mapping } from '../../mapping.svelte';
  import { ControllerKey, KEY_LABELS, MAPPABLE_KEYS } from '../../hid/config';
  import Panel from '../../ui/Panel.svelte';

  // 手柄图上画不出的键，放这里当 chip 选择（与 ControllerView 的 HIT 表互补）。
  const OFF_KEYS = [ControllerKey.Menu, ControllerKey.Turbo, ControllerKey.Back, ControllerKey.C, ControllerKey.Z];

  const sel = $derived(mapping.selectedKey);
  const mapped = $derived(MAPPABLE_KEYS.filter((k) => mapping.mappings[k] != null));

  function setTarget(v: number) {
    if (sel == null) return;
    mapping.updateMap(sel, v === 255 ? null : v);
  }
</script>

<Panel title="按键映射" desc="点击上方手柄图上的按键来选择，再设置映射目标。已映射的按键会在手柄上高亮并显示目标。">
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
      {#if sel != null}
        <span class="ekey">{KEY_LABELS[sel]}</span>
        <span class="earrow">映射为</span>
        <select value={mapping.mappings[sel] ?? 255} onchange={(e) => setTarget(Number((e.currentTarget as HTMLSelectElement).value))} disabled={mapping.busy}>
          <option value={255}>不映射（默认）</option>
          {#each MAPPABLE_KEYS as to (to)}
            {#if to !== sel}<option value={to}>{KEY_LABELS[to]}</option>{/if}
          {/each}
        </select>
        <button class="btn btn-ghost sm" disabled={mapping.mappings[sel] == null} onclick={() => setTarget(255)}>清除</button>
      {:else}
        <span class="ehint">未选择按键 — 点击上方手柄图上任意按键开始编辑。</span>
      {/if}
    </div>

    <!-- 手柄图上没有的功能键 -->
    <div class="section">
      <h3>其它功能键</h3>
      <div class="chips">
        {#each OFF_KEYS as k (k)}
          <button
            class="kchip"
            class:on={sel === k}
            class:mapped={mapping.mappings[k] != null}
            disabled={mapping.busy}
            onclick={() => mapping.selectKey(k)}
          >
            {KEY_LABELS[k]}
            {#if mapping.mappings[k] != null}<span class="kt">→ {KEY_LABELS[mapping.mappings[k] as number]}</span>{/if}
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
            <div class="mrow" class:on={sel === k}>
              <button class="mrow-main" onclick={() => mapping.selectKey(k)}>
                <span class="mk">{KEY_LABELS[k]}</span>
                <span class="mar">→</span>
                <span class="mt">{KEY_LABELS[mapping.mappings[k] as number]}</span>
              </button>
              <button class="mx" aria-label="清除映射" disabled={mapping.busy} onclick={() => mapping.updateMap(k, null)}>×</button>
            </div>
          {/each}
        </div>
      {:else}
        <p class="note none">暂无自定义映射 — 所有按键保持默认。</p>
      {/if}
    </div>
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
    gap: 12px;
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
  .earrow {
    font-size: 13px;
    color: var(--muted-2);
  }
  .editor select {
    min-width: 160px;
    font-size: 14px;
  }
  .ehint {
    font-size: 13px;
    color: var(--muted-2);
  }
  .btn.sm {
    padding: 7px 12px;
    font-size: 12.5px;
  }

  .section {
    margin-top: 4px;
    margin-bottom: 20px;
  }
  .section:last-child {
    margin-bottom: 0;
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
    grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
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
  .mrow-main {
    flex: 1;
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 9px 11px;
    color: var(--text);
    font-size: 13px;
    min-width: 0;
  }
  .mrow-main:hover {
    background: rgba(255, 255, 255, 0.02);
  }
  .mk {
    font-family: var(--mono);
    font-weight: 700;
  }
  .mar {
    color: var(--muted);
  }
  .mt {
    font-family: var(--mono);
    font-weight: 700;
    color: var(--accent-2);
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
</style>
