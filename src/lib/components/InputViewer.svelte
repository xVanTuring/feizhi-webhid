<script lang="ts">
  import { controller } from '../controller.svelte';
  import { gamepad } from '../gamepad.svelte';
  import { decodeXInput, pickGamepadReport } from '../hid/decode';
  import { byte2 } from '../hid/util';
  import ControllerView from './ControllerView.svelte';

  let pick = $state<'auto' | number>('auto');

  const target = $derived.by(() => {
    if (pick === 'auto') return pickGamepadReport(controller.reports);
    return controller.reports.find((r) => r.reportId === pick) ?? null;
  });
  const pad = $derived(target ? decodeXInput(target) : null);

  const formatBadge = $derived.by(() => {
    if (!pad) return null;
    const id = `ID ${byte2(pad.reportId)}`;
    if (pad.hasXInputHeader) return `XInput ✓ · ${id} · 偏移 +2`;
    return `RAW · ${id} · 偏移 +0`;
  });
</script>

<div class="card">
  <h2>手柄输入（WebHID 解码）</h2>

  <!-- 解码源选择 + 格式标识（仅已连接时显示） -->
  {#if controller.connected && controller.reports.length > 0}
    <div class="row" style="margin-top:0; margin-bottom:10px">
      <span class="f">解码源</span>
      <select bind:value={pick}>
        <option value="auto">自动</option>
        {#each controller.reports as r (r.reportId)}
          <option value={r.reportId}>ID {byte2(r.reportId)}（{r.bytes.length} 字节）</option>
        {/each}
      </select>
      {#if formatBadge}
        <span class="badge" class:xinput={pad?.hasXInputHeader}>{formatBadge}</span>
      {/if}
    </div>
  {/if}

  <!-- 连接提示（未收到输入时） -->
  {#if controller.connected && controller.reports.length === 0}
    <div class="note" style="margin-bottom:8px">
      ⚠ 已连接但 <b>未收到任何输入报文</b>。可能：① 打开的是命令接口 collection 而手柄输入在另一个 collection；② 手柄未上报。请在下方「原始输入报文」核对。
    </div>
  {/if}

  <!-- 控制器贴图视图（始终显示，断连时所有指示灯熄灭） -->
  <ControllerView {pad} />

  <!-- 未连接时的提示覆盖 -->
  {#if !controller.connected}
    <div class="overlay-hint note">未连接 — 连接后指示灯实时亮起</div>
  {/if}

  <div class="secondary note">
    Gamepad API：{gamepad.connected ? `${gamepad.id}（${gamepad.mapping}）` : '未识别此设备（macOS 上 Chrome 仅识别已知厂商手柄，属正常）'}
  </div>
</div>

<style>
  .badge {
    font-size: 11px;
    font-family: var(--mono);
    padding: 2px 8px;
    border-radius: 4px;
    background: var(--card-2);
    border: 1px solid var(--border-2);
    color: var(--muted-2);
  }
  .badge.xinput {
    background: #1a2d1a;
    border-color: #3c8c3c;
    color: #5fd98a;
  }
  .overlay-hint {
    text-align: center;
    margin-top: 4px;
    opacity: 0.5;
  }
  .secondary {
    margin-top: 12px;
    padding-top: 10px;
    border-top: 1px solid var(--border);
  }
</style>
