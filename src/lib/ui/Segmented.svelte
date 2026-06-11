<script lang="ts" generics="T extends string | number">
  let {
    value = $bindable(),
    options,
    disabled = false,
    onchange,
  }: {
    value: T;
    options: { value: T; label: string }[];
    disabled?: boolean;
    onchange?: (v: T) => void;
  } = $props();

  function pick(v: T) {
    if (disabled) return;
    value = v;
    onchange?.(v);
  }
</script>

<div class="seg" role="tablist">
  {#each options as opt (opt.value)}
    <button
      type="button"
      role="tab"
      aria-selected={value === opt.value}
      class="seg-btn"
      class:on={value === opt.value}
      {disabled}
      onclick={() => pick(opt.value)}
    >
      {opt.label}
    </button>
  {/each}
</div>

<style>
  .seg {
    display: inline-flex;
    background: var(--inset);
    border: 1px solid var(--line-2);
    border-radius: 10px;
    padding: 3px;
    gap: 3px;
  }
  .seg-btn {
    border-radius: 7px;
    padding: 7px 16px;
    font-size: 13px;
    font-weight: 600;
    color: var(--muted-2);
    transition: color 0.15s, background 0.15s, box-shadow 0.15s;
    white-space: nowrap;
  }
  .seg-btn:hover:not(:disabled):not(.on) {
    color: var(--text-2);
  }
  .seg-btn.on {
    color: #fff;
    background: linear-gradient(180deg, var(--accent-2), var(--accent));
    box-shadow: 0 2px 10px rgba(59, 130, 246, 0.35), inset 0 1px 0 rgba(255, 255, 255, 0.18);
  }
  .seg-btn:disabled {
    opacity: 0.45;
  }
</style>
