import { showToast, setupThemeSwitcher } from './utils.js';

// Inicializar tema persistente
setupThemeSwitcher();

const dropzone = document.getElementById('dropzone');
const fileInput = document.getElementById('fileInput');
const filesContainer = document.getElementById('filesContainer');
const compressionControls = document.getElementById('compressionControls');
const compressBtn = document.getElementById('compressBtn');
const toastContainer = document.getElementById('toastContainer');

let files = [];
let selectedCRF = 23; // default CRF

// Show controls only when files are present
function updateControlsVisibility() {
  compressionControls.style.display = files.length ? '' : 'none';
  compressBtn.disabled = files.length === 0;
}

updateControlsVisibility();

// Prevent the browser from opening files when dropped outside the dropzone
['dragover', 'drop'].forEach((evt) => {
  window.addEventListener(evt, (e) => {
    e.preventDefault();
  });
});

// Handle CRF selection
Array.from(document.querySelectorAll('.quality-option')).forEach(btn => {
  btn.addEventListener('click', () => {
    Array.from(document.querySelectorAll('.quality-option')).forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    selectedCRF = parseInt(btn.dataset.crf, 10);
  });
});

function renderFiles() {
  filesContainer.innerHTML = '';
  files.forEach((f, idx) => {
    const el = document.createElement('div');
    el.className = 'file-item';
    el.innerHTML = `
      <div class="file-info">
        <div class="file-name">${f.name}</div>
        <div class="file-size">${(f.size / (1024*1024)).toFixed(2)} MB</div>
      </div>
      <div class="file-actions">
        <button class="btn-remove" data-index="${idx}">Quitar</button>
        <span class="file-status" data-status-index="${idx}">Listo</span>
      </div>
    `;
    filesContainer.appendChild(el);
  });

  filesContainer.querySelectorAll('.btn-remove').forEach(btn => {
    btn.addEventListener('click', () => {
      const i = parseInt(btn.dataset.index, 10);
      files.splice(i, 1);
      renderFiles();
      updateControlsVisibility();
    });
  });
}

function addFiles(fileList) {
  const acceptedTypes = ['video/mp4','video/quicktime','video/webm','video/x-matroska','video/x-msvideo','video/x-m4v'];
  const toAdd = Array.from(fileList).filter(f => acceptedTypes.includes(f.type) || /\.(mp4|mov|webm|mkv|avi)$/i.test(f.name));
  if (toAdd.length !== fileList.length) {
    showToast('Algunos archivos fueron ignorados por formato no compatible', 'warning', toastContainer);
  }
  // Deduplicate by name+size+lastModified
  const existingKeys = new Set(files.map(f => `${f.name}|${f.size}|${f.lastModified || 0}`));
  toAdd.forEach(f => {
    const key = `${f.name}|${f.size}|${f.lastModified || 0}`;
    if (!existingKeys.has(key)) {
      files.push(f);
      existingKeys.add(key);
    }
  });
  renderFiles();
  updateControlsVisibility();
}

// Dropzone events
['dragenter','dragover'].forEach(evt => {
  dropzone.addEventListener(evt, e => {
    e.preventDefault();
    e.stopPropagation();
    dropzone.classList.add('is-dragover');
  });
});
['dragleave','drop'].forEach(evt => {
  dropzone.addEventListener(evt, e => {
    e.preventDefault();
    e.stopPropagation();
    dropzone.classList.remove('is-dragover');
  });
});

dropzone.addEventListener('drop', e => {
  if (e.dataTransfer?.files?.length) addFiles(e.dataTransfer.files);
});

dropzone.addEventListener('click', () => fileInput.click());
dropzone.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' || e.key === ' ') {
    e.preventDefault();
    fileInput.click();
  }
});
fileInput.addEventListener('change', () => addFiles(fileInput.files));

compressBtn.addEventListener('click', async () => {
  if (!files.length) return;

  compressBtn.disabled = true;
  showToast(`Comprimiendo ${files.length} archivo(s) con CRF ${selectedCRF}...`, 'info', toastContainer);

  // Mark all as processing
  filesContainer.querySelectorAll('.file-status').forEach((el) => {
    el.textContent = 'Procesando...';
  });

  const form = new FormData();
  form.append('crf', String(selectedCRF));
  files.forEach((f) => form.append('files', f, f.name));

  try {
    const resp = await fetch('/reform-video/compress', {
      method: 'POST',
      body: form,
    });
    if (!resp.ok) {
      const err = await resp.json().catch(() => ({}));
      throw new Error(err.message || `Error ${resp.status}`);
    }
    const data = await resp.json();

    // Render results
    filesContainer.innerHTML = '';
    (data.items || []).forEach((item) => {
      const el = document.createElement('div');
      el.className = 'file-item';
      if (item.status === 'success') {
        el.innerHTML = `
          <div class="file-info">
            <div class="file-name">${item.originalName} → ${item.outputName}</div>
            <div class="file-size">CRF ${item.crf || selectedCRF} · MP4 (H.264)</div>
          </div>
          <div class="file-actions">
            <a class="btn-download" href="${item.downloadUrl}" download>Descargar</a>
            <span class="file-status is-success">Listo</span>
          </div>
        `;
      } else {
        el.innerHTML = `
          <div class="file-info">
            <div class="file-name">${item.originalName}</div>
            <div class="file-size">Error</div>
          </div>
          <div class="file-actions">
            <span class="file-status is-error">${item.error || 'Falló'}</span>
          </div>
        `;
      }
      filesContainer.appendChild(el);
    });

  showToast('Compresión completada', 'success', toastContainer);
    // Reset selection after success
    files = [];
    updateControlsVisibility();
  } catch (e) {
  console.error(e);
  showToast(e.message || 'Error al comprimir video', 'error', toastContainer);
    // keep files so user can retry
    renderFiles();
  } finally {
    compressBtn.disabled = files.length === 0;
  }
});
