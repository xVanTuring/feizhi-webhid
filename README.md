# 飞智八爪鱼5 · WebHID 配置台

直接通过 WebHID 对八爪鱼5（VID `0x37D7`）下发命令，**免飞智驱动 / 空间站服务**：

- **自适应扳机配置** —— 6 种效果（Race / Recoil / Sniper / Vibration / Lock / Normal），全参数滑块、实时下发、帧预览；走厂商命令接口 `0xFFA0` 的 output report（`cmd 81`）。
- **手柄输入读取** —— 两路并行：
  - **解码视图**：通过标准 Gamepad API 实时显示摇杆 / 扳机 / 按键；
  - **原始报文监视器**：通过 WebHID `inputreport` 显示每个 reportId 的字节，变化字节高亮，适合逆向定位字节含义。

> 协议来源见仓库根目录《飞智自适应扳机分析.md》（反编译 Flydigi.Hid.dll / SpaceStationService.dll）。

## 运行

```bash
npm install
npm run dev      # http://localhost:5173
```

WebHID 仅在 **Chrome / Edge** 且 **安全上下文**（https 或 localhost）下可用。

```bash
npm run build    # svelte-check 类型检查 + 生产构建到 dist/
npm run preview  # 预览构建产物
```

## 使用前提

1. 手柄处于 **NewXInput / 增强模式**，厂商接口 `0xFFA0` 才会枚举出来；
2. **不要同时开飞智空间站**（会抢占设备）；
3. 点「连接手柄」在弹窗里选设备并授权；刷新后会自动恢复上次授权的设备。

## 结构

```
src/
  lib/
    hid/
      constants.ts     # VID / usage page / cmd / 默认报文参数
      triggers.ts      # 6 种扳机模式定义 + createParams 拼装语义
      frame.ts         # 扳机命令帧拼装（5A A5 cmd len apply …）
      util.ts          # hex / sleep 等
    controller.svelte.ts   # WebHID 控制器单例（连接/下发/原始报文捕获，含响应式状态）
    gamepad.svelte.ts      # Gamepad API 解码读取单例
    components/            # 各 UI 卡片
  App.svelte
  main.ts
```

控制器以单例 + Svelte 5 runes（`$state`）暴露响应式状态；HID 高频输入经 `requestAnimationFrame` 节流后再刷新到 UI。
