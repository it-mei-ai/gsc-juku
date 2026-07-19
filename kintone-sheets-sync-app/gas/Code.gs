const APP_CONFIG = {
  spreadsheetId: "1sCG61mugrjuGPatgQqiYzncngUu9ro-5nDckafhrYmw",
  settingSheetName: "設定",
  logSheetName: "同期ログ",
  defaultLimit: 500,
  batchSize: 100
};

const HEADER_ALIASES = {
  actionName: ["アクション名", "actionName", "action_name"],
  domain: ["kintoneドメイン", "ドメイン", "kintone URL", "kintoneURL", "サブドメイン"],
  appId: ["アプリID", "kintoneアプリID", "appId", "app_id"],
  apiToken: ["APIトークン", "kintone APIトークン", "kintone API Token", "apiToken", "api_token"],
  sheetName: ["対象シート", "シート名", "スプシシート名", "Googleシート名", "sheetName"],
  keyField: ["キー項目", "一意キー", "管理ID", "重複禁止フィールドコード", "更新キー", "keyField"],
  query: ["取得条件", "kintoneクエリ", "query", "絞り込み条件"],
  mapping: ["項目マッピング", "フィールドマッピング", "マッピング", "mapping"],
  limit: ["同期上限", "取得上限", "limit"],
  enabled: ["有効", "有効/無効", "実行可否", "enabled"],
  guestSpaceId: ["ゲストスペースID", "guestSpaceId", "guest_space_id"],
  allowKintoneToSheet: ["kintone⇨スプシ", "kintone→スプシ", "kintone=>スプシ", "kintone to スプシ"],
  allowSheetToKintone: ["スプシ⇨kintone", "スプシ→kintone", "スプシ=>kintone", "Sheets to kintone"]
};

const MANAGEMENT_COLUMNS = ["kintoneレコードID", "kintoneリビジョン", "同期ステータス", "同期エラー", "最終同期日時"];

function doGet() {
  return HtmlService.createTemplateFromFile("Index")
    .evaluate()
    .setTitle("kintone / Sheets Sync Console")
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

function getSettings() {
  const table = readSettingsTable_();
  const settings = table.rows.map(function(row) {
    return sanitizeSetting_(row, table.headers);
  });

  return {
    spreadsheetId: getSpreadsheet_().getId(),
    settingSheetName: APP_CONFIG.settingSheetName,
    generatedAt: Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "yyyy-MM-dd HH:mm:ss"),
    settings: settings
  };
}

function runSync(request) {
  const payload = request || {};
  const actionName = String(payload.actionName || "").trim();
  const direction = String(payload.direction || "").trim();
  const dryRun = payload.mode !== "live";
  const lock = LockService.getScriptLock();

  if (!lock.tryLock(5000)) {
    throw new Error("別の同期処理が実行中です。少し待ってから再実行してください。");
  }

  try {
    const setting = getRawSettingByAction_(actionName);
    if (!setting) {
      throw new Error("指定されたアクション名が設定シートにありません: " + actionName);
    }
    if (setting.enabled !== "" && !isEnabled_(setting.enabled)) {
      throw new Error("このアクションは無効です: " + actionName);
    }
    if (direction === "kintoneToSheet" && !isEnabled_(setting.allowKintoneToSheet)) {
      throw new Error("kintone⇨スプシ は設定シートで許可されていません。");
    }
    if (direction === "sheetToKintone" && !isEnabled_(setting.allowSheetToKintone)) {
      throw new Error("スプシ⇨kintone は設定シートで許可されていません。");
    }

    const result =
      direction === "kintoneToSheet"
        ? syncKintoneToSheet_(setting, dryRun)
        : syncSheetToKintone_(setting, dryRun);

    appendSyncLog_(actionName, direction, dryRun, "success", result.message, result.count || 0);
    return {
      ok: true,
      actionName: actionName,
      direction: direction,
      dryRun: dryRun,
      message: result.message,
      count: result.count || 0,
      details: result.details || {}
    };
  } catch (error) {
    appendSyncLog_(actionName || "-", direction || "-", dryRun, "error", error.message, 0);
    throw new Error(error.message);
  } finally {
    lock.releaseLock();
  }
}

