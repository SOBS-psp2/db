// Utility: fallback for images/downloads
function fallbackSrc(primary, mirror) {
  return function(e) {
    if (e.target.src !== mirror && mirror && mirror !== "None" && mirror !== "") {
      e.target.src = mirror;
    } else {
      e.target.onerror = null;
      e.target.src = "https://via.placeholder.com/112x112?text=No+Icon";
    }
  };
}

// Utility: get CSV and cache in sessionStorage
function fetchCSV(callback) {
  if (window._CSV_CACHE) { callback(window._CSV_CACHE); return; }
  fetch('sobsdataboss.csv?'+Date.now()).then(r => r.text()).then(csv => {
    Papa.parse(csv, {
      header: true,
      skipEmptyLines: true,
      complete: res => {
        window._CSV_CACHE = res.data;
        callback(res.data);
      }
    });
  });
}

// Helper: get DATA dependencies for an entry (supports comma/space/semicolon separated IDs)
function getDataDependencies(entry, dataMap) {
  if (!entry.depends) return [];
  const ids = entry.depends.split(/[\s,;]+/).filter(Boolean);
  return ids.map(id => dataMap[id]).filter(Boolean);
}

// Main list loader (Apps/Plugins)
function loadEntries(type) {
  fetchCSV(entries => {
    // Filter by type and visible (visible!=0 or !=false or blank)
    let filtered = entries.filter(e =>
      e.type === type &&
      (e.visible === undefined || e.visible === "" || e.visible === "1" || e.visible.toLowerCase() === "true")
    );
    // For DATA dependency lookup
    let dataMap = {};
    entries.forEach(e => {
      if (
        e.type === "DATA" &&
        (!e.visible || e.visible === "1" || e.visible === "")
      ) dataMap[e.id] = e;
    });

    // Render cards
    const grid = document.getElementById('cardGrid');
    grid.innerHTML = "";
    filtered.forEach(e => {
      // Card container
      let card = document.createElement('div');
      card.className = "vita-app";
      card.tabIndex = 0;
      card.title = e.id;
      card.onclick = () => { window.location.href = `entry.html?id=${encodeURIComponent(e.id)}`; };

      // App Icon area
      let iconArea = document.createElement('div');
      iconArea.className = "vita-app-icon";
      // Bubble overlay (optional, can be commented out if not needed)
      // let overlay = document.createElement('img');
      // overlay.src = "BubbleOverlay.png";
      // overlay.width = 128;
      // overlay.height = 128;
      // overlay.className = "bubble-overlay";
      // iconArea.appendChild(overlay);

      // App icon
      let icon = document.createElement('img');
      icon.src = e.download_icon0;
      icon.loading = "lazy";
      icon.width = 128;
      icon.height = 128;
      icon.className = "bubble";
      icon.onerror = fallbackSrc(e.download_icon0, e.download_icon0_mirror);
      iconArea.appendChild(icon);

      // Title
      let title = document.createElement('b');
      title.innerText = e.title || e.id;
      iconArea.appendChild(document.createElement('br'));
      iconArea.appendChild(title);

      card.appendChild(iconArea);

      // App info section
      let info = document.createElement('div');
      info.className = "vita-app-info";
      // Author
      let author = document.createElement('span');
      author.style.fontSize = "80%";
      author.innerText = e.credits || "";
      info.appendChild(author);

      // Quick download area (Install buttons)
      let qda = document.createElement('div');
      qda.className = "quick-download-area";
      // Install main app/plugin/data
      let mainBtn = document.createElement('a');
      mainBtn.href = e.download_url || "#";
      mainBtn.className = "download-button";
      mainBtn.innerText = (
        e.type === "VPK" ? "Install APP" :
        e.type === "PLUGIN" ? "Install PLUGIN" : "Install DATA"
      );
      qda.appendChild(mainBtn);

      // DATA dependencies as buttons (support multiple DATA entries)
      let dataDeps = getDataDependencies(e, dataMap);
      dataDeps.forEach(dataEntry => {
        let dataBtn = document.createElement('a');
        dataBtn.href = dataEntry.download_url || "#";
        dataBtn.className = "download-button";
        dataBtn.innerText = "Install DATA";
        qda.appendChild(dataBtn);
      });

      info.appendChild(qda);

      // Source code link, bottom right (if available)
      if (e.download_src && e.download_src !== "None" && e.download_src.trim() !== "") {
        let srcDiv = document.createElement('div');
        srcDiv.className = "vita-src-download to-bottom";
        let srcLink = document.createElement('a');
        srcLink.href = e.download_src;
        srcLink.target = "_blank";
        srcLink.rel = "noopener noreferrer";
        srcLink.innerText = e.download_src;
        srcDiv.appendChild(srcLink);
        info.appendChild(srcDiv);
      } else {
        // If closed source, show "CLOSED SRC"
        let srcDiv = document.createElement('div');
        srcDiv.className = "vita-src-download to-bottom";
        srcDiv.innerText = "CLOSED SRC";
        info.appendChild(srcDiv);
      }

      card.appendChild(info);

      grid.appendChild(card);
    });
    // Item count
    let c = filtered.length;
    document.getElementById('itemCount').innerText = `Indexed ${c} entr${c===1?'y':'ies'}`;
  });
}

