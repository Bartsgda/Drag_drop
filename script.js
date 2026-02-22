/*
 * script.js
 *
 * Ten plik zawiera logikę front‑endową systemu drag‑and‑drop. Odpowiada
 * za obsługę zdarzeń przeciągania i upuszczania, tworzenie listy
 * przesyłanych plików, wyzwalanie przesyłania pojedynczych plików oraz
 * aktualizację pasków postępu. Wspiera zarówno pojedyncze pliki, jak i
 * całe foldery dzięki API File System. Jeżeli przeglądarka nie
 * obsługuje folderów, użytkownicy mogą nadal wybrać wiele plików przez
 * pole wyboru.
 */

// ---------------------------------------------------------------------------
// Elementy DOM
// ---------------------------------------------------------------------------

const dropZone      = document.getElementById('dropZone');
const fileInput     = document.getElementById('fileInput');
const fileTableBody = document.querySelector('#fileTable tbody');
const autoUpload    = document.getElementById('autoUpload');
const uploadBtn     = document.getElementById('uploadBtn');
const clearBtn      = document.getElementById('clearBtn');
const fileCounter   = document.getElementById('fileCounter');
const toastContainer = document.getElementById('toastContainer');

// ---------------------------------------------------------------------------
// Stan aplikacji
// ---------------------------------------------------------------------------

/** Wewnętrzna tablica przechowująca strukturę plików oczekujących na wysyłkę. */
const fileList = [];

// ---------------------------------------------------------------------------
// Licznik plików
// ---------------------------------------------------------------------------

/**
 * Aktualizuje licznik widoczny w nagłówku kontrolek.
 */
function updateCounter() {
  const count = fileList.length;
  if (count === 0) {
    fileCounter.hidden = true;
    return;
  }
  fileCounter.hidden = false;
  if (count === 1) {
    fileCounter.textContent = '1 plik';
  } else if (count < 5) {
    fileCounter.textContent = count + ' pliki';
  } else {
    fileCounter.textContent = count + ' plików';
  }
}

// ---------------------------------------------------------------------------
// Toasty (komunikaty błędów)
// ---------------------------------------------------------------------------

/**
 * Wyświetla toast z komunikatem przez 4 sekundy.
 * @param {string} message Treść komunikatu
 * @param {'error'|'info'} type Typ komunikatu
 */
function showToast(message, type = 'error') {
  const toast = document.createElement('div');
  toast.className = 'toast toast--' + type;
  toast.textContent = message;
  toastContainer.appendChild(toast);
  // Animacja wejścia
  requestAnimationFrame(() => toast.classList.add('toast--visible'));
  setTimeout(() => {
    toast.classList.remove('toast--visible');
    toast.addEventListener('transitionend', () => toast.remove(), { once: true });
  }, 4000);
}

// ---------------------------------------------------------------------------
// Zarządzanie listą plików
// ---------------------------------------------------------------------------

/**
 * Dodaje pliki do listy i do tabeli. Po dodaniu, w trybie automatycznym
 * natychmiast rozpoczyna wysyłkę każdego nowego elementu.
 * @param {File[]} files Tablica obiektów File
 */
function addFiles(files) {
  Array.from(files).forEach((file) => {
    const fileEntry = {
      file,
      path: file.webkitRelativePath || file.relativePath || file.name,
      status: 'ready',
      progress: 0,
    };
    fileList.push(fileEntry);
    addFileRow(fileEntry);
    if (autoUpload.checked) {
      uploadFile(fileEntry);
    }
  });
  updateCounter();
}

/**
 * Usuwa wpis z listy i odpowiadający mu wiersz tabeli.
 * Działa tylko dla plików w stanie „ready".
 * @param {Object} fileEntry
 */
function removeFile(fileEntry) {
  if (fileEntry.status === 'uploading') return;
  const index = fileList.indexOf(fileEntry);
  if (index === -1) return;
  // Usuń wiersz z tabeli
  const tr = fileTableBody.querySelector(`tr[data-index='${index}']`);
  if (tr) tr.remove();
  // Usuń z tablicy
  fileList.splice(index, 1);
  // Przelicz data-index dla pozostałych wierszy
  Array.from(fileTableBody.querySelectorAll('tr')).forEach((row) => {
    const rowIdx = parseInt(row.dataset.index, 10);
    if (rowIdx > index) {
      row.dataset.index = rowIdx - 1;
    }
  });
  updateCounter();
}

