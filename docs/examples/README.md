# Synthetic import examples

[简体中文](#简体中文)

These files contain made-up data. They do not describe your PC. Open the files from the extracted project folder; no system-log collector is included.

- **Network:** Open `index.html`, choose **Only one app or website cannot connect**, then select [network-v1.json](network-v1.json) in the optional summary section. The summary shows one connected adapter with an IPv4 address and default route. The advice should still focus on the affected app or website, not a network reset.
- **Freezes and restarts:** Open `freeze/index.html` and select [restarts-v2.json](restarts-v2.json). Expect one restart-related record, unknown blue-screen evidence, and a storage event reported five seconds before the restart-related record. The time difference alone does not establish a cause.
- **Restart with blue-screen evidence:** On the same page, select [restarts-wer-only-v2.json](restarts-wer-only-v2.json). Its single Windows Error Reporting event should appear as one restart-related record, one blue-screen record, and one timeline entry. The event does not identify the cause of the crash.

If you prepare your own v2 restart summary, give each `reported_at` an explicit time zone (`Z` or a numeric offset such as `+08:00`) and use up to six fractional digits, for example `2026-01-02T12:00:06.439293Z`. If the original timestamp has more digits, keep the first six without rounding and leave the time zone unchanged. Import only the v2 JSON summary, not the original event log.

## 简体中文

这些文件都是虚构数据，不代表你的电脑。请从解压后的项目目录选择文件，本项目不附带系统日志采集器。

- **断网排查：** 打开 `zh/index.html`，选择「只有一个应用或网页打不开」，再在摘要导入区选择 [network-v1.json](network-v1.json)。摘要显示一个带 IPv4 地址和默认路由的已连接网卡，建议仍应优先排查出问题的应用或网站，不是重置网络。
- **卡死与重启：** 打开 `zh/freeze/index.html`，选择 [restarts-v2.json](restarts-v2.json)。应看到一条重启相关记录、蓝屏证据未知，以及早五秒报时的存储事件。报时接近不代表存在因果关系。
- **重启并有蓝屏证据：** 在同一页面选择 [restarts-wer-only-v2.json](restarts-wer-only-v2.json)。这条 Windows 错误报告应显示为一条重启相关记录、一条蓝屏记录，时间线也只有一项。它不能说明蓝屏原因。

若自行编写 v2 重启摘要，`reported_at` 必须带明确时区（`Z` 或 `+08:00` 这样的偏移），秒的小数最多六位，例如 `2026-01-02T12:00:06.439293Z`。原时间戳超过六位时，只保留前六位，不四舍五入，时区不变。请导入 v2 JSON 摘要，不要导入原始日志。
