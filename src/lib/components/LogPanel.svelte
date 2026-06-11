<script lang="ts">
  import { controller, type LogEntry } from '../controller.svelte';

  const fmt = (ts: number) => {
    const d = new Date(ts);
    const p = (n: number) => n.toString().padStart(2, '0');
    return `${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
  };

  const prefix: Record<LogEntry['level'], string> = {
    info: '·',
    tx: '→',
    rx: '←',
    warn: '⚠',
    error: '✗',
  };
</script>

<div class="devblock">
  <div class="db-head">
    收发日志
    <button class="clear" onclick={() => controller.clearLogs()}>清空</button>
  </div>
  <div class="log mono">
    {#each controller.logs as l (l.id)}
      <div class="line {l.level}">
        <span class="t">{fmt(l.ts)}</span>
        <span class="p">{prefix[l.level]}</span>
        <span class="m">{l.text}</span>
      </div>
    {:else}
      <div class="note">暂无日志。</div>
    {/each}
  </div>
</div>

<style>
  .db-head {
    font-size: 12px;
    font-weight: 700;
    letter-spacing: 0.5px;
    margin-bottom: 10px;
    display: flex;
    align-items: center;
    justify-content: space-between;
  }
  .clear {
    font-size: 11.5px;
    color: var(--muted-2);
    padding: 4px 10px;
    border-radius: 7px;
    border: 1px solid var(--line-2);
  }
  .clear:hover {
    color: var(--text);
    border-color: var(--line-hi);
  }
  .log {
    font-size: 11.5px;
    background: var(--inset);
    border: 1px solid var(--line);
    border-radius: 9px;
    padding: 10px;
    height: 180px;
    overflow: auto;
  }
  .line {
    display: flex;
    gap: 8px;
    white-space: pre-wrap;
    word-break: break-all;
    padding: 1px 0;
  }
  .t {
    color: #5a6472;
    flex: none;
  }
  .p {
    flex: none;
    width: 12px;
    text-align: center;
    color: var(--muted-2);
  }
  .m {
    color: var(--muted-2);
  }
  .line.tx .m,
  .line.tx .p {
    color: #7fd1ff;
  }
  .line.rx .m,
  .line.rx .p {
    color: var(--accent-2);
  }
  .line.warn .m,
  .line.warn .p {
    color: var(--warn);
  }
  .line.error .m,
  .line.error .p {
    color: var(--bad);
  }
</style>
