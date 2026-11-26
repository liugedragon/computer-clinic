# Computer Clinic

[简体中文](README.zh-CN.md)

**An offline first-aid kit for everyday PC problems.** If Wi-Fi stops working, a key seems dead, or the screen shows a stubborn dot, start here before resetting anything.

## Quick start

1. Select **Code → Download ZIP** on GitHub.
2. Extract the entire archive. Keep the HTML, JavaScript, and CSS files together.
3. Open `index.html` in a browser. English opens by default. Select **简体中文** on any tool page to switch languages.
4. Start with the symptom you can observe. No diagnostic file is required.

No installation, administrator access, account, or internet connection is needed after download.

## Tools

| Tool | What it helps you check | What it cannot tell you |
| --- | --- | --- |
| Network | Narrow down a single-site problem, shared outage, or Wi-Fi sign-in issue | It does not run live connectivity tests or prove where the fault is |
| Keyboard | See which physical key positions the browser receives | A key missing from the page is not proof of hardware failure |
| Display | Cycle through six solid colors to look for stuck or dead pixels | It does not scan the panel or certify that the screen is fault-free |
| Freezes and restarts | Read a synthetic example or a compatible, user-selected event summary | A restart record is evidence of a restart, not necessarily its cause |

To try importing without using your own logs, see the [synthetic examples](docs/examples/README.md).

## Linux and Windows

Network guidance, keyboard testing, and solid-color display checks are browser tools. On Linux, see the [Linux troubleshooting guide](docs/linux.md). Restart examples work in the browser, but restart-summary import is Windows-format only. There is no Linux log collector or importer.

## Privacy and preview scope

The browser preview is designed to run locally. It does not upload or persist diagnostic data, change settings, or include an executable or system-log collector. Imported data is optional. Read [what the app does with your data](docs/privacy.md) before sharing a report.

This is an early preview. The four tools passed [offline tests in Microsoft Edge on GitHub-hosted Windows Server 2025](https://github.com/liugedragon/computer-clinic/actions/runs/45832501538) in English and Simplified Chinese. The tests use simulated keystrokes and sample files. Windows 11 on a physical PC, physical keyboards, and monitor panels have not been tested.

## Contribute

If it helps, a **Star** is appreciated. [Issues](https://github.com/liugedragon/computer-clinic/issues) and pull requests are welcome. Good first contributions include clearer troubleshooting steps, keyboard layout coverage, and synthetic regression cases. See the [contribution guide](CONTRIBUTING.md).

The initial implementation was made by GPT Dot.
