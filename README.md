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

This is an early preview. The latest [offline Edge checks](https://github.com/liugedragon/computer-clinic/actions/runs/46113169840) passed in English and Simplified Chinese on GitHub-hosted Windows Server 2025 and Ubuntu 24.04. Both runners checked sample imports, simulated keys, six rendered colors and the warning shown when fullscreen has not been confirmed. Ubuntu also verified native fullscreen and focus restoration after exiting; the Windows runner used the browser viewport instead. This is not a Windows 11, hardware or real-log test. See the [Windows 11 manual checklist](docs/windows-checklist.md) for what still needs a real PC.

The two network pages were also tested offline in Playwright Firefox 153.0 on Debian 13.7. The check covered light and dark styles, symptom selection, importing a sample file, pasting a conflicting summary, and clearing the result. This does not cover distribution Firefox builds or the other tools.

## Contribute

If it helps, a **Star** is appreciated. [Issues](https://github.com/liugedragon/computer-clinic/issues) and pull requests are welcome. Good first contributions include clearer troubleshooting steps, keyboard layout coverage, and synthetic regression cases. See the [contribution guide](CONTRIBUTING.md).

The initial implementation was made by GPT Dot.