function syncKintoneToSheet_(setting, dryRun) {
  const targetSheet = getTargetSheet_(setting);
  const mapping = getMapping_(setting, targetSheet);
  const keyField = String(setting.keyField || "").trim();
  const fields = unique_(mapping.map(function(pair) {
    return pair.kintoneField;
  }).concat(keyField ? [keyField, "$id", "$revision"] : ["$id", "$revision"]));
  const query = withLimit_(setting.query, setting.limit);
  const response = requestKintone_(setting, "get", "records.json", null, {
    app: setting.appId,
    query: query,
    fields: fields
  });
  const records = response.records || [];

  if (dryRun) {
    return {
      message: records.length + "件をkintoneから取得できます。",
      count: records.length,
      details: { targetSheet: targetSheet.getName(), query: query }
    };
  }

  const result = upsertKintoneRecordsToSheet_(targetSheet, mapping, keyField, records);
  return {
    message: result.updated + "件更新、" + result.appended + "件追加しました。",
    count: records.length,
    details: result
  };
}

function syncSheetToKintone_(setting, dryRun) {
  const targetSheet = getTargetSheet_(setting);
  const mapping = getMapping_(setting, targetSheet);
  const keyField = String(setting.keyField || "").trim();
  const keySheetField = findSheetFieldForKintone_(mapping, keyField) || keyField;
  const table = readTargetTable_(targetSheet);
  const records = [];
  const rowNumbers = [];

  table.rows.forEach(function(row) {
    if (!rowHasMappedValue_(row, mapping)) return;
    if (keyField && !String(row.values[keySheetField] || "").trim()) return;

    records.push(buildKintoneRecordFromSheetRow_(row.values, mapping, keyField, keySheetField));
    rowNumbers.push(row.rowNumber);
  });

  if (dryRun) {
    return {
      message: records.length + "件をkintoneへ送信できます。",
      count: records.length,
      details: { targetSheet: targetSheet.getName() }
    };
  }

  const chunks = chunk_(records, APP_CONFIG.batchSize);
  chunks.forEach(function(chunk) {
    if (keyField) {
      requestKintone_(setting, "put", "records.json", {
        app: setting.appId,
        upsert: true,
        records: chunk
      });
    } else {
      requestKintone_(setting, "post", "records.json", {
        app: setting.appId,
        records: chunk.map(function(item) {
          return item.record;
        })
      });
    }
  });

  updateRowsStatus_(targetSheet, rowNumbers, "同期済み", "");
  return {
    message: records.length + "件をkintoneへ送信しました。",
    count: records.length,
    details: { batches: chunks.length }
  };
}

function readSettingsTable_() {
  const sheet = getSpreadsheet_().getSheetByName(APP_CONFIG.settingSheetName);
  if (!sheet) {
    throw new Error("設定シートが見つかりません: " + APP_CONFIG.settingSheetName);
  }
  if (sheet.getLastRow() < 1 || sheet.getLastColumn() < 1) {
    return { headers: [], rows: [] };
  }

  const values = sheet.getRange(1, 1, sheet.getLastRow(), sheet.getLastColumn()).getDisplayValues();
  const headers = values[0].map(cleanHeader_);
  const rows = values.slice(1)
    .map(function(row, index) {
      return rowToObject_(headers, row, index + 2);
    })
    .filter(function(row) {
      return Object.keys(row.values).some(function(key) {
        return String(row.values[key] || "").trim() !== "";
      });
    });

  return { headers: headers, rows: rows };
}

function getRawSettingByAction_(actionName) {
  const table = readSettingsTable_();
  for (let i = 0; i < table.rows.length; i += 1) {
    const setting = normalizeSetting_(table.rows[i]);
    if (setting.actionName === actionName) {
      return setting;
    }
  }
  return null;
}

function sanitizeSetting_(row, headers) {
  const setting = normalizeSetting_(row);
  const visibleFields = headers
    .filter(function(header) {
      return header && !isSecretHeader_(header);
    })
    .map(function(header) {
      return { label: header, value: row.values[header] || "" };
    });

  return {
    actionName: setting.actionName || "未設定",
    rowNumber: row.rowNumber,
    domain: setting.domain,
    appId: setting.appId,
    sheetName: setting.sheetName,
    keyField: setting.keyField,
    query: setting.query,
    mapping: setting.mapping,
    allowKintoneToSheet: isEnabled_(setting.allowKintoneToSheet),
    allowSheetToKintone: isEnabled_(setting.allowSheetToKintone),
    enabled: setting.enabled === "" ? true : isEnabled_(setting.enabled),
    tokenStatus: setting.apiToken ? "保存済み（非表示）" : "未設定",
    visibleFields: visibleFields
  };
}