// Entry page loader
function loadEntryPage() {
  let params = new URLSearchParams(window.location.search);
  let entryID = params.get('id');
  if (!entryID) return;
  fetchCSV(entries => {
    let entry = entries.find(e => e.id === entryID);
    if (!entry) {
      document.getElementById('entryPage').innerHTML = `<h2>Entry not found.</h2>`;
      return;
    }
    document.title = "SobsDB - " + (entry.title || entry.id);

    // For DATA dependency lookup
    let dataMap = {};
    entries.forEach(e => {
      if (
        e.type === "DATA" &&
        (!e.visible || e.visible === "1" || e.visible === "")
      ) dataMap[e.id] = e;
    });
    let dataDeps = getDataDependencies(entry, dataMap);

    // Entry page layout
    let html = `
      <div class="vita-app-page">
        <div class="vita-app-page-icon">
          <img src="${entry.download_icon0}" loading="lazy" width="128" height="128" class="bubble" onerror="this.onerror=null;this.src='${entry.download_icon0_mirror||'https://via.placeholder.com/128x128?text=No+Icon'}';">
        </div>
        <div class="vita-app-page-title">
          <b>${entry.title || entry.id} (${entry.id})</b>
        </div>
        <b>${entry.credits || ""}</b>
        <div class="vita-entry-info">
          <div class="vita-app-page-readme" id="entryReadme">Loading README...</div>
          <div class="quick-download-area">
            <a href="${entry.download_url}" class="download-button">${
              entry.type === "VPK" ? "Install APP" :
              entry.type === "PLUGIN" ? "Install PLUGIN" : "Install DATA"
            }</a>
            ${
              dataDeps.map(dataEntry =>
                `<a class="download-button" href="${dataEntry.download_url}">Install DATA</a>`
              ).join("")
            }
          </div>
          <div class="vita-src-download to-bottom">
            ${
              entry.download_src && entry.download_src !== "None" && entry.download_src.trim() !== ""
              ? `<a href="${entry.download_src}" target="_blank" rel="noopener noreferrer">${entry.download_src}</a>`
              : "CLOSED SRC"
            }
          </div>
        </div>
      </div>
    `;
    document.getElementById('entryPage').innerHTML = html;

    // Fetch README (main or mirror)
    function setReadme(text) {
      document.getElementById('entryReadme').innerHTML = marked.parse(text || "No README available.");
    }
    fetch(entry.download_readme)
      .then(r => r.ok ? r.text() : Promise.reject())
      .then(setReadme)
      .catch(() => {
        if (entry.download_readme_mirror) {
          fetch(entry.download_readme_mirror).then(r => r.ok ? r.text() : Promise.reject()).then(setReadme).catch(() => setReadme("No README available."));
        } else setReadme("No README available.");
      });
  });
}
