"use strict";

(() => {
  const colors = [
    ["black", "黑色"], ["white", "白色"], ["red", "红色"],
    ["green", "绿色"], ["blue", "蓝色"], ["gray", "灰色"]
  ];
  const $ = (id) => document.getElementById(id);
  const stage = $("testStage");
  const start = $("start");
  const exitButton = $("exit");
  const controls = $("controls");
  const show = $("showControls");
  const home = document.querySelector(".page");
  const maxPoints = 100;
  let active = false;
  let colorIndex = 0;
  let points = [];
  let recording = false;
  let enteredFullscreen = false;
  let fullscreenPending = false;
  let fallback = false;
  let lastColorChange = -Infinity;

  function setColor(delta) {
    // Ignore key repeat and rapid alternating clicks. Test transitions are manual.
    const now = performance.now();
    if (now - lastColorChange < 500) return;
    lastColorChange = now;
    stage.classList.remove(colors[colorIndex][0]);
    colorIndex = (colorIndex + delta + colors.length) % colors.length;
    stage.classList.add(colors[colorIndex][0]);
    $("current").textContent = colors[colorIndex][1] + " · " + (colorIndex + 1) + " / " + colors.length;
  }

  function setControlsHidden(hidden) {
    stage.classList.toggle("controls-hidden", hidden);
    controls.hidden = hidden;
    show.hidden = !hidden;
    stage.focus({preventScroll: true});
  }

  function report() {
    $("review").hidden = false;
    const list = $("observations");
    list.replaceChildren();
    $("review-note").textContent = recording ? (
      points.length ? "共记录 " + points.length + " 个观察点。" : "没有记录观察点。"
    ) : "本次未启用观察点记录。";
    for (const [i, p] of points.entries()) {
      const row = document.createElement("li");
      row.textContent = (i + 1) + ". " + p.color + " · 距左 " + p.x + "%，距上 " + p.y + "%";
      list.append(row);
    }
  }

  function finish() {
    if (!active) return;
    active = false;
    enteredFullscreen = false;
    stage.hidden = true;
    home.inert = false;
    document.body.classList.remove("testing");
    if (fallback) $("notice").textContent = "浏览器未允许全屏，已在浏览器视口内完成检查。";
    if (document.fullscreenElement === stage && typeof document.exitFullscreen === "function") {
      Promise.resolve(document.exitFullscreen()).catch(() => {});
    }
    report();
    start.focus({preventScroll: true});
  }

  async function begin() {
    if (active || fullscreenPending) return;
    active = true;
    fallback = false;
    enteredFullscreen = false;
    recording = $("record").checked;
    points = [];
    $("pointStatus").textContent = "";
    $("notice").textContent = "";
    $("review").hidden = true;
    stage.classList.remove(colors[colorIndex][0]);
    colorIndex = 0;
    lastColorChange = -Infinity;
    stage.classList.add("black");
    $("current").textContent = "黑色 · 1 / 6";
    home.inert = true;
    stage.hidden = false;
    document.body.classList.add("testing");
    setControlsHidden(false);
    if (typeof stage.requestFullscreen !== "function" || document.fullscreenEnabled === false) {
      fallback = true;
      return;
    }
    fullscreenPending = true;
    try {
      await stage.requestFullscreen();
      if (!active && document.fullscreenElement === stage) {
        await document.exitFullscreen();
      } else if (active) {
        enteredFullscreen = document.fullscreenElement === stage;
        fallback = !enteredFullscreen;
      }
    } catch {
      if (active) fallback = true;
    } finally {
      fullscreenPending = false;
    }
  }

  stage.tabIndex = -1;
  start.addEventListener("click", begin);
  exitButton.addEventListener("click", finish);
  $("previous").addEventListener("click", () => setColor(-1));
  $("next").addEventListener("click", () => setColor(1));
  $("hideControls").addEventListener("click", () => setControlsHidden(true));
  show.addEventListener("click", () => setControlsHidden(false));

  document.addEventListener("fullscreenchange", () => {
    if (!active) return;
    if (document.fullscreenElement === stage) enteredFullscreen = true;
    else if (enteredFullscreen) finish();
  });

  document.addEventListener("keydown", (event) => {
    if (!active || event.altKey || event.ctrlKey || event.metaKey) return;
    if (event.key === "Escape") {
      // Leave the browser's own fullscreen exit unblocked as well.
      finish();
      return;
    }
    if (event.repeat) return;
    if (event.key === "ArrowRight" || event.key === "ArrowLeft") {
      event.preventDefault();
      setColor(event.key === "ArrowRight" ? 1 : -1);
    } else if (event.key.toLowerCase() === "h") {
      event.preventDefault();
      setControlsHidden(!controls.hidden);
    }
  });

  stage.addEventListener("click", (event) => {
    if (!active || !recording || event.target !== stage) return;
    if (points.length >= maxPoints) {
      $("pointStatus").textContent = "已达到本次 100 个观察点的上限。";
      return;
    }
    const box = stage.getBoundingClientRect();
    if (!box.width || !box.height) return;
    const percent = (value, start, span) =>
      Math.min(100, Math.max(0, 100 * (value - start) / span)).toFixed(1);
    points.push({
      color: colors[colorIndex][1],
      x: percent(event.clientX, box.left, box.width),
      y: percent(event.clientY, box.top, box.height)
    });
    $("pointStatus").textContent = "已记录第 " + points.length + " 个观察点。";
  });
})();
