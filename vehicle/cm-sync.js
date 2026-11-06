/* CM 차량조회 관리 → 노선 DB 동기화 (북마크 버튼으로 실행)
   __API_URL__, __SYNC_KEY__ 는 관리자 페이지에서 버튼을 만들 때 채워집니다. */
(async () => {
  const API = "__API_URL__", KEY = "__SYNC_KEY__";
  const u = new URL(location.href);
  if (!/\/shuttle\/inquiry/.test(u.pathname)) { alert("CM > 차량 > 차량조회 관리 화면에서 눌러 주세요."); return; }
  if (u.searchParams.get("limit") !== "500") {
    alert("전체 운행을 한 화면에 불러옵니다. 화면이 다시 열리면 버튼을 한 번 더 눌러 주세요.");
    u.searchParams.set("limit", "500"); u.searchParams.set("page", "1"); location.href = u.toString(); return;
  }
  const dir = /fromSchool/.test(u.searchParams.get("vehicleOperationTypeCode") || "") ? "from" : "to";
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const box = document.createElement("div");
  box.style.cssText = "position:fixed;right:20px;bottom:20px;z-index:99999;background:#1f4fd8;color:#fff;padding:14px 18px;border-radius:12px;font:14px sans-serif;box-shadow:0 4px 16px rgba(0,0,0,.3)";
  document.body.appendChild(box);
  const say = t => box.textContent = t;
  const to24 = t => { const m = String(t).match(/(\d+):(\d+)\s*(AM|PM)/i); if (!m) return t; let h = +m[1] % 12; if (/PM/i.test(m[3])) h += 12; return String(h).padStart(2, "0") + ":" + m[2]; };
  const detail = d => { const k = Object.keys(d).find(k => k.startsWith("__reactFiber")); try { return d[k].memoizedProps.children[1].props.detail; } catch (e) { return null; } };
  const close = async () => { const d = document.querySelector(".MuiDialog-paper"); if (!d) return; const b = [...d.querySelectorAll("button")].find(b => b.textContent.trim() === "확인") || d.querySelector("button"); b.click(); for (let i = 0; i < 20 && document.querySelector(".MuiDialog-paper"); i++) await sleep(100); };
  const trs = [...document.querySelectorAll("tbody tr")];
  const rows = [];
  for (let n = 0; n < trs.length; n++) {
    const tr = trs[n];
    const c = [...tr.querySelectorAll("td")].map(td => td.innerText.trim());
    const btn = [...tr.querySelectorAll("*")].find(e => e.children.length === 0 && e.textContent.trim() === "코스");
    if (!btn) continue;
    say(`${dir === "to" ? "등원" : "하원"} 코스 읽는 중… ${n + 1} / ${trs.length}`);
    btn.click();
    let d, det;
    for (let i = 0; i < 50; i++) { await sleep(150); d = document.querySelector(".MuiDialog-paper"); det = d && detail(d); if (det && det.busRouteStopObjList && d.querySelectorAll("input").length > 3) break; }
    await sleep(150);
    const v = [...d.querySelectorAll("input")].map(i => i.value).slice(3);
    const coord = {}; (det.busRouteStopObjList || []).forEach(s => coord[s.name] = s);
    const stops = [];
    for (let i = 0; i < v.length; i += 2) { const s = coord[v[i]] || {}; stops.push({ n: v[i], lat: +s.lat, lng: +s.lng, time: to24(v[i + 1]) }); }
    const grades = ["초등", "예비중", "중등", "예비고", "고등"].filter((g, i) => c[7 + i]);
    rows.push({ car: c[1], area: c[2], days: c[5], cls: to24(c[6]), grp: grades.join("·") + " " + (c.slice(7, 12).find(Boolean) || "").split(",").slice(0, 2).join(",") + ((c.slice(7, 12).find(Boolean) || "").split(",").length > 2 ? "…" : ""), stops });
    await close();
  }
  say("노선 DB로 보내는 중…");
  await fetch(API, { method: "POST", mode: "no-cors", headers: { "Content-Type": "text/plain" }, body: JSON.stringify({ key: KEY, dir, rows }) });
  say(`완료: ${dir === "to" ? "등원" : "하원"} ${rows.length}개 운행을 보냈습니다. 결과는 시트 '이력' 탭에서 확인하세요.`);
  setTimeout(() => box.remove(), 8000);
})();
