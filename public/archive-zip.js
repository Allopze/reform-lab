import { showToast, formatBytes, escapeHtml, setupThemeSwitcher } from './utils.js';

setupThemeSwitcher();

const dropzone = document.getElementById('dropzone');
const fileInput = document.getElementById('fileInput');
const filesContainer = document.getElementById('filesContainer');
const compressionControls = document.getElementById('compressionControls');
const compressBtn = document.getElementById('compressBtn');
const toastContainer = document.getElementById('toastContainer');

let files = [];
let compressionLevel = 'deflate';

function updateControlsVisibility() {
  compressionControls.style.display = files.length ? '' : 'none';
  compressBtn.disabled = files.length === 0;
}

updateControlsVisibility();

// Prevent browser from opening dropped files
['dragover', 'drop'].forEach((evt) => {
  window.addEventListener(evt, (e) => {
    e.preventDefault();
  });
});

// Handle compression level selection
Array.from(document.querySelectorAll('.quality-option')).forEach(btn => {
  btn.addEventListener('click', () => {
    Array.from(document.querySelectorAll('.quality-option')).forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    compressionLevel = btn.dataset.level || 'deflate';
  });
});

function renderFiles() {
  filesContainer.innerHTML = '';
  files.forEach((f, idx) => {
    const el = document.createElement('div');
    el.className = 'file-item';
    el.innerHTML = `
      <div class="file-info">
        <div class="file-name">${escapeHtml(f.name)}</div>
        <div class="file-size">${formatBytes(f.size)}</div>
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
  const toAdd = Array.from(fileList);
  // Deduplicate
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
fileInput.addEventListener('change', () => {
  if (fileInput.files?.length) addFiles(fileInput.files);
});

compressBtn.addEventListener('click', async () => {
  if (!files.length) return;

  compressBtn.disabled = true;
  compressBtn.innerHTML = '<span>Subiendo...</span>';
  updateAllFilesStatus('Subiendo...');

  const form = new FormData();
  form.append('level', compressionLevel);
  files.forEach((f) => form.append('files', f, f.name));

  try {
    // 1. Iniciar la compresión y obtener el Job ID
    const initialResponse = await fetch('/archive/compress', {
      method: 'POST',
      body: form,
    });

    if (initialResponse.status !== 202) {
      const errorData = await initialResponse.json().catch(() => ({}));
      throw new Error(errorData.message || `Error ${initialResponse.status} al iniciar`);
    }

    const { jobId } = await initialResponse.json();
    console.log('Job ID recibido:', jobId);
    updateAllFilesStatus('Comprimiendo...');
    compressBtn.innerHTML = '<span>Comprimiendo...</span>';

    // 2. Empezar a consultar el estado
    pollStatus(jobId);

  } catch (error) {
    console.error('Error en el click:', error);
    showToast(error.message || 'Error al crear ZIP', 'error');
    updateAllFilesStatus('Error', true);
    compressBtn.disabled = false;
    compressBtn.innerHTML = '<span>Comprimir Archivos</span>';
  }
});

function pollStatus(jobId) {
  const intervalId = setInterval(async () => {
    try {
      const statusResponse = await fetch(`/archive/status/${jobId}`);
      if (!statusResponse.ok) {
        if (statusResponse.status === 404) {
          console.log('Esperando a que el job se inicie...');
          return; // Seguir intentando
        }
        throw new Error(`Error al consultar estado: ${statusResponse.status}`);
      }

      const result = await statusResponse.json();

      if (result.status === 'completed') {
        clearInterval(intervalId);
        console.log('Compresión completada:', result);
        
        // Ocultar controles de compresión
        compressionControls.style.display = 'none';
        
        filesContainer.innerHTML = '';
        const resultDiv = document.createElement('div');
        resultDiv.className = 'file-item';
        resultDiv.innerHTML = `
          <div class="file-info">
            <div class="file-name">${escapeHtml(result.zipName || 'archive.zip')}</div>
            <div class="file-size">${formatBytes(result.bytes || 0)}</div>
          </div>
          <div class="file-actions">
            <button class="btn-remove" id="removeResultBtn">Eliminar</button>
            <span class="file-status">Completado</span>
          </div>
        `;
        filesContainer.appendChild(resultDiv);
        
        // Botón de descarga
        const downloadBtn = document.createElement('a');
        downloadBtn.href = result.downloadUrl;
        downloadBtn.className = 'btn-convert';
        downloadBtn.download = result.zipName;
        downloadBtn.innerHTML = '<span>Descargar ZIP</span>';
        downloadBtn.style.marginTop = '1rem';
        filesContainer.appendChild(downloadBtn);
        
        // Botón para eliminar y empezar de nuevo
        document.getElementById('removeResultBtn').addEventListener('click', () => {
          filesContainer.innerHTML = '';
          files = [];
          compressionLevel = 'deflate';
          // Resetear selector de nivel
          Array.from(document.querySelectorAll('.quality-option')).forEach(b => b.classList.remove('active'));
          document.querySelector('.quality-option[data-level="deflate"]').classList.add('active');
          updateControlsVisibility();
          compressBtn.disabled = false;
          compressBtn.innerHTML = '<span>Comprimir Archivos</span>';
        });
        
        showToast('Archivo ZIP creado exitosamente', 'success');
        compressBtn.innerHTML = '<span>Comprimir Archivos</span>';

      } else if (result.status === 'error') {
        clearInterval(intervalId);
        throw new Error(result.message || 'Falló la compresión en el servidor');
      }
      // Si es 'processing', no hacer nada y esperar a la siguiente consulta
    } catch (error) {
      clearInterval(intervalId);
      console.error('Error en el polling:', error);
      showToast(error.message, 'error');
      updateAllFilesStatus('Error', true);
      compressBtn.disabled = false;
      compressBtn.innerHTML = '<span>Comprimir Archivos</span>';
    }
  }, 2000); // Consultar cada 2 segundos
}

function updateAllFilesStatus(status, isError = false) {
  document.querySelectorAll('.file-status').forEach(el => {
    el.textContent = status;
    el.classList.toggle('status-error', isError);
  });
}
