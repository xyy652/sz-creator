// 清音与清雪 · 创角器（SillyTavern 扩展版）
// 表单写在卡片的 first_mes 里，这个扩展负责：
//   1) 找到 #sz-form
//   2) 绑「开始」按钮
//   3) 把填的内容拼成文本 → 一键复制到剪贴板 → 同时显示出来方便手动复制

(function () {
    'use strict';

    const TAG = '[sz-creator]';
    const FIELD_IDS = ['name', 'age', 'height', 'body', 'hair', 'look',
        'traits', 'bg', 'since', 'acct', 'rel', 'kink', 'open'];

    const LABELS = {
        name: '姓　名', age: '年　龄', height: '身　高（cm）', body: '体　型',
        hair: '发　型', look: '外貌概况', traits: '性　格', bg: '背景故事',
        since: '做这行多久了', acct: '账号名', rel: '和姐妹俩的关系',
        kink: '特殊偏好 / 备注', open: '开局故事',
    };

    function findForm() {
        return document.getElementById('sz-form');
    }

    function readValues() {
        const out = [];
        FIELD_IDS.forEach((id) => {
            const el = document.getElementById('sz-f-' + id);
            if (!el) return;
            const v = (el.value || '').trim();
            if (v) out.push(LABELS[id] + '：' + v);
        });
        return out;
    }

    function buildText(lines) {
        const open = lines.find((l) => l.indexOf('开局故事：') === 0);
        const rest = lines.filter((l) => l.indexOf('开局故事：') !== 0);
        let msg = '【人物设定】\n' + (rest.length ? rest.join('\n') : '（未填写）');
        if (open) msg += '\n\n【开局故事】\n' + open.replace('开局故事：', '');
        msg += '\n\n（设定完毕，从这里开始。）';
        return msg;
    }

    function copyText(text) {
        // 1) 现代 API
        if (navigator.clipboard && navigator.clipboard.writeText) {
            return navigator.clipboard.writeText(text).then(() => true).catch(() => fallbackCopy(text));
        }
        return Promise.resolve(fallbackCopy(text));
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

    function showResult(form, text, copied) {
        const old = document.getElementById('sz-result');
        if (old) old.remove();

        const box = document.createElement('div');
        box.id = 'sz-result';
        box.setAttribute('style',
            'margin-top:12px;padding:12px;border-radius:8px;' +
            'border:1px solid rgba(72,200,140,.45);background:rgba(72,200,140,.08);');

        const head = document.createElement('div');
        head.setAttribute('style', 'font-size:.9em;font-weight:600;color:#5fd39a;margin-bottom:8px;');
        head.textContent = copied
            ? '✓ 已复制到剪贴板 —— 在下面输入框里粘贴（Ctrl+V）然后发送'
            : '↓ 复制失败，请手动全选下面这段复制';
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

        const btnCopy = document.createElement('button');
        btnCopy.textContent = '再复制一次';
        btnCopy.setAttribute('style',
            'flex:1;padding:8px;border:none;border-radius:7px;cursor:pointer;' +
            'background:linear-gradient(135deg,#4bc98c,#2e9a6a);color:#fff;font-size:.88em;font-weight:600;');
        btnCopy.onclick = () => {
            copyText(text).then((ok) => {
                btnCopy.textContent = ok ? '已复制' : '复制失败';
                setTimeout(() => { btnCopy.textContent = '再复制一次'; }, 1500);
            });
        };
        row.appendChild(btnCopy);

        const btnRe = document.createElement('button');
        btnRe.textContent = '重新填';
        btnRe.setAttribute('style',
            'flex:1;padding:8px;border:none;border-radius:7px;cursor:pointer;' +
            'background:rgba(255,255,255,.12);color:inherit;font-size:.88em;');
        btnRe.onclick = () => {
            box.remove();
            form.style.opacity = '1';
            form.style.pointerEvents = '';
            const b = document.getElementById('sz-submit');
            if (b) { b.disabled = false; b.textContent = '开 始'; }
        };
        row.appendChild(btnRe);

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

        btn.addEventListener('click', (ev) => {
            ev.preventDefault();
            const lines = readValues();
            if (!lines.length) {
                const old = btn.textContent;
                btn.textContent = '至少填一项';
                setTimeout(() => { btn.textContent = old; }, 1600);
                return;
            }
            const text = buildText(lines);
            btn.disabled = true;
            btn.textContent = '生成中…';

            copyText(text).then((ok) => {
                btn.textContent = ok ? '✓ 已复制' : '请手动复制';
                form.style.opacity = '0.5';
                form.style.pointerEvents = 'none';
                showResult(form, text, ok);
                // 顺手聚焦输入框，方便直接粘贴
                setTimeout(() => {
                    const ta = document.querySelector('#send_textarea');
                    if (ta) ta.focus();
                }, 200);
            });
            return false;
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
        let tries = 0;
        const timer = setInterval(() => {
            bind();
            if (++tries > 200) clearInterval(timer);
        }, 400);

        // 消息变动时重新找
        const chat = document.getElementById('chat');
        if (chat && window.MutationObserver) {
            const mo = new MutationObserver(() => bind());
            mo.observe(chat, { childList: true, subtree: true });
        }
        setInterval(bind, 3000);
        console.debug(TAG, 'ready');
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => setTimeout(boot, 800));
    } else {
        setTimeout(boot, 800);
    }
})();
