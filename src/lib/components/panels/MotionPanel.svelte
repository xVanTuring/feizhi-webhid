<script lang="ts">
  import { controller } from '../../controller.svelte';
  import { mapping } from '../../mapping.svelte';
  import { MotionMapType } from '../../hid/config';
  import Panel from '../../ui/Panel.svelte';
  import Segmented from '../../ui/Segmented.svelte';
  import Slider from '../../ui/Slider.svelte';

  const MODES = [
    { value: MotionMapType.Off, label: '关闭' },
    { value: MotionMapType.LeftJoystick, label: '左摇杆' },
    { value: MotionMapType.RightJoystick, label: '右摇杆' },
    { value: MotionMapType.Mouse, label: '鼠标' },
  ];
</script>

<Panel
  title="体感 / 陀螺仪"
  desc="把手柄的陀螺仪运动映射成摇杆或鼠标。改完在左侧「配置档案」点「保存到手柄」即生效。"
>
  {#if !mapping.loaded}
    <div class="empty">
      <div class="empty-icon">🧭</div>
      <div class="empty-t">尚未读取配置</div>
      <div class="empty-d">在左侧「配置档案」选择档位，点「读取」载入当前手柄配置后即可编辑。</div>
      <button class="btn btn-primary" disabled={!controller.connected || mapping.busy} onclick={() => mapping.read()}>
        读取配置档 {mapping.cfgId + 1}
      </button>
    </div>
  {:else}
    <div class="field">
      <span class="flabel">映射为</span>
      <Segmented
        value={mapping.motionMode}
        options={MODES}
        disabled={mapping.busy}
        onchange={(m) => mapping.updateMotionMode(m)}
      />
    </div>

    {#if mapping.motionMode !== MotionMapType.Off}
      <div class="sliders">
        <Slider
          label="灵敏度"
          min={1}
          max={255}
          bind:value={mapping.motionSens}
          oninput={() => mapping.updateMotionParams()}
          disabled={mapping.busy}
        />
        <Slider
          label="死区"
          min={0}
          max={255}
          bind:value={mapping.motionDead}
          oninput={() => mapping.updateMotionParams()}
          disabled={mapping.busy}
        />
      </div>
    {:else}
      <p class="off-note note">体感已关闭。选择「左摇杆 / 右摇杆 / 鼠标」以启用并显示灵敏度与死区。</p>
    {/if}
  {/if}
</Panel>

<style>
  .empty {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 9px;
    text-align: center;
    padding: 40px 20px;
  }
  .empty-icon {
    font-size: 36px;
    opacity: 0.7;
  }
  .empty-t {
    font-size: 15px;
    font-weight: 600;
  }
  .empty-d {
    font-size: 12.5px;
    color: var(--muted-2);
    max-width: 360px;
    margin-bottom: 6px;
  }

  .field {
    display: flex;
    align-items: center;
    gap: 16px;
    margin-bottom: 22px;
  }
  .flabel {
    font-size: 13px;
    color: var(--text-2);
    font-weight: 600;
  }
  .sliders {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
    gap: 20px 30px;
    max-width: 560px;
  }
  .off-note {
    margin: 0;
  }
</style>
