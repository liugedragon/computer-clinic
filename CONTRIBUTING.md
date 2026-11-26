# Contributing to Computer Clinic

You can help by improving a troubleshooting step, translating a page, testing a keyboard layout, or making a small, focused fix.

## Report a problem

Include your OS and browser version, which tool you used, steps to reproduce, and expected versus actual behavior. Say whether you opened the page directly from a fully extracted folder. Use built-in demos or synthetic data. Do not post raw event logs, crash dumps, hostnames, IP addresses, Wi-Fi names, credentials, or personal details.

## Test a change locally

1. Open `index.html` directly in a browser from the complete repository folder. No local server is needed.
2. Try a symptom on the network page, then follow each tool link and return to the home page.
3. Try a few keys, including pause and resume, and try exiting the display test. On the restart page, load and clear a demo.
4. Repeat with the internet disconnected. If you test on actual Windows hardware, say which browser and OS you used. Distinguish manual tests from simulated tests.

## Open a pull request

Keep changes focused and describe the user-visible problem, the fix, and what you actually verified. For a UI change, check readable labels, keyboard navigation, and language consistency. Do not add background collection, telemetry, or automatic system changes. Never use a real diagnostic file as a test fixture.
