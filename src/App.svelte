<script lang="ts">
  import { onMount } from 'svelte';
  import { controller } from './lib/controller.svelte';
  import { gamepad } from './lib/gamepad.svelte';
  import ConnectionCard from './lib/components/ConnectionCard.svelte';
  import TriggerConfigCard from './lib/components/TriggerConfigCard.svelte';
  import GripBindCard from './lib/components/GripBindCard.svelte';
  import TelemetryCard from './lib/components/TelemetryCard.svelte';
  import InputViewer from './lib/components/InputViewer.svelte';
  import RawMonitor from './lib/components/RawMonitor.svelte';
  import LogPanel from './lib/components/LogPanel.svelte';

  const TABS = [
    { id: 'effect', label: '扳机效果', hint: 'cmd81 手动测试' },
    { id: 'grip', label: '内置震动 · WRC7类', hint: 'cmd82 rumble 绑定' },
    { id: 'telemetry', label: '遥测驱动', hint: '真·力反馈 (规划中)' },
    { id: 'input', label: '输入监视', hint: 'WebHID 解码 / 原始' },
    { id: 'log', label: '日志', hint: '收发记录' },
  ];
  let tab = $state('effect');

  onMount(() => {
    gamepad.start();
    controller.tryRestore();
    return () => gamepad.stop();
  });
</script>

<div class="app">
  <h1>飞智八爪鱼5 · WebHID 配置台</h1>
  <div class="sub">
    直接对手柄发命令（厂商接口 0xFFA0），不经任何飞智软件/驱动。
    {#if !controller.supported}
      <b style="color:var(--bad-fg)">当前浏览器不支持 WebHID，请用 Chrome / Edge。</b>
    {:else}
      仅 Chrome / Edge 可用。
    {/if}
  </div>

  <ConnectionCard />

  <nav class="tabs">
    {#each TABS as t (t.id)}
      <button class="tab" class:on={tab === t.id} onclick={() => (tab = t.id)}>
        <span class="tlabel">{t.label}</span>
        <span class="thint">{t.hint}</span>
      </button>
    {/each}
  </nav>

  <!-- CSS 隐藏而非卸载：切 tab 不丢各页的本地状态（滑块值/选中的游戏等） -->
  <div class:hidden={tab !== 'effect'}><TriggerConfigCard /></div>
  <div class:hidden={tab !== 'grip'}><GripBindCard /></div>
  <div class:hidden={tab !== 'telemetry'}><TelemetryCard /></div>
  <div class:hidden={tab !== 'input'}>
    <InputViewer />
    <RawMonitor />
  </div>
  <div class:hidden={tab !== 'log'}><LogPanel /></div>

  <div class="note" style="margin-top:6px">
    提示：① 手柄需 <b>NewXInput / 增强模式</b>；② 别同时开飞智空间站（抢设备）；
    ③ 跑在 <code>https</code> 或 <code>localhost</code>；④ VID <code>0x37D7</code>。
  </div>
</div>
