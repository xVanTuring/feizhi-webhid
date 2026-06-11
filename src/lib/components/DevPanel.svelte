<script lang="ts">
  import { controller } from '../controller.svelte';
  import RawMonitor from './RawMonitor.svelte';
  import LogPanel from './LogPanel.svelte';
</script>

<section class="dev">
  <header class="dev-head">
    <span class="dh-title">
      <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
        <path d="M8 6l-5 6 5 6M16 6l5 6-5 6" />
      </svg>
      开发者工具
    </span>
    <span class="note">报文 ID / 长度 · 原始字节 · 收发日志</span>
  </header>

  <div class="devblock">
    <div class="cfg">
      <label class="numf">
        <span>Report ID</span>
        <input type="number" min="0" max="255" bind:value={controller.reportId} />
      </label>
      <label class="numf">
        <span>报文长度</span>
        <input type="number" min="2" max="63" bind:value={controller.reportLen} />
      </label>
      <div class="dinfo note">
        默认 0x03 / 31 字节，连接后自动填。
        {#if controller.deviceInfo}<br />{controller.deviceInfo}{/if}
      </div>
    </div>
  </div>

  <div class="cols">
    <RawMonitor />
    <LogPanel />
  </div>
</section>

<style>
  .dev {
    border: 1px solid var(--line);
    border-radius: var(--radius);
    background: var(--panel-2);
    padding: 16px 18px 18px;
    animation: fade-up 0.22s ease both;
  }
  .dev-head {
    display: flex;
    align-items: baseline;
    gap: 12px;
    margin-bottom: 14px;
    padding-bottom: 12px;
    border-bottom: 1px solid var(--line);
  }
  .dh-title {
    display: inline-flex;
    align-items: center;
    gap: 7px;
    font-size: 13px;
    font-weight: 700;
    letter-spacing: 0.5px;
    color: var(--text-2);
  }
  :global(.dev .devblock) {
    margin-bottom: 16px;
  }
  .cfg {
    display: flex;
    align-items: flex-end;
    gap: 16px;
    flex-wrap: wrap;
  }
  .numf {
    display: flex;
    flex-direction: column;
    gap: 5px;
    font-size: 11.5px;
    color: var(--muted-2);
  }
  .numf input {
    width: 92px;
  }
  .dinfo {
    flex: 1;
    min-width: 200px;
    line-height: 1.6;
  }
  .cols {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 16px;
  }
  @media (max-width: 760px) {
    .cols {
      grid-template-columns: 1fr;
    }
  }
</style>
