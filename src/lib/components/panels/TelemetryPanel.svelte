<script lang="ts">
  import Panel from '../../ui/Panel.svelte';

  const STEPS = [
    { t: '数据源', d: 'F1 23/24/25、WRC、尘埃拉力赛等都广播官方 UDP 遥测，无需逆向内存。' },
    { t: '映射', d: '刹车力度 → 左扳机阻力；油门负荷 → 右扳机阻力；打滑 / 红线 → 脉冲。' },
    { t: '下发', d: '节流去抖后连续发 cmd81，复用现有效果引擎。' },
  ];
</script>

<Panel
  title="遥测驱动 · 真·力反馈"
  badge="规划中"
  badgeTone="warn"
  desc="与「内置震动」不同：这条路读游戏的真实遥测（车速 / 油门 / 刹车 / 挡位 / 打滑），把它映射成 Race / Recoil 的可变阻力（cmd81）—— 阻力随车况实时变、且和扳机行程挂钩。这才是真按刹车力度顶手指。"
>
  <div class="steps">
    {#each STEPS as s, i (s.t)}
      <div class="step">
        <span class="n">{i + 1}</span>
        <div>
          <div class="st">{s.t}</div>
          <div class="sd">{s.d}</div>
        </div>
      </div>
    {/each}
  </div>

  <div class="note foot">
    雏形已在 <code>udp-trigger-test/racing_sim.py</code>（合成车况 → cmd81 连续发）。下一步把合成车况换成真实遥测包，或把这套搬进本页直接走 WebHID。免飞智服务。
  </div>
</Panel>

<style>
  .steps {
    display: grid;
    gap: 12px;
    margin-bottom: 18px;
  }
  .step {
    display: flex;
    gap: 13px;
    align-items: flex-start;
    padding: 13px 15px;
    background: var(--panel-2);
    border: 1px solid var(--line);
    border-radius: var(--radius-sm);
  }
  .n {
    flex: none;
    width: 26px;
    height: 26px;
    border-radius: 8px;
    background: var(--accent-soft);
    border: 1px solid var(--accent-line);
    color: var(--accent-2);
    font-family: var(--mono);
    font-weight: 700;
    font-size: 13px;
    display: grid;
    place-items: center;
  }
  .st {
    font-size: 13.5px;
    font-weight: 600;
    color: var(--text);
  }
  .sd {
    font-size: 12.5px;
    color: var(--muted-2);
    margin-top: 3px;
  }
  .foot {
    line-height: 1.7;
  }
</style>
