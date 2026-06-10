<script lang="ts">
  // 占位/路线说明卡：②类真实遥测驱动（真·力反馈），尚未接真实遥测源。
</script>

<div class="card">
  <h2>遥测驱动 · 真·力反馈（②类）<span class="badge">规划中</span></h2>

  <div class="note block">
    与「内置震动」不同：这条路<b>读游戏的真实遥测</b>(车速 / 油门 / 刹车 / 挡位 / 打滑)，
    把它映射成 <code>Race / Recoil</code> 的<b>可变阻力</b>(cmd81)——阻力随车况实时变、且和扳机行程挂钩。
    这才是真按刹车力度顶手指，而不是把全局震动搬到扳机。
  </div>

  <div class="steps">
    <div class="step"><span class="n">1</span><div><b>数据源</b>：F1 23/24/25、WRC、尘埃拉力赛等都广播官方 UDP 遥测，无需逆向内存。</div></div>
    <div class="step"><span class="n">2</span><div><b>映射</b>：刹车力度→左扳机阻力；油门负荷→右扳机阻力；打滑/红线→脉冲。</div></div>
    <div class="step"><span class="n">3</span><div><b>下发</b>：节流去抖后连续发 cmd81，复用现有效果引擎。</div></div>
  </div>

  <div class="note">
    雏形已在 <code>udp-trigger-test/racing_sim.py</code>(合成车况→cmd81 连续发)。下一步把合成车况换成真实遥测包，
    或把这套搬进本页直接走 WebHID。免飞智服务。
  </div>
</div>

<style>
  .badge {
    font-size: 11px;
    font-weight: 400;
    color: var(--warn-fg);
    border: 1px solid var(--warn-fg);
    border-radius: 10px;
    padding: 1px 8px;
    margin-left: 8px;
  }
  .block {
    margin-bottom: 14px;
  }
  .steps {
    display: flex;
    flex-direction: column;
    gap: 10px;
    margin-bottom: 14px;
  }
  .step {
    display: flex;
    gap: 10px;
    align-items: flex-start;
    font-size: 13px;
    color: var(--muted-2);
  }
  .step .n {
    flex: none;
    width: 20px;
    height: 20px;
    border-radius: 50%;
    background: var(--accent-soft);
    border: 1px solid var(--border-2);
    color: var(--text);
    font-size: 12px;
    text-align: center;
    line-height: 19px;
  }
</style>
