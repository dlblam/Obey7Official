document.addEventListener("DOMContentLoaded", () => {
  const $ = s => document.querySelector(s);
  const book = $("#book"), cover = $("#cover");
  const leftText = $("#leftText"), rightText = $("#rightText");
  const leftChapter = $("#leftChapter"), rightChapter = $("#rightChapter");
  const leftNumber = $("#leftNumber"), rightNumber = $("#rightNumber");
  const chapterTitle = $("#chapterTitle"), progressBar = $("#progressBar");
  const progressText = $("#progressText"), pageIndicator = $("#pageIndicator");
  const tocList = $("#tocList"), toast = $("#toast");

  let files = [], units = [], pages = [], current = -1, open = false;
  let settings = JSON.parse(localStorage.getItem("obey7-reader") || "{}");
  let fontSize = settings.fontSize || 18, lineHeight = settings.lineHeight || 1.8;

  const showToast = msg => {
    toast.textContent = msg; toast.classList.add("show");
    clearTimeout(showToast.t); showToast.t = setTimeout(()=>toast.classList.remove("show"),1800);
  };

  function escapeHTML(s) {
    return s.replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
  }

  async function loadFiles() {
    for (let n=1; n<10000; n++) {
      try {
        const r = await fetch(`public/content/${n}.txt`, {cache:"no-store"});
        if (!r.ok) break;
        // text() preserves \n, \r\n and Unicode characters supplied by the TXT file.
        const text = await r.text();
        files.push({n, text});
      } catch { break; }
    }
    if (!files.length) {
      files = [{n:1,text:"Chưa có nội dung. Hãy đặt các file 1.txt, 2.txt, 3.txt... vào public/content/."}];
    }
    buildUnits();
    buildTOC();
    render();
  }

  // QUY TẮC QUAN TRỌNG:
  // 1 file TXT = 1 unit. Không bao giờ nối nội dung giữa hai file.
  // Khi chia một file thành 2 trang, chỉ được cắt tại khoảng trắng,
  // không được cắt đôi một từ.
  function buildUnits() {
    units = files.map(f => ({
      number:f.n,
      title: detectTitle(f.text, f.n),
      text:f.text.replace(/\r\n/g,"\n").replace(/\r/g,"\n")
    }));
    pages = [];
    units.forEach(unit => {
      const chunks = paginateUnit(unit.text);
      chunks.forEach((text, i) => pages.push({
        file:unit.number, title:unit.title, text,
        pageInFile:i+1, totalInFile:chunks.length
      }));
    });
  }

  function detectTitle(text, n) {
    const line = text.split("\n").map(x=>x.trim()).find(Boolean);
    return (line && line.length <= 90) ? line : `Phần ${n}`;
  }

  // Đo trực tiếp trên đúng font/kích thước của trang.
  // white-space: pre-wrap giữ nguyên xuống dòng; từ chỉ được cắt ở whitespace.
  function paginateUnit(text) {
    // Tự động lấy kích thước thực tế từ DOM tránh bị lệch khi đổi cỡ chữ/giãn dòng
    const samplePage = document.querySelector(".reader-page");
    const samplePaper = document.querySelector(".paper");
    const availableWidth = samplePage ? samplePage.clientWidth - 70 : 400;
    const availableHeight = samplePaper ? samplePaper.clientHeight - 95 : 500;

    const probe = document.createElement("div");
    probe.className = "page-text";
    probe.style.cssText = `position:absolute;visibility:hidden;pointer-events:none;width:${availableWidth}px;height:${availableHeight}px;overflow:hidden;white-space:pre-wrap;overflow-wrap:normal;word-break:normal;hyphens:none;font-size:${fontSize}px;line-height:${lineHeight}`;
    document.body.appendChild(probe);
    const capacity = probe.clientHeight;
    document.body.removeChild(probe);

    // Tokenization giữ nguyên whitespace, vì vậy newline/khoảng trắng không bị biến thành một dấu cách.
    const tokens = text.split(/(\s+)/);
    const result = []; let currentText = "";
    const measure = document.createElement("div");
    measure.className = "page-text";
    measure.style.cssText = `position:absolute;visibility:hidden;pointer-events:none;width:${availableWidth}px;height:auto;white-space:pre-wrap;overflow-wrap:normal;word-break:normal;hyphens:none;font-size:${fontSize}px;line-height:${lineHeight}`;
    document.body.appendChild(measure);

    for (const token of tokens) {
      const candidate = currentText + token;
      measure.textContent = candidate;
      if (currentText && measure.scrollHeight > capacity) {
        result.push(currentText);
        // Không để whitespace đầu trang. Nếu token là newline/khoảng trắng,
        // phần whitespace sẽ được xử lý ở đầu vòng sau mà không cắt chữ.
        currentText = token;
        measure.textContent = currentText;
        if (measure.scrollHeight > capacity) currentText = "";
      } else {
        currentText = candidate;
      }
    }
    if (currentText) result.push(currentText);
    document.body.removeChild(measure);
    return result.length ? result : [""];
  }

  function buildTOC() {
    tocList.innerHTML = units.map(u => `
      <div class="toc-item" data-file="${u.number}">
        <span class="toc-no">${String(u.number).padStart(2,"0")}</span>
        <span class="toc-name">${escapeHTML(u.title)}</span>
      </div>`).join("");
    tocList.querySelectorAll(".toc-item").forEach(el => el.onclick = () => {
      const idx = pages.findIndex(p => p.file === Number(el.dataset.file));
      if (idx >= 0) { openBook(); current = idx; render(); closeDrawer(); }
    });
  }

  function render() {
    if (!open || current < 0) {
      leftText.textContent = ""; rightText.textContent = "";
      chapterTitle.textContent = "Bìa sách";
      progressText.textContent = "Nhấn vào bìa để mở sách";
      pageIndicator.textContent = "Bìa";
      progressBar.style.width = "0%";
      return;
    }
    const p = pages[current], next = pages[current+1];
    leftText.textContent = p?.text || "";
    leftChapter.textContent = p ? p.title : "";
    leftNumber.textContent = p ? `${p.pageInFile} / ${p.totalInFile}` : "";
    rightText.textContent = next?.text || "";
    rightChapter.textContent = next?.title || "";
    rightNumber.textContent = next ? `${next.pageInFile} / ${next.totalInFile}` : "";
    chapterTitle.textContent = p ? p.title : "";
    const pct = pages.length <= 1 ? 100 : ((current+1)/pages.length)*100;
    progressBar.style.width = `${pct}%`;
    progressText.textContent = `File ${p.file}.txt · Trang ${p.pageInFile}/${p.totalInFile}`;
    pageIndicator.textContent = `${current+1} / ${pages.length}`;
  }

  function openBook() {
    if (open) return;
    open = true; book.classList.remove("closed");
    setTimeout(() => { current = 0; render(); }, 420);
  }
  function closeBook() {
    open = false; current = -1; book.classList.add("closed"); render();
  }
  function nextPage() {
    if (!open) { openBook(); return; }
    if (current < pages.length-1) { current++; render(); }
    else showToast("Đã đến cuối sách.");
  }
  function prevPage() {
    if (!open) return;
    if (current > 0) { current--; render(); }
    else closeBook();
  }

  cover.onclick = openBook;
  $("#nextBtn").onclick = nextPage; $("#nextHotspot").onclick = nextPage;
  $("#prevBtn").onclick = prevPage; $("#prevHotspot").onclick = prevPage;
  $("#centerOpen").onclick = () => open ? closeBook() : openBook();

  // Click vùng trái/phải của trang, không dùng nút điều hướng.
  book.addEventListener("click", e => {
    if (!open || e.target.closest(".cover")) return;
    const rect = book.getBoundingClientRect();
    const x = e.clientX - rect.left;
    if (x < rect.width/2) prevPage(); else nextPage();
  });

  let touchX=0;
  book.addEventListener("touchstart", e=>touchX=e.changedTouches[0].clientX,{passive:true});
  book.addEventListener("touchend", e=>{
    const dx=e.changedTouches[0].clientX-touchX;
    if(Math.abs(dx)>45) dx<0?nextPage():prevPage();
  },{passive:true});

  function saveSettings() {
    localStorage.setItem("obey7-reader", JSON.stringify({fontSize,lineHeight}));
  }
  function applySettings() {
    document.documentElement.style.setProperty("--reader-font", `${fontSize}px`);
    document.querySelectorAll(".page-text").forEach(el=>{el.style.fontSize=`${fontSize}px`;el.style.lineHeight=lineHeight});
    $("#fontSizeRange").value=fontSize; $("#fontSizeValue").value=`${fontSize}px`;
    $("#lineHeightRange").value=lineHeight; $("#lineHeightValue").value=lineHeight;
  }

  // Nâng cấp: Tự động phân trang và căn chỉnh lại ngay lập tức khi người dùng thay đổi cỡ chữ hoặc giãn dòng
  $("#fontSizeRange").oninput = e => {
    fontSize = +e.target.value;
    $("#fontSizeValue").value = `${fontSize}px`;
    saveSettings();
    applySettings();
    const old = current;
    buildUnits();
    current = Math.min(Math.max(0, old), pages.length - 1);
    render();
  };

  $("#lineHeightRange").oninput = e => {
    lineHeight = +e.target.value;
    $("#lineHeightValue").value = lineHeight;
    saveSettings();
    applySettings();
    const old = current;
    buildUnits();
    current = Math.min(Math.max(0, old), pages.length - 1);
    render();
  };

  $("#paperMode").onchange=e=>document.querySelectorAll(".paper").forEach(p=>{p.classList.remove("night","warm");if(e.target.value!=="classic")p.classList.add(e.target.value)});
  $("#fullscreenBtn").onclick=()=>document.documentElement.requestFullscreen?.();

  const tocDrawer=$("#tocDrawer"), backdrop=$("#drawerBackdrop");
  function closeDrawer(){tocDrawer.classList.remove("open");backdrop.classList.remove("show");tocDrawer.setAttribute("aria-hidden","true")}
  $("#tocBtn").onclick=()=>{tocDrawer.classList.add("open");backdrop.classList.add("show");tocDrawer.setAttribute("aria-hidden","false")};
  backdrop.onclick=closeDrawer; document.querySelectorAll("[data-close]").forEach(b=>b.onclick=closeDrawer);
  $("#settingsBtn").onclick=()=>$("#settingsModal").showModal();
  document.querySelectorAll("[data-dialog-close]").forEach(b=>b.onclick=()=>b.closest("dialog").close());

  $("#searchBtn").onclick=()=>$("#searchModal").showModal();
  $("#doSearch").onclick=search;
  $("#searchInput").onkeydown=e=>{if(e.key==="Enter")search()};
  function search(){
    const q=$("#searchInput").value.trim().toLowerCase(), out=$("#searchResults");
    if(!q){out.innerHTML="";return}
    const results=[];
    pages.forEach((p,i)=>{
      const at=p.text.toLowerCase().indexOf(q);
      if(at>=0) results.push({i,p,snip:p.text.slice(Math.max(0,at-60),at+q.length+100)});
    });
    out.innerHTML=results.length?results.slice(0,50).map(r=>`<div class="result" data-i="${r.i}"><b>File ${r.p.file}.txt</b> · ${escapeHTML(r.snip).replace(new RegExp(escapeRegExp(q),"ig"),m=>`<mark>${m}</mark>`)}</div>`).join(""):"Không tìm thấy.";
    out.querySelectorAll(".result").forEach(el=>el.onclick=()=>{current=+el.dataset.i;openBook();$("#searchModal").close();render()});
  }
  function escapeRegExp(s){return s.replace(/[.*+?^${}()|[\]\\]/g,"\\$&")}

  document.addEventListener("keydown",e=>{
    if(e.key==="ArrowRight" || e.key==="PageDown") nextPage();
    if(e.key==="ArrowLeft" || e.key==="PageUp") prevPage();
    if(e.key==="Escape" && open) closeBook();
  });

  applySettings();
  loadFiles();
});