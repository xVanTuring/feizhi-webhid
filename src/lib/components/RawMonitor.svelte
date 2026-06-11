<script lang="ts">
  import { controller } from '../controller.svelte';
  import { byte2 } from '../hid/util';
</script>

<div class="devblock">
  <div class="db-head">原始输入报文 <span class="note">变化字节高亮 · 适合逆向定位</span></div>
  {#if !controller.connected}
    <div class="note">连接后实时显示每个 reportId 的字节。</div>
  {:else if controller.reports.length === 0}
    <div class="note">已连接，等待输入报文…（仅命令接口时可能收不到手柄帧）</div>
  {:else}
    {#each controller.reports as r (r.reportId)}
      <div class="report">
        <div class="rhead">
          <span class="rid mono">ID {byte2(r.reportId)}</span>
          <span class="note">{r.bytes.length} 字节 · #{r.count}</span>
        </div>
        <div class="bytes">
          {#each r.bytes as b, i (i)}
            <span class="b mono" class:hot={r.changed[i]}>{byte2(b)}</span>
          {/each}
        </div>
      </div>
    {/each}
  {/if}
</div>

<style>
  .db-head {
    font-size: 12px;
    font-weight: 700;
    letter-spacing: 0.5px;
    margin-bottom: 10px;
    display: flex;
    align-items: baseline;
    gap: 10px;
  }
  .report {
    margin-bottom: 12px;
  }
  .rhead {
    display: flex;
    align-items: baseline;
    gap: 10px;
    margin-bottom: 5px;
  }
  .rid {
    font-size: 12.5px;
    color: var(--accent-2);
    font-weight: 700;
  }
  .bytes {
    display: flex;
    flex-wrap: wrap;
    gap: 3px;
  }
  .b {
    font-size: 11.5px;
    padding: 2px 5px;
    border-radius: 4px;
    background: var(--inset);
    color: #7fd1ff;
    border: 1px solid transparent;
    transition: background 0.25s, color 0.25s, border-color 0.25s;
  }
  .b.hot {
    background: rgba(59, 130, 246, 0.28);
    color: #fff;
    border-color: var(--accent);
  }
</style>