/**
 * Czyści całą listę plików (tylko te, które nie są w trakcie wysyłki).
 */
function clearList() {
  // Iterujemy od końca, żeby indeksy się nie przesuwały
  for (let i = fileList.length - 1; i >= 0; i--) {
    if (fileList[i].status !== 'uploading') {
      removeFile(fileList[i]);
    }
  }
}

// ---------------------------------------------------------------------------
// Renderowanie tabeli
// ---------------------------------------------------------------------------

/**
 * Tworzy wiersz w tabeli dla przekazanego wpisu pliku.
 * @param {Object} fileEntry Obiekt reprezentujący dodany plik
 */
function addFileRow(fileEntry) {
  const tr = document.createElement('tr');
  tr.dataset.index = fileList.indexOf(fileEntry);

  tr.innerHTML = `
    <td>${escapeHtml(fileEntry.file.name)}</td>
    <td>${escapeHtml(getFormat(fileEntry.file.name))}</td>
    <td>${(fileEntry.file.size / 1024).toFixed(2)}</td>
    <td>${escapeHtml(fileEntry.path)}</td>
    <td>
      <div class="progress"><div class="progress-bar" style="width:0"></div></div>
    </td>
    <td class="status">Gotowy</td>
    <td><button class="remove-btn" title="Usuń z listy">✕</button></td>
  `;

  // Przycisk usuwania
  tr.querySelector('.remove-btn').addEventListener('click', () => {
    if (fileEntry.status === 'uploading') {
      showToast('Nie można usunąć pliku podczas wysyłania.', 'info');
      return;
    }
    removeFile(fileEntry);
  });

  fileTableBody.appendChild(tr);
}

// ---------------------------------------------------------------------------
// Pomocnicze
// ---------------------------------------------------------------------------

/**
 * Zwraca rozszerzenie pliku na podstawie jego nazwy.
 * @param {string} filename
 * @returns {string}
 */
function getFormat(filename) {
  const parts = filename.split('.');
  return parts.length > 1 ? parts.pop().toLowerCase() : '';
}

/**
 * Escapuje znaki specjalne HTML, aby zapobiec XSS przy wstawianiu
 * nazw plików do innerHTML.
 * @param {string} str
 * @returns {string}
 */
function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// ---------------------------------------------------------------------------
// Wysyłanie plików
// ---------------------------------------------------------------------------

/**
 * Główna funkcja odpowiedzialna za przesłanie pojedynczego pliku na
 * serwer. Aktualizuje pasek postępu i status w tabeli.
 * @param {Object} fileEntry Obiekt opisujący plik do wysyłki
 */
function uploadFile(fileEntry) {
  if (!fileEntry || fileEntry.status === 'uploading' || fileEntry.status === 'done') {
    return;
  }
  const index      = fileList.indexOf(fileEntry);
  const tr         = fileTableBody.querySelector(`tr[data-index='${index}']`);
  const progressBar = tr.querySelector('.progress-bar');
  const statusCell  = tr.querySelector('.status');
  const removeBtn   = tr.querySelector('.remove-btn');

  statusCell.textContent = 'Ładowanie...';
  fileEntry.status       = 'uploading';
  removeBtn.disabled     = true;

  const formData = new FormData();
  formData.append('files[]', fileEntry.file, fileEntry.file.name);
  formData.append('paths[]', fileEntry.path);

  const xhr = new XMLHttpRequest();
  xhr.open('POST', 'upload.php', true);

  xhr.upload.addEventListener('progress', (e) => {
    if (e.lengthComputable) {
      const percent = (e.loaded / e.total) * 100;
      progressBar.style.width = percent + '%';
    }
  });

  xhr.onreadystatechange = function () {
    if (xhr.readyState !== 4) return;

    removeBtn.disabled = false;

    if (xhr.status === 200) {
      let response = {};
      try { response = JSON.parse(xhr.responseText); } catch (_) {}

      // Sprawdź czy plik nie został pominięty przez serwer (np. niedozwolone rozszerzenie)
      if (response.skipped && response.skipped.some((s) => s.name === fileEntry.file.name)) {
        const reason = response.skipped.find((s) => s.name === fileEntry.file.name).reason;
        const msg = reason === 'forbidden_extension'
          ? 'Niedozwolony format pliku: ' + fileEntry.file.name
          : 'Plik za duży: ' + fileEntry.file.name;
        progressBar.style.width = '0';
        statusCell.textContent  = 'Odrzucony';
        statusCell.style.color  = '#dc3545';
        fileEntry.status        = 'error';
        showToast(msg);
      } else {
        progressBar.style.width = '100%';
        statusCell.textContent  = 'Ukończono';
        statusCell.style.color  = '#28a745';
        fileEntry.status        = 'done';
      }
    } else {
      progressBar.style.width = '0';
      statusCell.textContent  = 'Błąd (' + xhr.status + ')';
      statusCell.style.color  = '#dc3545';
      fileEntry.status        = 'error';
      showToast('Błąd wysyłania „' + fileEntry.file.name + '" — serwer zwrócił ' + xhr.status + '.');
    }
  };

  xhr.send(formData);
}

