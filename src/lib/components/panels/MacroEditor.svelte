<script lang="ts">
  import { controller } from '../../controller.svelte';
  import { gamepad } from '../../gamepad.svelte';
  import { mapping } from '../../mapping.svelte';
  import { decodePad, pickGamepadReport } from '../../hid/decode';
  import {
    ControllerKey,
    KEY_BY_LABEL,
    KEY_LABELS,
    MAPPABLE_KEYS,
    MacroEnableType,
    MacroEvent,
  } from '../../hid/config';

  let { mkey }: { mkey: ControllerKey } = $props();

  const STEP_CAP = 64;
  const macro = $derived(mapping.getMacro(mkey));
  const total = $derived(macro ? macro.steps.reduce((a, s) => a + s.delayMs, 0) : 0);

  const TYPE_OPTS = [
    { v: MacroEnableType.Once, label: '按下触发一次' },
    { v: MacroEnableType.Press, label: '按住循环' },
    { v: MacroEnableType.Click, label: '单击开关' },
  ];
  const EVENT_OPTS = [
    { v: MacroEvent.Press, label: '按下' },
    { v: MacroEvent.Release, label: '抬起' },
    { v: MacroEvent.Hold, label: '按压' },
  ];

  // —— 录制：按下手柄实体键自动追加 按下/抬起 步骤 ——
  const tgt = $derived(pickGamepadReport(controller.reports));
  const webhidPad = $derived(tgt ? decodePad(tgt) : null);
  const pad = $derived(controller.rawInputActive ? webhidPad : gamepad.pad);

  let recording = $state(false);
  let recPrev = new Set<string>();
  let recLast = 0;

  $effect(() => {
    if (!recording) {
      recPrev = new Set();
      return;
    }
    const now = new Set((pad?.buttons ?? []).filter((b) => b.pressed).map((b) => b.name));
    for (const name of now) if (!recPrev.has(name)) record(name, MacroEvent.Press);
    for (const name of recPrev) if (!now.has(name)) record(name, MacroEvent.Release);
    recPrev = now;
  });

  function record(name: string, event: MacroEvent) {
    const k = KEY_BY_LABEL[name];
    if (k == null || !macro || macro.steps.length >= STEP_CAP) return;
    const ts = performance.now();
    const delay = recLast ? Math.min(3000, Math.round(ts - recLast)) : 0;
    recLast = ts;
    mapping.addMacroStep(mkey, { event, key: k, delayMs: delay });
  }

  function addStep() {
    if (!macro || macro.steps.length >= STEP_CAP) return;
    const last = macro.steps[macro.steps.length - 1];
    mapping.addMacroStep(mkey, { event: MacroEvent.Press, key: last?.key ?? ControllerKey.A, delayMs: 50 });
  }
</script>

