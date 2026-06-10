<script lang="ts">
  import { controller } from '../controller.svelte';
  import { GRIP_PRESETS, buildGripFrame, paramsOf, type GripBindParams } from '../hid/gripbind';
  import { byte2 } from '../hid/util';

  let selectedProc = $state(GRIP_PRESETS[0].proc);
  let p = $state<GripBindParams>(paramsOf(GRIP_PRESETS[0]));
  let showAdvanced = $state(false);

  const selected = $derived(GRIP_PRESETS.find((g) => g.proc === selectedProc) ?? GRIP_PRESETS[0]);

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

  const previewHex = $derived(
    Array.from(buildGripFrame(1, p, controller.reportLen).slice(0, 12), byte2).join(' '),
  );
</script>

<div class="card">
  <h2>内置震动绑定 · SyncWithGrip（cmd82）<span class="badge">代偿式</span></h2>
  <div class="note block">
    发一次绑定，固件就把游戏的 <b>XInput rumble 耦合进扳机</b> + 一个静态阻尼。零循环、通用，但属
    <b>伪自适应</b>(游戏对扳机无感知、阻力不随车况变)。要真·力反馈看「遥测驱动」标签页。
  </div>

  <div class="primary">
    <select bind:value={selectedProc} onchange={applyPreset} aria-label="选择游戏">
      {#each GRIP_PRESETS as g (g.proc)}
        <option value={g.proc}>{g.name}</option>
      {/each}
    </select>
    <button onclick={() => controller.bindGrip(p)} disabled={!controller.connected}>绑定 Bind</button>
    <button class="sec" onclick={() => controller.unbindGrip(p)} disabled={!controller.connected}>解绑 Unbind</button>
  </div>
  <div class="note hintline">
    进程 <code>{selected.proc}</code> · 共 {GRIP_PRESETS.length} 款 · 流程：连接 → 选游戏 → 绑定 → 启动该游戏（需游戏会输出震动）
  </div>

  <button class="toggle" onclick={() => (showAdvanced = !showAdvanced)}>
    {showAdvanced ? '▾' : '▸'} 高级参数 · 微调 / 帧预览
  </button>

  {#if showAdvanced}
    <div class="adv">
      <div class="fields">
        {#each FIELDS as f (f.key)}
          <label class="field">
            <span>{f.label}</span>
            <input type="number" min="0" max="255" bind:value={p[f.key]} />
          </label>
        {/each}
      </div>
      <div class="row">
        <button class="sec" onclick={applyPreset}>重填该预设</button>
      </div>
      <div class="row">
        <span class="f">下发帧</span>
        <div class="frame">{byte2(controller.reportId)} | {previewHex}</div>
      </div>
      <div class="note">
        <code>reportId | 5A A5 | 52 | 0B | side bindType filter scale stroke pressure strength freq</code>
        · 左右各发一帧 · 无 applyFlag / CRC
      </div>
    </div>
  {/if}
</div>

<style>
  .badge {
    font-size: 11px;
    font-weight: 400;
    color: var(--warn-fg);
    border: 1px solid var(--warn-fg);
    border-radius: 10px;
    padding: 1px 8px;
    margin-left: 8px;
  }
  .block {
    margin-bottom: 12px;
  }
  .primary {
    display: flex;
    gap: 10px;
    align-items: center;
    flex-wrap: wrap;
  }
  .primary select {
    flex: 1;
    min-width: 200px;
    font-size: 15px;
    padding: 8px 10px;
  }
  .hintline {
    margin: 8px 0 4px;
  }
  .toggle {
    background: transparent;
    color: var(--muted-2);
    padding: 6px 0;
    font-size: 13px;
  }
  .toggle:hover {
    color: var(--text);
  }
  .adv {
    border-top: 1px solid var(--border);
    padding-top: 12px;
    margin-top: 4px;
  }
  .fields {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
    gap: 8px 14px;
  }
  .field {
    display: flex;
    flex-direction: column;
    gap: 3px;
    font-size: 12px;
    color: var(--muted-2);
  }
  .field input {
    width: 100%;
  }
  .frame {
    flex: 1;
    font-family: var(--mono);
    font-size: 13px;
    color: #7fd1ff;
    background: var(--card-2);
    border: 1px solid var(--border);
    border-radius: 6px;
    padding: 10px;
    word-break: break-all;
  }
</style>
