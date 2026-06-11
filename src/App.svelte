<script lang="ts">
  import { onMount } from 'svelte';
  import { controller } from './lib/controller.svelte';
  import { gamepad } from './lib/gamepad.svelte';
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
        <div class:hidden={ui.tab !== 'trigger'}><TriggerPanel /></div>
        <div class:hidden={ui.tab !== 'vibration'}><VibrationPanel /></div>
        <div class:hidden={ui.tab !== 'buttons'}><KeyMapPanel /></div>
        <div class:hidden={ui.tab !== 'motion'}><MotionPanel /></div>
        <div class:hidden={ui.tab !== 'telemetry'}><TelemetryPanel /></div>
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
