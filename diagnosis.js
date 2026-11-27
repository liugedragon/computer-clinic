/* Framework-free core, shared by the offline page and Node's tests. */
(function (root, make) {
  const api = make();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.ClinicNetwork = api;
})(globalThis, () => {
  'use strict';
  // Use the language of the current offline HTML page.
  const msg = (zh, en) => globalThis.document?.documentElement.lang === "en" ? en : zh;
  const limit = 4000;
  const select = {
    path: ['unknown', 'wifi', 'ethernet'],
    other: ['unknown', 'yes', 'no'],
    scope: ['unknown', 'all', 'one', 'local', 'portal'],
    vpn: ['unknown', 'yes', 'no']
  };
  const keys = ['version', 'adapters', 'up', 'ipv4', 'ipv6', 'route4', 'route6', 'pair4', 'pair6'];
  function readSnapshot(raw) {
    if (typeof raw !== 'string' || raw.length > limit) throw new Error(msg('证据不符合此版本的格式或长度限制。', "The summary does not meet the format or size limits."));
    let v;
    try { v = JSON.parse(raw); } catch { throw new Error(msg('不是有效的证据内容。请只复制 { 和 } 之间的一整行（含括号）。', "This is not a valid summary. Copy the full JSON object, including the opening and closing braces.")); }
    if (!v || Array.isArray(v) || typeof v !== 'object' || v.version !== 1 ||
        Object.keys(v).length !== keys.length || keys.some(k => !Object.hasOwn(v, k))) {
      throw new Error(msg('证据版本或字段不匹配。为保护隐私，当前版本不会导入额外字段。', "The summary version or fields do not match. Extra fields are not imported for privacy."));
    }
    if (!['ok', 'unavailable'].includes(v.adapters) || !keys.slice(2).every(k =>
      v[k] === null || (Number.isSafeInteger(v[k]) && v[k] >= 0 && v[k] <= 65535))) {
      throw new Error(msg('证据中存在不支持的状态或计数。', "The summary contains an unsupported status or count."));
    }
    if (v.adapters === 'unavailable' ? keys.slice(2).some(k => v[k] !== null) : v.up === null) {
      throw new Error(msg('网卡状态和计数相互矛盾。', "The adapter status and counts contradict each other."));
    }
    for (const fam of [4, 6]) {
      const ip = v['ipv' + fam], route = v['route' + fam], pair = v['pair' + fam];
      if ((ip === null || route === null) !== (pair === null) ||
          (ip !== null && ip > v.up) || (route !== null && route > v.up) ||
          (pair !== null && (pair > Math.min(ip, route) || pair < ip + route - v.up))) {
        throw new Error(msg('IP、路由与网卡的计数相互矛盾。', "The IP, route, and adapter counts contradict each other."));
      }
    }
    return v;
  }

  function analyze(v, input = {}) {
    const ans = {};
    for (const k of Object.keys(select)) ans[k] = select[k].includes(input[k]) ? input[k] : 'unknown';
    const ask = (key, title) => ({ key, title });
    const Q = {
      path: ask('path', msg('这台电脑通过什么方式联网？', "How does this PC connect to the network?")),
      other: ask('other', msg('同一网络、同一时间，另一台设备能正常上网吗？', "Can another device on the same network get online at the same time?")),
      scope: ask('scope', msg('故障表现更接近哪一种？', "Which description best matches what fails?")),
      vpn: ask('vpn', msg('目前是否启用了 VPN，或单位要求使用代理？', "Is a VPN or organization-managed proxy in use?"))
    };
    const findings = [];
    if (v?.adapters === 'ok') {
      findings.push(msg(`系统报告有 ${v.up} 个启用且已连接的适配器（可能含虚拟网卡）。`, `The system reports ${v.up} enabled and connected adapters, possibly including virtual adapters.`));
      for (const fam of [4, 6]) {
        const [ip, route, pair] = [v['ipv' + fam], v['route' + fam], v['pair' + fam]];
        const show = n => n === null ? msg('未取得', "unavailable") : String(n);
        findings.push(msg(`IPv${fam}：具备候选地址的适配器 ${show(ip)}；有默认路由 ${show(route)}；同一适配器同时满足两项 ${show(pair)}。`, `IPv${fam}: adapters with a candidate address: ${show(ip)}; with a default route: ${show(route)}; with both on the same adapter: ${show(pair)}.`));
      }
    } else findings.push(v ? msg('这份摘要没有提供网卡状态，不代表电脑没有网卡。', "The summary did not contain adapter status. This does not mean the PC has no adapters.") : msg('尚未导入网络摘要；可以直接按现象排查。', "No network summary was imported. You can start with the symptoms."));
    const common = msg('本工具没有访问互联网，不能确认 DNS、网关可达性、网络运营商状态或硬件故障。', "This tool did not contact the internet. It cannot verify DNS, gateway reachability, provider status, or hardware faults.");
    function result(code, headline, next, question) {
      const eligible = code === 'local' ? [] : code === 'shared' ? ['scope'] : [question.key, 'scope', 'other', 'path', 'vpn'];
      const unresolved = eligible.find(key => ans[key] === 'unknown');
      return { code, headline, next, question: unresolved ? Q[unresolved] : null, findings, limit: common };
    }
    const shared = ans.other === 'no' && ['unknown', 'all'].includes(ans.scope);
    const sharedNext = msg('先确认两台设备连的是同一个 Wi-Fi（有线则确认接同一路由器），手机测试时先关闭移动数据。若仍同时失败，先看路由器是否通电、状态灯是否异常；再查运营商公告，或咨询网络管理员。', "Check that both devices use the same Wi-Fi or router. Turn off mobile data on the phone for this check. If both still fail, check router power and status lights, then look for a provider outage or ask your network administrator.");
    if (ans.scope === 'local') return result('local', msg('先检查这台电脑上提供网页的程序', "Check the app serving the page on this PC"),
      msg('localhost 和 127.0.0.1 指向这台电脑。先确认提供网页的程序已启动，再核对浏览器中的地址和端口。这个现象本身不需要重置网络。', "localhost and 127.0.0.1 refer to this PC. Check that the app serving the page is running and that the browser address and port are correct. Do not reset the network just for this symptom."), Q.scope);
    const paired = v?.pair4 > 0 || v?.pair6 > 0;
    const full = v?.pair4 !== null && v?.pair6 !== null;
    if (shared) return result('shared', msg('另一台设备也失败，先排查两台设备共用的网络', "Another device also fails. Check the shared network first."), sharedNext, Q.scope);
    const missingPath = v?.adapters === 'ok' && (v.up === 0 || (full && !paired));
    if (missingPath && ['one', 'portal'].includes(ans.scope)) {
      const one = ans.scope === 'one';
      return result('recheck-summary', one
        ? msg('你选择了仅一个应用或网站失败，但摘要未显示可用的候选联网配置', "You selected one failing app or site, but the summary shows no candidate network configuration")
        : msg('你看到了登录提示，但摘要未显示可用的候选联网配置', "You saw a sign-in prompt, but the summary shows no candidate network configuration"),
        one
          ? msg('先确认同一台电脑、同一个网络上的其他应用现在能否联网。然后重新获取这台电脑的摘要，避免混用另一台设备或另一时间的记录。', "Check whether other apps can get online now on this PC and network. Then collect a fresh summary from this PC, so the clues describe the same device and time.")
          : msg('在系统的 Wi-Fi 设置中确认当前连接，再重新获取这台电脑的摘要。登录提示并不说明互联网可达；仅在确认提示属于这个网络且没有证书警告时登录。', "Confirm the current connection in your Wi-Fi settings, then collect a fresh summary from this PC. A sign-in prompt does not prove internet access. Only sign in after verifying the prompt belongs to this network and there is no certificate warning."), Q.other);
    }
    if (v?.adapters === 'ok' && v.up === 0) {
      return result('no-link', msg('系统未报告已连接的网络适配器', "No connected network adapter was reported"),
        ans.path === 'wifi' ? msg('打开系统的 Wi-Fi 设置（Windows 或 Linux 桌面均可），确认 Wi-Fi 已开启、飞行模式已关闭，目标网络显示已连接。', "Open your Wi-Fi settings on Windows or your Linux desktop. Check that Wi-Fi is on, airplane mode is off, and you are connected to the intended network.")
        : ans.path === 'ethernet' ? msg('查看网线两端是否插稳，以及路由器对应端口的链路指示灯。若是在办公环境，先询问管理员。', "Check that the cable is secure at both ends and look at the corresponding port light. On a work network, check with the administrator first.")
        : msg('先确认这台电脑正在尝试连接 Wi-Fi 还是有线网络。', "First confirm whether this PC is trying to use Wi-Fi or Ethernet."), ans.path === 'unknown' ? Q.path : Q.other);
    }
    if (v?.adapters === 'ok' && full && !paired && v.ipv4 === 0 && v.ipv6 === 0) {
      return result('no-address', msg('有已连接网卡，但未报告可用于此检查的 IP 地址', "A connected adapter was found, but no usable IP address was reported"),
        msg('查看当前连接的 IP 分配设置和路由器 DHCP 状态。自定义静态 IP 的设备先联系管理员，不要直接重置。', "Check the IP assignment for this connection and the router's DHCP status. For a custom static IP, ask the administrator before resetting anything."), Q.other);
    }
    if (v?.adapters === 'ok' && full && !paired) {
      const noRoute = v.route4 === 0 && v.route6 === 0;
      return result(noRoute ? 'no-default-route' : 'unpaired-route',
        noRoute ? msg('已连接网卡没有观测到默认路由', "No default route was found on the connected adapters") : msg('没有找到地址和同地址族默认路由同时存在的网卡', "No adapter was found with both an address and a default route of the same address family"),
        msg('在系统网络设置中查看实际联网的适配器是否有默认网关。若使用 VPN、公司网络或只访问局域网，可能是设计如此，先核对管理员给的配置。', "Check the network settings for a default gateway on the adapter you actually use. VPN, work, or local-only networks may be intentionally configured this way. Check with the administrator first."), Q.vpn);
    }
    if (ans.scope === 'portal') return result('portal', msg('你遇到的表现可能是公共网络需要登录', "The public network may require sign-in"),
      msg('检查系统网络通知或浏览器里是否有登录提示，仅在确认是该网络的官方页面后登录。不要忽略浏览器证书警告。', "Look for a sign-in prompt in your network notifications or browser. Use it only after verifying that it belongs to that network. Do not ignore browser certificate warnings."), Q.other);
    if (ans.scope === 'one') return result('one', msg('故障看起来局限于一个应用或网站', "The problem appears limited to one app or website"),
      msg('先检查其他应用是否工作；只有一个应用或网站异常时，优先查该应用的服务状态、离线模式或代理设置，不要先重置整台电脑的网络。', "Check whether other apps work. If only one fails, check its service status, offline mode, or proxy settings before resetting the PC's network."), Q.vpn);
    if (ans.vpn === 'yes') return result('vpn', msg('VPN 或单位代理是应优先核对的配置', "Check the VPN or organization-managed proxy first"),
      msg('确认该应用是否应通过 VPN 或单位代理，向管理员核对配置；不要自动关闭单位要求的保护或更改策略。', "Confirm whether the app needs the VPN or proxy. Ask your administrator before changing required settings or disabling protections."), Q.scope);
    if (paired) return result('configured', msg('至少有一条候选网络配置，尚不能确定故障原因', "At least one candidate network configuration exists. The cause is still unknown."),
      msg('先比较同一网络上的其他设备，再分辨是所有应用都失败还是只有个别应用失败。', "Check another device on the same network, then determine whether all apps or just a few fail."), ans.other === 'unknown' ? Q.other : Q.scope);
    return result('unknown', msg('现有信息不足，不能确定故障原因', "Not enough information to identify a cause"),
      v ? msg('可以按现象继续排查；也可以选择导入兼容的匿名摘要。', "Keep narrowing it down with the questions. Importing a compatible anonymous summary is optional.") : msg('先选你遇到的现象，再按提示补充知道的信息。', "Start by choosing the symptom you see and answering any questions you can."), ans.scope === 'unknown' ? Q.scope : Q.other);
  }
  return { readSnapshot, analyze };
});
