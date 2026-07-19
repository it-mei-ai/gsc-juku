const sampleSettings = [
  {
    actionName: "顧客マスタ同期",
    domain: "example.cybozu.com",
    appId: "123",
    sheetName: "顧客マスタ",
    keyField: "管理ID",
    query: "削除フラグ not in (\"削除\") order by 更新日時 desc limit 500",
    mapping: "管理ID:管理ID, 会社名:company_name, 担当者:owner, ステータス:status",
    allowKintoneToSheet: true,
    allowSheetToKintone: true,
    tokenStatus: "保存済み（非表示）",
    enabled: true,
    lastRun: "未実行",
    rowNumber: 2
  },
  {
    actionName: "案件一覧をスプシへ反映",
    domain: "example.cybozu.com",
    appId: "456",
    sheetName: "案件一覧",
    keyField: "案件ID",
    query: "ステータス in (\"進行中\", \"見積\") order by レコード番号 desc limit 300",
    mapping: "案件ID:project_id, 顧客名:customer, 金額:amount, 状況:stage",
    allowKintoneToSheet: true,
    allowSheetToKintone: false,
    tokenStatus: "保存済み（非表示）",
    enabled: true,
    lastRun: "2026-07-18 18:12",
    rowNumber: 3
  },
  {
    actionName: "請求ステータス更新",
    domain: "example.cybozu.com",
    appId: "789",
    sheetName: "請求管理",
    keyField: "請求ID",
    query: "",
    mapping: "請求ID:invoice_id, 入金状況:payment_status, 入金日:paid_at",
    allowKintoneToSheet: false,
    allowSheetToKintone: true,
    tokenStatus: "未設定",
    enabled: false,
    lastRun: "未実行",
    rowNumber: 4
  }
];

const adviceItems = [
  { type: "ok", text: "最初は対象シート1つ、数件だけのテスト同期から始める。" },
  { type: "ok", text: "一意キーは管理IDなどの重複しない列に固定する。" },
  { type: "warn", text: "削除の自動同期は初期版に入れず、まず登録と更新だけにする。" },
  { type: "warn", text: "本実行前に差分プレビューとログ保存を必須にする。" }
];

const state = {
  settings: sampleSettings,
  selectedAction: sampleSettings[0].actionName,
  mode: "dryRun",
  logs: [
    {
      status: "warn",
      title: "サンプル設定で表示中",
      detail: "実シートに接続できるApps Script版は gas フォルダにあります。",
      time: new Date().toLocaleString("ja-JP")
    }
  ]
};

const app = document.querySelector("#app");

function currentSetting() {
  return state.settings.find((setting) => setting.actionName === state.selectedAction) || state.settings[0];
}

function parseMapping(mappingText) {
  if (!mappingText) return [];
  return String(mappingText)
    .split(/[\n,]/)
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => {
      const [sheetField, kintoneField] = part.split(/\s*(?:=>|:|=)\s*/);
      return {
        sheetField: sheetField || "",
        kintoneField: kintoneField || sheetField || ""
      };
    });
}

function toDisplay(value) {
  if (value === true) return "◯";
  if (value === false) return "-";
  if (value === undefined || value === null || value === "") return "未設定";
  return String(value);
}

