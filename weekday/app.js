(function () {
  "use strict";

  var cfg = window.WC_CONFIG || {};

  /* ── Meta 픽셀 (pixelId가 있을 때만) ───────────────── */
  if (cfg.pixelId) {
    !function (f, b, e, v, n, t, s) {
      if (f.fbq) return; n = f.fbq = function () { n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments); };
      if (!f._fbq) f._fbq = n; n.push = n; n.loaded = !0; n.version = "2.0"; n.queue = [];
      t = b.createElement(e); t.async = !0; t.src = v; s = b.getElementsByTagName(e)[0]; s.parentNode.insertBefore(t, s);
    }(window, document, "script", "https://connect.facebook.net/en_US/fbevents.js");
    window.fbq("init", cfg.pixelId);
    window.fbq("track", "PageView");
  }

  /* ── 유입 경로(UTM) 기억 ──────────────────────────── */
  // 1) 주소에 utm/fbclid가 있으면 그대로 쓰고, 같은 브라우저에 30일간 기억합니다.
  // 2) 없으면 30일 안에 기억해 둔 유입 정보를 씁니다(visit=처음 들어온 날짜).
  // 3) 그것도 없으면 직전 페이지 주소(ref=도메인)를 남깁니다. 직접 입력이면 ref=direct.
  var UTM_KEYS = ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term"];
  var KEEP_DAYS = 30;
  function today() {
    var d = new Date(Date.now() + 9 * 3600 * 1000);   // 한국 시간 기준 날짜
    return d.toISOString().slice(0, 10);
  }
  function referrerHost() {
    try {
      if (!document.referrer) return "direct";
      var h = new URL(document.referrer).hostname.replace(/^www\./, "");
      return h === window.location.hostname ? "" : h;
    } catch (e) { return ""; }
  }
  function readUtm() {
    var params = new URLSearchParams(window.location.search);
    var found = {};
    UTM_KEYS.forEach(function (k) { if (params.get(k)) found[k] = params.get(k); });
    if (params.get("fbclid")) found.fbclid = "Y";
    var ref = referrerHost();
    if (Object.keys(found).length) {
      if (ref && ref !== "direct") found.ref = ref;
      try { localStorage.setItem("wc_utm", JSON.stringify({ at: Date.now(), day: today(), v: found })); } catch (e) {}
      return found;
    }
    try {
      var saved = JSON.parse(localStorage.getItem("wc_utm") || "null");
      if (saved && saved.v && Date.now() - saved.at < KEEP_DAYS * 864e5) {
        var back = {};
        Object.keys(saved.v).forEach(function (k) { back[k] = saved.v[k]; });
        if (saved.day !== today()) back.visit = saved.day;
        return back;
      }
    } catch (e) { /* 저장소를 못 쓰는 브라우저 */ }
    return ref ? { ref: ref } : {};
  }
  var utm = readUtm();

  /* ── 폼 ─────────────────────────────────────────── */
  var form = document.getElementById("apply-form");
  if (!form) return;
  var errorBox = document.getElementById("form-error");
  var doneBox = document.getElementById("form-done");
  var submitBtn = document.getElementById("submit-btn");
  var phoneInput = form.elements.phone;

  function formatPhone(v) {
    var d = v.replace(/\D/g, "").slice(0, 11);
    if (d.indexOf("02") === 0) {
      if (d.length > 9) return d.slice(0, 2) + "-" + d.slice(2, 6) + "-" + d.slice(6, 10);
      if (d.length > 5) return d.slice(0, 2) + "-" + d.slice(2, 5) + "-" + d.slice(5);
      if (d.length > 2) return d.slice(0, 2) + "-" + d.slice(2);
      return d;
    }
    if (d.length > 7) return d.slice(0, 3) + "-" + d.slice(3, d.length - 4) + "-" + d.slice(d.length - 4);
    if (d.length > 3) return d.slice(0, 3) + "-" + d.slice(3);
    return d;
  }
  phoneInput.addEventListener("input", function () { phoneInput.value = formatPhone(phoneInput.value); });
  var refPhoneInput = form.elements.refPhone;
  if (refPhoneInput) refPhoneInput.addEventListener("input", function () { refPhoneInput.value = formatPhone(refPhoneInput.value); });

  function showError(msg, field) {
    errorBox.textContent = msg;
    errorBox.hidden = false;
    Array.prototype.forEach.call(form.querySelectorAll("[aria-invalid]"), function (el) { el.removeAttribute("aria-invalid"); });
    if (field) { field.setAttribute("aria-invalid", "true"); field.focus(); }
  }
  function clearError() { errorBox.hidden = true; errorBox.textContent = ""; }

  function validate() {
    var f = form.elements;
    var name = f.parent.value.trim();
    var digits = f.phone.value.replace(/\D/g, "");
    if (!name) return showError("학생 이름을 입력해 주세요.", f.parent), false;
    if (!/^(01[016789]\d{7,8}|0\d{8,10})$/.test(digits)) return showError("연락처를 정확히 입력해 주세요. (예: 010-1234-5678)", f.phone), false;
    if (!f.school.value) return showError("재학 중인 학교를 선택해 주세요.", f.school), false;
    if (f.refName && (f.refName.value.trim() || f.refPhone.value.trim())) {
      if (!f.refName.value.trim()) return showError("추천한 재원생 이름을 입력해 주세요.", f.refName), false;
      if (!/^(01[016789]\d{7,8}|0\d{8,10})$/.test(f.refPhone.value.replace(/\D/g, ""))) return showError("재원생 학부모 연락처를 정확히 입력해 주세요. (예: 010-1234-5678)", f.refPhone), false;
    }
    if (!f.consent.checked) return showError("개인정보 수집·이용에 동의해 주셔야 신청할 수 있습니다.", f.consent), false;
    clearError();
    return true;
  }

  var sending = false;
  form.addEventListener("submit", function (e) {
    e.preventDefault();
    if (sending || !validate()) return;

    if (!cfg.endpoint) {
      showError("지금은 온라인 신청을 받을 수 없습니다. 02-3392-0015로 전화 주시면 바로 상담해 드리겠습니다.");
      return;
    }

    var f = form.elements;
    var grade = form.querySelector('input[name="grade"]:checked');
    var payload = {
      parent: f.parent.value.trim(),
      phone: formatPhone(f.phone.value),
      grade: grade ? grade.value : "",
      school: f.school.value,
      memo: f.memo.value.trim(),
      refName: f.refName ? f.refName.value.trim() : "",
      refPhone: f.refPhone && f.refPhone.value.trim() ? formatPhone(f.refPhone.value) : "",
      consent: f.consent.checked ? "Y" : "N",
      website: f.website.value,
      utm: utm,
      page: window.location.origin + window.location.pathname
    };

    sending = true;
    submitBtn.disabled = true;
    submitBtn.textContent = "보내는 중…";

    fetch(cfg.endpoint, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify(payload)
    })
      .then(function (res) { return res.json(); })
      .then(function (data) {
        if (!data || data.ok !== true) throw new Error((data && data.error) || "save_failed");
        form.hidden = true;
        doneBox.hidden = false;
        doneBox.focus();
        if (window.fbq) window.fbq("track", "Lead");
      })
      .catch(function () {
        showError("신청을 보내지 못했습니다. 잠시 후 다시 시도하시거나 02-3392-0015로 전화 주세요.");
      })
      .then(function () {
        sending = false;
        submitBtn.disabled = false;
        submitBtn.textContent = "상담 신청하기";
      });
  });
})();
