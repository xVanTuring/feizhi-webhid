<script lang="ts">
  import { controller } from '../controller.svelte';
  import {
    ControllerKey,
    KEY_LABELS,
    MAPPABLE_KEYS,
    MotionMapType,
    bumpDataVersion,
    getDataVersion,
    getKeyMap,
    getMotionMap,
    setKeyMap,
    setMotionMap,
  } from '../hid/config';

  let rawConfig = $state<Uint8Array | null>(null);
  let busy = $state(false);
  let cfgId = $state(0);
  let status = $state('');

  let mappings = $state<Record<number, number | null>>({});
  let motionMode = $state<MotionMapType>(MotionMapType.Off);
  let motionSens = $state(50);
  let motionDead = $state(10);

  function refreshFromRaw() {
    if (!rawConfig) return;
    const next: Record<number, number | null> = {};
    for (const k of MAPPABLE_KEYS) next[k] = getKeyMap(rawConfig, k);
    mappings = next;
    const m = getMotionMap(rawConfig);
    motionMode = m.mode;
    motionSens = m.sensitivity;
    motionDead = m.deadZone;
  }

  async function readConfig() {
    if (!controller.connected) {
      status = '未连接';
      return;
    }
    busy = true;
    status = '正在读取配置…';
    try {
      rawConfig = await controller.readMappingConfig(cfgId);
      refreshFromRaw();
      status = `已读取 cfg ${cfgId}，版本 ${getDataVersion(rawConfig)}`;
    } catch (e) {
      status = '读取失败: ' + (e instanceof Error ? e.message : String(e));
    } finally {
      busy = false;
    }
  }

  function updateMap(from: ControllerKey, to: number | null) {
    if (!rawConfig) return;
    setKeyMap(rawConfig, from, to == null || to === ControllerKey.None ? null : to);
    rawConfig = rawConfig; // 触发 $state 响应
    mappings = { ...mappings, [from]: to == null || to === ControllerKey.None ? null : to };
  }

  function updateMotionMode(mode: MotionMapType) {
    if (!rawConfig) return;
    if (mode === MotionMapType.Off) {
      setMotionMap(rawConfig, MotionMapType.Off);
    } else {
      setMotionMap(rawConfig, mode, { sensitivity: motionSens, deadZone: motionDead });
    }
    rawConfig = rawConfig;
    motionMode = mode;
  }

  function updateMotionParams() {
    if (!rawConfig || motionMode === MotionMapType.Off) return;
    setMotionMap(rawConfig, motionMode, { sensitivity: motionSens, deadZone: motionDead });
    rawConfig = rawConfig;
  }

  async function writeConfig() {
    if (!rawConfig) {
      status = '请先读取配置';
      return;
    }
    if (!controller.connected) {
      status = '未连接';
      return;
    }
    busy = true;
    status = '正在写入…';
    try {
      bumpDataVersion(rawConfig);
      await controller.writeAllMappingConfig(cfgId, rawConfig);
      const version = getDataVersion(rawConfig);
      await controller.saveMappingConfig(version); // 先持久化到 flash
      await controller.applyMappingConfig(cfgId); // 再切到该档
      status = `已保存，版本 ${version}`;
    } catch (e) {
      status = '写入失败: ' + (e instanceof Error ? e.message : String(e));
    } finally {
      busy = false;
    }
  }

  const MOTION_OPTIONS: { v: MotionMapType; label: string }[] = [
    { v: MotionMapType.Off, label: '关闭' },
    { v: MotionMapType.LeftJoystick, label: '左摇杆' },
    { v: MotionMapType.RightJoystick, label: '右摇杆' },
    { v: MotionMapType.Mouse, label: '鼠标' },
  ];
</script>

<div class="card">
  <h2>配置 · 键位 / 体感</h2>
  <div class="note block">
    先<b>读取</b>当前配置，再改按键映射或体感开关，最后<b>写入保存</b>。修改会立即作用在内存中的原始字节上。
  </div>

  <div class="primary">
    <label class="field">
      <span>配置档 ID</span>
      <input type="number" min="0" max="3" bind:value={cfgId} disabled={busy} style="width:70px" />
    </label>
    <button onclick={readConfig} disabled={!controller.connected || busy}>读取配置</button>
    <button class="sec" onclick={writeConfig} disabled={!rawConfig || !controller.connected || busy}>
      写入并保存
    </button>
    <span class="pill {status.includes('失败') ? 'bad' : status ? 'ok' : ''}">{status || '就绪'}</span>
  </div>

  {#if rawConfig}
    <div class="sections">
      <section>
        <h3>按键映射</h3>
        <div class="km-grid">
          {#each MAPPABLE_KEYS as from (from)}
            <div class="km-row">
              <span class="kfrom">{KEY_LABELS[from]}</span>
              <span class="arrow">→</span>
              <select
                value={mappings[from] ?? 255}
                onchange={(e) => updateMap(from, Number((e.currentTarget as HTMLSelectElement).value))}
                disabled={busy}
              >
                <option value={255}>不映射</option>
                {#each MAPPABLE_KEYS as to (to)}
                  <option value={to}>{KEY_LABELS[to]}</option>
                {/each}
              </select>
            </div>
          {/each}
        </div>
      </section>

      <section>
        <h3>陀螺仪 / 体感</h3>
        <div class="row">
          <span class="f">映射模式</span>
          <div class="seg">
            {#each MOTION_OPTIONS as opt (opt.v)}
              <button
                class={motionMode === opt.v ? 'on' : ''}
                onclick={() => updateMotionMode(opt.v)}
                disabled={busy}
              >
                {opt.label}
              </button>
            {/each}
          </div>
        </div>
        {#if motionMode !== MotionMapType.Off}
          <div class="row">
            <span class="f">灵敏度</span>
            <input
              type="range"
              min="1"
              max="255"
              bind:value={motionSens}
              oninput={updateMotionParams}
              disabled={busy}
            />
            <span class="val">{motionSens}</span>
          </div>
          <div class="row">
            <span class="f">死区</span>
            <input
              type="range"
              min="0"
              max="255"
              bind:value={motionDead}
              oninput={updateMotionParams}
              disabled={busy}
            />
            <span class="val">{motionDead}</span>
          </div>
        {/if}
      </section>
    </div>
  {/if}
</div>

<style>
  .block {
    margin-bottom: 12px;
  }
  .primary {
    display: flex;
    gap: 10px;
    align-items: center;
    flex-wrap: wrap;
    margin-bottom: 12px;
  }
  .field {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 13px;
    color: var(--muted-2);
  }
  .sections {
    display: grid;
    gap: 14px;
  }
  section h3 {
    font-size: 13px;
    margin: 0 0 8px;
    color: var(--muted-2);
  }
  .km-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
    gap: 6px 10px;
  }
  .km-row {
    display: flex;
    align-items: center;
    gap: 6px;
    background: var(--card-2);
    border: 1px solid var(--border);
    border-radius: 6px;
    padding: 5px 8px;
    font-size: 13px;
  }
  .kfrom {
    width: 48px;
    color: var(--text);
  }
  .arrow {
    color: var(--muted);
  }
  .km-row select {
    flex: 1;
    min-width: 0;
    font-size: 13px;
    padding: 4px 6px;
  }
</style>
