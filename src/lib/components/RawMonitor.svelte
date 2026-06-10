<script lang="ts">
  import { controller } from '../controller.svelte';
  import { byte2 } from '../hid/util';
</script>

<div class="card">
  <h2>原始输入报文（WebHID）</h2>
  {#if !controller.connected}
    <div class="note">连接后这里实时显示设备上报的每个 reportId 的字节，变化的字节会高亮 —— 适合逆向定位按键/摇杆字节。</div>
  {:else if controller.reports.length === 0}
    <div class="note">已连接，等待输入报文…（Mac 上整设备共享，按键/摇杆帧会出现在此；若只看到命令接口可能收不到手柄帧）</div>
  {:else}
    {#each controller.reports as r (r.reportId)}
      <div class="report">
        <div class="rhead">
          <span class="rid">ID {byte2(r.reportId)}</span>
          <span class="note">{r.bytes.length} 字节 · #{r.count}</span>
        </div>
        <div class="bytes">
          {#each r.bytes as b, i (i)}
            <span class="b" class:hot={r.changed[i]}>{byte2(b)}</span>
          {/each}
        </div>
      </div>
    {/each}
  {/if}
</div>

<style>
  .report {
    margin-bottom: 12px;
  }
  .rhead {
    display: flex;
    align-items: baseline;
    gap: 10px;
    margin-bottom: 4px;
  }
  .rid {
    font-family: var(--mono);
    font-size: 13px;
    color: var(--accent);
  }
  .bytes {
    display: flex;
    flex-wrap: wrap;
    gap: 3px;
  }
  .b {
    font-family: var(--mono);
    font-size: 12px;
    padding: 2px 4px;
    border-radius: 4px;
    background: var(--card-2);
    color: #7fd1ff;
    border: 1px solid transparent;
    transition: background 0.25s, color 0.25s;
  }
  .b.hot {
    background: #2d3a5e;
    color: #fff;
    border-color: var(--accent);
  }
</style>
