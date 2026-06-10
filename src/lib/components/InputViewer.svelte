<script lang="ts">
  import { controller } from '../controller.svelte';
  import { gamepad } from '../gamepad.svelte';
  import { decodeXInput, pickGamepadReport } from '../hid/decode';
  import { byte2 } from '../hid/util';

  // 手动指定解码哪个 reportId；'auto' = 自动挑最像手柄的那个。
  let pick = $state<'auto' | number>('auto');

  const target = $derived.by(() => {
    if (pick === 'auto') return pickGamepadReport(controller.reports);
    return controller.reports.find((r) => r.reportId === pick) ?? null;
  });
  const pad = $derived(target ? decodeXInput(target) : null);
</script>

<div class="card">
  <h2>手柄输入（WebHID 解码）</h2>

  {#if !controller.connected}
    <div class="note">连接后这里按 XInput 布局解码摇杆 / 扳机 / 按键。</div>
  {:else if controller.reports.length === 0}
    <div class="note">
      ⚠ 已连接但 <b>未收到任何输入报文</b>。可能：① 打开的是命令接口 collection 而手柄输入在另一个 collection；
      ② 手柄未上报。请在下方「原始输入报文」核对，并告诉我结果。
    </div>
  {:else}
    <div class="row" style="margin-top:0">
      <span class="f">解码源</span>
      <select bind:value={pick}>
        <option value="auto">自动</option>
        {#each controller.reports as r (r.reportId)}
          <option value={r.reportId}>ID {byte2(r.reportId)}（{r.bytes.length} 字节）</option>
        {/each}
      </select>
      {#if pad}
        <span class="note">解码 ID {byte2(pad.reportId)} · 偏移 {pad.offset}</span>
      {/if}
    </div>

    {#if !pad}
      <div class="note">选中的报文太短，无法按 XInput 解码。</div>
    {:else}
      <div class="grid">
        <div class="stick">
          <div class="pad">
            <div class="dot" style="left:{50 + pad.lx * 42}%; top:{50 + pad.ly * 42}%"></div>
          </div>
          <div class="note">L {pad.lx.toFixed(2)}, {pad.ly.toFixed(2)}</div>
        </div>
        <div class="stick">
          <div class="pad">
            <div class="dot" style="left:{50 + pad.rx * 42}%; top:{50 + pad.ry * 42}%"></div>
          </div>
          <div class="note">R {pad.rx.toFixed(2)}, {pad.ry.toFixed(2)}</div>
        </div>

        <div class="triggers">
          <div class="trig">
            <span class="tlabel">LT</span>
            <div class="bar"><div class="fill" style="width:{pad.lt * 100}%"></div></div>
            <span class="tval">{pad.lt.toFixed(2)}</span>
          </div>
          <div class="trig">
            <span class="tlabel">RT</span>
            <div class="bar"><div class="fill" style="width:{pad.rt * 100}%"></div></div>
            <span class="tval">{pad.rt.toFixed(2)}</span>
          </div>
        </div>
      </div>

      <div class="btns">
        {#each pad.buttons as b (b.name)}
          <span class="btn" class:on={b.pressed}>{b.name}</span>
        {/each}
      </div>
    {/if}
  {/if}

  <div class="secondary note">
    Gamepad API：{gamepad.connected ? `${gamepad.id}（${gamepad.mapping}）` : '未识别此设备（macOS 上 Chrome 仅识别已知厂商手柄，属正常）'}
  </div>
</div>

<style>
  .grid {
    display: flex;
    gap: 18px;
    align-items: flex-start;
    flex-wrap: wrap;
    margin-top: 6px;
  }
  .stick {
    text-align: center;
  }
  .pad {
    position: relative;
    width: 96px;
    height: 96px;
    border-radius: 50%;
    background: var(--card-2);
    border: 1px solid var(--border-2);
  }
  .pad::after {
    content: '';
    position: absolute;
    inset: 50% auto auto 50%;
    width: 6px;
    height: 6px;
    margin: -3px 0 0 -3px;
    border-radius: 50%;
    background: var(--border-2);
  }
  .dot {
    position: absolute;
    width: 14px;
    height: 14px;
    margin: -7px 0 0 -7px;
    border-radius: 50%;
    background: var(--accent);
    box-shadow: 0 0 8px rgba(45, 108, 255, 0.6);
  }
  .triggers {
    flex: 1;
    min-width: 220px;
    display: flex;
    flex-direction: column;
    gap: 14px;
    padding-top: 8px;
  }
  .trig {
    display: flex;
    align-items: center;
    gap: 10px;
  }
  .tlabel {
    width: 28px;
    color: var(--muted-2);
    font-size: 13px;
  }
  .bar {
    flex: 1;
    height: 14px;
    border-radius: 7px;
    background: var(--card-2);
    border: 1px solid var(--border-2);
    overflow: hidden;
  }
  .fill {
    height: 100%;
    background: linear-gradient(90deg, #2d6cff, #5fd98a);
  }
  .tval {
    width: 40px;
    font-family: var(--mono);
  }
  .btns {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    margin-top: 16px;
  }
  .btn {
    min-width: 30px;
    text-align: center;
    padding: 4px 8px;
    border-radius: 6px;
    font-size: 12px;
    background: var(--accent-soft);
    border: 1px solid var(--border-2);
    color: var(--muted-2);
    font-family: var(--mono);
  }
  .btn.on {
    background: var(--accent);
    border-color: var(--accent);
    color: #fff;
  }
  .secondary {
    margin-top: 16px;
    padding-top: 10px;
    border-top: 1px solid var(--border);
  }
</style>