{#if macro}
  <div class="macro">
    <div class="mhead">
      <div class="mh-l">
        <span class="mtag">宏编辑</span>
        <label class="trig">
          触发方式
          <select value={macro.type} onchange={(e) => mapping.setMacroType(mkey, Number((e.currentTarget as HTMLSelectElement).value))}>
            {#each TYPE_OPTS as o (o.v)}<option value={o.v}>{o.label}</option>{/each}
          </select>
        </label>
        {#if macro.type === MacroEnableType.Press}
          <label class="trig">
            循环间隔
            <input type="number" min="0" max="2000" value={macro.intervalMs} onchange={(e) => mapping.setMacroInterval(mkey, Number((e.currentTarget as HTMLInputElement).value))} /> ms
          </label>
        {/if}
      </div>
      <span class="stat mono">{macro.steps.length}/{STEP_CAP} 步 · {total}ms</span>
    </div>

    <div class="tools">
      <button class="btn {recording ? 'btn-danger' : 'btn-ghost'} sm" disabled={!controller.connected} onclick={() => (recording = !recording)}>
        <span class="rdot" class:on={recording}></span>
        {recording ? '停止录制' : '录制'}
      </button>
      <button class="btn btn-ghost sm" onclick={addStep} disabled={macro.steps.length >= STEP_CAP}>+ 添加步骤</button>
      <button class="btn btn-ghost sm" onclick={() => mapping.clearMacroSteps(mkey)} disabled={!macro.steps.length}>清空</button>
      {#if recording}<span class="rechint">按手柄上的键即录入（按下 + 抬起）</span>{/if}
    </div>

    {#if macro.steps.length}
      <div class="steps">
        {#each macro.steps as st, i (i)}
          <div class="step">
            <span class="idx mono">{i + 1}</span>
            <select value={st.event} onchange={(e) => mapping.updateMacroStep(mkey, i, { event: Number((e.currentTarget as HTMLSelectElement).value) })}>
              {#each EVENT_OPTS as o (o.v)}<option value={o.v}>{o.label}</option>{/each}
            </select>
            <select value={st.key} onchange={(e) => mapping.updateMacroStep(mkey, i, { key: Number((e.currentTarget as HTMLSelectElement).value) })}>
              {#each MAPPABLE_KEYS as k (k)}<option value={k}>{KEY_LABELS[k]}</option>{/each}
            </select>
            <label class="dly">
              <input type="number" min="0" max="3000" value={st.delayMs} onchange={(e) => mapping.updateMacroStep(mkey, i, { delayMs: Number((e.currentTarget as HTMLInputElement).value) })} />
              ms
            </label>
            <button class="del" aria-label="删除步骤" onclick={() => mapping.removeMacroStep(mkey, i)}>×</button>
          </div>
        {/each}
      </div>
    {:else}
      <p class="empty note">还没有步骤 — 点「录制」按手柄键，或「添加步骤」手动编排。</p>
    {/if}

    <p class="hint note">提示：间隔(ms)以 10ms 为步进存储（V3.1 固件），保存后由手柄自带引擎回放，无需 PC 在线。</p>
  </div>
{/if}

<style>
  .macro {
    margin: 0 0 22px;
    border: 1px solid var(--line);
    border-radius: var(--radius-sm);
    background: var(--panel-2);
    padding: 14px 16px;
  }
  .mhead {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    flex-wrap: wrap;
    margin-bottom: 12px;
  }
  .mh-l {
    display: flex;
    align-items: center;
    gap: 14px;
    flex-wrap: wrap;
  }
  .mtag {
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 1px;
    text-transform: uppercase;
    color: #34d399;
  }
  .trig {
    display: inline-flex;
    align-items: center;
    gap: 7px;
    font-size: 12.5px;
    color: var(--muted-2);
  }
  .trig input {
    width: 64px;
  }
  .stat {
    font-size: 12px;
    color: var(--muted-2);
  }
  .tools {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
    margin-bottom: 12px;
  }
  .btn.sm {
    padding: 7px 12px;
    font-size: 12.5px;
  }
  .rdot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: currentColor;
    opacity: 0.6;
  }
  .rdot.on {
    opacity: 1;
    animation: blink 1s steps(2) infinite;
  }
  @keyframes blink {
    50% { opacity: 0.25; }
  }
  .rechint {
    font-size: 11.5px;
    color: var(--bad);
  }
  .steps {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }
  .step {
    display: flex;
    align-items: center;
    gap: 8px;
    background: var(--inset);
    border: 1px solid var(--line);
    border-radius: 8px;
    padding: 6px 8px;
  }
  .idx {
    width: 22px;
    text-align: center;
    font-size: 12px;
    color: var(--muted);
    flex: none;
  }
  .step select {
    font-size: 12.5px;
    padding: 6px 8px;
  }
  .dly {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    font-size: 11.5px;
    color: var(--muted-2);
    margin-left: auto;
  }
  .dly input {
    width: 64px;
  }
  .del {
    flex: none;
    width: 26px;
    height: 26px;
    border-radius: 7px;
    color: var(--muted);
    font-size: 16px;
    border: 1px solid var(--line);
  }
  .del:hover {
    color: var(--bad);
    background: var(--bad-bg);
    border-color: rgba(251, 113, 133, 0.3);
  }
  .empty {
    margin: 4px 0 0;
  }
  .hint {
    margin: 12px 0 0;
    font-size: 11px;
  }
</style>
