<script lang="ts">
  let {
    label,
    value = $bindable(0),
    min = 0,
    max = 255,
    step = 1,
    unit = '',
    hint = '',
    disabled = false,
    oninput,
  }: {
    label: string;
    value?: number;
    min?: number;
    max?: number;
    step?: number;
    unit?: string;
    hint?: string;
    disabled?: boolean;
    oninput?: (v: number) => void;
  } = $props();

  function clamp(n: number) {
    return Math.min(max, Math.max(min, n));
  }
  function set(n: number) {
    if (disabled) return;
    value = clamp(n);
    oninput?.(value);
  }
  const bump = (d: number) => set(value + d * step);
</script>

<div class="ctl" class:disabled>
  <div class="top">
    <span class="lbl">{label}{#if hint}<span class="q" title={hint}>?</span>{/if}</span>
    <span class="val mono">{value}{unit}</span>
  </div>
  <div class="body">
    <button type="button" class="step" {disabled} onclick={() => bump(-1)} aria-label="减小">−</button>
    <input
      type="range"
      {min}
      {max}
      {step}
      {disabled}
      bind:value
      oninput={() => oninput?.(value)}
    />
    <button type="button" class="step" {disabled} onclick={() => bump(1)} aria-label="增大">+</button>
  </div>
</div>

<style>
  .ctl.disabled {
    opacity: 0.5;
  }
  .top {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    margin-bottom: 9px;
  }
  .lbl {
    font-size: 13px;
    color: var(--text-2);
    display: inline-flex;
    align-items: center;
    gap: 6px;
  }
  .q {
    width: 14px;
    height: 14px;
    border-radius: 50%;
    border: 1px solid var(--line-2);
    color: var(--muted);
    font-size: 9px;
    line-height: 13px;
    text-align: center;
    cursor: help;
  }
  .val {
    font-size: 14px;
    font-weight: 700;
    color: var(--accent-2);
  }
  .body {
    display: flex;
    align-items: center;
    gap: 11px;
  }
  .step {
    flex: none;
    width: 26px;
    height: 26px;
    border-radius: 8px;
    background: var(--panel-hi);
    border: 1px solid var(--line-2);
    color: var(--text-2);
    font-size: 17px;
    line-height: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: background 0.12s, border-color 0.12s, color 0.12s;
  }
  .step:hover:not(:disabled) {
    border-color: var(--accent-line);
    color: var(--accent-2);
    background: var(--accent-soft);
  }
  .step:disabled {
    opacity: 0.4;
  }
</style>
