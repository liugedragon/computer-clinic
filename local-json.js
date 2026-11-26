(() => {
  'use strict';
  // Use the language of the current offline HTML page.
  const msg = (zh, en) => globalThis.document?.documentElement.lang === "en" ? en : zh;
  // Each panel owns a ticket. A newer import, a text edit or reset retires the old read.
  function reader(input, byteLimit, handlers) {
    let ticket = 0;
    let busy = false;
    const cancel = () => {
      ticket++;
      busy = false;
      input.value = '';
      input.removeAttribute('aria-busy');
    };
    input.addEventListener('change', async () => {
      const files = input.files;
      if (!files || !files.length) return; // Closing the picker preserves the current result.
      const file = files[0];
      cancel();
      const current = ticket;
      busy = true;
      input.setAttribute('aria-busy', 'true');
      handlers.start();
      try {
        if (!file.size || file.size > byteLimit) throw new Error(msg('文件为空或太大，请选择一份精简的 JSON 检查结果。', "The file is empty or too large. Choose a small JSON summary."));
        let data;
        try {
          const bytes = await new Promise((resolve, reject) => {
            const r = new FileReader();
            r.onload = () => resolve(r.result);
            r.onerror = r.onabort = reject;
            r.readAsArrayBuffer(file);
          });
          data = new TextDecoder('utf-8', {fatal:true}).decode(bytes).trim();
        } catch {
          throw new Error(msg('无法读取该文件，请检查是否为 UTF-8 文本。也可以手动粘贴结果。', "Could not read this file as UTF-8 text. You can also paste the summary."));
        }
        if (current === ticket) handlers.success(data);
      } catch (error) {
        if (current === ticket) handlers.error(error.message);
      } finally {
        if (current === ticket) cancel();
      }
    });
    return {cancel, pending: () => busy};
  }
  globalThis.ClinicLocalJson = {reader};
})();
