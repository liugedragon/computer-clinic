'use strict';

(function () {
  // Use the language of the current offline HTML page.
  const msg = (zh, en) => globalThis.document?.documentElement.lang === "en" ? en : zh;
  const core = globalThis.FreezeTimeline;
  const $ = id => document.getElementById(id);
  const labels = {
    unexpected_reboot: msg('意外重启标记', "Unexpected restart marker"), unexpected_shutdown: msg('异常关机标记', "Unexpected shutdown marker"),
    bugcheck_report: msg('Windows 蓝屏报告', "Windows blue-screen report"), storage_io_retry: msg('存储 I/O 重试', "Storage I/O retry"),
    storage_reset: msg('存储设备重置', "Storage device reset"), application_error: msg('应用错误', "Application error"), application_hang: msg('应用挂起', "Application hang")
  };
  const coverage = {complete: msg('查询完成（仅所选事件）', "Query complete (selected events only)"), limited: msg('结果受限，可能缺记录', "Limited; records may be missing"), unavailable: msg('无法读取', "Unavailable")};
  const recordCount = count => count + msg(' 条记录', count === 1 ? ' record' : ' records');
  let request = 0;

  function add(parent, tag, value) {
    const el = document.createElement(tag);
    el.textContent = value;
    parent.append(el);
    return el;
  }

  function reset(message) {
    $('results').hidden = true;
    $('timeline').replaceChildren();
    for (const id of ['mode', 'reboot', 'bugcheck', 'coverage']) $(id).textContent = '';
    $('status').textContent = message;
  }

  function render(report, fromBuiltInDemo = false) {
    $('mode').textContent = fromBuiltInDemo ? msg('内置合成样例 · 不是本机记录', "Synthetic example · Not from this PC") : msg('导入的 Windows 格式摘要 · 来源未经核验', "Imported Windows-format summary · Source unverified");
    $('reboot').textContent = report.rebootEvidence === 'observed' ?
      msg('有标记（', "Markers found (") + recordCount(report.rebootIndexes.length) + msg('）', ")") : msg('未知', "Unknown");
    $('bugcheck').textContent = report.bugcheckEvidence === 'observed' ?
      msg('有证据（', "Evidence found (") + recordCount(report.bugcheckIndexes.length) + msg('）', ")") : msg('未知', "Unknown");
    $('coverage').textContent = 'System：' + coverage[report.channels.System] +
      '；Application：' + coverage[report.channels.Application] + '。';
    const list = document.createDocumentFragment();
    report.timeline.forEach((row, index) => {
      const item = add(list, 'li', '');
      item.id = 'event-' + index;
      const time = add(item, 'time', row.at);
      time.dateTime = row.at;
      add(item, 'strong', ' · ' + labels[row.kind]);
      add(item, 'div', row.channel + ' / ' + row.provider + ' / ' + row.eventId);
      if (row.bugcheckCode !== null) add(item, 'code', msg('Stop 代码 0x', "Stop code 0x") + row.bugcheckCode.toString(16).toUpperCase());
      if (row.nearby && row.nearby.length) {
        const box = add(item, 'details', '');
        add(box, 'summary', msg('时间接近的存储或应用记录（仅作参考）', "Nearby storage or app events (for context only)"));
        const inner = add(box, 'ul', '');
        for (const context of row.nearby) {
          const entry = add(inner, 'li', '');
          const gap = context.relation === 'same_time' ? msg('同一报时', "Same reported time") :
            (context.relation === 'before' ? msg('报时前 ', "Before report: ") : msg('报时后 ', "After report: ")) + Math.abs(context.offsetSeconds) + msg(' 秒', " s");
          const link = add(entry, 'a', gap + ' · ' + labels[report.timeline[context.index].kind]);
          link.href = '#event-' + context.index;
        }
        if (row.nearbyOmitted) add(box, 'p', msg('另有 ', "Other nearby events omitted: ") + row.nearbyOmitted + msg(' 条邻近记录，未在此列出。', "."));
      }
    });
    $('timeline').replaceChildren(list);
    $('empty').hidden = report.timeline.length !== 0;
    $('status').textContent = msg('已载入 ', "Event records loaded: ") + report.timeline.length + msg(' 条记录。', ".");
    $('results').hidden = false;
  }

  $('demo').addEventListener('click', () => { ++request; render(core.demo(), true); });
  $('clear').addEventListener('click', () => { ++request; reset(msg('已清空。', "Cleared.")); });
  $('summary-file').addEventListener('change', async function () {
    const file = this.files[0];
    this.value = '';
    if (!file) return;
    const seq = ++request;
    reset(msg('正在离线读取摘要。', "Reading the summary offline."));
    try {
      if (file.size > core.MAX_BYTES) throw new core.InputError(msg('文件超过 256 KiB。', "The file exceeds 256 KiB."));
      const bytes = new Uint8Array(await file.arrayBuffer());
      if (seq !== request) return;
      render(core.analyze(bytes));
    } catch (e) {
      if (seq !== request) return;
      reset(e instanceof core.InputError ? e.message : msg('无法读取这份摘要。', "Could not read the summary."));
    }
  });
})();
