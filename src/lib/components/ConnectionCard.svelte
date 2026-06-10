<script lang="ts">
  import { controller } from '../controller.svelte';
</script>

<div class="card">
  <h2>连接</h2>
  <div class="row">
    <button onclick={() => controller.connect()} disabled={controller.connected || !controller.supported}>
      连接手柄
    </button>
    <button class="sec" onclick={() => controller.disconnect()} disabled={!controller.connected}>断开</button>
    <span class="pill {controller.connected ? 'ok' : 'bad'}">
      {controller.connected ? '已连接 · ' + controller.productName : '未连接'}
    </span>
    {#if controller.connected && !controller.hasCmdInterface}
      <span class="pill bad" title="未枚举到 0xFFA0">⚠ 无命令接口</span>
    {/if}
  </div>

  {#if controller.deviceInfo}
    <div class="row note">{controller.deviceInfo}</div>
  {/if}

  <div class="row">
    <span class="f">Report ID</span>
    <input type="number" min="0" max="255" style="width:80px" bind:value={controller.reportId} />
    <span class="f" style="width:auto">报文长度</span>
    <input type="number" min="2" max="63" style="width:80px" bind:value={controller.reportLen} />
    <span class="note">默认 0x03 / 31 字节，连接后按设备自动填，不对可手动改。</span>
  </div>
</div>
