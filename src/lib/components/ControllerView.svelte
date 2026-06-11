<script lang="ts">
  import type { DecodedPad } from '../hid/decode';
  import { ControllerKey as K, KEY_LABELS, type KeyMapping } from '../hid/config';

  let {
    pad = null,
    interactive = false,
    mappings = {},
    selected = null,
    onpick,
  }: {
    pad?: DecodedPad | null;
    /** 映射模式：按键可点选，显示映射状态。 */
    interactive?: boolean;
    /** 物理键 → 映射形态。 */
    mappings?: Record<number, KeyMapping>;
    /** 当前选中的物理键。 */
    selected?: ControllerKey | null;
    onpick?: (key: ControllerKey) => void;
  } = $props();

  type ControllerKey = K;

  // 可点选按键的命中区，坐标镜像下方各按键的绘制坐标。
  // compact = 只画高亮点不画目标气泡（D-pad / Home 等局促处）。
  type Hit = {
    key: ControllerKey;
    kind: 'circle' | 'rect';
    cx?: number; cy?: number; r?: number;
    x?: number; y?: number; w?: number; h?: number;
    rot?: [number, number, number];
    side?: 'above' | 'below';
    bx?: number; by?: number;
    compact?: boolean;
  };

  const HIT: Hit[] = [
    { key: K.Lt, kind: 'rect', x: 6, y: 3, w: 40, h: 48, side: 'below' },
    { key: K.Rt, kind: 'rect', x: 460, y: 3, w: 40, h: 48, side: 'below' },
    { key: K.M5, kind: 'rect', x: 53, y: 13, w: 58, h: 28, side: 'below' },
    { key: K.M6, kind: 'rect', x: 397, y: 13, w: 58, h: 28, side: 'below' },
    { key: K.Lb, kind: 'rect', x: 9, y: 51, w: 75, h: 28, side: 'below' },
    { key: K.Rb, kind: 'rect', x: 423, y: 51, w: 75, h: 28, side: 'below' },
    { key: K.Thl, kind: 'circle', cx: 132.5, cy: 168.5, r: 32.5, side: 'above' },
    { key: K.Thr, kind: 'circle', cx: 317.5, cy: 232.5, r: 32.5, side: 'above' },
    { key: K.Up, kind: 'circle', cx: 198, cy: 206, r: 13, compact: true },
    { key: K.Down, kind: 'circle', cx: 198, cy: 260, r: 13, compact: true },
    { key: K.Left, kind: 'circle', cx: 172, cy: 233, r: 13, compact: true },
    { key: K.Right, kind: 'circle', cx: 226, cy: 233, r: 13, compact: true },
    { key: K.A, kind: 'circle', cx: 380, cy: 204, r: 14, side: 'below' },
    { key: K.B, kind: 'circle', cx: 409, cy: 175, r: 14, side: 'above' },
    { key: K.X, kind: 'circle', cx: 351, cy: 175, r: 14, side: 'above' },
    { key: K.Y, kind: 'circle', cx: 380, cy: 146, r: 14, side: 'above' },
    { key: K.Home, kind: 'circle', cx: 253, cy: 112, r: 16, compact: true },
    { key: K.Select, kind: 'rect', x: 171, y: 118, w: 40, h: 18, rot: [51, 191, 127], bx: 191, by: 103 },
    { key: K.Start, kind: 'rect', x: 296, y: 118, w: 40, h: 18, rot: [-51, 316, 127], bx: 316, by: 103 },
    { key: K.M2, kind: 'rect', x: 153, y: 308, w: 68, h: 44, side: 'above' },
    { key: K.M1, kind: 'rect', x: 287, y: 308, w: 68, h: 44, side: 'above' },
    { key: K.M4, kind: 'rect', x: 136, y: 368, w: 97, h: 36, side: 'above' },
    { key: K.M3, kind: 'rect', x: 275, y: 368, w: 97, h: 36, side: 'above' },
  ];

  const isMapped = (h: Hit) => {
    const m = mappings[h.key];
    return m != null && m.kind !== 'none';
  };
  const isTurbo = (h: Hit) => mappings[h.key]?.kind === 'turbo';
  function targetLabel(h: Hit): string {
    const m = mappings[h.key];
    if (!m) return '';
    if (m.kind === 'key' || m.kind === 'turbo') return KEY_LABELS[m.target] ?? '';
    if (m.kind === 'macro') return '宏';
    if (m.kind === 'special') return 'KB';
    return '';
  }

  function badgeAt(h: Hit): { x: number; y: number } {
    if (h.bx != null && h.by != null) return { x: h.bx, y: h.by };
    if (h.kind === 'circle')
      return { x: h.cx!, y: h.side === 'above' ? h.cy! - h.r! - 11 : h.cy! + h.r! + 11 };
    const cx = h.x! + h.w! / 2;
    return { x: cx, y: h.side === 'above' ? h.y! - 11 : h.y! + h.h! + 11 };
  }
  const dotX = (h: Hit) => (h.kind === 'circle' ? h.cx! + h.r! * 0.66 : h.x! + h.w! - 6);
  const dotY = (h: Hit) => (h.kind === 'circle' ? h.cy! - h.r! * 0.66 : h.y! + 6);
  const transform = (h: Hit) => (h.rot ? `rotate(${h.rot[0]} ${h.rot[1]} ${h.rot[2]})` : undefined);
  const aria = (h: Hit) =>
    `${KEY_LABELS[h.key]}${isMapped(h) ? '，映射为 ' + targetLabel(h) : '，未映射'}`;

  function onKey(ev: KeyboardEvent, key: ControllerKey) {
    if (ev.key === 'Enter' || ev.key === ' ') {
      ev.preventDefault();
      onpick?.(key);
    }
  }

  const b = (name: string) => pad?.buttons.find(x => x.name === name)?.pressed ?? false;
  const lt = $derived(pad?.lt ?? 0);
  const rt = $derived(pad?.rt ?? 0);
  const lx = $derived(pad?.lx ?? 0);
  const ly = $derived(pad?.ly ?? 0);
  const rx = $derived(pad?.rx ?? 0);
  const ry = $derived(pad?.ry ?? 0);

  const LCX = 132.5, LCY = 168.5; // left stick center
  const RCX = 317.5, RCY = 232.5; // right stick center
  const STICK_MOVE = 18;

  // 按钮活跃色辅助
  const ac = (active: boolean, color = '#3b82f6') => active ? color : 'none';
  const sc = (active: boolean, color = '#60a5fa') => active ? color : '#3a3d45';
