/* Framework-free core, shared by the offline page and Node's tests. */
(function (root, make) {
  const api = make();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.ClinicNetwork = api;
})(globalThis, () => {
  'use strict';
  const limit = 4000;
  const select = {
    path: ['unknown', 'wifi', 'ethernet'],
    other: ['unknown', 'yes', 'no'],
    scope: ['unknown', 'all', 'one', 'local', 'portal'],
    vpn: ['unknown', 'yes', 'no']
  };
  const keys = ['version', 'adapters', 'up', 'ipv4', 'ipv6', 'route4', 'route6', 'pair4', 'pair6'];
  function readSnapshot(raw) {
    if (typeof raw !== 'string' || raw.length > limit) throw new Error('证据不符合此版本的格式或长度限制。');
    let v;
    try { v = JSON.parse(raw); } catch { throw new Error('不是有效的证据内容。请只复制 { 和 } 之间的一整行（含括号）。'); }
    if (!v || Array.isArray(v) || typeof v !== 'object' || v.version !== 1 ||
        Object.keys(v).length !== keys.length || keys.some(k => !Object.hasOwn(v, k))) {
      throw new Error('证据版本或字段不匹配。为保护隐私，当前版本不会导入额外字段。');
    }
    if (!['ok', 'unavailable'].includes(v.adapters) || !keys.slice(2).every(k =>
      v[k] === null || (Number.isSafeInteger(v[k]) && v[k] >= 0 && v[k] <= 65535))) {
      throw new Error('证据中存在不支持的状态或计数。');
    }
    if (v.adapters === 'unavailable' ? keys.slice(2).some(k => v[k] !== null) : v.up === null) {
      throw new Error('网卡状态和计数相互矛盾。');
    }
    for (const fam of [4, 6]) {
      const ip = v['ipv' + fam], route = v['route' + fam], pair = v['pair' + fam];
      if ((ip === null || route === null) !== (pair === null) ||
          (ip !== null && ip > v.up) || (route !== null && route > v.up) ||
          (pair !== null && (pair > Math.min(ip, route) || pair < ip + route - v.up))) {
        throw new Error('IP、路由与网卡的计数相互矛盾。');
      }
    }
    return v;
  }

  function analyze(v, input = {}) {
    const ans = {};
    for (const k of Object.keys(select)) ans[k] = select[k].includes(input[k]) ? input[k] : 'unknown';
    const ask = (key, title) => ({ key, title });
    const Q = {
      path: ask('path', '这台电脑通过什么方式联网？'),
      other: ask('other', '同一网络、同一时间，另一台设备能正常上网吗？'),
      scope: ask('scope', '故障表现更接近哪一种？'),
      vpn: ask('vpn', '目前是否启用了 VPN，或单位要求使用代理？')
    };
    const findings = [];
    if (v?.adapters === 'ok') {
      findings.push(`系统报告有 ${v.up} 个启用且已连接的适配器（可能含虚拟网卡）。`);
      for (const fam of [4, 6]) {
        const [ip, route, pair] = [v['ipv' + fam], v['route' + fam], v['pair' + fam]];
        const show = n => n === null ? '未取得' : String(n);
        findings.push(`IPv${fam}：具备候选地址的适配器 ${show(ip)}；有默认路由 ${show(route)}；同一适配器同时满足两项 ${show(pair)}。`);
      }
    } else findings.push(v ? '未能读取 Windows 网卡状态，不能把采集失败当作没有网卡。' : '尚未导入 Windows 自动检查结果。');
    const common = '本工具没有访问互联网，不能确认 DNS、网关可达性、网络运营商状态或硬件故障。';
    function result(code, headline, next, question) {
      const eligible = code === 'local' ? [] : code === 'shared' ? ['scope'] : [question.key, 'scope', 'other', 'path', 'vpn'];
      const unresolved = eligible.find(key => ans[key] === 'unknown');
      return { code, headline, next, question: unresolved ? Q[unresolved] : null, findings, limit: common };
    }
    const shared = ans.other === 'no' && ['unknown', 'all'].includes(ans.scope);
    const sharedNext = '先确认两台设备连的是同一个 Wi-Fi（有线则确认接同一路由器），手机测试时先关闭移动数据。若仍同时失败，先看路由器是否通电、状态灯是否异常；再查运营商公告，或咨询网络管理员。';
    if (ans.scope === 'local') return result('local', '先检查这台电脑上提供网页的程序',
      'localhost 和 127.0.0.1 指向这台电脑。先确认提供网页的程序已启动，再核对浏览器中的地址和端口。这个现象本身不需要重置网络。', Q.scope);
    const paired = v?.pair4 > 0 || v?.pair6 > 0;
    const full = v?.pair4 !== null && v?.pair6 !== null;
    if (shared) return result('shared', '另一台设备也失败，先排查两台设备共用的网络', sharedNext, Q.scope);
    if (v?.adapters === 'ok' && v.up === 0) {
      return result('no-link', '系统未报告已连接的网络适配器',
        ans.path === 'wifi' ? '打开 Windows「设置 → 网络和 Internet → Wi-Fi」，确认 Wi-Fi 已开启、未打开飞行模式，并查看目标网络是否显示“已连接”。'
        : ans.path === 'ethernet' ? '查看网线两端是否插稳，以及路由器对应端口的链路指示灯。若是在办公环境，先询问管理员。'
        : '先确认这台电脑正在尝试连接 Wi-Fi 还是有线网络。', ans.path === 'unknown' ? Q.path : Q.other);
    }
    if (v?.adapters === 'ok' && full && !paired && v.ipv4 === 0 && v.ipv6 === 0) {
      return result('no-address', '有已连接网卡，但未报告可用于此检查的 IP 地址',
        '查看当前连接的 Windows IP 分配设置和路由器 DHCP 状态。自定义静态 IP 的设备先联系管理员，不要直接重置。', Q.other);
    }
    if (v?.adapters === 'ok' && full && !paired) {
      const noRoute = v.route4 === 0 && v.route6 === 0;
      return result(noRoute ? 'no-default-route' : 'unpaired-route',
        noRoute ? '已连接网卡没有观测到默认路由' : '没有找到地址和同地址族默认路由同时存在的网卡',
        '查看 Windows 中实际联网的适配器是否有默认网关。若使用 VPN、公司网络或只访问局域网，可能是设计如此，先核对管理员给的配置。', Q.vpn);
    }
    if (ans.scope === 'portal') return result('portal', '你遇到的表现可能是公共网络需要登录',
      '检查 Windows 网络通知里的登录提示，仅在确认是该网络的官方页面后登录。不要忽略浏览器证书警告。', Q.other);
    if (ans.scope === 'one') return result('one', '故障看起来局限于一个应用或网站',
      '先检查其他应用是否工作；只有一个应用或网站异常时，优先查该应用的服务状态、离线模式或代理设置，不要先重置整台电脑的网络。', Q.vpn);
    if (ans.vpn === 'yes') return result('vpn', 'VPN 或单位代理是应优先核对的配置',
      '确认该应用是否应通过 VPN 或单位代理，向管理员核对配置；不要自动关闭单位要求的保护或更改策略。', Q.scope);
    if (paired) return result('configured', '至少有一条候选网络配置，尚不能确定故障原因',
      '先比较同一网络上的其他设备，再分辨是所有应用都失败还是只有个别应用失败。', ans.other === 'unknown' ? Q.other : Q.scope);
    return result('unknown', '现有信息不足，不能确定故障原因',
      v ? '可用手动问题继续缩小范围；如果方便，重新运行 Windows 采集器，确认没有系统组件或策略错误。' : '可先导入 Windows 只读采集结果，也可以直接回答下面的问题。', ans.scope === 'unknown' ? Q.scope : Q.other);
  }
  return { readSnapshot, analyze };
});
