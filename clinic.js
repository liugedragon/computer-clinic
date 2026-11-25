(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const fields = ['path', 'other', 'scope', 'vpn'];
  const box = $('snapshot'), message = $('message'), follow = $('follow');
  let evidence = null;
  let nextQuestion;
  let demoIndex = -1;
  const demoCases = [
    {label:'1/2 · 有线网卡没有报告连接', evidence:{version:1,adapters:'ok',up:0,ipv4:0,ipv6:0,route4:0,route6:0,pair4:0,pair6:0}, path:'ethernet',scope:'all'},
    {label:'2/2 · 只有一个应用打不开', evidence:null, path:'wifi',scope:'one'}
  ];
  function showDemoLabel() {
    const active = demoIndex >= 0;
    $('demo-status').hidden = !active;
    $('demo-status').textContent = active ? '演示数据 · 不是本机检查 · ' + demoCases[demoIndex].label : '';
    $('quick-demo').textContent = active ? '切换演示场景' : '看两个演示场景';
  }
  function leaveDemo() {
    if (demoIndex < 0) return;
    demoIndex = -1;
    evidence = null;
    for (const field of fields) $(field).value = 'unknown';
  }
  function describe(text, error = false, file = false) {
    message.textContent = text;
    message.classList.toggle('error', error);
    box.setAttribute('aria-invalid', String(error && !file));
    $('snapshot-file').setAttribute('aria-invalid', String(error && file));
  }
  function render() {
    const ans = Object.fromEntries(fields.map(key => [key, $(key).value]));
    const report = ClinicNetwork.analyze(evidence, ans);
    $('result-title').textContent = report.headline;
    $('next').textContent = report.next;
    $('limits').textContent = report.limit;
    $('findings').replaceChildren(...report.findings.map(item => {
      const row = document.createElement('li');
      row.textContent = item;
      return row;
    }));
    showDemoLabel();
    nextQuestion = report.question?.key;
    follow.hidden = !nextQuestion;
    if (report.question) follow.textContent = '建议补充：' + report.question.title;
  }
  function reset() {
    localFile.cancel();
    demoIndex = -1;
    evidence = null;
    $('quick-feedback').textContent = '';
    box.value = '';
    for (const field of fields) $(field).value = 'unknown';
    describe('没有证据时，可以先用上方引导或按自己知道的现象选择。');
    render();
  }
  function apply(raw, fromFile = false) {
    evidence = ClinicNetwork.readSnapshot(raw);
    if (!fromFile) box.value = '';
    describe(fromFile ? '已导入所选文件。文件来源未经核验，未上传或保存。' :
      '已导入。本页仅使用计数，没有保存原始内容。');
    render();
  }
  function importFailed(msg, fromFile = false) {
    evidence = null; // Never present earlier evidence as if it were the failed import.
    describe(msg, true, fromFile);
    render();
  }
  const localFile = ClinicLocalJson.reader($('snapshot-file'), 4000, {
    start() {
      leaveDemo();
      evidence = null;
      describe('正在读取所选 JSON 文件…');
      render();
    },
    success(raw) { apply(raw, true); },
    error(msg) { importFailed(msg, true); }
  });
  $('load').addEventListener('click', () => {
    localFile.cancel();
    leaveDemo();
    try { apply(box.value.trim()); }
    catch (error) { importFailed(error.message); }
  });
  // If the input is edited after import, explicitly invalidate old evidence.
  box.addEventListener('input', () => {
    const wasReading = localFile.pending();
    localFile.cancel();
    const previousDemo = demoIndex >= 0;
    leaveDemo();
    if (wasReading || previousDemo || evidence || message.classList.contains('error')) {
      evidence = null;
      describe('输入已修改，点击“导入并分析”后才会使用新的内容。');
      render();
    }
  });
  $('clear').addEventListener('click', reset);
  fields.forEach(field => $(field).addEventListener('change', () => {
    const value = $(field).value;
    leaveDemo();
    $(field).value = value;
    render();
  }));
  ['all','one','portal'].forEach(kind => $('quick-' + kind).addEventListener('click', () => {
    leaveDemo();
    $('scope').value = kind;
    render();
    $('result-title').focus();
  }));
  $('quick-paste').addEventListener('click', () => {
    if (demoIndex >= 0) { leaveDemo(); render(); }
    box.focus();
  });
  $('quick-demo').addEventListener('click', () => {
    if (demoIndex < 0 && (localFile.pending() || evidence || box.value.trim() || fields.some(key => $(key).value !== 'unknown'))) {
      $('quick-feedback').textContent = '当前页面有排查内容。若要看演示，请先点“重新开始”；不会替你清除。';
      return;
    }
    const next = (demoIndex + 1) % demoCases.length;
    reset();
    demoIndex = next;
    const demo = demoCases[next];
    evidence = demo.evidence;
    $('path').value = demo.path;
    $('scope').value = demo.scope;
    render();
    $('result-title').focus();
  });
  $('redo').addEventListener('click', () => {
    $('clear').click();
    $('quick-title').focus();
  });
  follow.addEventListener('click', () => { if (nextQuestion) $(nextQuestion).focus(); });
  reset();
})();
