(() => {
  "use strict";
  // Use the language of the current offline HTML page.
  const msg = (zh, en) => globalThis.document?.documentElement.lang === "en" ? en : zh;

  // Only codes in this fixed physical-layout allowlist enter application state.
  const fn = Array.from({length: 12}, (_, i) => ["F" + (i + 1), "F" + (i + 1)]);
  const letters = (row) => [...row].map((letter) => ["Key" + letter, letter]);
  const digits = [..."1234567890"].map((digit) => ["Digit" + digit, digit]);
  const mainRows = [
    [["Escape", "Esc"], [null, "", .38], ...fn.slice(0, 4), [null, "", .2],
      ...fn.slice(4, 8), [null, "", .2], ...fn.slice(8)],
    [["Backquote", "`"], ...digits, ["Minus", "−"], ["Equal", "="], ["Backspace", "Backspace", 2]],
    [["Tab", "Tab", 1.5], ...letters("QWERTYUIOP"), ["BracketLeft", "["], ["BracketRight", "]"], ["Backslash", "\\", 1.5]],
    [["CapsLock", "Caps Lock", 1.75], ...letters("ASDFGHJKL"), ["Semicolon", ";"], ["Quote", "'"], ["Enter", "Enter", 2.25]],
    [["ShiftLeft", msg("左 Shift", "Left Shift"), 2.25], ...letters("ZXCVBNM"), ["Comma", ","], ["Period", "."], ["Slash", "/"], ["ShiftRight", msg("右 Shift", "Right Shift"), 2.75]],
    [["ControlLeft", msg("左 Ctrl", "Left Ctrl"), 1.25], ["MetaLeft", msg("左 Win", "Left Win"), 1.25], ["AltLeft", msg("左 Alt", "Left Alt"), 1.25],
      ["Space", msg("空格", "Space"), 6.25], ["AltRight", msg("右 Alt", "Right Alt"), 1.25], ["MetaRight", msg("右 Win", "Right Win"), 1.25],
      ["ContextMenu", msg("菜单", "Menu"), 1.25], ["ControlRight", msg("右 Ctrl", "Right Ctrl"), 1.25]],
  ];
  // Tuple: code, visible label, column, row, optional column span, optional row span.
  const nav = [
    ["PrintScreen", "PrtSc", 1, 1], ["ScrollLock", "ScrLk", 2, 1], ["Pause", "Pause", 3, 1],
    ["Insert", "Ins", 1, 2], ["Home", "Home", 2, 2], ["PageUp", "PgUp", 3, 2],
    ["Delete", "Del", 1, 3], ["End", "End", 2, 3], ["PageDown", "PgDn", 3, 3],
    ["ArrowUp", "↑", 2, 5], ["ArrowLeft", "←", 1, 6], ["ArrowDown", "↓", 2, 6], ["ArrowRight", "→", 3, 6],
  ];
  const num = [
    ["NumLock", "Num", 1, 2], ["NumpadDivide", "/", 2, 2], ["NumpadMultiply", "*", 3, 2], ["NumpadSubtract", "−", 4, 2],
    ["Numpad7", "7", 1, 3], ["Numpad8", "8", 2, 3], ["Numpad9", "9", 3, 3], ["NumpadAdd", "+", 4, 3, 1, 2],
    ["Numpad4", "4", 1, 4], ["Numpad5", "5", 2, 4], ["Numpad6", "6", 3, 4],
    ["Numpad1", "1", 1, 5], ["Numpad2", "2", 2, 5], ["Numpad3", "3", 3, 5], ["NumpadEnter", "Enter", 4, 5, 1, 2],
    ["Numpad0", "0", 1, 6, 2], ["NumpadDecimal", ".", 3, 6],
  ];

  const byId = (id) => document.getElementById(id);
  const start = byId("start");
  const stop = byId("stop");
  const reset = byId("reset");
  const exit = byId("exit");
  const layout = byId("layout");
  const board = byId("board");
  const capture = byId("capture");
  const status = byId("status");
  const seenOutput = byId("seen");
  const totalOutput = byId("total");
  const lastOutput = byId("last");

  const cells = new Map();
  const seen = new Set();
  const held = new Set();
  let active = false;
  let composing = false;
  let lastCode = "";

  function el(tag, className, label) {
    const element = document.createElement(tag);
    element.className = className;
    if (label) element.textContent = label;
    return element;
  }

  function makeCell(code, label, isNumpad = false) {
    const key = el("span", "key", label);
    key.dataset.code = code;
    // Prevent both arbitrary display values and ambiguity between main / numpad keys.
    cells.set(code, {key, label: isNumpad ? msg("数字区 ", "Number pad ") + label : label, isNumpad});
    return key;
  }

  function renderGrid(className, entries, isNumpad = false) {
    const grid = el("div", className);
    for (const [code, label, column, row, width = 1, height = 1] of entries) {
      const cell = makeCell(code, label, isNumpad);
      cell.style.gridColumn = column + " / span " + width;
      cell.style.gridRow = row + " / span " + height;
      grid.append(cell);
    }
    board.append(grid);
    return grid;
  }

  const alphas = el("div", "alphas");
  for (const cellsInRow of mainRows) {
    const row = el("div", "main-row");
    for (const [code, label, units = 1] of cellsInRow) {
      const cell = code ? makeCell(code, label) : el("span", "spacer");
      cell.style.setProperty("--u", units);
      row.append(cell);
    }
    alphas.append(row);
  }
  board.append(alphas);
  renderGrid("nav-grid", nav);
  const numGrid = renderGrid("num-grid", num, true);

  function count() {
    const compact = layout.value === "compact";
    const visibleSeen = [...seen].filter((code) => !compact || !cells.get(code).isNumpad);
    seenOutput.textContent = visibleSeen.length;
    totalOutput.textContent = compact ? cells.size - num.length : cells.size;
    lastOutput.textContent = lastCode && (!compact || !cells.get(lastCode).isNumpad)
      ? cells.get(lastCode).label : msg("无", "None");
  }

  function clearHeld() {
    for (const code of held) cells.get(code).key.classList.remove("down");
    held.clear();
  }

  function pause(reason) {
    if (!active) return;
    active = false;
    composing = false;
    capture.removeEventListener("keydown", onKeyDown);
    capture.removeEventListener("keyup", onKeyUp);
    capture.removeEventListener("compositionstart", onCompositionStart);
    capture.removeEventListener("compositionend", onCompositionEnd);
    capture.removeEventListener("blur", onFocusLoss);
    document.removeEventListener("visibilitychange", onVisibilityChange);
    window.removeEventListener("blur", onWindowBlur);
    window.removeEventListener("pagehide", onPageHide);
    clearHeld();
    capture.classList.remove("active");
    start.disabled = false;
    start.textContent = msg("继续检测", "Resume test");
    stop.disabled = true;
    status.textContent = msg("已暂停 · ", "Paused · ") + reason;
  }

  function onFocusLoss() { pause(msg("焦点已离开检测区。", "Focus left the test area.")); }
  function onWindowBlur() { pause(msg("窗口失去焦点。", "The window lost focus.")); }
  function onPageHide() { pause(msg("已离开页面。", "You left the page.")); }
  function onVisibilityChange() {
    if (document.visibilityState !== "visible") pause(msg("页面已切换到后台。", "The tab moved to the background."));
  }
  function onCompositionStart() {
    composing = true;
    clearHeld();
  }
  function onCompositionEnd() { composing = false; }

  function onKeyDown(event) {
    if (!active || event.target !== capture || document.activeElement !== capture ||
        composing || event.isComposing || event.keyCode === 229 || event.repeat) return;
    const cell = cells.get(event.code);
    if (!cell || (cell.isNumpad && numGrid.hidden)) return;
    if (!held.has(event.code)) {
      held.add(event.code);
      seen.add(event.code);
      lastCode = event.code;
      cell.key.classList.add("done", "down");
      count();
    }
    if (event.code === "Escape" && !event.ctrlKey && !event.altKey && !event.metaKey) {
      pause(msg("按下 Esc。", "Esc was pressed."));
      start.focus({preventScroll: true});
    }
    // Do not prevent Tab, function keys, browser/system modifier shortcuts,
    // or any IME operation. Suppress only plain in-page scrolling where useful.
    if (!event.ctrlKey && !event.altKey && !event.metaKey &&
        ["Space", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "PageUp", "PageDown", "Home", "End"].includes(event.code)) {
      event.preventDefault();
    }
  }

  function onKeyUp(event) {
    if (!active || event.target !== capture || !held.delete(event.code)) return;
    cells.get(event.code).key.classList.remove("down");
  }

  start.addEventListener("click", () => {
    if (active || document.visibilityState !== "visible") return;
    capture.focus({preventScroll: true});
    if (document.activeElement !== capture) {
      status.textContent = msg("未开始 · 无法取得检测区焦点，请重试。", "Not started · Could not focus the test area. Try again.");
      return;
    }
    active = true;
    composing = false;
    start.disabled = true;
    stop.disabled = false;
    status.textContent = msg("检测中 · 请按下想检查的键。", "Testing · Press the keys you want to check.");
    capture.classList.add("active");
    capture.addEventListener("keydown", onKeyDown);
    capture.addEventListener("keyup", onKeyUp);
    capture.addEventListener("compositionstart", onCompositionStart);
    capture.addEventListener("compositionend", onCompositionEnd);
    capture.addEventListener("blur", onFocusLoss);
    document.addEventListener("visibilitychange", onVisibilityChange);
    window.addEventListener("blur", onWindowBlur);
    window.addEventListener("pagehide", onPageHide);
  });
  // Prevent a pointer press on Pause from blurring capture before click has a chance to run.
  stop.addEventListener("mousedown", (event) => { if (active) event.preventDefault(); });
  stop.addEventListener("click", () => {
    pause(msg("可继续检测或清空记录。", "Resume the test or clear the marks."));
    start.focus({preventScroll: true});
  });
  reset.addEventListener("click", () => {
    pause(msg("已清空。", "Cleared."));
    for (const code of seen) cells.get(code).key.classList.remove("done");
    seen.clear();
    lastCode = "";
    count();
    start.textContent = msg("开始检测", "Start test");
    status.textContent = msg("已清空 · 请点击「开始检测」。", "Cleared · Select Start test.");
  });
  exit.addEventListener("click", () => { pause(msg("已返回工具首页。", "Returned to tool home.")); });
  layout.addEventListener("change", () => {
    pause(msg("布局已切换，可继续检测。", "Layout changed. You can resume the test."));
    numGrid.hidden = layout.value === "compact";
    board.classList.toggle("compact", numGrid.hidden);
    count();
  });
  count();
})();
