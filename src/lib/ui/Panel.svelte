<script lang="ts">
  import type { Snippet } from 'svelte';

  let {
    title,
    desc = '',
    badge = '',
    badgeTone = 'accent',
    actions,
    children,
  }: {
    title: string;
    desc?: string;
    badge?: string;
    badgeTone?: 'accent' | 'warn';
    actions?: Snippet;
    children: Snippet;
  } = $props();
</script>

<section class="panel">
  <header class="phead">
    <div class="phead-main">
      <h2>
        {title}
        {#if badge}<span class="pbadge" class:warn={badgeTone === 'warn'}>{badge}</span>{/if}
      </h2>
      {#if desc}<p class="pdesc">{desc}</p>{/if}
    </div>
    {#if actions}<div class="phead-actions">{@render actions()}</div>{/if}
  </header>
  <div class="pbody">
    {@render children()}
  </div>
</section>

<style>
  .panel {
    animation: fade-up 0.22s ease both;
  }
  .phead {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 14px;
    margin-bottom: 18px;
  }
  h2 {
    font-size: 16px;
    font-weight: 700;
    margin: 0;
    display: flex;
    align-items: center;
    gap: 9px;
    letter-spacing: 0.2px;
  }
  .pbadge {
    font-size: 10.5px;
    font-weight: 600;
    color: var(--accent-2);
    background: var(--accent-soft);
    border: 1px solid var(--accent-line);
    border-radius: 6px;
    padding: 2px 8px;
  }
  .pbadge.warn {
    color: var(--warn);
    background: var(--warn-bg);
    border-color: rgba(251, 191, 36, 0.3);
  }
  .pdesc {
    margin: 7px 0 0;
    font-size: 12.5px;
    color: var(--muted-2);
    max-width: 62ch;
    line-height: 1.6;
  }
  .phead-actions {
    flex: none;
    display: flex;
    gap: 8px;
    align-items: center;
  }
</style>
