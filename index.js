// 卡内表单通用处理器
// 表单写在卡片的 first_mes 里。这个扩展负责：
//   1) 找到 #sz-form
//   2) 读所有带 data-sz-field 的控件，用 data-sz-label 当字段名
//   3) 拼成文本 → 一键复制 + 显示出来
//
// 表单可以自带这些属性来控制输出：
//   #sz-form[data-sz-title]  输出标题，默认「人物设定」
//   #sz-form[data-sz-open]   哪个字段单独成段，默认「开局故事」
//   #sz-form[data-sz-cta]    按钮文案，默认「开 始」

(function () {
    'use strict';

    const TAG = '[sz-creator]';

    function findForm() {
        return document.getElementById('sz-form');
    }

    function readValues(form) {
        const out = [];
        form.querySelectorAll('[data-sz-field]').forEach((el) => {
            const v = (el.value || '').trim();
            if (!v) return;
            const label = el.getAttribute('data-sz-label') || el.id || '字段';
            out.push(label + '：' + v);
        });
        return out;
    }

    function buildText(form, lines) {
        const title = form.getAttribute('data-sz-title') || '人物设定';
        const openKey = form.getAttribute('data-sz-open') || '开局故事';
        const open = lines.find((l) => l.indexOf(openKey + '：') === 0);
        const rest = lines.filter((l) => l.indexOf(openKey + '：') !== 0);

        let msg = '【' + title + '】\n' + (rest.length ? rest.join('\n') : '（未填写）');
        if (open) msg += '\n\n【' + openKey + '】\n' + open.replace(openKey + '：', '');
        msg += '\n\n（设定完毕，从这里开始。）';
        return msg;
    }

    function fallbackCopy(text) {
        try {
            const ta = document.createElement('textarea');
            ta.value = text;
            ta.style.position = 'fixed';
            ta.style.left = '-9999px';
            document.body.appendChild(ta);
            ta.select();
            const ok = document.execCommand('copy');
            document.body.removeChild(ta);
            return ok;
        } catch (e) {
            return false;
        }
    }

    function copyText(text) {
        if (navigator.clipboard && navigator.clipboard.writeText) {
            return navigator.clipboard.writeText(text)
                .then(() => true)
                .catch(() => fallbackCopy(text));
        }
        return Promise.resolve(fallbackCopy(text));
    }

    function showResult(form, text, copied) {
        const old = document.getElementById('sz-result');
        if (old) old.remove();

        const box = document.createElement('div');
        box.id = 'sz-result';
        box.setAttribute('style',
            'margin-top:12px;padding:12px;border-radius:10px;' +
            'border:1px solid rgba(72,200,140,.45);background:rgba(72,200,140,.08);');

        const head = document.createElement('div');
        head.setAttribute('style',
            'font-size:.9em;font-weight:600;color:#5fd39a;margin-bottom:8px;line-height:1.5;');
        head.textContent = copied
            ? '✓ 已复制 —— 在下面输入框里粘贴（Ctrl+V）然后发送'
            : '↓ 复制没成功，手动全选下面这段复制';
        box.appendChild(head);

        const ta = document.createElement('textarea');
        ta.id = 'sz-result-text';
        ta.value = text;
        ta.setAttribute('style',
            'width:100%;box-sizing:border-box;min-height:150px;padding:9px 10px;' +
            'background:rgba(0,0,0,.35);color:inherit;border:1px solid rgba(255,255,255,.18);' +
            'border-radius:7px;font-family:inherit;font-size:.86em;line-height:1.6;resize:vertical;');
        ta.addEventListener('click', () => ta.select());
        box.appendChild(ta);

        const row = document.createElement('div');
        row.setAttribute('style', 'display:flex;gap:8px;margin-top:8px;');

        const b1 = document.createElement('button');
        b1.textContent = '再复制一次';
        b1.setAttribute('style',
            'flex:1;padding:9px;border:none;border-radius:7px;cursor:pointer;' +
            'background:linear-gradient(135deg,#4bc98c,#2e9a6a);color:#fff;' +
            'font-size:.88em;font-weight:600;');
        b1.onclick = () => {
            copyText(text).then((ok) => {
                b1.textContent = ok ? '已复制' : '复制失败';
                setTimeout(() => { b1.textContent = '再复制一次'; }, 1500);
            });
        };
        row.appendChild(b1);

        const b2 = document.createElement('button');
        b2.textContent = '重新填';
        b2.setAttribute('style',
            'flex:1;padding:9px;border:none;border-radius:7px;cursor:pointer;' +
            'background:rgba(255,255,255,.12);color:inherit;font-size:.88em;');
        b2.onclick = () => {
            box.remove();
            form.style.opacity = '1';
            form.style.pointerEvents = '';
            const b = document.getElementById('sz-submit');
            if (b) {
                b.disabled = false;
                b.textContent = form.getAttribute('data-sz-cta') || '开 始';
            }
        };
        row.appendChild(b2);

        box.appendChild(row);
        form.parentNode.insertBefore(box, form.nextSibling);
    }

    function bind() {
        const form = findForm();
        if (!form) return false;
        if (form.dataset.szBound === '1') return true;

        const btn = document.getElementById('sz-submit');
        if (!btn) return false;
        form.dataset.szBound = '1';

        const cta = form.getAttribute('data-sz-cta');
        if (cta && !btn.textContent.trim()) btn.textContent = cta;

        btn.addEventListener('click', (ev) => {
            ev.preventDefault();
            const lines = readValues(form);
            if (!lines.length) {
                const old = btn.textContent;
                btn.textContent = '至少填一项';
                setTimeout(() => { btn.textContent = old; }, 1600);
                return;
            }
            const text = buildText(form, lines);
            btn.disabled = true;
            btn.textContent = '生成中…';
            copyText(text).then((ok) => {
                btn.textContent = ok ? '✓ 已复制' : '请手动复制';
                form.style.opacity = '0.5';
                form.style.pointerEvents = 'none';
                showResult(form, text, ok);
                setTimeout(() => {
                    const ta = document.querySelector('#send_textarea');
                    if (ta) ta.focus();
                }, 200);
            });
        });

        try {
            if (!document.getElementById('sz-ready')) {
                const tag = document.createElement('div');
                tag.id = 'sz-ready';
                tag.setAttribute('style',
                    'margin-top:6px;font-size:.75em;color:#5fd39a;opacity:.85;text-align:center;');
                tag.textContent = '✓ 创角器已加载';
                btn.parentNode.insertBefore(tag, btn.nextSibling);
            }
        } catch (e) { /* ignore */ }

        console.debug(TAG, 'bound');
        return true;
    }

    function boot() {
        let n = 0;
        const iv = setInterval(() => {
            bind();
            if (++n > 400) clearInterval(iv);
        }, 400);
        setInterval(bind, 3000);

        const chat = document.getElementById('chat');
        if (chat && window.MutationObserver) {
            new MutationObserver(() => bind()).observe(chat, { childList: true, subtree: true });
        }
        console.debug(TAG, 'ready');
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => setTimeout(boot, 800));
    } else {
        setTimeout(boot, 800);
    }
})();