function normalizeSetting_(row) {
  const values = row.values;
  const enabledValue = pickValue_(values, HEADER_ALIASES.enabled);
  return {
    actionName: String(pickValue_(values, HEADER_ALIASES.actionName) || "").trim(),
    domain: String(pickValue_(values, HEADER_ALIASES.domain) || "").trim(),
    appId: String(pickValue_(values, HEADER_ALIASES.appId) || "").trim(),
    apiToken: String(pickValue_(values, HEADER_ALIASES.apiToken) || "").trim(),
    sheetName: String(pickValue_(values, HEADER_ALIASES.sheetName) || "").trim(),
    keyField: String(pickValue_(values, HEADER_ALIASES.keyField) || "").trim(),
    query: String(pickValue_(values, HEADER_ALIASES.query) || "").trim(),
    mapping: String(pickValue_(values, HEADER_ALIASES.mapping) || "").trim(),
    limit: String(pickValue_(values, HEADER_ALIASES.limit) || "").trim(),
    enabled: enabledValue === undefined ? "" : String(enabledValue).trim(),
    guestSpaceId: String(pickValue_(values, HEADER_ALIASES.guestSpaceId) || "").trim(),
    allowKintoneToSheet: String(pickValue_(values, HEADER_ALIASES.allowKintoneToSheet) || "").trim(),
    allowSheetToKintone: String(pickValue_(values, HEADER_ALIASES.allowSheetToKintone) || "").trim(),
    rowNumber: row.rowNumber
  };
}

function getTargetSheet_(setting) {
  if (!setting.sheetName) {
    throw new Error("対象シートが未設定です。");
  }
  const sheet = getSpreadsheet_().getSheetByName(setting.sheetName);
  if (!sheet) {
    throw new Error("対象シートが見つかりません: " + setting.sheetName);
  }
  return sheet;
}

function getMapping_(setting, sheet) {
  const explicit = parseMappingText_(setting.mapping);
  if (explicit.length) return explicit;

  const table = readTargetTable_(sheet);
  return table.headers
    .filter(function(header) {
      return header && MANAGEMENT_COLUMNS.indexOf(header) === -1;
    })
    .map(function(header) {
      return { sheetField: header, kintoneField: header };
    });
}

function parseMappingText_(mappingText) {
  return String(mappingText || "")
    .split(/[\n,]/)
    .map(function(part) {
      return part.trim();
    })
    .filter(Boolean)
    .map(function(part) {
      const pieces = part.split(/\s*(?:=>|:|=)\s*/);
      return {
        sheetField: cleanHeader_(pieces[0] || ""),
        kintoneField: cleanHeader_(pieces[1] || pieces[0] || "")
      };
    })
    .filter(function(pair) {
      return pair.sheetField && pair.kintoneField;
    });
}

function readTargetTable_(sheet) {
  if (sheet.getLastRow() < 1 || sheet.getLastColumn() < 1) {
    return { headers: [], rows: [] };
  }
  const values = sheet.getRange(1, 1, sheet.getLastRow(), sheet.getLastColumn()).getValues();
  const displayHeaders = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getDisplayValues()[0];
  const headers = displayHeaders.map(cleanHeader_);
  const rows = values.slice(1).map(function(row, index) {
    return rowToObject_(headers, row, index + 2);
  });

  return { headers: headers, rows: rows };
}

function upsertKintoneRecordsToSheet_(sheet, mapping, keyField, records) {
  const management = MANAGEMENT_COLUMNS;
  const requiredHeaders = unique_(mapping.map(function(pair) {
    return pair.sheetField;
  }).concat(management));
  let headers = ensureHeaders_(sheet, requiredHeaders);
  const headerIndex = indexByHeader_(headers);
  const table = readTargetTable_(sheet);
  const keySheetField = findSheetFieldForKintone_(mapping, keyField) || keyField;
  const existingByKey = {};
  let updated = 0;
  let appended = 0;

  table.rows.forEach(function(row) {
    const key = String(row.values[keySheetField] || "").trim();
    if (key) existingByKey[key] = row;
  });

  records.forEach(function(record) {
    const key = keyField ? String(getKintoneFieldValue_(record, keyField) || "").trim() : "";
    const existing = key ? existingByKey[key] : null;
    const rowValues = existing ? tableRowToArray_(existing.values, headers) : new Array(headers.length).fill("");

    mapping.forEach(function(pair) {
      rowValues[headerIndex[pair.sheetField]] = getKintoneFieldValue_(record, pair.kintoneField);
    });
    rowValues[headerIndex["kintoneレコードID"]] = getKintoneFieldValue_(record, "$id");
    rowValues[headerIndex["kintoneリビジョン"]] = getKintoneFieldValue_(record, "$revision");
    rowValues[headerIndex["同期ステータス"]] = "同期済み";
    rowValues[headerIndex["同期エラー"]] = "";
    rowValues[headerIndex["最終同期日時"]] = new Date();

    if (existing) {
      sheet.getRange(existing.rowNumber, 1, 1, headers.length).setValues([rowValues]);
      updated += 1;
    } else {
      sheet.appendRow(rowValues);
      appended += 1;
    }
  });

  return { updated: updated, appended: appended };
}

