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
  var UTM_KEYS = ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term"];
  function readUtm() {
    var params = new URLSearchParams(window.location.search);
    var found = {};
    UTM_KEYS.forEach(function (k) { if (params.get(k)) found[k] = params.get(k); });
    if (params.get("fbclid")) found.fbclid = "Y";
    try {
      if (Object.keys(found).length) sessionStorage.setItem("wc_utm", JSON.stringify(found));
      else found = JSON.parse(sessionStorage.getItem("wc_utm") || "{}");
    } catch (e) { /* 저장소를 못 쓰는 브라우저 */ }
    return found;
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
    if (!name) return showError("학부모님 성함을 입력해 주세요.", f.parent), false;
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
