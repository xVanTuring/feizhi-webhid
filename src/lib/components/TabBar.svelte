<script lang="ts">
  import { ui, type TabId } from '../ui.svelte';

  const TABS: { id: TabId; label: string }[] = [
    { id: 'trigger', label: '扳机' },
    { id: 'vibration', label: '震动' },
    { id: 'buttons', label: '按键' },
    { id: 'motion', label: '体感' },
    { id: 'telemetry', label: '遥测' },
  ];
</script>

{#snippet icon(id: TabId)}
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">
    {#if id === 'trigger'}
      <path d="M4 16a8 8 0 0 1 16 0" />
      <path d="M12 16 17 9" />
      <circle cx="12" cy="16" r="1.4" fill="currentColor" stroke="none" />
    {:else if id === 'vibration'}
      <rect x="9" y="4" width="6" height="16" rx="2" />
      <path d="M5 9v6M19 9v6" />
    {:else if id === 'buttons'}
      <circle cx="8" cy="8" r="2.2" />
      <circle cx="16" cy="8" r="2.2" />
      <circle cx="8" cy="16" r="2.2" />
      <circle cx="16" cy="16" r="2.2" />
    {:else if id === 'motion'}
      <circle cx="12" cy="12" r="3" />
      <ellipse cx="12" cy="12" rx="9" ry="3.6" transform="rotate(-30 12 12)" />
    {:else if id === 'telemetry'}
      <path d="M5 19V13M10 19V8M15 19v-7M20 19V5" />
    {/if}
  </svg>
{/snippet}

<nav class="tabbar">
  {#each TABS as t (t.id)}
    <button class="tab" class:on={ui.tab === t.id} onclick={() => (ui.tab = t.id)}>
      {@render icon(t.id)}
      <span>{t.label}</span>
    </button>
  {/each}
</nav>

<style>
  .tabbar {
    display: flex;
    gap: 4px;
    padding: 5px;
    background: var(--panel-2);
    border: 1px solid var(--line);
    border-radius: var(--radius);
    box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.02);
  }
  .tab {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 5px;
    padding: 11px 6px 9px;
    border-radius: 10px;
    color: var(--muted);
    font-size: 12.5px;
    font-weight: 600;
    position: relative;
    transition: color 0.15s, background 0.15s;
  }
  .tab svg {
    width: 21px;
    height: 21px;
    transition: transform 0.18s ease;
  }
  .tab:hover:not(.on) {
    color: var(--text-2);
    background: rgba(255, 255, 255, 0.02);
  }
  .tab.on {
    color: var(--accent-2);
    background: var(--accent-soft);
  }
  .tab.on svg {
    transform: translateY(-1px);
    filter: drop-shadow(0 0 6px var(--accent-glow));
  }
  .tab.on::after {
    content: "";
    position: absolute;
    bottom: 4px;
    left: 50%;
    transform: translateX(-50%);
    width: 16px;
    height: 2.5px;
    border-radius: 2px;
    background: var(--accent);
    box-shadow: 0 0 8px var(--accent-glow);
  }
</style>