function render() {
  const setting = currentSetting();
  const mappingRows = parseMapping(setting.mapping);
  const activeCount = state.settings.filter((item) => item.enabled).length;
  const bidirectionalCount = state.settings.filter(
    (item) => item.allowKintoneToSheet && item.allowSheetToKintone
  ).length;

  app.innerHTML = `
    <main class="app-shell">
      <header class="topbar">
        <div class="brand">
          <div class="brand-mark">K</div>
          <div>
            <p class="eyebrow">kintone / Google Sheets</p>
            <h1>同期アクション管理</h1>
          </div>
        </div>
        <div class="status-row">
          <span class="pill ok">設定シート: 設定</span>
          <span class="pill ok">APIトークン非表示</span>
          <span class="pill warn">ローカルはデモ表示</span>
        </div>
      </header>

      <section class="layout">
        <aside class="sidebar">
          <div class="control-group">
            <label for="actionSelect">アクション名</label>
            <select id="actionSelect">
              ${state.settings
                .map(
                  (item) =>
                    `<option value="${escapeHtml(item.actionName)}" ${
                      item.actionName === setting.actionName ? "selected" : ""
                    }>${escapeHtml(item.actionName)}</option>`
                )
                .join("")}
            </select>
          </div>

          <div class="control-group">
            <label>実行モード</label>
            <div class="mode-toggle">
              <button type="button" data-mode="dryRun" class="${state.mode === "dryRun" ? "active" : ""}">
                テスト
              </button>
              <button type="button" data-mode="live" class="${state.mode === "live" ? "active" : ""}">
                本実行
              </button>
            </div>
          </div>

          <button type="button" class="small-button primary" id="reloadButton">設定を再読込</button>

          <div class="empty">
            Apps Script版では、スプレッドシートの「設定」シートから最新設定を読み込みます。
          </div>
        </aside>

        <div class="content">
          <section class="overview">
            <div class="metric">
              <span>設定数</span>
              <strong>${state.settings.length}</strong>
            </div>
            <div class="metric">
              <span>有効設定</span>
              <strong>${activeCount}</strong>
            </div>
            <div class="metric">
              <span>双方向許可</span>
              <strong>${bidirectionalCount}</strong>
            </div>
            <div class="metric">
              <span>選択行</span>
              <strong>${setting.rowNumber || "-"}</strong>
            </div>
          </section>

          <section class="grid-2">
            <div class="panel">
              <div class="panel-header">
                <h2>設定内容</h2>
                <span class="pill ${setting.enabled ? "ok" : "warn"}">${setting.enabled ? "有効" : "無効"}</span>
              </div>
              <div class="field-grid">
                ${renderField("kintoneドメイン", setting.domain)}
                ${renderField("アプリID", setting.appId)}
                ${renderField("対象シート", setting.sheetName)}
                ${renderField("一意キー", setting.keyField)}
                ${renderField("取得条件", setting.query || "未設定")}
                ${renderField("APIトークン", setting.tokenStatus, true)}
                ${renderField("kintone⇨スプシ", setting.allowKintoneToSheet)}
                ${renderField("スプシ⇨kintone", setting.allowSheetToKintone)}
              </div>
            </div>

            <div class="panel">
              <div class="panel-header">
                <h2>同期操作</h2>
                <span class="pill">${state.mode === "dryRun" ? "テスト" : "本実行"}</span>
              </div>
              <div class="button-row">
                <button type="button" class="sync-button primary" id="kintoneToSheetButton" ${
                  setting.allowKintoneToSheet && setting.enabled ? "" : "disabled"
                }>
                  kintone⇨スプシ
                </button>
                <button type="button" class="sync-button reverse" id="sheetToKintoneButton" ${
                  setting.allowSheetToKintone && setting.enabled ? "" : "disabled"
                }>
                  スプシ⇨kintone
                </button>
              </div>
              <ul class="summary-list">
                ${renderSummary(setting)}
              </ul>
            </div>
          </section>

          <section class="grid-2">
            <div class="panel">
              <div class="panel-header">
                <h2>項目マッピング</h2>
                <span class="pill">${mappingRows.length}項目</span>
              </div>
              ${renderMappingTable(mappingRows)}
            </div>

            <div class="panel">
              <div class="panel-header">
                <h2>仕様アドバイス</h2>
                <span class="pill">MVP向け</span>
              </div>
              <ul class="advice-list">
                ${adviceItems
                  .map((item) => `<li class="${item.type}">${escapeHtml(item.text)}</li>`)
                  .join("")}
              </ul>
            </div>
          </section>

          <section class="log-panel">
            <div class="log-header">
              <h2>実行ログ</h2>
              <button type="button" class="small-button" id="clearLogsButton">クリア</button>
            </div>
            <div class="log-body">
              ${state.logs.map(renderLog).join("")}
            </div>
          </section>
        </div>
      </section>
    </main>
  `;

  bindEvents();
}