// ---------------------------------------------------------------------------
// Zdarzenia UI
// ---------------------------------------------------------------------------

// Kliknięcie strefy upuszczania – otwiera ukryty input
dropZone.addEventListener('click', () => fileInput.click());

// Wybór plików przez input
fileInput.addEventListener('change', (e) => {
  if (e.target.files && e.target.files.length) {
    addFiles(e.target.files);
  }
  fileInput.value = '';
});

// Drag & drop — wizualne podświetlenie
dropZone.addEventListener('dragover', (e) => {
  e.preventDefault();
  dropZone.classList.add('dragover');
});
dropZone.addEventListener('dragleave', () => {
  dropZone.classList.remove('dragover');
});

// Upuszczenie plików/folderów
dropZone.addEventListener('drop', (e) => {
  e.preventDefault();
  dropZone.classList.remove('dragover');
  const dt = e.dataTransfer;
  if (dt.items && dt.items.length) {
    handleDataTransferItems(dt.items);
  } else if (dt.files && dt.files.length) {
    addFiles(dt.files);
  }
});

// Wyślij wszystkie pliki w stanie „ready"
uploadBtn.addEventListener('click', () => {
  fileList.forEach((entry) => {
    if (entry.status === 'ready') uploadFile(entry);
  });
});

// Wyczyść listę (pliki nie w trakcie wysyłki)
clearBtn.addEventListener('click', clearList);

// ---------------------------------------------------------------------------
// Rekurencyjne wchodzenie w foldery (FileSystem API)
// ---------------------------------------------------------------------------

/**
 * Funkcja rekurencyjnie przechodząca przez strukturę folderów
 * dostarczonych przez API DataTransferItem i wybierająca wszystkie pliki.
 * @param {DataTransferItemList} items Lista elementów z DataTransfer
 */
function handleDataTransferItems(items) {
  const files  = [];
  let pending  = items.length;
  if (!pending) return;

  for (let i = 0; i < items.length; i++) {
    const item  = items[i];
    const entry = item.webkitGetAsEntry ? item.webkitGetAsEntry() : null;
    if (entry) {
      traverseFileTree(entry, '');
    } else {
      files.push(item.getAsFile());
      if (--pending === 0) addFiles(files);
    }
  }

  /**
   * Rekurencyjnie przechodzimy drzewa katalogów przy użyciu API FileSystem.
   * @param {FileSystemEntry} entry
   * @param {string} path
   */
  function traverseFileTree(entry, path) {
    if (entry.isFile) {
      entry.file(function (file) {
        file.relativePath = path + entry.name;
        files.push(file);
        if (--pending === 0) addFiles(files);
      });
    } else if (entry.isDirectory) {
      const dirReader = entry.createReader();
      dirReader.readEntries(function (entries) {
        pending += entries.length;
        entries.forEach(function (ent) {
          traverseFileTree(ent, path + entry.name + '/');
        });
        if (--pending === 0) addFiles(files);
      });
    }
  }
}