function buildKintoneRecordFromSheetRow_(rowValues, mapping, keyField, keySheetField) {
  const record = {};

  mapping.forEach(function(pair) {
    if (keyField && pair.kintoneField === keyField) return;
    const value = rowValues[pair.sheetField];
    if (value === "" || value === null || value === undefined) return;
    record[pair.kintoneField] = { value: normalizeSheetValue_(value) };
  });

  if (keyField) {
    return {
      updateKey: {
        field: keyField,
        value: normalizeSheetValue_(rowValues[keySheetField])
      },
      record: record
    };
  }

  mapping.forEach(function(pair) {
    if (record[pair.kintoneField]) return;
    const value = rowValues[pair.sheetField];
    if (value === "" || value === null || value === undefined) return;
    record[pair.kintoneField] = { value: normalizeSheetValue_(value) };
  });

  return { record: record };
}

function updateRowsStatus_(sheet, rowNumbers, status, errorMessage) {
  const headers = ensureHeaders_(sheet, MANAGEMENT_COLUMNS);
  const headerIndex = indexByHeader_(headers);
  rowNumbers.forEach(function(rowNumber) {
    sheet.getRange(rowNumber, headerIndex["同期ステータス"] + 1).setValue(status);
    sheet.getRange(rowNumber, headerIndex["同期エラー"] + 1).setValue(errorMessage || "");
    sheet.getRange(rowNumber, headerIndex["最終同期日時"] + 1).setValue(new Date());
  });
}

function requestKintone_(setting, method, apiName, body, queryParams) {
  if (!setting.domain) throw new Error("kintoneドメインが未設定です。");
  if (!setting.appId) throw new Error("アプリIDが未設定です。");
  if (!setting.apiToken) throw new Error("APIトークンが未設定です。");

  const url = buildKintoneUrl_(setting, apiName, queryParams || {});
  const params = {
    method: method,
    muteHttpExceptions: true,
    contentType: "application/json",
    headers: {
      "X-Cybozu-API-Token": setting.apiToken
    }
  };

  if (body) {
    params.payload = JSON.stringify(body);
  }

  const response = UrlFetchApp.fetch(url, params);
  const statusCode = response.getResponseCode();
  const text = response.getContentText() || "";
  const parsed = text ? JSON.parse(text) : {};

  if (statusCode < 200 || statusCode >= 300) {
    const message = parsed.message || text || "kintone API request failed";
    throw new Error("kintone APIエラー(" + statusCode + "): " + message);
  }

  return parsed;
}

function buildKintoneUrl_(setting, apiName, queryParams) {
  let domain = setting.domain;
  if (!/^https?:\/\//.test(domain)) {
    domain = "https://" + domain;
  }
  domain = domain.replace(/\/+$/, "");

  const path = setting.guestSpaceId
    ? "/k/guest/" + encodeURIComponent(setting.guestSpaceId) + "/v1/" + apiName
    : "/k/v1/" + apiName;
  const query = objectToQueryString_(queryParams || {});

  return domain + path + (query ? "?" + query : "");
}

function objectToQueryString_(params) {
  const parts = [];
  Object.keys(params).forEach(function(key) {
    const value = params[key];
    if (value === undefined || value === null || value === "") return;
    if (Array.isArray(value)) {
      value.forEach(function(item, index) {
        if (item === undefined || item === null || item === "") return;
        parts.push(encodeURIComponent(key + "[" + index + "]") + "=" + encodeURIComponent(item));
      });
      return;
    }
    parts.push(encodeURIComponent(key) + "=" + encodeURIComponent(value));
  });
  return parts.join("&");
}

function appendSyncLog_(actionName, direction, dryRun, status, message, count) {
  const ss = getSpreadsheet_();
  let sheet = ss.getSheetByName(APP_CONFIG.logSheetName);
  if (!sheet) {
    sheet = ss.insertSheet(APP_CONFIG.logSheetName);
    sheet.appendRow(["日時", "アクション名", "方向", "モード", "ステータス", "件数", "メッセージ"]);
  }
  sheet.appendRow([
    new Date(),
    actionName,
    direction,
    dryRun ? "テスト" : "本実行",
    status,
    count,
    message
  ]);
}