function renderField(label, value, secret = false) {
  return `
    <div class="field">
      <span>${escapeHtml(label)}</span>
      <strong class="${secret ? "secret-value" : ""}">${escapeHtml(toDisplay(value))}</strong>
    </div>
  `;
}

function renderSummary(setting) {
  const items = [];
  items.push({
    type: setting.tokenStatus === "未設定" ? "warn" : "ok",
    text: setting.tokenStatus === "未設定" ? "APIトークンが未設定です。" : "APIトークンは保存済みです。"
  });
  items.push({
    type: setting.keyField ? "ok" : "warn",
    text: setting.keyField ? `一意キー: ${setting.keyField}` : "一意キーを設定してください。"
  });
  items.push({
    type: setting.allowKintoneToSheet || setting.allowSheetToKintone ? "ok" : "warn",
    text:
      setting.allowKintoneToSheet || setting.allowSheetToKintone
        ? "許可された方向のボタンだけ実行できます。"
        : "同期方向が許可されていません。"
  });

  return items.map((item) => `<li class="${item.type}">${escapeHtml(item.text)}</li>`).join("");
}

function renderMappingTable(rows) {
  if (!rows.length) {
    return `<div class="empty">マッピング未設定</div>`;
  }

  return `
    <table class="mapping-table">
      <thead>
        <tr>
          <th>スプレッドシート列</th>
          <th>kintoneフィールドコード</th>
        </tr>
      </thead>
      <tbody>
        ${rows
          .map(
            (row) => `
              <tr>
                <td>${escapeHtml(row.sheetField)}</td>
                <td>${escapeHtml(row.kintoneField)}</td>
              </tr>
            `
          )
          .join("")}
      </tbody>
    </table>
  `;
}

function renderLog(log) {
  return `
    <article class="log-item ${log.status}">
      <strong>${escapeHtml(log.title)}</strong>
      <span>${escapeHtml(log.time)}</span>
      <p>${escapeHtml(log.detail)}</p>
    </article>
  `;
}

function bindEvents() {
  document.querySelector("#actionSelect").addEventListener("change", (event) => {
    state.selectedAction = event.target.value;
    addLog("success", "設定を切り替えました", `${event.target.value} を表示しています。`);
    render();
  });

  document.querySelectorAll("[data-mode]").forEach((button) => {
    button.addEventListener("click", () => {
      state.mode = button.dataset.mode;
      addLog("success", "実行モードを変更しました", state.mode === "dryRun" ? "テスト実行です。" : "本実行です。");
      render();
    });
  });

  document.querySelector("#reloadButton").addEventListener("click", () => {
    addLog("warn", "設定を再読込しました", "ローカル版ではサンプル設定を再表示します。");
    render();
  });

  document.querySelector("#kintoneToSheetButton")?.addEventListener("click", () => {
    simulateSync("kintone⇨スプシ");
  });

  document.querySelector("#sheetToKintoneButton")?.addEventListener("click", () => {
    simulateSync("スプシ⇨kintone");
  });

  document.querySelector("#clearLogsButton").addEventListener("click", () => {
    state.logs = [];
    render();
  });
}

function simulateSync(direction) {
  const setting = currentSetting();
  addLog(
    state.mode === "dryRun" ? "warn" : "success",
    `${direction} ${state.mode === "dryRun" ? "テスト" : "本実行"}`,
    `${setting.actionName} はローカル画面での操作確認です。実同期は gas/Code.gs 版で実行します。`
  );
  render();
}

function addLog(status, title, detail) {
  state.logs.unshift({
    status,
    title,
    detail,
    time: new Date().toLocaleString("ja-JP")
  });
  state.logs = state.logs.slice(0, 10);
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

render();
