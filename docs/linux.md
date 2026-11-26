# Using Computer Clinic on Linux

[简体中文](#简体中文) · [Back to the project](../README.md)

Extract the project and open `index.html` in a graphical browser on your Linux desktop. The English page opens by default. No installer, terminal command, or administrator access is required for the browser tools.

- **Network:** Choose the symptom before using any optional data. If only this PC is affected, check the desktop's network menu for the active Wi-Fi or Ethernet connection. If `ip` is installed, `ip -brief address show` lists local addresses; `ip -4 route show default` and `ip -6 route show default` show default routes in the main routing tables. These are read-only checks. A route does not prove the internet is reachable; VPNs and custom routing may use other tables. Do not share raw output publicly.
- **Keyboard and display:** These run in the browser. Desktop shortcuts and Fn keys may not reach the keyboard test. If your browser denies fullscreen, the display test does not cover the entire panel.
- **Freezes and restarts:** Use the synthetic example to see how the timeline works. File import expects a Windows-format summary; it does not read Linux journals. On systems with systemd, `journalctl --list-boots` lists boots present in the journal, and `journalctl -k -b -1 --no-pager` reads kernel messages from the prior boot if retained and accessible. No record does not rule out a freeze. Keep journal output local, and do not change logging or access permissions just to run this check.

If Linux runs inside WSL, a container, or a remote session, the network and logs you see there may belong to that environment, not the host. For the physical keyboard or screen, open the browser on the desktop connected to that hardware.

References: [iproute2 route documentation](https://github.com/iproute2/iproute2/blob/main/man/man8/ip-route.8.in), [systemd journalctl manual](https://www.freedesktop.org/software/systemd/man/latest/journalctl.html).

## 简体中文

解压项目，用 Linux 桌面的图形浏览器打开 `index.html`。默认是英文，可以切换到简体中文。浏览器工具不需要安装、终端或管理员权限。

- **网络：** 先选故障现象。如果只有这台电脑断网，先在桌面网络菜单确认正在用的 Wi-Fi 或有线连接。如果系统装有 `ip`，`ip -brief address show` 查看本机地址，`ip -4 route show default` 和 `ip -6 route show default` 查看主路由表中的默认路由。这些命令只读；有默认路由不代表能上网，VPN 和自定义路由也可能使用其他表。不要公开原始输出。
- **键盘和屏幕：** 都在浏览器里运行。系统快捷键或 Fn 可能不会传给网页；浏览器不允许全屏时，纯色测试不能覆盖整块屏幕。
- **卡死与重启：** 可以看合成样例；文件导入只接受 Windows 格式，不读取 Linux 日志。使用 systemd 的系统上，`journalctl --list-boots` 可以查看日志中保留的启动记录；若有权限且记录还在，`journalctl -k -b -1 --no-pager` 可以查看上一次启动的内核消息。没有日志不代表没发生卡死。日志请留在本机，不要为了排查改变日志设置或权限。

如果 Linux 运行在 WSL、容器或远程会话中，看到的网络和日志可能不是宿主机的。要测物理键盘或屏幕，请在连接这些硬件的桌面上打开浏览器。
