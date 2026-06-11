<script lang="ts">
  import { controller } from '../../controller.svelte';
  import { mapping } from '../../mapping.svelte';
  import { ControllerKey, KEY_LABELS, MAPPABLE_KEYS } from '../../hid/config';
  import Panel from '../../ui/Panel.svelte';

  // 把可映射键分组展示，比一长串更易找。
  const GROUPS: { title: string; keys: ControllerKey[] }[] = [
    { title: '动作键', keys: [ControllerKey.A, ControllerKey.B, ControllerKey.X, ControllerKey.Y] },
    { title: '方向键', keys: [ControllerKey.Up, ControllerKey.Down, ControllerKey.Left, ControllerKey.Right] },
    { title: '肩键 / 扳机', keys: [ControllerKey.Lb, ControllerKey.Rb, ControllerKey.Lt, ControllerKey.Rt] },
    { title: '摇杆按下', keys: [ControllerKey.Thl, ControllerKey.Thr] },
    {
      title: '背键 / 扩展',
      keys: [ControllerKey.M1, ControllerKey.M2, ControllerKey.M3, ControllerKey.M4, ControllerKey.M5, ControllerKey.M6, ControllerKey.C, ControllerKey.Z],
    },
    {
      title: '功能键',
      keys: [ControllerKey.Start, ControllerKey.Select, ControllerKey.Menu, ControllerKey.Turbo, ControllerKey.Home, ControllerKey.Back],
    },
  ];
</script>

<Panel title="按键映射" desc="把任意物理键映射成另一个键。改完在左侧「配置档案」点「保存到手柄」即生效。">
  {#if !mapping.loaded}
    <div class="empty">
      <div class="empty-icon">🎛️</div>
      <div class="empty-t">尚未读取配置</div>
      <div class="empty-d">在左侧「配置档案」选择档位，点「读取」载入当前手柄配置后即可编辑。</div>
      <button class="btn btn-primary" disabled={!controller.connected || mapping.busy} onclick={() => mapping.read()}>
        读取配置档 {mapping.cfgId + 1}
      </button>
    </div>
  {:else}
    <div class="groups">
      {#each GROUPS as g (g.title)}
        <section class="group">
          <h3>{g.title}</h3>
          <div class="rows">
            {#each g.keys as from (from)}
              <div class="km">
                <span class="kfrom">{KEY_LABELS[from]}</span>
                <span class="kar">→</span>
                <select
                  value={mapping.mappings[from] ?? 255}
                  onchange={(e) => mapping.updateMap(from, Number((e.currentTarget as HTMLSelectElement).value))}
                  disabled={mapping.busy}
                  class:mapped={mapping.mappings[from] != null}
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
      {/each}
    </div>
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

  .groups {
    display: grid;
    gap: 20px;
  }
  .group h3 {
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 1.2px;
    text-transform: uppercase;
    color: var(--muted);
    margin: 0 0 10px;
  }
  .rows {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
    gap: 8px 12px;
  }
  .km {
    display: flex;
    align-items: center;
    gap: 8px;
    background: var(--panel-2);
    border: 1px solid var(--line);
    border-radius: 9px;
    padding: 6px 8px 6px 11px;
  }
  .kfrom {
    font-weight: 700;
    font-size: 13px;
    color: var(--text);
    min-width: 38px;
    font-family: var(--mono);
  }
  .kar {
    color: var(--muted);
  }
  .km select {
    flex: 1;
    min-width: 0;
    font-size: 12.5px;
    padding: 6px 8px;
  }
  .km select.mapped {
    color: var(--accent-2);
    border-color: var(--accent-line);
  }
</style>
