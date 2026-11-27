'use strict';

(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.FreezeTimeline = api;
})(globalThis, function () {
  // Use the language of the current offline HTML page.
  const msg = (zh, en) => globalThis.document?.documentElement.lang === "en" ? en : zh;
  const MAX_BYTES = 256 * 1024;
  const MAX_PER_CHANNEL = 200;
  const WINDOW_DAYS = 7;
  const WINDOW_SECONDS = 300;
  const MAX_CONTEXT = 8;
  const KERNEL = 'Microsoft-Windows-Kernel-Power';
  const WER = 'Microsoft-Windows-WER-SystemErrorReporting';
  const SOURCES = [
    ['System', KERNEL, 41, 'unexpected_reboot'],
    ['System', 'EventLog', 6008, 'unexpected_shutdown'],
    ['System', WER, 1001, 'bugcheck_report'],
    ['System', 'disk', 153, 'storage_io_retry'],
    ['System', 'storahci', 129, 'storage_reset'],
    ['System', 'stornvme', 129, 'storage_reset'],
    ['Application', 'Application Error', 1000, 'application_error'],
    ['Application', 'Application Hang', 1002, 'application_hang']
  ];
  const REBOOT = new Set(['unexpected_reboot', 'unexpected_shutdown', 'bugcheck_report']);
  const CONTEXT = new Set(SOURCES.map(x => x[3]).filter(x => !REBOOT.has(x)));
  const STATUSES = new Set(['complete', 'limited', 'unavailable']);
  const SOURCENAMES = new Set(['synthetic_fixture', 'windows_local_summary']);
  const TS = /^(20\d\d|2100)-(\d{2})-(\d{2})T([01]\d|2[0-3]):([0-5]\d):([0-5]\d)(?:\.(\d{1,6}))?(Z|[+-](?:[01]\d|2[0-3]):[0-5]\d)$/;

  class InputError extends Error {}

  function exactKeys(o, keys) {
    return o !== null && typeof o === 'object' && !Array.isArray(o) &&
      Object.keys(o).length === keys.length && keys.every(k => Object.hasOwn(o, k));
  }

  function parseTime(s) {
    const m = typeof s === 'string' && s.length <= 32 && TS.exec(s);
    if (!m || m[0] !== s || m[8] === '-00:00') throw new InputError(msg('时间必须有效并带时区。', "The timestamp must be valid and include a time zone."));
    const year = +m[1], month = +m[2], day = +m[3];
    const local = Date.UTC(year, month - 1, day, +m[4], +m[5], +m[6]);
    const check = new Date(local);
    if (check.getUTCFullYear() !== year || check.getUTCMonth() !== month - 1 ||
        check.getUTCDate() !== day) throw new InputError(msg('日期不合法。', "The date is invalid."));
    const zone = m[8];
    const offset = zone === 'Z' ? 0 :
      (zone[0] === '+' ? 1 : -1) * (+zone.slice(1, 3) * 60 + +zone.slice(4, 6));
    const fraction = (m[7] || '').padEnd(6, '0');
    const adjusted = local - offset * 60000;
    return {
      micros: adjusted * 1000 + +fraction,
      at: new Date(adjusted).toISOString().replace('.000Z', '.' + fraction + 'Z')
    };
  }

  // Native JSON.parse validates the grammar, but silently overwrites duplicate
  // keys. Scan string tokens separately, decoding escaped keys before comparing.
  function rejectDuplicateKeys(text) {
    const tokens = /"(?:\\.|[^"\\])*"|[{}\[\]:,]/g;
    const stack = [];
    let lastString;
    for (const found of text.matchAll(tokens)) {
      const token = found[0];
      if (token === '{' || token === '[') {
        if (stack.length >= 8) throw new InputError(msg('摘要的结构过深。', "The summary is nested too deeply."));
        stack.push(token === '{' ? new Set() : null);
      } else if (token === '}' || token === ']') {
        stack.pop();
      } else if (token === ':') {
        const key = JSON.parse(lastString);
        const keys = stack[stack.length - 1];
        if (keys.has(key)) throw new InputError(msg('摘要含重复的 JSON 字段。', "The summary contains a duplicate JSON field."));
        keys.add(key);
      } else if (token[0] === '"') {
        lastString = token;
      }
    }
  }

  function readEnvelope(bytes) {
    if (!(bytes instanceof Uint8Array) || bytes.length > MAX_BYTES) {
      throw new InputError(msg('只接收不超过 256 KiB 的 UTF-8 JSON。', "Use UTF-8 JSON no larger than 256 KiB."));
    }
    let data, text;
    try {
      text = new TextDecoder('utf-8', {fatal: true}).decode(bytes);
      data = JSON.parse(text);
    } catch {
      throw new InputError(msg('无法读取 UTF-8 JSON。', "Could not read UTF-8 JSON."));
    }
    rejectDuplicateKeys(text);
    if (!exactKeys(data, ['schema_version', 'source', 'window_days', 'channels', 'events']) ||
        data.schema_version !== 2 || !SOURCENAMES.has(data.source) || data.window_days !== WINDOW_DAYS ||
        !exactKeys(data.channels, ['System', 'Application']) ||
        !STATUSES.has(data.channels.System) || !STATUSES.has(data.channels.Application) ||
        !Array.isArray(data.events) || data.events.length > MAX_PER_CHANNEL * 2) {
      throw new InputError(msg('这不是受支持的 v2 事件摘要，或事件超过 400 条。', "The summary is not a supported v2 event summary or contains more than 400 events."));
    }
    return data;
  }

  function rowFrom(raw) {
    const fields = ['reported_at', 'channel', 'provider', 'event_id'];
    const hasCode = raw !== null && typeof raw === 'object' && Object.hasOwn(raw, 'bugcheck_code');
    if (!exactKeys(raw, hasCode ? [...fields, 'bugcheck_code'] : fields)) {
      throw new InputError(msg('事件包含不允许的字段。', "An event contains an unexpected field."));
    }
    const rule = SOURCES.find(r => r[0] === raw.channel && r[1] === raw.provider && r[2] === raw.event_id);
    if (!rule) throw new InputError(msg('事件来源、频道或编号不在白名单。', "The event source, channel, or ID is not supported."));
    const code = hasCode ? raw.bugcheck_code : 0;
    if (hasCode && (rule[3] !== 'unexpected_reboot' || !Number.isInteger(code) ||
        code < 0 || code > 0xFFFFFFFF)) {
      throw new InputError(msg('蓝屏代码字段不合法。', "The stop code field is invalid."));
    }
    return {
      ...parseTime(raw.reported_at),
      channel: rule[0], provider: rule[1], eventId: rule[2],
      kind: rule[3], bugcheckCode: code > 0 ? code : null
    };
  }

  function bisect(times, bound, upper = false) {
    let low = 0, high = times.length;
    while (low < high) {
      const mid = (low + high) >>> 1;
      if (times[mid] < bound || (upper && times[mid] === bound)) low = mid + 1;
      else high = mid;
    }
    return low;
  }

  function around(micros, context, times) {
    const window = WINDOW_SECONDS * 1000000;
    const low = bisect(times, micros - window);
    const high = bisect(times, micros + window, true);
    let right = bisect(times, micros);
    let left = right - 1;
    const nearby = [];
    while (nearby.length < MAX_CONTEXT && (left >= low || right < high)) {
      const i = right >= high || (left >= low && micros - times[left] <= times[right] - micros)
        ? left-- : right++;
      const delta = times[i] - micros;
      nearby.push({
        index: context[i].index, offsetSeconds: delta / 1000000,
        relation: delta < 0 ? 'before' : delta > 0 ? 'after' : 'same_time'
      });
    }
    return {nearby, nearbyOmitted: high - low - nearby.length};
  }

  function analyze(bytes) {
    const data = readEnvelope(bytes);
    const counts = {System: 0, Application: 0};
    const rows = data.events.map(r => {
      const row = rowFrom(r);
      if (++counts[row.channel] > MAX_PER_CHANNEL || data.channels[row.channel] === 'unavailable') {
        throw new InputError(msg('事件条数或频道状态与摘要不符。', "The event count or channel status does not match the summary."));
      }
      return row;
    }).sort((a, b) => a.micros - b.micros);
    const context = rows.flatMap((e, i) => CONTEXT.has(e.kind) ? [{index: i, micros: e.micros}] : []);
    const times = context.map(e => e.micros);
    const rebootIndexes = [], bugcheckIndexes = [];
    const timeline = rows.map(({micros, ...row}, index) => {
      if (REBOOT.has(row.kind)) rebootIndexes.push(index);
      if (row.kind === 'bugcheck_report' || row.bugcheckCode !== null) bugcheckIndexes.push(index);
      return {...row, ...(REBOOT.has(row.kind) ? around(micros, context, times) : {})};
    });
    return {
      source: data.source, channels: {...data.channels}, timeline, rebootIndexes,
      bugcheckIndexes, rebootEvidence: rebootIndexes.length ? 'observed' : 'unknown',
      bugcheckEvidence: bugcheckIndexes.length ? 'observed' : 'unknown'
    };
  }

  const demoRows = [
    ['2026-01-02T12:00:10Z', 'Application', 'Application Hang', 1002],
    ['2026-01-02T20:00:00+08:00', 'System', KERNEL, 41, 0],
    ['2026-01-02T11:58:55Z', 'System', 'disk', 153],
    ['2026-01-02T12:00:03Z', 'System', 'EventLog', 6008],
    ['2026-01-02T12:00:06Z', 'System', WER, 1001]
  ];
  function demo() {
    const events = demoRows.map(([reported_at, channel, provider, event_id, code]) =>
      ({reported_at, channel, provider, event_id, ...(code === undefined ? {} : {bugcheck_code: code})}));
    return analyze(new TextEncoder().encode(JSON.stringify({
      schema_version: 2, source: 'synthetic_fixture', window_days: WINDOW_DAYS,
      channels: {System: 'complete', Application: 'complete'}, events
    })));
  }

  return Object.freeze({analyze, demo, InputError, MAX_BYTES, MAX_PER_CHANNEL, WINDOW_SECONDS, MAX_CONTEXT});
});
