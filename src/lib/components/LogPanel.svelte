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

<div class="card">
  <h2 style="justify-content:space-between">
    日志
    <button class="sec" style="padding:4px 10px" onclick={() => controller.clearLogs()}>清空</button>
  </h2>
  <div class="log">
    {#each controller.logs as l (l.id)}
      <div class="line {l.level}">
        <span class="t">{fmt(l.ts)}</span>
        <span class="p">{prefix[l.level]}</span>
        <span class="m">{l.text}</span>
      </div>
    {/each}
  </div>
</div>

<style>
  .log {
    font-family: var(--mono);
    font-size: 12px;
    background: var(--card-2);
    border: 1px solid var(--border);
    border-radius: 6px;
    padding: 10px;
    height: 170px;
    overflow: auto;
  }
  .line {
    display: flex;
    gap: 8px;
    white-space: pre-wrap;
    word-break: break-all;
  }
  .t {
    color: #5a6472;
    flex: none;
  }
  .p {
    flex: none;
    width: 12px;
    text-align: center;
  }
  .m {
    color: var(--muted-2);
  }
  .line.tx .m {
    color: #7fd1ff;
  }
  .line.tx .p {
    color: #7fd1ff;
  }
  .line.warn .m,
  .line.warn .p {
    color: var(--warn-fg);
  }
  .line.error .m,
  .line.error .p {
    color: var(--bad-fg);
  }
</style>
