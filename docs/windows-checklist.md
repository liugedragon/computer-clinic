# Windows 11 manual checklist

[简体中文](#简体中文) · [Project README](../README.md)

This checklist is for a physical Windows 11 PC. The [hosted Edge run](https://github.com/liugedragon/computer-clinic/actions/runs/46113169840) used Windows Server 2025 in a cloud environment; it did not enter native fullscreen on that runner or test physical hardware.

Download and extract the complete ZIP, then open `index.html` in Edge. Keep the files together. Do not install anything, change network settings, or export native logs for this checklist.

1. **Network guidance:** Compare a one-app or one-site symptom with a broader outage. Load the same [no-default-route example](examples/network-no-default-route-v1.json) for each choice and confirm they give different advice. This checks guidance, not whether your internet connection works.
2. **Keyboard:** Start the test and try letters, arrow keys and Space. Hold Space for a moment: the page should not scroll or count repeats as new presses. Pause or press Esc; a later keypress should not change the result. Some system shortcuts and Fn keys never reach the browser.
3. **Display:** Keep brightness comfortable and cycle through all six colors on the intended monitor. Check whether the browser actually enters fullscreen. Click Exit and check that focus returns to Start. Try again and exit with Esc. If the browser stays windowed, record that separately and do not treat the result as a whole-panel check. A screenshot verifies rendered colors, not physical dead pixels.
4. **Freezes and restarts:** Import the [synthetic blue-screen summary](examples/restarts-wer-only-v2.json) and clear it afterward. Check that the blue-screen and restart evidence appear and clear correctly. This does not read your Windows logs or diagnose a real crash.

In a bug report, include the Windows and browser versions, the step that failed and whether fullscreen was actually entered. Use the synthetic files, not raw logs or private network details. See [privacy](privacy.md).

## 简体中文

这份清单用于 Windows 11 实机。[云端 Edge 测试](https://github.com/liugedragon/computer-clinic/actions/runs/46113169840)跑在 Windows Server 2025 上，未进入原生全屏，也没有测试实物硬件。

下载并完整解压 ZIP，再用 Edge 打开 `zh/index.html`。不需要安装软件、修改网络配置或导出系统日志。

1. **断网排查：** 比较「只有一个应用或网站失败」与大范围断网。两次都导入同一份[无默认路由样例](examples/network-no-default-route-v1.json)，看建议是否不同。这只验证建议，不测试 互联网是否可达。
2. **键盘测试：** 开始后试字母、方向键、空格。长按空格不应滚屏，也不应把连发当成新的按键。暂停或按 Esc 后继续按键，结果不应再改变。某些系统快捷键和 Fn 键不会传给浏览器。
3. **屏幕检查：** 在要检查的显示器上、以舒适亮度手动切换六种颜色。先确认浏览器是否真的进入全屏，点击「退出」后检查键盘焦点是否回到「开始」。再测一次 Esc 退出。若始终是窗口模式，单独记录，不能算整块屏幕都测了。截图能确认渲染颜色，不能证明面板没有坏点。
4. **卡死与重启：** 导入[合成蓝屏摘要](examples/restarts-wer-only-v2.json)，确认出现蓝屏与重启线索，再清空。此操作不读取本机系统日志，也不诊断真实崩溃。

反馈请注明 Windows 版本、浏览器版本、失败步骤和是否进入全屏。请使用合成样例，不要附原始日志或私人网络信息。详见[隐私说明](privacy.md)。