function ensureHeaders_(sheet, requiredHeaders) {
  if (sheet.getLastRow() < 1) {
    sheet.getRange(1, 1, 1, requiredHeaders.length).setValues([requiredHeaders]);
    return requiredHeaders.slice();
  }

  let headers = sheet.getRange(1, 1, 1, Math.max(1, sheet.getLastColumn())).getDisplayValues()[0].map(cleanHeader_);
  const missing = requiredHeaders.filter(function(header) {
    return headers.indexOf(header) === -1;
  });

  if (missing.length) {
    sheet.getRange(1, headers.length + 1, 1, missing.length).setValues([missing]);
    headers = headers.concat(missing);
  }

  return headers;
}

function rowToObject_(headers, row, rowNumber) {
  const values = {};
  headers.forEach(function(header, index) {
    if (!header) return;
    values[header] = row[index];
  });
  return { rowNumber: rowNumber, values: values };
}

function tableRowToArray_(values, headers) {
  return headers.map(function(header) {
    return values[header] === undefined ? "" : values[header];
  });
}

function rowHasMappedValue_(row, mapping) {
  return mapping.some(function(pair) {
    const value = row.values[pair.sheetField];
    return value !== "" && value !== null && value !== undefined;
  });
}

function findSheetFieldForKintone_(mapping, kintoneField) {
  if (!kintoneField) return "";
  for (let i = 0; i < mapping.length; i += 1) {
    if (mapping[i].kintoneField === kintoneField) return mapping[i].sheetField;
  }
  return "";
}

function getKintoneFieldValue_(record, fieldCode) {
  const field = record[fieldCode];
  if (!field) return "";
  const value = field.value;
  if (Array.isArray(value)) {
    return value
      .map(function(item) {
        if (typeof item === "object" && item !== null) {
          return item.name || item.code || item.value || JSON.stringify(item);
        }
        return item;
      })
      .join(", ");
  }
  if (typeof value === "object" && value !== null) {
    return value.name || value.code || value.value || JSON.stringify(value);
  }
  return value;
}

function normalizeSheetValue_(value) {
  if (Object.prototype.toString.call(value) === "[object Date]") {
    return Utilities.formatDate(value, Session.getScriptTimeZone(), "yyyy-MM-dd");
  }
  return value;
}

function pickValue_(values, aliases) {
  for (let i = 0; i < aliases.length; i += 1) {
    const key = aliases[i];
    if (Object.prototype.hasOwnProperty.call(values, key)) return values[key];
  }
  return undefined;
}

function isEnabled_(value) {
  const normalized = String(value === undefined ? "" : value).trim().toLowerCase();
  return ["◯", "○", "〇", "true", "yes", "y", "1", "on", "有効", "許可"].indexOf(normalized) !== -1;
}

function isSecretHeader_(header) {
  const normalized = String(header || "").toLowerCase();
  return (
    normalized.indexOf("apiトークン") !== -1 ||
    normalized.indexOf("トークン") !== -1 ||
    normalized.indexOf("api token") !== -1 ||
    normalized.indexOf("apitoken") !== -1 ||
    normalized.indexOf("apiキー") !== -1 ||
    normalized.indexOf("password") !== -1 ||
    normalized.indexOf("パスワード") !== -1 ||
    normalized.indexOf("secret") !== -1 ||
    normalized.indexOf("シークレット") !== -1
  );
}

function cleanHeader_(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function withLimit_(query, limitValue) {
  const queryText = String(query || "").trim();
  const limit = Math.min(Number(limitValue || APP_CONFIG.defaultLimit) || APP_CONFIG.defaultLimit, APP_CONFIG.defaultLimit);
  if (/\blimit\s+\d+/i.test(queryText)) return queryText;
  return (queryText ? queryText + " " : "") + "limit " + limit;
}

function indexByHeader_(headers) {
  const index = {};
  headers.forEach(function(header, position) {
    index[header] = position;
  });
  return index;
}

function unique_(items) {
  const seen = {};
  return items.filter(function(item) {
    if (!item || seen[item]) return false;
    seen[item] = true;
    return true;
  });
}

function chunk_(items, size) {
  const chunks = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
}

function getSpreadsheet_() {
  const overrideId = PropertiesService.getScriptProperties().getProperty("SPREADSHEET_ID");
  return SpreadsheetApp.openById(overrideId || APP_CONFIG.spreadsheetId);
}