</script>

<!--
  坐标系 508×421，路径来自 device_wireframe_k5，按钮坐标来自 device_config_k5。
-->
<div class="wrap">
  <svg viewBox="0 0 508 421" xmlns="http://www.w3.org/2000/svg" class="svg">
    <defs>
      <filter id="glow" x="-60%" y="-60%" width="220%" height="220%">
        <feGaussianBlur in="SourceGraphic" stdDeviation="3" result="b"/>
        <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
      </filter>
      <filter id="glow-sm" x="-40%" y="-40%" width="180%" height="180%">
        <feGaussianBlur in="SourceGraphic" stdDeviation="2" result="b"/>
        <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
      </filter>
      <clipPath id="lt-clip"><rect x="6"   y="3" width="40" height="48" rx="4"/></clipPath>
      <clipPath id="rt-clip"><rect x="460" y="3" width="40" height="48" rx="4"/></clipPath>
    </defs>

    <!-- ══ 控制器轮廓（来自 device_wireframe_k5） ══ -->

    <!-- 外轮廓（含手柄两侧大弧线）-->
    <path d="M185.721 298.199C159.773 298.199 148.447 311.849 132.698 334.948C117.473 355.423 97.5235 380.622 88.5987 382.722C71.2742 384.297 35.05 378.522 34 313.949C35.5551 232.051 77.574 136.503 85.4488 124.428C89.0826 118.856 91.8222 116.75 94.0801 115.014C96.7152 112.988 98.6943 111.466 100.673 105.529C103.928 95.7653 109.241 93.4131 124.635 86.5983C126.623 85.7179 128.78 84.763 131.123 83.7081C151.296 74.6228 158.901 74.3322 166.482 74.0425C166.595 74.0382 166.709 74.0338 166.822 74.0295C177.138 73.6327 183.235 77.3248 187.788 80.0815C190.417 81.6739 192.532 82.9543 194.646 82.9543H312.768C314.883 82.9543 316.997 81.6739 319.627 80.0815C324.18 77.3248 330.277 73.6327 340.593 74.0295L340.932 74.0425C348.513 74.3322 356.118 74.6228 376.292 83.7081C378.634 84.763 380.791 85.7179 382.78 86.5983C398.173 93.4131 403.487 95.7653 406.741 105.529C408.72 111.466 410.699 112.988 413.334 115.014C415.592 116.75 418.332 118.856 421.966 124.428C429.84 136.503 471.859 232.051 473.414 313.949C472.364 378.522 436.14 384.297 418.816 382.722C409.891 380.622 389.941 355.423 374.717 334.948C358.967 311.849 347.642 298.199 321.693 298.199H185.721Z"
          fill="#1a1b1f" stroke="#3e4049" stroke-width="1.2"/>

    <!-- 内层（肩膀以下简化轮廓） -->
    <path d="M185.721 298.199C159.773 298.199 148.447 311.849 132.698 334.948C117.473 355.423 97.5235 380.622 88.5987 382.722C71.2742 384.297 35.05 378.522 34 313.949C35.5551 232.05 77.574 136.503 85.4488 124.428C101.251 102.664 147.489 82.9541 194.646 82.9541H312.768C328.912 82.9541 393.958 87.7807 421.966 124.428C429.84 136.503 471.859 232.05 473.414 313.949C472.364 378.522 436.14 384.297 418.816 382.722C409.891 380.622 389.941 355.423 374.717 334.948C358.967 311.849 347.642 298.199 321.693 298.199H185.721Z"
          fill="#202126" stroke="#31333c" stroke-width="0.8"/>

    <!-- 顶部肩区（折叠三角形面板） -->
    <path d="M228.67 186.5H281.814C283.991 186.5 286.053 185.555 287.473 183.923L287.748 183.587L352.314 100.072C355.949 95.3713 352.929 88.5869 347.089 88.0996L346.809 88.0811C326.172 87.0877 288.066 85.5 255.298 85.5C226.466 85.5 192.187 86.7292 169.587 87.7012L160.666 88.0977C154.651 88.3738 151.496 95.2489 155.075 100.005L155.25 100.229L222.841 183.719C224.265 185.478 226.407 186.5 228.67 186.5Z"
          fill="#252730" stroke="#3e4049" stroke-width="1"/>

    <!-- 屏幕 / 中控面板 -->
    <rect x="219" y="137" width="70" height="34" rx="2" fill="#0d0f14" stroke="#2a2d38" stroke-width="1"/>

    <!-- D-pad 底盘（十字形） -->
    <path d="M206.6 193C209.214 193 211.334 195.12 211.334 197.734V219.667H233.266C235.88 219.667 238 221.787 238 224.401V241.6C238 244.214 235.88 246.334 233.266 246.334H211.334V268.267C211.334 270.881 209.214 273 206.6 273H189.401C186.787 273 184.667 270.881 184.667 268.267V246.334H162.734C160.12 246.334 158 244.214 158 241.6V224.401C158 221.787 160.12 219.667 162.734 219.667H184.667V197.734C184.667 195.12 186.787 193 189.401 193H206.6Z"
          fill="#17181d" stroke="#2e3040" stroke-width="1"/>

    <!-- ══ LT / RT 扳机 ══ -->
    <rect x="6"   y="3" width="40" height="48" rx="4" fill="#17181d" stroke={sc(lt>0.05)} stroke-width="1.2"/>
    <rect x="6"   y={3 + 48*(1-lt)} width="40" height={48*lt} rx="2"
          fill="#3b82f6" opacity={0.25 + lt*0.65} clip-path="url(#lt-clip)"/>
    <text x="26"  y="23" text-anchor="middle" class="lbl" class:on={lt>0.05}>LT</text>
    <text x="26"  y="38" text-anchor="middle" class="tval" class:on={lt>0.05}>{(lt*100).toFixed(0)}%</text>

    <rect x="460" y="3" width="40" height="48" rx="4" fill="#17181d" stroke={sc(rt>0.05)} stroke-width="1.2"/>
    <rect x="460" y={3 + 48*(1-rt)} width="40" height={48*rt} rx="2"
          fill="#3b82f6" opacity={0.25 + rt*0.65} clip-path="url(#rt-clip)"/>
    <text x="480" y="23" text-anchor="middle" class="lbl" class:on={rt>0.05}>RT</text>
    <text x="480" y="38" text-anchor="middle" class="tval" class:on={rt>0.05}>{(rt*100).toFixed(0)}%</text>

    <!-- ══ RM-L / RM-R（M5/M6，在 LT↔LB 和 RT↔RB 之间） ══ -->
    <rect x="53" y="13" width="58" height="28" rx="4"
          fill={ac(b('M5'),'#5b21b6')} stroke={sc(b('M5'),'#a78bfa')} stroke-width="1.2"
          filter={b('M5') ? 'url(#glow-sm)' : undefined}/>
    <text x="82" y="30" text-anchor="middle" class="lbl" class:on={b('M5')}>RM-L</text>

    <rect x="397" y="13" width="58" height="28" rx="4"
          fill={ac(b('M6'),'#5b21b6')} stroke={sc(b('M6'),'#a78bfa')} stroke-width="1.2"
          filter={b('M6') ? 'url(#glow-sm)' : undefined}/>
    <text x="426" y="30" text-anchor="middle" class="lbl" class:on={b('M6')}>RM-R</text>

    <!-- ══ LB / RB ══ -->
    <rect x="9"   y="51" width="75" height="28" rx="4"
          fill={ac(b('LB'),'#1d4ed8')} stroke={sc(b('LB'))} stroke-width="1.2"
          filter={b('LB') ? 'url(#glow-sm)' : undefined}/>
    <text x="46.5" y="69" text-anchor="middle" class="lbl" class:on={b('LB')}>LB</text>

    <rect x="423" y="51" width="75" height="28" rx="4"
          fill={ac(b('RB'),'#1d4ed8')} stroke={sc(b('RB'))} stroke-width="1.2"
          filter={b('RB') ? 'url(#glow-sm)' : undefined}/>
    <text x="460.5" y="69" text-anchor="middle" class="lbl" class:on={b('RB')}>RB</text>

    <!-- ══ 左摇杆 ══ -->
    <circle cx={LCX} cy={LCY} r="32.5"
            fill={b('L3') ? '#1e3a5f' : '#17181d'}
            stroke={sc(b('L3'))} stroke-width="1.5"/>
    <!-- 摇杆轨迹圈 -->
    <circle cx={LCX} cy={LCY} r="20" fill="none" stroke="#2a2d38" stroke-width="0.8" stroke-dasharray="2 3"/>
    <circle cx={LCX + lx*STICK_MOVE} cy={LCY + ly*STICK_MOVE} r="9"
            fill="#3b82f6" opacity="0.9" filter="url(#glow-sm)"/>
    <text x={LCX} y={LCY + 48} text-anchor="middle" class="axis">{lx.toFixed(2)}, {ly.toFixed(2)}</text>

    <!-- ══ 右摇杆 ══ -->
    <circle cx={RCX} cy={RCY} r="32.5"
            fill={b('R3') ? '#1e3a5f' : '#17181d'}
            stroke={sc(b('R3'))} stroke-width="1.5"/>
    <circle cx={RCX} cy={RCY} r="20" fill="none" stroke="#2a2d38" stroke-width="0.8" stroke-dasharray="2 3"/>
    <circle cx={RCX + rx*STICK_MOVE} cy={RCY + ry*STICK_MOVE} r="9"
            fill="#3b82f6" opacity="0.9" filter="url(#glow-sm)"/>
    <text x={RCX} y={RCY + 48} text-anchor="middle" class="axis">{rx.toFixed(2)}, {ry.toFixed(2)}</text>

    <!-- ══ D-pad ══ -->
    {#each [
      { n: '↑', cx: 198, cy: 206 },
      { n: '↓', cx: 198, cy: 260 },
      { n: '←', cx: 172, cy: 233 },
      { n: '→', cx: 226, cy: 233 },
    ] as d (d.n)}
      <circle cx={d.cx} cy={d.cy} r="10"
              fill={ac(b(d.n),'#1d4ed8')} stroke={sc(b(d.n))} stroke-width="1.2"
              filter={b(d.n) ? 'url(#glow-sm)' : undefined}/>
      <text x={d.cx} y={d.cy + 4} text-anchor="middle" class="dpad" class:on={b(d.n)}>{d.n}</text>
    {/each}

    <!-- ══ ABXY ══ -->
    {#each [
      { n: 'A', cx: 380, cy: 204, c: '#16a34a', s: '#4ade80' },
      { n: 'B', cx: 409, cy: 175, c: '#dc2626', s: '#f87171' },
      { n: 'X', cx: 351, cy: 175, c: '#2563eb', s: '#60a5fa' },
      { n: 'Y', cx: 380, cy: 146, c: '#ca8a04', s: '#facc15' },
    ] as f (f.n)}
      <circle cx={f.cx} cy={f.cy} r="14"
              fill={b(f.n) ? f.c : '#17181d'}
              stroke={b(f.n) ? f.s : '#3a3d45'} stroke-width="1.2"
              filter={b(f.n) ? 'url(#glow-sm)' : undefined}/>
      <text x={f.cx} y={f.cy + 5} text-anchor="middle" class="face"
            style="fill:{b(f.n) ? '#fff' : f.s}; opacity:{b(f.n) ? 1 : 0.55}">{f.n}</text>
    {/each}

    <!-- ══ Home / Back / Start ══ -->
    <!-- Home：双环按钮 -->
    <circle cx="253" cy="112" r="16"
            fill={b('Home') ? '#3b0764' : '#17181d'}
            stroke={b('Home') ? '#a78bfa' : '#3a3d45'} stroke-width="1.5"
            filter={b('Home') ? 'url(#glow-sm)' : undefined}/>
    <circle cx="253" cy="112" r="9"
            fill="none"
            stroke={b('Home') ? '#c4b5fd' : '#2e3040'} stroke-width="1.2"/>
    <circle cx="253" cy="112" r="3"
            fill={b('Home') ? '#e9d5ff' : '#3a3d50'}/>

    <!-- Back（Select）：device_config 40×18 rx=5，旋转 51° 绕中心 (191,127) -->
    <rect x="171" y="118" width="40" height="18" rx="5"
          fill={b('Back') ? '#1f2937' : '#17181d'}
          stroke={b('Back') ? '#9ca3af' : '#2e3040'} stroke-width="1.2"
          transform="rotate(51 191 127)"
          filter={b('Back') ? 'url(#glow-sm)' : undefined}/>
    <!-- 三横线图标（与 rect 同向旋转） -->
    <g transform="rotate(51 191 127)" opacity={b('Back') ? 0.9 : 0.35}>
      <line x1="184" y1="124" x2="198" y2="124" stroke="#9ca3af" stroke-width="1.2" stroke-linecap="round"/>
      <line x1="184" y1="127" x2="198" y2="127" stroke="#9ca3af" stroke-width="1.2" stroke-linecap="round"/>
      <line x1="184" y1="130" x2="198" y2="130" stroke="#9ca3af" stroke-width="1.2" stroke-linecap="round"/>
    </g>

    <!-- Start（Menu）：device_config 40×18 rx=5，旋转 -51° 绕中心 (316,127) -->
    <rect x="296" y="118" width="40" height="18" rx="5"
          fill={b('Start') ? '#1f2937' : '#17181d'}
          stroke={b('Start') ? '#9ca3af' : '#2e3040'} stroke-width="1.2"
          transform="rotate(-51 316 127)"
          filter={b('Start') ? 'url(#glow-sm)' : undefined}/>
    <!-- 九宫格 2×2 dots 图标（与 rect 同向旋转） -->
    <g transform="rotate(-51 316 127)" opacity={b('Start') ? 0.9 : 0.35}>
      <rect x="309" y="122" width="3" height="3" rx="1" fill="#9ca3af"/>
      <rect x="314" y="122" width="3" height="3" rx="1" fill="#9ca3af"/>
      <rect x="319" y="122" width="3" height="3" rx="1" fill="#9ca3af"/>
      <rect x="309" y="127" width="3" height="3" rx="1" fill="#9ca3af"/>
      <rect x="314" y="127" width="3" height="3" rx="1" fill="#9ca3af"/>
      <rect x="319" y="127" width="3" height="3" rx="1" fill="#9ca3af"/>
    </g>

    <!-- ══ M1-M4 背部拨片 ══
         M2 center=187，以 SVG 中心 x=254 镜像 → M1 center=321，left=287
         M4 center=184.5，镜像 → M3 center=323.5，left=275                  ══ -->
    {#each [
      { n: 'M2', x: 153, y: 308, w: 68, h: 44, lx: 187,   ly: 333 },
      { n: 'M1', x: 287, y: 308, w: 68, h: 44, lx: 321,   ly: 333 },
      { n: 'M4', x: 136, y: 368, w: 97, h: 36, lx: 184.5, ly: 390 },
      { n: 'M3', x: 275, y: 368, w: 97, h: 36, lx: 323.5, ly: 390 },
    ] as m (m.n)}
      <rect x={m.x} y={m.y} width={m.w} height={m.h} rx="6"
            fill={ac(b(m.n),'#5b21b6')} stroke={sc(b(m.n),'#a78bfa')} stroke-width="1.2"
            filter={b(m.n) ? 'url(#glow-sm)' : undefined}/>
      <text x={m.lx} y={m.ly} text-anchor="middle" class="lbl" class:on={b(m.n)}>{m.n}</text>
    {/each}

    <!-- ══ Fn / Turbo：M2 右边 x=221，M1 左边 x=287，空隙 66px ══
         两个 26px 宽标签 + 6px 间隔 = 58px，各留 4px 边距
         Turbo: 225~251   Fn: 257~283   → 离 M1(287) 有 4px 空隙         ══ -->
    <rect x="225" y="322" width="26" height="12" rx="2" fill="none" stroke="#252830" stroke-width="1"/>
    <text x="238" y="332" text-anchor="middle" class="tiny">Turbo</text>
    <rect x="257" y="322" width="26" height="12" rx="2" fill="none" stroke="#252830" stroke-width="1"/>
    <text x="270" y="332" text-anchor="middle" class="tiny">Fn</text>

    <!-- ══ 映射模式：可点选命中区 + 选中环 + 目标气泡 ══ -->
    {#if interactive}
      <g class="imap">
        {#each HIT as h (h.key)}
          {@const sel = selected === h.key}
          {@const mapped = isMapped(h)}
          {@const turbo = isTurbo(h)}
          {@const macro = mappings[h.key]?.kind === 'macro'}
          {@const ba = badgeAt(h)}
          <g class="iz" class:mapped class:sel class:turbo class:macro>
            {#if h.kind === 'circle'}
              {#if sel}<circle class="ring" cx={h.cx} cy={h.cy} r={(h.r ?? 0) + 4} />{/if}
              <circle
                class="hit"
                cx={h.cx}
                cy={h.cy}
                r={h.r}
                role="button"
                tabindex="0"
                aria-label={aria(h)}
                onclick={() => onpick?.(h.key)}
                onkeydown={(e) => onKey(e, h.key)}
              ><title>{aria(h)}</title></circle>
            {:else}
              {#if sel}
                <rect class="ring" x={(h.x ?? 0) - 3} y={(h.y ?? 0) - 3} width={(h.w ?? 0) + 6} height={(h.h ?? 0) + 6} rx="8" transform={transform(h)} />
              {/if}
              <rect
                class="hit"
                x={h.x}
                y={h.y}
                width={h.w}
                height={h.h}
                rx="6"
                transform={transform(h)}
                role="button"
                tabindex="0"
                aria-label={aria(h)}
                onclick={() => onpick?.(h.key)}
                onkeydown={(e) => onKey(e, h.key)}
              ><title>{aria(h)}</title></rect>
            {/if}

            {#if mapped && h.compact}
              <circle class="mdot" cx={dotX(h)} cy={dotY(h)} r="3.6" />
            {:else if mapped}
              {@const tl = targetLabel(h)}
              {@const kind = mappings[h.key]?.kind}
              {@const pw = Math.max(20, tl.length * 8 + 12)}
              <g class="pill" class:turbo class:macro={kind === 'macro'} class:opaque={kind === 'special'} transform="translate({ba.x} {ba.y})">
                <rect x={-pw / 2} y="-8.5" width={pw} height="17" rx="8.5" />
                <text x="0" y="4" text-anchor="middle">{tl}</text>
              </g>
            {/if}
          </g>
        {/each}
      </g>
    {/if}
  </svg>
</div>

<style>
  .wrap { width: 100%; max-width: 508px; }
  .svg  { width: 100%; height: auto; display: block; }

  .lbl  { font-size: 10px; font-family: var(--mono, monospace); fill: #505565; pointer-events: none; }
  .lbl.on { fill: #cbd5e1; }

  .tval { font-size: 8px;  font-family: var(--mono, monospace); fill: #3a3d50; pointer-events: none; }
  .tval.on { fill: #93c5fd; }

  .axis { font-size: 8.5px; font-family: var(--mono, monospace); fill: #374151; pointer-events: none; }

  .dpad { font-size: 10px; font-family: var(--mono, monospace); fill: #505565; pointer-events: none; }
  .dpad.on { fill: #fff; }

  .face { font-size: 11px; font-weight: 700; font-family: var(--mono, monospace); pointer-events: none; }

  .tiny { font-size: 6.5px; font-family: var(--mono, monospace); fill: #2e3240; pointer-events: none; }

  /* —— 映射模式 —— */
  .iz .hit {
    fill: rgba(59, 130, 246, 0.04);
    stroke: rgba(91, 157, 255, 0.32);
    stroke-width: 1.2;
    stroke-dasharray: 3 3;
    cursor: pointer;
    transition: fill 0.12s, stroke 0.12s;
  }
  .iz .hit:hover {
    fill: rgba(59, 130, 246, 0.18);
    stroke: var(--accent-2);
    stroke-dasharray: none;
  }
  .iz .hit:focus-visible {
    outline: none;
    stroke: #fff;
    stroke-dasharray: none;
  }
  .iz.mapped .hit {
    fill: rgba(59, 130, 246, 0.16);
    stroke: var(--accent);
    stroke-dasharray: none;
  }
  .iz.turbo .hit {
    fill: rgba(139, 92, 246, 0.18);
    stroke: var(--violet);
  }
  .iz.macro .hit {
    fill: rgba(16, 185, 129, 0.18);
    stroke: #34d399;
  }
  .iz.sel .hit {
    fill: rgba(59, 130, 246, 0.3);
    stroke: #fff;
    stroke-dasharray: none;
  }
  .ring {
    fill: none;
    stroke: var(--accent-2);
    stroke-width: 2;
    filter: drop-shadow(0 0 5px var(--accent-glow));
    pointer-events: none;
    animation: imap-pulse 1.4s ease-in-out infinite;
  }
  @keyframes imap-pulse {
    50% { opacity: 0.4; }
  }
  .mdot {
    fill: var(--accent-2);
    filter: drop-shadow(0 0 4px var(--accent-glow));
    pointer-events: none;
  }
  .pill { pointer-events: none; }
  .pill rect {
    fill: var(--accent);
    filter: drop-shadow(0 1px 3px rgba(0, 0, 0, 0.55));
  }
  .pill.turbo rect {
    fill: var(--violet);
  }
  .pill.macro rect {
    fill: #10b981;
  }
  .pill.opaque rect {
    fill: #4b5570;
  }
  .pill text {
    fill: #fff;
    font-size: 10px;
    font-weight: 700;
    font-family: var(--mono, monospace);
  }
</style>
