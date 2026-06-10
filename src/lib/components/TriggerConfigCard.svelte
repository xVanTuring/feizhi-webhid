<script lang="ts">
  import { controller } from '../controller.svelte';
  import { buildTriggerFrame } from '../hid/frame';
  import { byte2 } from '../hid/util';
  import {
    MODE_ORDER,
    TRIGGER_MODES,
    TriggerMode,
    TriggerSide,
    defaultValues,
  } from '../hid/triggers';

  let side = $state<TriggerSide>(TriggerSide.Left);
  let mode = $state<TriggerMode>(TriggerMode.Race);
  let match = $state(true);
  let live = $state(true);
  let values = $state<Record<string, number>>(defaultValues(TriggerMode.Race));

  const modeDef = $derived(TRIGGER_MODES[mode]);

  // 帧预览（不含 reportId — sendReport 单独传）。Both 在下发时会拆成左右两帧。
  const previewData = $derived(
    buildTriggerFrame({ mode, side, values, match, reportLen: controller.reportLen }),
  );
  const previewHex = $derived(
    Array.from(previewData.slice(0, 14), byte2).join(' '),
  );

  const SIDES: { v: TriggerSide; label: string }[] = [
    { v: TriggerSide.Left, label: '左 L' },
    { v: TriggerSide.Right, label: '右 R' },
    { v: TriggerSide.Both, label: '双 Both' },
  ];

  let liveTimer = 0;
  function scheduleLive() {
    if (!live || !controller.connected) return;
    clearTimeout(liveTimer);
    liveTimer = window.setTimeout(() => controller.sendTrigger({ mode, side, values, match }), 40);
  }

  function setMode(next: TriggerMode) {
    mode = next;
    values = defaultValues(next);
    scheduleLive();
  }

  function setSide(next: TriggerSide) {
    side = next;
    scheduleLive();
  }
</script>

<div class="card">
  <h2>自适应扳机</h2>

  <div class="row">
    <span class="f">扳机</span>
    <div class="seg">
      {#each SIDES as s (s.v)}
        <button class={side === s.v ? 'on' : ''} onclick={() => setSide(s.v)}>{s.label}</button>
      {/each}
    </div>
  </div>

  <div class="row">
    <span class="f">效果模式</span>
    <select value={mode} onchange={(e) => setMode(Number((e.currentTarget as HTMLSelectElement).value))}>
      {#each MODE_ORDER as m (m)}
        <option value={m}>{TRIGGER_MODES[m].name}</option>
      {/each}
    </select>
    <label class="chk">
      <input type="checkbox" bind:checked={match} onchange={scheduleLive} /> matchStroke(匹配行程)
    </label>
  </div>

  <div class="note" style="margin:-2px 0 8px">{modeDef.hint}</div>

  {#each modeDef.params as p (p.key)}
    <div class="row">
      <span class="f">{p.label}</span>
      <input
        type="range"
        min={p.min}
        max={p.max}
        bind:value={values[p.key]}
        oninput={scheduleLive}
      />
      <span class="val">{values[p.key]}</span>
    </div>
  {/each}

  <div class="row" style="margin-top:14px">
    <button onclick={() => controller.sendTrigger({ mode, side, values, match })} disabled={!controller.connected}>
      发送
    </button>
    <button class="sec" onclick={() => controller.release(side)} disabled={!controller.connected}>
      释放(Normal)
    </button>
    <label class="chk"><input type="checkbox" bind:checked={live} /> 拖动实时发送</label>
  </div>

  <div class="row">
    <span class="f">下发帧</span>
    <div class="frame">{byte2(controller.reportId)} | {previewHex} …</div>
  </div>
  <div class="note">
    格式：<code>reportId | 5A A5 | cmd=51(81) | len=0A | apply=01 | side mode p1 p2 p3 p4 …</code>
    {#if side === TriggerSide.Both}· Both 下发时拆为左右两帧（间隔 100ms）{/if}
  </div>
</div>

<style>
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
