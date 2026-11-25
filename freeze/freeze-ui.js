'use strict';

(function () {
  const core = globalThis.FreezeTimeline;
  const $ = id => document.getElementById(id);
  const labels = {
    unexpected_reboot: '意外重启标记', unexpected_shutdown: '异常关机标记',
    bugcheck_report: 'Windows 蓝屏报告', storage_io_retry: '存储 I/O 重试',
    storage_reset: '存储设备重置', application_error: '应用错误', application_hang: '应用挂起'
  };
  const coverage = {complete: '查询完成（仅所选事件）', limited: '结果受限，可能缺记录', unavailable: '无法读取'};
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
    $('mode').textContent = fromBuiltInDemo ? '内置合成样例 · 不是本机记录' : '导入的 Windows 格式摘要 · 来源未经核验';
    $('reboot').textContent = report.rebootEvidence === 'observed' ?
      '有标记（' + report.rebootIndexes.length + ' 条记录）' : '未知';
    $('bugcheck').textContent = report.bugcheckEvidence === 'observed' ?
      '有证据（' + report.bugcheckIndexes.length + ' 条记录）' : '未知';
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
      if (row.bugcheckCode !== null) add(item, 'code', 'Stop 代码 0x' + row.bugcheckCode.toString(16).toUpperCase());
      if (row.nearby && row.nearby.length) {
        const box = add(item, 'details', '');
        add(box, 'summary', '时间接近的存储或应用记录（仅作参考）');
        const inner = add(box, 'ul', '');
        for (const context of row.nearby) {
          const entry = add(inner, 'li', '');
          const gap = context.relation === 'same_time' ? '同一报时' :
            (context.relation === 'before' ? '报时前 ' : '报时后 ') + Math.abs(context.offsetSeconds) + ' 秒';
          const link = add(entry, 'a', gap + ' · ' + labels[report.timeline[context.index].kind]);
          link.href = '#event-' + context.index;
        }
        if (row.nearbyOmitted) add(box, 'p', '另有 ' + row.nearbyOmitted + ' 条邻近记录，未在此列出。');
      }
    });
    $('timeline').replaceChildren(list);
    $('empty').hidden = report.timeline.length !== 0;
    $('status').textContent = '已载入 ' + report.timeline.length + ' 条记录。';
    $('results').hidden = false;
  }

  $('demo').addEventListener('click', () => { ++request; render(core.demo(), true); });
  $('clear').addEventListener('click', () => { ++request; reset('已清空。'); });
  $('summary-file').addEventListener('change', async function () {
    const file = this.files[0];
    this.value = '';
    if (!file) return;
    const seq = ++request;
    reset('正在离线读取摘要。');
    try {
      if (file.size > core.MAX_BYTES) throw new core.InputError('文件超过 256 KiB。');
      const bytes = new Uint8Array(await file.arrayBuffer());
      if (seq !== request) return;
      render(core.analyze(bytes));
    } catch (e) {
      if (seq !== request) return;
      reset(e instanceof core.InputError ? e.message : '无法读取这份摘要。');
    }
  });
})();
