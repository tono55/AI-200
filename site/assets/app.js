/* AI-200 問題集 — 依存ライブラリなしの静的アプリ
 * データ: data/questions.json（scripts/build_questions.py が questions/*.yml から生成）
 * 学習記録: localStorage（この端末のブラウザーだけに保存）
 */
(() => {
  "use strict";

  const STORE_KEY = "ai200-quiz-v1";
  const LETTERS = "ABCDEFGHIJ";
  const TYPE_LABELS = {
    single: "単一選択",
    multiple: "複数選択",
    yesno: "はい / いいえ",
    order: "並べ替え",
    match: "対応付け",
    dropdown: "穴埋め（コード）",
  };
  const DIFFICULTY_LABELS = { 1: "基本", 2: "標準", 3: "応用" };
  const EXAM_MINUTES = 100;

  let DATA = null;
  let objectiveById = {};
  let caseById = {};
  let session = null; // 実行中の学習 / 模擬試験
  let lastResult = null; // 直近の模擬試験の結果
  let timerHandle = null;

  const main = document.getElementById("main");

  // 画面の中身を差し替える（null / false を除き、配列は展開する）
  function setMain(...children) {
    main.replaceChildren(...children.flat(Infinity).filter((c) => c !== null && c !== undefined && c !== false));
  }

  // ---------- 保存 ----------
  function loadProgress() {
    try {
      const raw = localStorage.getItem(STORE_KEY);
      const data = raw ? JSON.parse(raw) : {};
      return { answers: data.answers || {}, bookmarks: data.bookmarks || {}, exams: data.exams || [] };
    } catch (e) {
      return { answers: {}, bookmarks: {}, exams: [] };
    }
  }
  let progress = loadProgress();
  function saveProgress() {
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify(progress));
    } catch (e) {
      /* 保存できない環境（プライベート ブラウズなど）でも動作は続ける */
    }
  }
  function recordAnswer(q, grade) {
    const prev = progress.answers[q.id] || { attempts: 0, correctCount: 0 };
    progress.answers[q.id] = {
      attempts: prev.attempts + 1,
      correctCount: prev.correctCount + (grade.correct ? 1 : 0),
      lastCorrect: grade.correct,
      lastRatio: grade.total ? grade.earned / grade.total : 0,
      lastAt: Date.now(),
    };
    saveProgress();
  }

  // ---------- 小さなユーティリティ ----------
  function h(tag, attrs, ...children) {
    const el = document.createElement(tag);
    if (attrs) {
      for (const [k, v] of Object.entries(attrs)) {
        if (v === null || v === undefined || v === false) continue;
        if (k === "class") el.className = v;
        else if (k === "html") el.innerHTML = v;
        else if (k.startsWith("on")) el.addEventListener(k.slice(2), v);
        else if (v === true) el.setAttribute(k, "");
        else el.setAttribute(k, v);
      }
    }
    for (const child of children.flat()) {
      if (child === null || child === undefined || child === false) continue;
      el.append(child instanceof Node ? child : document.createTextNode(String(child)));
    }
    return el;
  }

  function shuffle(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  }

  // 問題文用の最小限の Markdown（コード ブロック、インライン コード、太字、リンク、箇条書き、段落）
  function mdInline(text) {
    const codes = [];
    let s = escapeHtml(text).replace(/`([^`]+)`/g, (_, c) => {
      codes.push(c);
      return `\u0000${codes.length - 1}\u0000`;
    });
    s = s
      .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
      .replace(/\[([^\]]+)\]\((https:\/\/[^)\s]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');
    return s.replace(/\u0000(\d+)\u0000/g, (_, i) => `<code>${codes[Number(i)]}</code>`);
  }

  function md(text) {
    const out = [];
    const parts = String(text).split(/^```[^\n]*\n([\s\S]*?)^```[ \t]*$/m);
    parts.forEach((part, idx) => {
      if (idx % 2 === 1) {
        out.push(`<pre><code>${escapeHtml(part.replace(/\n$/, ""))}</code></pre>`);
        return;
      }
      const blocks = part.split(/\n{2,}/);
      for (const block of blocks) {
        const lines = block.split("\n").filter((l) => l.trim() !== "");
        if (!lines.length) continue;
        if (lines.every((l) => /^\s*-\s+/.test(l))) {
          out.push("<ul>" + lines.map((l) => `<li>${mdInline(l.replace(/^\s*-\s+/, ""))}</li>`).join("") + "</ul>");
        } else {
          out.push(`<p>${lines.map(mdInline).join("<br>")}</p>`);
        }
      }
    });
    return out.join("");
  }

  function mdEl(text, cls) {
    return h("div", { class: "md" + (cls ? " " + cls : ""), html: md(text) });
  }

  function pct(n, d) {
    return d ? Math.round((n / d) * 100) : 0;
  }

  function noteUrl(objectiveId) {
    const o = objectiveById[objectiveId];
    return o && DATA.repo_blob_base ? DATA.repo_blob_base + o.note : null;
  }

  function sourceUrl(q) {
    return DATA.repo_blob_base && q.source_file ? DATA.repo_blob_base + q.source_file : null;
  }

  function bar(value, cls) {
    return h("div", { class: "bar" },
      h("div", { class: "track" }, h("div", { class: "fill " + (cls || ""), style: `width:${Math.max(0, Math.min(100, value))}%` })),
      h("span", { class: "val" }, `${value}%`));
  }

  // ---------- 採点 ----------
  function newQuestionState(q) {
    const st = { q, response: null, submitted: false, grade: null, flagged: false };
    if (q.type === "single" || q.type === "multiple") {
      const idx = q.options.map((_, i) => i);
      st.optionOrder = q.shuffle === false ? idx : shuffle(idx);
      st.response = [];
    } else if (q.type === "yesno") {
      st.response = q.statements.map(() => null);
    } else if (q.type === "order") {
      st.pool = shuffle(q.items.concat(q.distractors || []));
      st.response = [];
    } else if (q.type === "match") {
      const rights = Array.from(new Set(q.pairs.map((p) => p.right).concat(q.distractors || [])));
      st.choices = shuffle(rights);
      st.response = q.pairs.map(() => "");
    } else if (q.type === "dropdown") {
      st.response = {};
      st.blankOptions = {};
      for (const [k, b] of Object.entries(q.blanks)) {
        st.response[k] = "";
        st.blankOptions[k] = shuffle(b.options);
      }
    }
    return st;
  }

  function isAnswered(st) {
    const r = st.response;
    switch (st.q.type) {
      case "single":
      case "multiple":
      case "order":
        return r.length > 0;
      case "yesno":
        return r.every((v) => v !== null);
      case "match":
        return r.every((v) => v !== "");
      case "dropdown":
        return Object.values(r).every((v) => v !== "");
      default:
        return false;
    }
  }

  function gradeState(st) {
    const q = st.q;
    const r = st.response;
    let earned = 0;
    let total = 0;
    if (q.type === "single") {
      total = 1;
      earned = r.length === 1 && r[0] === q.answer[0] ? 1 : 0;
    } else if (q.type === "multiple") {
      total = q.answer.length;
      const hits = r.filter((i) => q.answer.includes(i)).length;
      const wrong = r.length - hits;
      earned = Math.max(0, hits - wrong);
    } else if (q.type === "yesno") {
      total = q.statements.length;
      earned = q.statements.filter((s, i) => r[i] === s.answer).length;
    } else if (q.type === "order") {
      total = q.items.length;
      earned = q.items.filter((item, i) => r[i] === item).length;
      if (r.length !== q.items.length) earned = Math.min(earned, total - 1);
    } else if (q.type === "match") {
      total = q.pairs.length;
      earned = q.pairs.filter((p, i) => r[i] === p.right).length;
    } else if (q.type === "dropdown") {
      const keys = Object.keys(q.blanks);
      total = keys.length;
      earned = keys.filter((k) => r[k] === q.blanks[k].answer).length;
    }
    return { earned, total, correct: total > 0 && earned === total };
  }

  // ---------- 問題の描画 ----------
  function renderCase(q) {
    if (!q.case || !caseById[q.case]) return null;
    const c = caseById[q.case];
    return h("details", { class: "case", open: true },
      h("summary", null, `ケーススタディ: ${c.title}`),
      mdEl(c.scenario));
  }

  function renderQuestionBody(st, onChange) {
    const q = st.q;
    const locked = st.submitted;
    const wrap = h("div", { class: "qbody" });
    const caseEl = renderCase(q);
    if (caseEl) wrap.append(caseEl);
    wrap.append(mdEl(q.question));

    if (q.type === "single" || q.type === "multiple") {
      const name = "opt-" + q.id;
      const fs = h("fieldset", { class: "options" },
        h("legend", { class: "muted small" },
          q.type === "multiple" ? `${q.answer.length} つ選んでください` : "1 つ選んでください"));
      st.optionOrder.forEach((origIdx, pos) => {
        const checked = st.response.includes(origIdx);
        let cls = "option";
        if (locked) {
          const isAns = q.answer.includes(origIdx);
          if (checked && isAns) cls += " correct";
          else if (checked && !isAns) cls += " wrong";
          else if (!checked && isAns) cls += " missed";
        }
        const input = h("input", {
          type: q.type === "single" ? "radio" : "checkbox",
          name,
          checked,
          disabled: locked,
          onchange: (e) => {
            if (q.type === "single") st.response = [origIdx];
            else if (e.target.checked) st.response = st.response.concat(origIdx);
            else st.response = st.response.filter((i) => i !== origIdx);
            onChange();
          },
        });
        fs.append(h("label", { class: cls }, input,
          h("span", { class: "letter" }, LETTERS[pos]),
          h("span", { html: mdInline(q.options[origIdx]) })));
      });
      wrap.append(fs);
    } else if (q.type === "yesno") {
      const tbody = h("tbody");
      q.statements.forEach((s, i) => {
        const name = `yn-${q.id}-${i}`;
        const rowCls = locked ? (st.response[i] === s.answer ? "correct" : "wrong") : "";
        const choice = (val, label) => h("label", null,
          h("input", {
            type: "radio", name, checked: st.response[i] === val, disabled: locked,
            onchange: () => { st.response[i] = val; onChange(); },
          }), " ", label);
        tbody.append(h("tr", { class: rowCls },
          h("td", { html: mdInline(s.text) }),
          h("td", { class: "choice" }, choice(true, "はい"), choice(false, "いいえ"),
            locked && st.response[i] !== s.answer ? h("div", { class: "answer-note" }, `正解: ${s.answer ? "はい" : "いいえ"}`) : null)));
      });
      wrap.append(h("div", { class: "table-wrap" },
        h("table", { class: "yn" }, h("thead", null, h("tr", null, h("th", null, "記述"), h("th", null, "回答"))), tbody)));
    } else if (q.type === "order") {
      const pool = st.pool.filter((item) => !st.response.includes(item));
      const answerList = h("ol", { class: "order-list" });
      if (!st.response.length) answerList.append(h("li", { class: "order-empty" }, "左の候補から順に追加してください"));
      st.response.forEach((item, i) => {
        let cls = "";
        if (locked) cls = q.items[i] === item ? "correct" : "wrong";
        answerList.append(h("li", { class: cls },
          h("strong", null, `${i + 1}.`),
          h("span", { html: mdInline(item) }),
          locked ? null : h("button", { class: "btn small", type: "button", "aria-label": "上へ", disabled: i === 0,
            onclick: () => { const r = st.response; [r[i - 1], r[i]] = [r[i], r[i - 1]]; onChange(true); } }, "↑"),
          locked ? null : h("button", { class: "btn small", type: "button", "aria-label": "下へ", disabled: i === st.response.length - 1,
            onclick: () => { const r = st.response; [r[i + 1], r[i]] = [r[i], r[i + 1]]; onChange(true); } }, "↓"),
          locked ? null : h("button", { class: "btn small", type: "button", "aria-label": "外す",
            onclick: () => { st.response = st.response.filter((x) => x !== item); onChange(true); } }, "×")));
      });
      const poolList = h("ul", { class: "order-list" });
      if (!pool.length) poolList.append(h("li", { class: "order-empty" }, "（残りなし）"));
      pool.forEach((item) => {
        poolList.append(h("li", null, h("span", { html: mdInline(item) }),
          locked ? null : h("button", { class: "btn small", type: "button", onclick: () => { st.response = st.response.concat(item); onChange(true); } }, "追加 →")));
      });
      wrap.append(h("div", { class: "order-cols" },
        h("div", null, h("h3", null, "候補"), poolList),
        h("div", null, h("h3", null, "回答（上から順に）"), answerList)));
      if (locked) {
        wrap.append(h("div", { class: "answer-note" }, "正しい順序:"),
          h("ol", { class: "small" }, q.items.map((it) => h("li", { html: mdInline(it) }))));
      }
    } else if (q.type === "match") {
      q.pairs.forEach((p, i) => {
        const sel = h("select", {
          disabled: locked, "aria-label": `対応: ${p.left}`,
          onchange: (e) => { st.response[i] = e.target.value; onChange(); },
        }, h("option", { value: "" }, "選択してください"),
        st.choices.map((c) => h("option", { value: c, selected: st.response[i] === c }, c.replace(/`/g, ""))));
        const rowCls = locked ? (st.response[i] === p.right ? "correct" : "wrong") : "";
        wrap.append(h("div", { class: "match-row " + rowCls },
          h("div", { html: mdInline(p.left) }),
          h("div", null, sel, locked && st.response[i] !== p.right ? h("div", { class: "answer-note", html: "正解: " + mdInline(p.right) }) : null)));
      });
    } else if (q.type === "dropdown") {
      const pre = h("pre", { class: "template" });
      const re = /\{\{(\w+)\}\}/g;
      let last = 0;
      let m;
      while ((m = re.exec(q.template))) {
        pre.append(document.createTextNode(q.template.slice(last, m.index)));
        const key = m[1];
        const blank = q.blanks[key];
        let cls = "";
        if (locked) cls = st.response[key] === blank.answer ? "correct" : "wrong";
        pre.append(h("select", {
          class: cls, disabled: locked, "aria-label": `空欄 ${key}`,
          title: locked && cls === "wrong" ? `正解: ${blank.answer}` : null,
          onchange: (e) => { st.response[key] = e.target.value; onChange(); },
        }, h("option", { value: "" }, `(${key})`),
        st.blankOptions[key].map((o) => h("option", { value: o, selected: st.response[key] === o }, o))));
        last = m.index + m[0].length;
      }
      pre.append(document.createTextNode(q.template.slice(last)));
      wrap.append(pre);
      if (locked) {
        const wrongKeys = Object.keys(q.blanks).filter((k) => st.response[k] !== q.blanks[k].answer);
        if (wrongKeys.length) {
          wrap.append(h("div", { class: "answer-note" },
            "正解: " + Object.keys(q.blanks).map((k) => `(${k}) ${q.blanks[k].answer}`).join(" / ")));
        }
      }
    }
    return wrap;
  }

  function renderFeedback(st) {
    const q = st.q;
    const g = st.grade;
    const o = objectiveById[q.objective];
    const note = noteUrl(q.objective);
    const src = sourceUrl(q);
    return h("section", { class: "feedback " + (g.correct ? "ok" : "ng"), "aria-live": "polite" },
      h("div", { class: "verdict" }, g.correct ? "正解" : `不正解（${g.earned} / ${g.total}）`),
      mdEl(q.explanation),
      h("div", { class: "small muted" }, `出題範囲 ${q.objective}: ${o ? o.title_ja : ""}`),
      h("ul", { class: "refs" },
        q.refs.map((r) => h("li", null, h("a", { href: r, target: "_blank", rel: "noopener" }, r))),
        note ? h("li", null, h("a", { href: note, target: "_blank", rel: "noopener" }, "このリポジトリの学習ノート")) : null,
        src ? h("li", null, h("a", { href: src, target: "_blank", rel: "noopener" }, `問題の定義（${q.id}）`)) : null));
  }

  function questionMeta(st, index, total) {
    const q = st.q;
    const bookmarked = !!progress.bookmarks[q.id];
    return h("div", { class: "qhead" },
      h("div", { class: "qmeta" },
        h("span", { class: "tag accent" }, `${index + 1} / ${total}`),
        h("span", { class: "tag" }, `範囲 ${q.objective}`),
        h("span", { class: "tag" }, TYPE_LABELS[q.type]),
        h("span", { class: "tag" }, DIFFICULTY_LABELS[q.difficulty] || "")),
      h("button", {
        class: "btn small", type: "button", "aria-pressed": bookmarked ? "true" : "false",
        onclick: (e) => {
          if (progress.bookmarks[q.id]) delete progress.bookmarks[q.id];
          else progress.bookmarks[q.id] = true;
          saveProgress();
          e.currentTarget.setAttribute("aria-pressed", progress.bookmarks[q.id] ? "true" : "false");
        },
      }, "★ ブックマーク"));
  }

  // ---------- 画面: ホーム ----------
  function viewHome() {
    const total = DATA.questions.length;
    const answeredIds = DATA.questions.filter((q) => progress.answers[q.id]).map((q) => q.id);
    const correct = answeredIds.filter((id) => progress.answers[id].lastCorrect).length;
    const wrongCount = answeredIds.length - correct;
    const lastExam = progress.exams[progress.exams.length - 1];

    setMain(
      h("h1", null, "AI-200 知識チェック問題集"),
      h("p", { class: "muted" },
        `Developing AI Cloud Solutions on Azure の公式出題範囲（${DATA.skills_version} 版、${DATA.objectives.length} 項目）を網羅するオリジナル問題です。`),
      h("div", { class: "grid" },
        h("div", { class: "card stat" }, h("div", { class: "num" }, total), h("div", { class: "label" }, "問題数")),
        h("div", { class: "card stat" }, h("div", { class: "num" }, `${answeredIds.length}`), h("div", { class: "label" }, "回答済み")),
        h("div", { class: "card stat" }, h("div", { class: "num" }, `${pct(correct, answeredIds.length)}%`), h("div", { class: "label" }, "直近の正答率")),
        h("div", { class: "card stat" }, h("div", { class: "num" }, lastExam ? `${lastExam.percent}%` : "—"), h("div", { class: "label" }, "前回の模擬試験"))),
      h("h2", null, "モードを選ぶ"),
      h("div", { class: "grid" },
        h("a", { class: "card mode-card", href: "#/practice" },
          h("strong", null, "学習モード"), h("span", null, "分野・出題範囲・形式で絞り込み、1 問ずつ解説を確認")),
        h("a", { class: "card mode-card", href: "#/exam" },
          h("strong", null, "模擬試験"), h("span", null, `配点に沿って出題。${EXAM_MINUTES} 分のタイマー、最後にまとめて採点`)),
        h("a", { class: "card mode-card", href: "#/practice?status=wrong" },
          h("strong", null, `間違えた問題（${wrongCount}）`), h("span", null, "直近で不正解だった問題だけを復習")),
        h("a", { class: "card mode-card", href: "#/coverage" },
          h("strong", null, "網羅状況"), h("span", null, "27 項目ごとの問題数と正答率"))),
      h("h2", null, "出題範囲と配点"),
      h("div", { class: "card" },
        DATA.domains.map((d) => {
          const qs = DATA.questions.filter((q) => q.domain === d.id);
          return h("div", { style: "margin-bottom:8px" },
            h("div", null, h("strong", null, `分野 ${d.id}`), ` ${d.title_ja}（${d.weight[0]}–${d.weight[1]}%）`),
            h("div", { class: "small muted" }, `${qs.length} 問`));
        })),
      h("div", { class: "actions" },
        h("button", {
          class: "btn danger", type: "button",
          onclick: () => {
            if (confirm("この端末の学習記録（回答履歴・ブックマーク・模擬試験の結果）を削除しますか？")) {
              progress = { answers: {}, bookmarks: {}, exams: [] };
              saveProgress();
              route();
            }
          },
        }, "学習記録をリセット")),
      h("p", { class: "small muted" }, "学習記録はこのブラウザーにだけ保存されます。"));
  }

  // ---------- 画面: 学習モードの設定 ----------
  function viewPracticeSetup(params) {
    const state = {
      domain: params.get("domain") || "",
      objective: params.get("objective") || "",
      type: params.get("type") || "",
      status: params.get("status") || "all",
      count: params.get("count") || "all",
      random: params.get("random") !== "0",
    };

    const objectiveSelect = h("select", { onchange: (e) => { state.objective = e.target.value; update(); } });
    const countLabel = h("p", { class: "muted small" });

    function filtered() {
      return DATA.questions.filter((q) => {
        if (state.domain && q.domain !== state.domain) return false;
        if (state.objective && q.objective !== state.objective) return false;
        if (state.type && q.type !== state.type) return false;
        const a = progress.answers[q.id];
        if (state.status === "unanswered" && a) return false;
        if (state.status === "wrong" && !(a && !a.lastCorrect)) return false;
        if (state.status === "bookmarked" && !progress.bookmarks[q.id]) return false;
        return true;
      });
    }

    function fillObjectives() {
      objectiveSelect.replaceChildren(h("option", { value: "" }, "すべて"),
        DATA.objectives.filter((o) => !state.domain || o.domain === state.domain)
          .map((o) => h("option", { value: o.id, selected: state.objective === o.id }, `${o.id} ${o.title_ja}`)));
    }

    function update() {
      const n = filtered().length;
      countLabel.textContent = `条件に合う問題: ${n} 問`;
      startBtn.disabled = n === 0;
    }

    const startBtn = h("button", {
      class: "btn primary", type: "button",
      onclick: () => {
        let qs = filtered();
        if (state.random) qs = shuffle(qs);
        if (state.count !== "all") qs = qs.slice(0, Number(state.count));
        startSession("practice", qs);
      },
    }, "開始");

    fillObjectives();
    setMain(
      h("h1", null, "学習モード"),
      h("p", { class: "muted" }, "1 問ずつ回答し、すぐに正解と解説を確認します。"),
      h("div", { class: "card" },
        h("div", { class: "form-grid" },
          h("label", { class: "field" }, "分野",
            h("select", { onchange: (e) => { state.domain = e.target.value; state.objective = ""; fillObjectives(); update(); } },
              h("option", { value: "" }, "すべて"),
              DATA.domains.map((d) => h("option", { value: d.id, selected: state.domain === d.id }, `分野 ${d.id}: ${d.title_ja}`)))),
          h("label", { class: "field" }, "出題範囲", objectiveSelect),
          h("label", { class: "field" }, "問題形式",
            h("select", { onchange: (e) => { state.type = e.target.value; update(); } },
              h("option", { value: "" }, "すべて"),
              Object.entries(TYPE_LABELS).map(([k, v]) => h("option", { value: k, selected: state.type === k }, v)))),
          h("label", { class: "field" }, "対象",
            h("select", { onchange: (e) => { state.status = e.target.value; update(); } },
              [["all", "すべて"], ["unanswered", "未回答"], ["wrong", "直近で不正解"], ["bookmarked", "ブックマーク"]]
                .map(([k, v]) => h("option", { value: k, selected: state.status === k }, v)))),
          h("label", { class: "field" }, "問題数",
            h("select", { onchange: (e) => { state.count = e.target.value; } },
              [["all", "すべて"], ["10", "10 問"], ["20", "20 問"], ["30", "30 問"]]
                .map(([k, v]) => h("option", { value: k, selected: state.count === k }, v))))),
        h("label", { class: "check", style: "margin-top:12px" },
          h("input", { type: "checkbox", checked: state.random, onchange: (e) => { state.random = e.target.checked; } }),
          "ランダムな順番で出題する"),
        countLabel,
        h("div", { class: "actions" }, startBtn)));
    update();
  }

  // ---------- 画面: 模擬試験の設定 ----------
  function pickExamQuestions(count) {
    const weights = DATA.domains.map((d) => ({ id: d.id, w: (d.weight[0] + d.weight[1]) / 2 }));
    const sumW = weights.reduce((s, x) => s + x.w, 0);
    const byDomain = {};
    for (const d of DATA.domains) byDomain[d.id] = shuffle(DATA.questions.filter((q) => q.domain === d.id));
    const picked = [];
    let remaining = count;
    weights.forEach((x, i) => {
      const n = i === weights.length - 1 ? remaining : Math.round((count * x.w) / sumW);
      const take = byDomain[x.id].splice(0, Math.min(n, byDomain[x.id].length));
      picked.push(...take);
      remaining -= take.length;
    });
    // 不足分を残りから補う
    const rest = shuffle(Object.values(byDomain).flat());
    while (picked.length < count && rest.length) picked.push(rest.shift());
    // 同じケーススタディの問題はまとめて並べる
    const shuffled = shuffle(picked);
    const caseGroups = {};
    const ordered = [];
    for (const q of shuffled) {
      if (q.case) {
        if (!caseGroups[q.case]) { caseGroups[q.case] = []; ordered.push(caseGroups[q.case]); }
        caseGroups[q.case].push(q);
      } else ordered.push(q);
    }
    return ordered.flat();
  }

  function viewExamSetup() {
    const max = DATA.questions.length;
    let count = Math.min(50, max);
    let timed = true;
    setMain(
      h("h1", null, "模擬試験"),
      h("p", { class: "muted" },
        "分野の配点（中央値）に比例して出題します。回答中は正誤を表示せず、最後にまとめて採点します。"),
      h("div", { class: "card" },
        h("div", { class: "form-grid" },
          h("label", { class: "field" }, "問題数",
            h("select", { onchange: (e) => { count = Number(e.target.value); } },
              [20, 30, 50, max].filter((n, i, a) => n <= max && a.indexOf(n) === i)
                .map((n) => h("option", { value: n, selected: n === count }, n === max ? `全問（${n} 問）` : `${n} 問`))))),
        h("label", { class: "check", style: "margin-top:12px" },
          h("input", { type: "checkbox", checked: timed, onchange: (e) => { timed = e.target.checked; } }),
          `時間制限あり（本番と同じ ${EXAM_MINUTES} 分を問題数に比例して設定）`),
        h("p", { class: "notice", style: "margin-top:12px" },
          "正答率は学習の目安です。本番のスコア（700 / 1000）は配点や問題ごとの重みが異なるため、正答率とは一致しません。目標は 80% 以上を安定して取ることです。"),
        h("div", { class: "actions" },
          h("button", {
            class: "btn primary", type: "button",
            onclick: () => {
              const qs = pickExamQuestions(count);
              const minutes = timed ? Math.max(5, Math.round((EXAM_MINUTES * qs.length) / 50)) : null;
              startSession("exam", qs, minutes);
            },
          }, "開始"))));
  }

  // ---------- セッション ----------
  function startSession(mode, questions, minutes) {
    session = {
      mode,
      states: questions.map(newQuestionState),
      index: 0,
      endsAt: minutes ? Date.now() + minutes * 60000 : null,
      finished: false,
    };
    location.hash = "#/session";
  }

  function stopTimer() {
    if (timerHandle) clearInterval(timerHandle);
    timerHandle = null;
  }

  function viewSession() {
    if (!session) {
      location.hash = "#/";
      return;
    }
    stopTimer();
    const { states } = session;
    const st = states[session.index];
    const total = states.length;
    const isExam = session.mode === "exam";

    const timerEl = h("span", { class: "timer" });
    function tick() {
      if (!session || !session.endsAt) return;
      const left = Math.max(0, session.endsAt - Date.now());
      const m = Math.floor(left / 60000);
      const s = Math.floor((left % 60000) / 1000);
      timerEl.textContent = `残り ${m}:${String(s).padStart(2, "0")}`;
      timerEl.classList.toggle("low", left < 5 * 60000);
      if (left <= 0) finishExam(true);
    }
    if (isExam && session.endsAt) {
      tick();
      timerHandle = setInterval(tick, 1000);
    }

    const submitBtn = h("button", { class: "btn primary", type: "button" }, "回答する");
    const body = h("div");
    function rerender(keepFocus) {
      const y = window.scrollY;
      body.replaceChildren(renderQuestionBody(st, onChange));
      if (st.submitted && !isExam) body.append(renderFeedback(st));
      submitBtn.disabled = !isAnswered(st) || st.submitted;
      if (keepFocus) window.scrollTo(0, y);
    }
    function onChange(structural) {
      if (structural) rerender(true);
      submitBtn.disabled = !isAnswered(st) || st.submitted;
      if (isExam) updatePalette();
    }
    submitBtn.addEventListener("click", () => {
      st.submitted = true;
      st.grade = gradeState(st);
      recordAnswer(st.q, st.grade);
      rerender(true);
      nextBtn.focus();
    });

    const go = (i) => {
      session.index = i;
      viewSession();
      main.focus();
      window.scrollTo(0, 0);
    };
    const prevBtn = h("button", { class: "btn", type: "button", disabled: session.index === 0, onclick: () => go(session.index - 1) }, "← 前へ");
    const nextBtn = h("button", {
      class: "btn" + (isExam ? "" : " primary"), type: "button",
      onclick: () => {
        if (session.index < total - 1) go(session.index + 1);
        else if (isExam) finishExam(false);
        else finishPractice();
      },
    }, session.index < total - 1 ? "次へ →" : isExam ? "終了して採点" : "結果を見る");

    const palette = h("div", { class: "palette", "aria-label": "問題一覧" });
    function updatePalette() {
      palette.replaceChildren(...states.map((s, i) => {
        let cls = isAnswered(s) ? "answered" : "";
        if (s.flagged) cls += " flagged";
        if (i === session.index) cls += " current";
        return h("button", { type: "button", class: cls, "aria-label": `問題 ${i + 1}`, onclick: () => go(i) }, i + 1);
      }));
    }

    const flagBtn = isExam ? h("button", {
      class: "btn", type: "button", "aria-pressed": st.flagged ? "true" : "false",
      onclick: (e) => { st.flagged = !st.flagged; e.currentTarget.setAttribute("aria-pressed", st.flagged ? "true" : "false"); updatePalette(); },
    }, "見直しマーク") : null;

    rerender();
    if (isExam) updatePalette();

    const answeredCount = states.filter((s) => (isExam ? isAnswered(s) : s.submitted)).length;
    setMain(
      h("div", { class: "qhead" },
        h("h1", { style: "margin:0" }, isExam ? "模擬試験" : "学習モード"),
        isExam && session.endsAt ? timerEl : null),
      h("div", { class: "progress", role: "progressbar", "aria-valuemin": "0", "aria-valuemax": String(total), "aria-valuenow": String(answeredCount) },
        h("span", { style: `width:${pct(answeredCount, total)}%` })),
      questionMeta(st, session.index, total),
      h("div", { class: "card" }, body,
        h("div", { class: "actions" },
          prevBtn,
          isExam ? flagBtn : submitBtn,
          h("span", { class: "spacer" }),
          nextBtn)),
      isExam ? h("div", { class: "card" }, h("div", { class: "small muted" }, "問題一覧（色付き = 回答済み、下線 = 見直しマーク）"), palette,
        h("div", { class: "actions" }, h("button", { class: "btn", type: "button", onclick: () => finishExam(false) }, "終了して採点"))) : null,
      !isExam ? h("div", { class: "actions" }, h("button", { class: "btn", type: "button", onclick: finishPractice }, "ここで終了して結果を見る")) : null);
  }

  function summarize(states) {
    const byDomain = {};
    const byObjective = {};
    let earned = 0;
    let total = 0;
    let correct = 0;
    for (const s of states) {
      const g = s.grade || { earned: 0, total: 1, correct: false };
      earned += g.earned;
      total += g.total;
      if (g.correct) correct++;
      for (const [map, key] of [[byDomain, s.q.domain], [byObjective, s.q.objective]]) {
        map[key] = map[key] || { n: 0, correct: 0, earned: 0, total: 0 };
        map[key].n++;
        map[key].earned += g.earned;
        map[key].total += g.total;
        if (g.correct) map[key].correct++;
      }
    }
    return { byDomain, byObjective, earned, total, correct, n: states.length, percent: pct(earned, total) };
  }

  function finishPractice() {
    const done = session.states.filter((s) => s.submitted);
    lastResult = { mode: "practice", states: done, summary: summarize(done) };
    session = null;
    stopTimer();
    location.hash = "#/results";
  }

  function finishExam(timeUp) {
    if (!session || session.finished) return;
    const unanswered = session.states.filter((s) => !isAnswered(s)).length;
    if (!timeUp && unanswered && !confirm(`未回答が ${unanswered} 問あります。終了して採点しますか？`)) return;
    session.finished = true;
    stopTimer();
    for (const s of session.states) {
      s.submitted = true;
      s.grade = gradeState(s);
      if (isAnswered(s)) recordAnswer(s.q, s.grade);
    }
    const summary = summarize(session.states);
    progress.exams.push({ at: Date.now(), n: summary.n, percent: summary.percent });
    progress.exams = progress.exams.slice(-20);
    saveProgress();
    lastResult = { mode: "exam", states: session.states, summary, timeUp };
    session = null;
    location.hash = "#/results";
  }

  // ---------- 画面: 結果 ----------
  function viewResults() {
    if (!lastResult) {
      location.hash = "#/";
      return;
    }
    const { states, summary, mode, timeUp } = lastResult;
    const weakObjectives = Object.entries(summary.byObjective)
      .map(([id, v]) => ({ id, rate: pct(v.earned, v.total), ...v }))
      .filter((v) => v.rate < 80)
      .sort((a, b) => a.rate - b.rate);

    setMain(
      h("h1", null, mode === "exam" ? "模擬試験の結果" : "学習の結果"),
      timeUp ? h("p", { class: "notice" }, "時間切れのため自動で採点しました。") : null,
      h("div", { class: "grid" },
        h("div", { class: "card stat" }, h("div", { class: "score-big" }, `${summary.percent}%`), h("div", { class: "label" }, "得点率（部分点を含む）")),
        h("div", { class: "card stat" }, h("div", { class: "num" }, `${summary.correct} / ${summary.n}`), h("div", { class: "label" }, "完全正解した問題"))),
      h("h2", null, "分野別"),
      h("div", { class: "card" },
        DATA.domains.filter((d) => summary.byDomain[d.id]).map((d) => {
          const v = summary.byDomain[d.id];
          const rate = pct(v.earned, v.total);
          return h("div", { style: "margin-bottom:10px" },
            h("div", { class: "small" }, `分野 ${d.id}: ${d.title_ja}（${v.n} 問）`),
            bar(rate, rate >= 80 ? "ok" : rate < 60 ? "ng" : ""));
        })),
      h("h2", null, "復習が必要な出題範囲（80% 未満）"),
      weakObjectives.length
        ? h("div", { class: "card table-wrap" }, h("table", null,
          h("thead", null, h("tr", null, h("th", null, "範囲"), h("th", null, "内容"), h("th", null, "得点率"), h("th", null, ""))),
          h("tbody", null, weakObjectives.map((v) => {
            const o = objectiveById[v.id];
            const note = noteUrl(v.id);
            return h("tr", null, h("td", null, v.id), h("td", null, o ? o.title_ja : ""), h("td", null, `${v.rate}%`),
              h("td", { class: "links" },
                h("a", { href: `#/practice?objective=${encodeURIComponent(v.id)}&domain=${o ? o.domain : ""}` }, "練習"),
                note ? [" / ", h("a", { href: note, target: "_blank", rel: "noopener" }, "ノート")] : null));
          }))))
        : h("p", { class: "muted" }, "すべての出題範囲で 80% 以上です。"),
      h("h2", null, "問題ごとの振り返り"),
      states.map((s, i) => {
        const g = s.grade || { correct: false, earned: 0, total: 1 };
        const d = h("details", { class: "review" },
          h("summary", null, `${g.correct ? "○" : "×"} ${i + 1}. [${s.q.objective}] ${TYPE_LABELS[s.q.type]}`,
            g.correct ? "" : `（${g.earned}/${g.total}）`));
        d.addEventListener("toggle", () => {
          if (d.open && d.children.length === 1) d.append(renderQuestionBody(s, () => {}), renderFeedback(s));
        }, { once: false });
        return d;
      }),
      h("div", { class: "actions" },
        h("a", { class: "btn primary", href: mode === "exam" ? "#/exam" : "#/practice" }, "もう一度"),
        h("a", { class: "btn", href: "#/practice?status=wrong" }, "間違えた問題を復習"),
        h("a", { class: "btn", href: "#/" }, "ホーム")));
  }

  // ---------- 画面: 網羅状況 ----------
  function viewCoverage() {
    const min = DATA.min_questions || 3;
    const rows = [];
    for (const d of DATA.domains) {
      rows.push(h("tr", null, h("th", { colspan: "6", style: "padding-top:16px" }, `分野 ${d.id}: ${d.title_ja}（${d.weight[0]}–${d.weight[1]}%）`)));
      for (const o of DATA.objectives.filter((x) => x.domain === d.id)) {
        const qs = DATA.questions.filter((q) => q.objective === o.id);
        const answered = qs.filter((q) => progress.answers[q.id]);
        const correct = answered.filter((q) => progress.answers[q.id].lastCorrect);
        const note = noteUrl(o.id);
        const types = Array.from(new Set(qs.map((q) => TYPE_LABELS[q.type]))).join("、");
        rows.push(h("tr", null,
          h("td", null, o.id),
          h("td", null, o.title_ja, h("div", { class: "small muted" }, o.title_en)),
          h("td", { class: qs.length < min ? "under" : "" }, `${qs.length}`, h("div", { class: "small muted" }, types)),
          h("td", null, `${answered.length}`),
          h("td", null, answered.length ? bar(pct(correct.length, answered.length), pct(correct.length, answered.length) >= 80 ? "ok" : "") : h("span", { class: "muted" }, "—")),
          h("td", { class: "links" },
            h("a", { href: `#/practice?objective=${encodeURIComponent(o.id)}&domain=${d.id}` }, "練習"),
            note ? [" / ", h("a", { href: note, target: "_blank", rel: "noopener" }, "ノート")] : null)));
      }
    }
    const typeCounts = {};
    for (const q of DATA.questions) typeCounts[q.type] = (typeCounts[q.type] || 0) + 1;
    setMain(
      h("h1", null, "網羅状況"),
      h("p", { class: "muted" }, `公式の出題範囲 ${DATA.objectives.length} 項目ごとの問題数と、あなたの直近の正答率です。`),
      h("div", { class: "card" },
        h("div", { class: "small muted" }, "問題形式の内訳"),
        h("div", { class: "qmeta", style: "margin-top:6px" },
          Object.entries(typeCounts).map(([k, v]) => h("span", { class: "tag" }, `${TYPE_LABELS[k]} ${v}`)),
          h("span", { class: "tag" }, `ケーススタディ ${DATA.questions.filter((q) => q.case).length}`))),
      h("div", { class: "card table-wrap", style: "margin-top:12px" },
        h("table", null,
          h("thead", null, h("tr", null, h("th", null, "範囲"), h("th", null, "内容"), h("th", null, "問題数"), h("th", null, "回答済み"), h("th", null, "正答率"), h("th", null, ""))),
          h("tbody", null, rows))));
  }

  // ---------- ルーター ----------
  function route() {
    const hash = location.hash || "#/";
    const [path, query] = hash.slice(1).split("?");
    const params = new URLSearchParams(query || "");
    if (path !== "/session") stopTimer();
    document.querySelectorAll(".topbar nav a").forEach((a) => {
      if (a.getAttribute("href") === "#" + path) a.setAttribute("aria-current", "page");
      else a.removeAttribute("aria-current");
    });
    switch (path) {
      case "/practice": viewPracticeSetup(params); break;
      case "/exam": viewExamSetup(); break;
      case "/session": viewSession(); break;
      case "/results": viewResults(); break;
      case "/coverage": viewCoverage(); break;
      default: viewHome();
    }
  }

  async function init() {
    try {
      const res = await fetch("data/questions.json", { cache: "no-cache" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      DATA = await res.json();
    } catch (e) {
      setMain(h("h1", null, "問題データを読み込めませんでした"),
        h("p", null, "data/questions.json が見つかりません。リポジトリのルートで次を実行してから、ローカル サーバーで開いてください。"),
        h("pre", null, "python3 scripts/build_questions.py\npython3 -m http.server -d site 8000"),
        h("p", { class: "small muted" }, String(e)));
      return;
    }
    DATA.questions.forEach((q) => { q.answer = q.answer || []; });
    objectiveById = Object.fromEntries(DATA.objectives.map((o) => [o.id, o]));
    caseById = Object.fromEntries((DATA.cases || []).map((c) => [c.id, c]));
    const info = document.getElementById("data-info");
    if (info) info.textContent = `出題範囲: ${DATA.skills_version} 版 / 問題数: ${DATA.questions.length} / データ生成: ${DATA.generated_at}`;
    window.addEventListener("hashchange", route);
    route();
  }

  init();
})();
