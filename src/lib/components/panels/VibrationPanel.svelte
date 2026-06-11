<script lang="ts">
  import { controller } from '../../controller.svelte';
  import { ui } from '../../ui.svelte';
  import { GRIP_PRESETS, buildGripFrame, paramsOf, type GripBindParams } from '../../hid/gripbind';
  import { byte2 } from '../../hid/util';
  import Panel from '../../ui/Panel.svelte';

  let selectedProc = $state(GRIP_PRESETS[0].proc);
  let p = $state<GripBindParams>(paramsOf(GRIP_PRESETS[0]));
  let showAdvanced = $state(false);

  const selected = $derived(GRIP_PRESETS.find((g) => g.proc === selectedProc) ?? GRIP_PRESETS[0]);
  const previewHex = $derived(
    Array.from(buildGripFrame(1, p, controller.reportLen).slice(0, 12), byte2).join(' '),
  );

  function applyPreset() {
    p = paramsOf(selected);
  }

  const FIELDS: { key: keyof GripBindParams; label: string }[] = [
    { key: 'bindType', label: 'bindType (VibType)' },
    { key: 'filter', label: 'filter (VibFilter)' },
    { key: 'scale', label: 'scale (PwmScal)' },
    { key: 'stroke', label: 'stroke' },
    { key: 'pressure', label: 'pressureLevel' },
    { key: 'strength', label: 'strength' },
    { key: 'frequency', label: 'frequency' },
  ];
</script>

<Panel
  title="内置震动绑定"
  badge="代偿式"
  badgeTone="warn"
  desc="发一次绑定，固件就把游戏的 XInput 震动实时耦合进扳机马达 + 一个静态阻尼。零循环、通用，但属伪自适应（游戏对扳机无感知）。要真·力反馈见「遥测」标签。"
>
  <div class="picker">
    <div class="field">
      <span class="flabel">选择游戏</span>
      <select bind:value={selectedProc} onchange={applyPreset}>
        {#each GRIP_PRESETS as g (g.proc)}
          <option value={g.proc}>{g.name}</option>
        {/each}
      </select>
    </div>
    <div class="picker-actions">
      <button class="btn btn-primary" disabled={!controller.connected} onclick={() => controller.bindGrip(p)}>绑定</button>
      <button class="btn btn-ghost" disabled={!controller.connected} onclick={() => controller.unbindGrip(p)}>解绑</button>
    </div>
  </div>

  <div class="steps">
    <span class="step"><b>1</b> 连接手柄</span>
    <span class="arrow">→</span>
    <span class="step"><b>2</b> 选游戏</span>
    <span class="arrow">→</span>
    <span class="step"><b>3</b> 绑定</span>
    <span class="arrow">→</span>
    <span class="step"><b>4</b> 启动该游戏（需游戏会输出震动）</span>
  </div>

  <div class="meta note">
    进程 <code>{selected.proc}</code> · 共 {GRIP_PRESETS.length} 款预设
  </div>

  <button class="adv-toggle" class:open={showAdvanced} onclick={() => (showAdvanced = !showAdvanced)}>
    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M9 6l6 6-6 6" />
    </svg>
    高级参数 · 微调
  </button>

  {#if showAdvanced}
    <div class="adv">
      <div class="fields">
        {#each FIELDS as f (f.key)}
          <label class="numf">
            <span>{f.label}</span>
            <input type="number" min="0" max="255" bind:value={p[f.key]} />
          </label>
        {/each}
      </div>
      <button class="btn btn-ghost sm" onclick={applyPreset}>重填该预设</button>

      {#if ui.devMode}
        <div class="frame">
          <code class="frame-hex">{byte2(controller.reportId)} | {previewHex}</code>
          <div class="note frame-note">
            <code>reportId | 5A A5 | 52 | 0B | side bindType filter scale stroke pressure strength freq</code> · 左右各一帧 · 无 applyFlag / CRC
          </div>
        </div>
      {/if}
    </div>
  {/if}
</Panel>

<style>
  .picker {
    display: flex;
    align-items: flex-end;
    gap: 14px;
    flex-wrap: wrap;
    margin-bottom: 18px;
  }
  .field {
    display: flex;
    flex-direction: column;
    gap: 7px;
    flex: 1;
    min-width: 220px;
  }
  .flabel {
    font-size: 13px;
    color: var(--text-2);
    font-weight: 600;
  }
  .field select {
    font-size: 14px;
    padding: 10px 12px;
  }
  .picker-actions {
    display: flex;
    gap: 8px;
  }

  .steps {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 8px 6px;
    padding: 12px 14px;
    background: var(--panel-2);
    border: 1px solid var(--line);
    border-radius: var(--radius-sm);
    margin-bottom: 10px;
  }
  .step {
    font-size: 12px;
    color: var(--text-2);
    display: inline-flex;
    align-items: center;
    gap: 6px;
  }
  .step b {
    width: 17px;
    height: 17px;
    border-radius: 50%;
    background: var(--accent-soft);
    border: 1px solid var(--accent-line);
    color: var(--accent-2);
    font-size: 10.5px;
    display: grid;
    place-items: center;
  }
  .arrow {
    color: var(--muted);
  }
  .meta {
    margin-bottom: 16px;
  }

  .adv-toggle {
    display: inline-flex;
    align-items: center;
    gap: 7px;
    font-size: 12.5px;
    font-weight: 600;
    color: var(--muted-2);
    padding: 6px 0;
  }
  .adv-toggle:hover {
    color: var(--text);
  }
  .adv-toggle svg {
    transition: transform 0.18s ease;
  }
  .adv-toggle.open svg {
    transform: rotate(90deg);
  }
  .adv {
    margin-top: 12px;
    padding-top: 16px;
    border-top: 1px dashed var(--line-2);
    animation: fade-up 0.18s ease;
  }
  .fields {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
    gap: 12px 16px;
    margin-bottom: 14px;
  }
  .numf {
    display: flex;
    flex-direction: column;
    gap: 5px;
    font-size: 11.5px;
    color: var(--muted-2);
  }
  .numf input {
    width: 100%;
  }
  .btn.sm {
    padding: 7px 12px;
    font-size: 12.5px;
  }
  .frame {
    margin-top: 14px;
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
