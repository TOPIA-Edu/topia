/**
 * Weekday Class 상담 신청 → 구글 시트 저장
 *
 * 이 스크립트는 "Weekday Class 상담 신청 (랜딩 페이지)" 시트에서
 * [확장 프로그램 > Apps Script]로 열어 붙여 넣고, 웹 앱으로 배포합니다.
 * (배포 방법은 저장소의 README.md 참고)
 */

// 새 신청이 들어오면 알림 메일을 받을 주소. 비워 두면 메일을 보내지 않습니다.
var NOTIFY_EMAIL = "";

// 시트 첫 줄(머리글) 순서와 같아야 합니다.
var HEADERS = ["접수일시", "학부모 성함", "연락처", "자녀 학년(현재)", "재학 학교", "궁금한 점",
  "개인정보 동의", "유입 경로(UTM)", "페이지 주소", "처리 상태", "담당자", "메모"];

var SCHOOLS = ["을지초등학교", "불암초등학교", "원광초등학교", "중계초등학교", "수암초등학교", "그 외 학교"];
var GRADES = ["1학년 (예비 2학년)", "2학년 (예비 3학년)"];

function doPost(e) {
  try {
    var data = JSON.parse((e && e.postData && e.postData.contents) || "{}");

    // 스팸 방지: 사람에게 보이지 않는 칸이 채워져 있으면 저장하지 않고 성공처럼 응답
    if (data.website) return json_({ ok: true });

    var parent = clean_(data.parent, 30);
    var phone = clean_(data.phone, 13);
    var digits = phone.replace(/\D/g, "");
    var grade = GRADES.indexOf(data.grade) >= 0 ? data.grade : "";
    var school = SCHOOLS.indexOf(data.school) >= 0 ? data.school : "";
    var memo = clean_(data.memo, 500);

    if (!parent) return json_({ ok: false, error: "parent" });
    if (!/^(01[016789]\d{7,8}|0\d{8,10})$/.test(digits)) return json_({ ok: false, error: "phone" });
    if (!grade) return json_({ ok: false, error: "grade" });
    if (!school) return json_({ ok: false, error: "school" });
    if (data.consent !== "Y") return json_({ ok: false, error: "consent" });

    var utm = data.utm && typeof data.utm === "object" ? data.utm : {};
    var utmText = Object.keys(utm).slice(0, 8).map(function (k) {
      return clean_(k, 20) + "=" + clean_(String(utm[k]), 80);
    }).join(" / ");

    var lock = LockService.getScriptLock();
    lock.waitLock(10000);
    try {
      var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheets()[0];
      if (sheet.getLastRow() === 0) sheet.appendRow(HEADERS);
      sheet.appendRow([
        Utilities.formatDate(new Date(), "Asia/Seoul", "yyyy-MM-dd HH:mm:ss"),
        parent, phone, grade, school, memo,
        "동의", utmText, clean_(data.page, 200),
        "신규", "", ""
      ]);
    } finally {
      lock.releaseLock();
    }

    if (NOTIFY_EMAIL) {
      MailApp.sendEmail(NOTIFY_EMAIL,
        "[Weekday Class] 새 상담 신청 - " + parent,
        "새 상담 신청이 접수되었습니다.\n\n" +
        "학부모: " + parent + "\n연락처: " + phone + "\n학년: " + grade + "\n학교: " + school +
        (memo ? "\n궁금한 점: " + memo : "") +
        "\n\n시트에서 확인하기: " + SpreadsheetApp.getActiveSpreadsheet().getUrl());
    }

    return json_({ ok: true });
  } catch (err) {
    return json_({ ok: false, error: "server" });
  }
}

// 주소를 브라우저로 열었을 때 동작 확인용
function doGet() {
  return json_({ ok: true, service: "weekday-class-leads" });
}

// 셀에 수식으로 해석되지 않도록 앞의 = + - @ 를 막고, 길이를 자릅니다.
function clean_(v, max) {
  var s = String(v == null ? "" : v).replace(/[\u0000-\u001f]/g, " ").trim().slice(0, max);
  return /^[=+\-@]/.test(s) ? "'" + s : s;
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
