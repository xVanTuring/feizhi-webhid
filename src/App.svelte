<script lang="ts">
  import { onMount } from 'svelte';
  import { controller } from './lib/controller.svelte';
  import { gamepad } from './lib/gamepad.svelte';
  import ConnectionCard from './lib/components/ConnectionCard.svelte';
  import TriggerConfigCard from './lib/components/TriggerConfigCard.svelte';
  import GripBindCard from './lib/components/GripBindCard.svelte';
  import ConfigCard from './lib/components/ConfigCard.svelte';
  import TelemetryCard from './lib/components/TelemetryCard.svelte';
  import InputViewer from './lib/components/InputViewer.svelte';
  import RawMonitor from './lib/components/RawMonitor.svelte';
  import LogPanel from './lib/components/LogPanel.svelte';

  const TABS = [
    { id: 'effect', label: '扳机效果', hint: 'cmd81 手动测试' },
    { id: 'grip', label: '内置震动 · WRC7类', hint: 'cmd82 rumble 绑定' },
    { id: 'config', label: '配置 · 键位/体感', hint: '按键映射 / 陀螺仪' },
    { id: 'telemetry', label: '遥测驱动', hint: '真·力反馈 (规划中)' },
    { id: 'input', label: '输入监视', hint: 'WebHID 解码 / 原始' },
    { id: 'log', label: '日志', hint: '收发记录' },
  ];
  const TAB_IDS = TABS.map((t) => t.id);

  /** 从 URL hash 取当前 tab（非法/缺省回退到第一个）。 */
  function tabFromHash(): string {
    const id = location.hash.replace(/^#/, '');
    return TAB_IDS.includes(id) ? id : TABS[0].id;
  }

  // 用 URL hash 记住当前 tab：刷新/收藏/分享链接都能停在同一页。
  let tab = $state(tabFromHash());

  // tab 变化 → 写回 hash（replaceState 不进历史栈、也不触发 hashchange，无循环）。
  $effect(() => {
    const target = '#' + tab;
    if (location.hash !== target) history.replaceState(null, '', target);
  });

  onMount(() => {
    gamepad.start();
    controller.tryRestore();
    // 手动改 URL / 浏览器前进后退时同步回来。
    const onHash = () => (tab = tabFromHash());
    window.addEventListener('hashchange', onHash);
    return () => {
      window.removeEventListener('hashchange', onHash);
      gamepad.stop();
    };
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
  <div class:hidden={tab !== 'config'}><ConfigCard /></div>
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
