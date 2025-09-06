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

// Pobieranie elementów DOM
const dropZone = document.getElementById('dropZone');
const fileInput = document.getElementById('fileInput');
const fileTableBody = document.querySelector('#fileTable tbody');
const autoUpload = document.getElementById('autoUpload');
const uploadBtn = document.getElementById('uploadBtn');

// Wewnętrzna tablica przechowująca strukturę plików oczekujących na wysyłkę
const fileList = [];

/**
 * Dodaje pliki do listy i do tabeli. Po dodaniu, w trybie automatycznym
 * natychmiast rozpoczyna wysyłkę każdego nowego elementu.
 * @param {File[]} files Tablica obiektów File
 */
function addFiles(files) {
  Array.from(files).forEach((file) => {
    // Utwórz strukturę opisującą plik z dodatkowymi metadanymi
    const fileEntry = {
      file,
      path: file.webkitRelativePath || file.relativePath || file.name,
      status: 'ready',
      progress: 0,
    };
    fileList.push(fileEntry);
    addFileRow(fileEntry);
    // W trybie automatycznym natychmiast wysyłamy plik
    if (autoUpload.checked) {
      uploadFile(fileEntry);
    }
  });
}

/**
 * Tworzy wiersz w tabeli dla przekazanego wpisu pliku.
 * @param {Object} fileEntry Obiekt reprezentujący dodany plik
 */
function addFileRow(fileEntry) {
  const tr = document.createElement('tr');
  // Zapisujemy indeks w atrybucie danych, aby później łatwo znaleźć wiersz
  tr.dataset.index = fileList.indexOf(fileEntry);
  tr.innerHTML = `
    <td>${fileEntry.file.name}</td>
    <td>${getFormat(fileEntry.file.name)}</td>
    <td>${(fileEntry.file.size / 1024).toFixed(2)}</td>
    <td>${fileEntry.path}</td>
    <td>
      <div class="progress"><div class="progress-bar" style="width:0"></div></div>
    </td>
    <td class="status">Gotowy</td>
  `;
  fileTableBody.appendChild(tr);
}

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
 * Główna funkcja odpowiedzialna za przesłanie pojedynczego pliku na
 * serwer. Aktualizuje pasek postępu i status w tabeli.
 * @param {Object} fileEntry Obiekt opisujący plik do wysyłki
 */
function uploadFile(fileEntry) {
  if (!fileEntry || fileEntry.status === 'uploading' || fileEntry.status === 'done') {
    return;
  }
  const index = fileList.indexOf(fileEntry);
  const tr = fileTableBody.querySelector(`tr[data-index='${index}']`);
  const progressBar = tr.querySelector('.progress-bar');
  const statusCell = tr.querySelector('.status');
  statusCell.textContent = 'Ładowanie...';
  fileEntry.status = 'uploading';

  const formData = new FormData();
  formData.append('files[]', fileEntry.file, fileEntry.file.name);
  formData.append('paths[]', fileEntry.path);

  const xhr = new XMLHttpRequest();
  xhr.open('POST', 'upload.php', true);

  xhr.upload.addEventListener('progress', function (e) {
    if (e.lengthComputable) {
      const percent = (e.loaded / e.total) * 100;
      progressBar.style.width = percent + '%';
    }
  });

  xhr.onreadystatechange = function () {
    if (xhr.readyState === 4) {
      if (xhr.status === 200) {
        progressBar.style.width = '100%';
        statusCell.textContent = 'Ukończono';
        fileEntry.status = 'done';
      } else {
        statusCell.textContent = 'Błąd';
        fileEntry.status = 'error';
      }
    }
  };

  xhr.send(formData);
}

// Obsługa kliknięcia strefy upuszczania – wywołuje hidden input
dropZone.addEventListener('click', () => {
  fileInput.click();
});

// Obsługa wyboru plików przez ukryty input
fileInput.addEventListener('change', (e) => {
  if (e.target.files && e.target.files.length) {
    addFiles(e.target.files);
  }
  fileInput.value = '';
});

// Obsługa przeciągania nad strefą
dropZone.addEventListener('dragover', (e) => {
  e.preventDefault();
  dropZone.classList.add('dragover');
});
dropZone.addEventListener('dragleave', () => {
  dropZone.classList.remove('dragover');
});

// Obsługa upuszczenia plików/folderów
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

// Kliknięcie przycisku „Wyślij pliki” rozpoczyna wysyłanie wszystkich
// plików w stanie „ready”
uploadBtn.addEventListener('click', () => {
  fileList.forEach((entry) => {
    if (entry.status === 'ready') {
      uploadFile(entry);
    }
  });
});

/**
 * Funkcja rekurencyjnie przechodząca przez strukturę folderów
 * dostarczonych przez API DataTransferItem i wybierająca wszystkie pliki.
 * Dzięki temu obsługiwane są przeciągane foldery.
 *
 * @param {DataTransferItemList} items Lista elementów z DataTransfer
 */
function handleDataTransferItems(items) {
  const files = [];
  let pending = items.length;
  if (!pending) return;

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const entry = item.webkitGetAsEntry ? item.webkitGetAsEntry() : null;
    if (entry) {
      traverseFileTree(entry, '');
    } else {
      // W starszych przeglądarkach webkitRelativePath nie jest dostępny
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