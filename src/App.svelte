<script lang="ts">
  import { onMount } from 'svelte';
  import { controller } from './lib/controller.svelte';
  import { gamepad } from './lib/gamepad.svelte';
  import { mapping } from './lib/mapping.svelte';
  import { ui, TAB_IDS, type TabId } from './lib/ui.svelte';

  import Sidebar from './lib/components/Sidebar.svelte';
  import HeroController from './lib/components/HeroController.svelte';
  import TabBar from './lib/components/TabBar.svelte';
  import DevPanel from './lib/components/DevPanel.svelte';

  import TriggerPanel from './lib/components/panels/TriggerPanel.svelte';
  import VibrationPanel from './lib/components/panels/VibrationPanel.svelte';
  import KeyMapPanel from './lib/components/panels/KeyMapPanel.svelte';
  import MotionPanel from './lib/components/panels/MotionPanel.svelte';
  import TelemetryPanel from './lib/components/panels/TelemetryPanel.svelte';

  function tabFromHash(): TabId {
    const id = location.hash.replace(/^#/, '') as TabId;
    return TAB_IDS.includes(id) ? id : 'trigger';
  }

  // 同步初始化（在下面的 $effect 首次运行前），否则 effect 会用默认值覆盖 URL 里的 tab。
  ui.tab = tabFromHash();

  // tab ↔ URL hash 双向同步：刷新/分享链接停在同一页。
  $effect(() => {
    const target = '#' + ui.tab;
    if (location.hash !== target) history.replaceState(null, '', target);
  });

  // 连接成功（首次连接 / 刷新后静默重连）即自动读取一次当前档位映射配置，
  // 让按键/体感页直接反映手柄真实配置 —— 只读不写，不改手柄。
  // 扳机是只发不收，不在此列；这里仅对可回读的 A3 映射配置生效。
  let autoReadDone = false;
  $effect(() => {
    if (!controller.connected) {
      autoReadDone = false; // 断开后允许下次重连再自动读一次
      return;
    }
    if (!autoReadDone && !mapping.loaded && !mapping.busy) {
      autoReadDone = true; // 只读一次；失败也不重试，留给用户手动「读取」
      void mapping.read();
    }
  });

  onMount(() => {
    gamepad.start();
    controller.tryRestore();
    const onHash = () => (ui.tab = tabFromHash());
    window.addEventListener('hashchange', onHash);
    return () => {
      window.removeEventListener('hashchange', onHash);
      gamepad.stop();
    };
  });
</script>

<div class="shell">
  <Sidebar />

  <main class="main">
    <div class="main-inner">
      <HeroController />

      <TabBar />

      <div class="content">
        <div class="pane" class:hidden={ui.tab !== 'trigger'}><TriggerPanel /></div>
        <div class="pane" class:hidden={ui.tab !== 'vibration'}><VibrationPanel /></div>
        <div class="pane" class:hidden={ui.tab !== 'buttons'}><KeyMapPanel /></div>
        <div class="pane" class:hidden={ui.tab !== 'motion'}><MotionPanel /></div>
        <div class="pane" class:hidden={ui.tab !== 'telemetry'}><TelemetryPanel /></div>
      </div>

      {#if ui.devMode}
        <DevPanel />
      {/if}
    </div>
  </main>
</div>

<style>
  .shell {
    display: grid;
    grid-template-columns: 252px 1fr;
    min-height: 100vh;
  }
  .main {
    min-width: 0;
    overflow-x: hidden;
  }
  .main-inner {
    max-width: 920px;
    margin: 0 auto;
    padding: 26px 26px 60px;
    display: flex;
    flex-direction: column;
    gap: 18px;
  }
  .content {
    background: linear-gradient(180deg, rgba(19, 24, 38, 0.55), rgba(12, 15, 25, 0.45));
    border: 1px solid var(--line);
    border-radius: var(--radius);
    padding: 24px 26px;
    box-shadow: 0 14px 40px rgba(0, 0, 0, 0.28);
  }
  .hidden {
    display: none;
  }
  /* 切换标签时，可见面板从 display:none 恢复显示会重放此进场动画。 */
  .content > .pane:not(.hidden) {
    animation: pane-in 0.28s cubic-bezier(0.22, 1, 0.36, 1) both;
  }
  @keyframes pane-in {
    from {
      opacity: 0;
      transform: translateY(7px);
    }
    to {
      opacity: 1;
      transform: none;
    }
  }
  /* 面板自身进场交给 .pane 统一处理，避免与 Panel 的 fade-up 叠加成双重位移。 */
  .content > .pane :global(.panel) {
    animation: none;
  }

  @media (max-width: 900px) {
    .shell {
      grid-template-columns: 1fr;
    }
    :global(.sidebar) {
      height: auto !important;
      position: static !important;
    }
    .main-inner {
      padding: 18px 16px 50px;
    }
    .content {
      padding: 20px 16px;
    }
  }
</style>
