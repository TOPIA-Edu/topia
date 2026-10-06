/**
 * Weekday Class 상담 신청 → 구글 시트 저장
 *
 * 이 스크립트는 "Weekday Class 상담 신청 (랜딩 페이지)" 시트에서
 * [확장 프로그램 > Apps Script]로 열어 붙여 넣고, 웹 앱으로 배포합니다.
 * (배포 방법은 저장소의 README.md 참고)
 *
 * 값은 열 순서가 아니라 1행 머리글 이름을 보고 저장합니다.
 * 그래서 시트에서 열 순서를 바꾸거나 열을 추가해도 저장 위치가 어긋나지 않습니다.
 */

// 배포가 제대로 반영됐는지 확인하는 표시. 웹 앱 주소를 브라우저로 열면 보입니다.
var VERSION = "2026-10-06 추천인 칸";

// 새 신청이 들어오면 알림 메일을 받을 주소. 비워 두면 메일을 보내지 않습니다.
var NOTIFY_EMAIL = "";

// 시트 1행 머리글 (이 순서로 시트를 정리합니다)
var HEADERS = ["접수일시", "학부모 성함", "연락처", "자녀 학년(현재)", "재학 학교",
  "추천 재원생 이름", "추천인 학부모 연락처", "궁금한 점",
  "개인정보 동의", "유입 경로(UTM)", "페이지 주소", "처리 상태", "담당자", "메모"];

var SCHOOLS = ["을지초등학교", "불암초등학교", "원광초등학교", "중계초등학교", "수암초등학교", "그 외 학교"];
var GRADES = ["1학년 (예비 2학년)", "2학년 (예비 3학년)"];
var PHONE_RE = /^(01[016789]\d{7,8}|0\d{8,10})$/;

/**
 * 시트 열 정리 — Apps Script 편집기에서 이 함수를 골라 [실행]을 한 번 누르세요.
 * "재학 학교"(E열) 바로 뒤에 추천인 칸 2개(F·G열)를 끼워 넣습니다.
 * 이미 있으면 아무것도 바꾸지 않습니다. 신청이 들어올 때도 자동으로 확인합니다.
 */
function setupSheet() {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheets()[0];
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(HEADERS);
    return "머리글을 새로 만들었습니다.";
  }
  var head = headerRow_(sheet);
  if (head.indexOf("추천 재원생 이름") >= 0) return "이미 정리되어 있습니다.";

  var schoolCol = head.indexOf("재학 학교") + 1;          // 보통 5 (E열)
  if (schoolCol < 1) schoolCol = 5;
  sheet.insertColumnsAfter(schoolCol, 2);
  sheet.getRange(1, schoolCol + 1, 1, 2).setValues([["추천 재원생 이름", "추천인 학부모 연락처"]]);
  // 새 칸 머리글 모양을 "재학 학교" 머리글과 같게
  sheet.getRange(1, schoolCol).copyTo(sheet.getRange(1, schoolCol + 1, 1, 2), SpreadsheetApp.CopyPasteType.PASTE_FORMAT, false);
  return "재학 학교 뒤에 추천인 칸 2개를 추가했습니다.";
}

function doPost(e) {
  try {
    var data = JSON.parse((e && e.postData && e.postData.contents) || "{}");

    // 스팸 방지: 사람에게 보이지 않는 칸이 채워져 있으면 저장하지 않고 성공처럼 응답
    if (data.website) return json_({ ok: true });

    var parent = clean_(data.parent, 30);
    var phone = clean_(data.phone, 13);
    var grade = GRADES.indexOf(data.grade) >= 0 ? data.grade : "";
    var school = SCHOOLS.indexOf(data.school) >= 0 ? data.school : "";
    var memo = clean_(data.memo, 500);
    var refName = clean_(data.refName, 30);
    var refPhone = clean_(data.refPhone, 13);

    if (!parent) return json_({ ok: false, error: "parent" });
    if (!PHONE_RE.test(phone.replace(/\D/g, ""))) return json_({ ok: false, error: "phone" });
    if (!grade) return json_({ ok: false, error: "grade" });
    if (!school) return json_({ ok: false, error: "school" });
    if (data.consent !== "Y") return json_({ ok: false, error: "consent" });
    if (refPhone && !PHONE_RE.test(refPhone.replace(/\D/g, ""))) return json_({ ok: false, error: "refPhone" });

    var utm = data.utm && typeof data.utm === "object" ? data.utm : {};
    var utmText = Object.keys(utm).slice(0, 8).map(function (k) {
      return clean_(k, 20) + "=" + clean_(String(utm[k]), 80);
    }).join(" / ");

    // 머리글 이름 → 저장할 값
    var record = {
      "접수일시": Utilities.formatDate(new Date(), "Asia/Seoul", "yyyy-MM-dd HH:mm:ss"),
      "학부모 성함": parent,
      "연락처": phone,
      "자녀 학년(현재)": grade,
      "재학 학교": school,
      "추천 재원생 이름": refName,
      "추천인 학부모 연락처": refPhone,
      "궁금한 점": memo,
      "개인정보 동의": "동의",
      "유입 경로(UTM)": utmText,
      "페이지 주소": clean_(data.page, 200),
      "처리 상태": "신규"
    };

    var lock = LockService.getScriptLock();
    lock.waitLock(10000);
    try {
      setupSheet();
      var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheets()[0];
      var head = headerRow_(sheet);
      var row = head.map(function (h) { return record.hasOwnProperty(h) ? record[h] : ""; });
      sheet.appendRow(row);
    } finally {
      lock.releaseLock();
    }

    if (NOTIFY_EMAIL) {
      MailApp.sendEmail(NOTIFY_EMAIL,
        "[Weekday Class] 새 상담 신청 - " + parent,
        "새 상담 신청이 접수되었습니다.\n\n" +
        "학부모: " + parent + "\n연락처: " + phone + "\n학년: " + grade + "\n학교: " + school +
        (refName ? "\n추천 재원생: " + refName + " (" + refPhone + ")" : "") +
        (memo ? "\n궁금한 점: " + memo : "") +
        "\n\n시트에서 확인하기: " + SpreadsheetApp.getActiveSpreadsheet().getUrl());
    }

    return json_({ ok: true });
  } catch (err) {
    return json_({ ok: false, error: "server" });
  }
}

// 웹 앱 주소를 브라우저로 열면 지금 배포된 버전을 보여 줍니다.
function doGet() {
  return json_({ ok: true, service: "weekday-class-leads", version: VERSION });
}

function headerRow_(sheet) {
  var lastCol = Math.max(sheet.getLastColumn(), 1);
  return sheet.getRange(1, 1, 1, lastCol).getValues()[0].map(function (v) { return String(v).trim(); });
}

// 셀에 수식으로 해석되지 않도록 앞의 = + - @ 를 막고, 길이를 자릅니다.
function clean_(v, max) {
  var s = String(v == null ? "" : v).replace(/[\u0000-\u001f]/g, " ").trim().slice(0, max);
  return /^[=+\-@]/.test(s) ? "'" + s : s;
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
