<script lang="ts">
  let {
    checked = $bindable(false),
    disabled = false,
    label = '开关',
    onchange,
  }: {
    checked?: boolean;
    disabled?: boolean;
    label?: string;
    onchange?: (v: boolean) => void;
  } = $props();

  function toggle() {
    if (disabled) return;
    checked = !checked;
    onchange?.(checked);
  }
</script>

<button
  type="button"
  role="switch"
  aria-checked={checked}
  aria-label={label}
  class="sw"
  class:on={checked}
  {disabled}
  onclick={toggle}
>
  <span class="knob"></span>
</button>

<style>
  .sw {
    width: 42px;
    height: 24px;
    border-radius: 999px;
    background: var(--inset);
    border: 1px solid var(--line-2);
    position: relative;
    flex: none;
    transition: background 0.2s, border-color 0.2s, box-shadow 0.2s;
  }
  .sw:disabled {
    opacity: 0.4;
  }
  .knob {
    position: absolute;
    top: 50%;
    left: 3px;
    width: 16px;
    height: 16px;
    border-radius: 50%;
    background: var(--muted-2);
    transform: translate(0, -50%);
    transition: transform 0.2s cubic-bezier(0.34, 1.4, 0.64, 1), background 0.2s;
  }
  .sw.on {
    background: linear-gradient(180deg, var(--accent-2), var(--accent));
    border-color: transparent;
    box-shadow: 0 0 14px var(--accent-glow), inset 0 1px 0 rgba(255, 255, 255, 0.2);
  }
  .sw.on .knob {
    background: #fff;
    transform: translate(18px, -50%);
  }
</style>
