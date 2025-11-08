import { showToast, formatBytes, escapeHtml, setupThemeSwitcher } from './utils.js';

setupThemeSwitcher();

const dropzone = document.getElementById('dropzone');
const fileInput = document.getElementById('fileInput');
const filesContainer = document.getElementById('filesContainer');
const extractBtn = document.getElementById('extractBtn');
const toastContainer = document.getElementById('toastContainer');

let selectedFile = null;

function updateButton() {
  extractBtn.disabled = !selectedFile;
}

updateButton();

// Prevent browser from opening dropped files
['dragover', 'drop'].forEach((evt) => {
  window.addEventListener(evt, (e) => {
    e.preventDefault();
  });
});

function renderFile(file) {
  filesContainer.innerHTML = '';
  const el = document.createElement('div');
  el.className = 'file-item';
  el.innerHTML = `
    <div class="file-info">
      <div class="file-name">${escapeHtml(file.name)}</div>
      <div class="file-size">${formatBytes(file.size)}</div>
    </div>
    <div class="file-actions">
      <button class="btn-remove" id="removeBtn">Quitar</button>
      <span class="file-status" id="fileStatus">Listo</span>
    </div>
  `;
  filesContainer.appendChild(el);

  document.getElementById('removeBtn').addEventListener('click', () => {
    selectedFile = null;
    filesContainer.innerHTML = '';
    updateButton();
  });
}

function addFile(file) {
  const ext = file.name.split('.').pop().toLowerCase();
  if (!['zip'].includes(ext)) {
    showToast('Solo se permiten archivos ZIP', 'error');
    return;
  }
  selectedFile = file;
  renderFile(file);
  updateButton();
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
  if (e.dataTransfer?.files?.length) {
    addFile(e.dataTransfer.files[0]);
  }
});

dropzone.addEventListener('click', () => fileInput.click());
dropzone.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' || e.key === ' ') {
    e.preventDefault();
    fileInput.click();
  }
});

fileInput.addEventListener('change', () => {
  if (fileInput.files?.length) {
    addFile(fileInput.files[0]);
  }
});

extractBtn.addEventListener('click', async () => {
  if (!selectedFile) return;

  extractBtn.disabled = true;
  extractBtn.innerHTML = '<span>Extrayendo...</span>';
  const statusEl = document.getElementById('fileStatus');
  if (statusEl) statusEl.textContent = 'Extrayendo...';

  const form = new FormData();
  form.append('file', selectedFile, selectedFile.name);

  try {
    const resp = await fetch('/archive/extract', {
      method: 'POST',
      body: form,
    });
    if (!resp.ok) {
      const err = await resp.json().catch(() => ({}));
      throw new Error(err.message || `Error ${resp.status}`);
    }
    const data = await resp.json();

    if (data.files && data.files.length > 0) {
      filesContainer.innerHTML = '';
      
      const headerDiv = document.createElement('div');
      headerDiv.className = 'extraction-header';
      headerDiv.style.padding = '1rem';
      headerDiv.style.marginBottom = '1rem';
      headerDiv.style.borderBottom = '1px solid var(--border)';
      headerDiv.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <div>
            <h3 style="margin: 0 0 0.5rem 0; color: var(--text);">Archivos extraídos (${data.files.length})</h3>
            <p style="margin: 0; color: var(--text-secondary); font-size: 0.9rem;">Haz clic en cada archivo para descargarlo</p>
          </div>
          <button class="btn-remove" id="clearResultsBtn" style="margin: 0;">Limpiar</button>
        </div>
      `;
      filesContainer.appendChild(headerDiv);

      data.files.forEach(file => {
        const fileDiv = document.createElement('div');
        fileDiv.className = 'file-item';
        fileDiv.innerHTML = `
          <div class="file-info">
            <div class="file-name">${escapeHtml(file.name)}</div>
            <div class="file-size">Extraído</div>
          </div>
          <div class="file-actions">
            <a class="btn-download" href="${file.downloadUrl}" download="${escapeHtml(file.name)}">Descargar</a>
          </div>
        `;
        filesContainer.appendChild(fileDiv);
      });

      // Botón para limpiar y empezar de nuevo
      document.getElementById('clearResultsBtn').addEventListener('click', () => {
        filesContainer.innerHTML = '';
        selectedFile = null;
        extractBtn.disabled = false;
        extractBtn.innerHTML = '<span>Extraer archivos</span>';
        updateButton();
      });

      showToast(`${data.files.length} archivo(s) extraído(s) exitosamente`, 'success');
      extractBtn.innerHTML = '<span>Extraer archivos</span>';
    } else {
      throw new Error(data.message || 'No se encontraron archivos');
    }
  } catch (e) {
    console.error(e);
    showToast(e.message || 'Error al extraer archivos', 'error');
    if (statusEl) {
      statusEl.textContent = 'Error';
      statusEl.classList.add('status-error');
    }
    extractBtn.disabled = false;
    extractBtn.innerHTML = '<span>Extraer archivos</span>';
  }
});
