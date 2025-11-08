import { showToast, downloadFile, formatBytes, escapeHtml, safeJson, isPdf, setupThemeSwitcher } from './utils.js';

document.addEventListener('DOMContentLoaded', () => {
  const API_URL = window.location.origin;

  const dropzone = document.getElementById('dropzone');
  const fileInput = document.getElementById('fileInput');
  const filesContainer = document.getElementById('filesContainer');
  const mergeBtn = document.getElementById('mergeBtn');
  const toastContainer = document.getElementById('toastContainer');
  const mainContainer = document.querySelector('.main');

  let downloadBtn = null;

  let selectedFiles = []; // [{id, file, name, size, status}]
  let dragSrcId = null;

  // Eventos dropzone
  if (dropzone && fileInput) {
    dropzone.addEventListener('click', () => fileInput.click());
    dropzone.addEventListener('dragover', (e) => { e.preventDefault(); dropzone.classList.add('drag-over'); });
    dropzone.addEventListener('dragleave', () => dropzone.classList.remove('drag-over'));
    dropzone.addEventListener('drop', (e) => {
      e.preventDefault();
      dropzone.classList.remove('drag-over');
      const files = Array.from(e.dataTransfer.files).filter(f => isPdf(f));
      if (files.length === 0) return showToast('Solo se permiten archivos PDF', 'error', toastContainer);
      addFiles(files);
    });
  }

  if (fileInput) {
    fileInput.addEventListener('change', (e) => {
      const files = Array.from(e.target.files).filter(f => isPdf(f));
      if (files.length === 0) return showToast('Solo se permiten archivos PDF', 'error', toastContainer);
      addFiles(files);
      fileInput.value = '';
    });
  }

  function addFiles(files) {
    files.forEach(file => {
      if (downloadBtn && mainContainer?.contains(downloadBtn)) {
        mainContainer.removeChild(downloadBtn);
        downloadBtn = null;
      }

      const id = `f-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      const item = { id, file, name: file.name, size: file.size, status: 'waiting' };
      selectedFiles.push(item);
      renderItem(item);
    });
    updateMergeBtn();
  }

  function renderItem(item) {
    const div = document.createElement('div');
    div.className = 'file-item draggable';
    div.id = item.id;
    div.draggable = true;
    div.innerHTML = `
    <div class="file-icon drag-handle" title="Arrastra para reordenar">PDF</div>
      <div class="file-info">
        <div class="file-name">${escapeHtml(item.name)}</div>
        <div class="file-meta">
          <span class="file-size">${formatBytes(item.size)}</span>
          <span class="file-status status-waiting">Esperando</span>
          <div class="file-error" style="color: var(--error); font-size: 0.85rem; margin-top: 4px; display: none;"></div>
        </div>
      </div>
      <div class="file-actions">
  <button class="btn-remove" aria-label="Eliminar">X</button>
      </div>
    `;

    // Event listener para el botón de eliminar (más seguro que onclick)
    div.querySelector('.btn-remove').addEventListener('click', () => removeFile(item.id));

    // Drag & drop para reordenar
    div.addEventListener('dragstart', (e) => {
      dragSrcId = item.id;
      div.classList.add('dragging');
      e.dataTransfer.effectAllowed = 'move';
    });
    div.addEventListener('dragend', () => {
      div.classList.remove('dragging');
    });

    div.addEventListener('dragover', (e) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
    });

    div.addEventListener('drop', (e) => {
      e.preventDefault();
      if (dragSrcId === item.id) return;

      const dragging = document.getElementById(dragSrcId);
      const target = e.currentTarget;
      const rect = target.getBoundingClientRect();
      const isAfter = e.clientY > rect.top + rect.height / 2;

      target.parentNode.insertBefore(dragging, isAfter ? target.nextSibling : target);
    });
    filesContainer.appendChild(div);
  }

  // Eliminada: getDragAfterElement no se utiliza.

  function updateMergeBtn() {
    if (mergeBtn) {
      const waitingFiles = selectedFiles.filter(f => f.status === 'waiting');
      const isProcessing = selectedFiles.some(f => f.status === 'uploading');
      mergeBtn.disabled = waitingFiles.length < 2 || isProcessing;
    }
  }

  function removeFile(id) {
    selectedFiles = selectedFiles.filter(f => f.id !== id);
    const el = document.getElementById(id);
    if (el) { el.style.animation = 'slideOut 0.3s ease'; setTimeout(() => el.remove(), 300); }
    updateMergeBtn();
  }

  if (mergeBtn) {
    mergeBtn.addEventListener('click', handleMerge);
  }

  async function handleMerge() {
    const orderIds = [...filesContainer.querySelectorAll('.file-item')].map(el => el.id);
    // Reordena el array en memoria según el DOM actual
    selectedFiles.sort((a, b) => orderIds.indexOf(a.id) - orderIds.indexOf(b.id));

    const formData = new FormData();
    selectedFiles.forEach(f => formData.append('files', f.file)); // el ORDEN aquí manda
    selectedFiles.forEach(f => { f.status = 'uploading'; updateStatus(f.id, 'uploading'); });
    if (mergeBtn) mergeBtn.disabled = true;

    try {
      const res = await fetch(`${API_URL}/merge-pdf`, { method: 'POST', body: formData });
      if (!res.ok) {
        const err = await safeJson(res);
        throw new Error(err.message || 'Error al unir PDFs');
      }
      const data = await res.json();

      const skippedSet = new Set((data.skippedFiles || []).map(name => name.toLowerCase()));
      let skippedCount = 0;

      selectedFiles.forEach(f => {
        if (skippedSet.has(f.name.toLowerCase())) {
          skippedCount += 1;
          f.status = 'error';
          updateStatus(f.id, 'error', 'No se pudo leer este PDF');
        } else {
          f.status = 'success';
          updateStatus(f.id, 'success');
        }
      });

      const mergedCount = selectedFiles.length - skippedCount;
      showToast(`PDF unido correctamente (${mergedCount} de ${selectedFiles.length})`, 'success', toastContainer);
      if (skippedCount > 0) {
        showToast(`${skippedCount} archivo(s) se omitieron por no ser PDF válidos`, 'warning', toastContainer);
      }

      // Reemplaza el botón de unir por uno de descarga
      if (downloadBtn && mainContainer?.contains(downloadBtn)) {
        mainContainer.removeChild(downloadBtn);
      }

  downloadBtn = document.createElement('button');
  downloadBtn.className = 'btn-convert btn-download-merged';
  downloadBtn.textContent = 'Descargar PDF unido';
      downloadBtn.addEventListener('click', () => downloadFile(data.downloadUrl, data.outputName));
      if (mainContainer) mainContainer.appendChild(downloadBtn);

      const successIds = selectedFiles.filter(f => f.status === 'success').map(f => f.id);
      selectedFiles = selectedFiles.filter(f => f.status !== 'success');

      setTimeout(() => {
        successIds.forEach(id => {
          const node = document.getElementById(id);
          if (node) {
            node.style.animation = 'slideOut 0.3s ease';
            setTimeout(() => node.remove(), 280);
          }
        });
        updateMergeBtn();
      }, 600);
    } catch (e) {
      console.error(e);
      selectedFiles.forEach(f => { f.status = 'error'; updateStatus(f.id, 'error', e.message); });
      showToast(e.message, 'error', toastContainer);
    } finally {
      updateMergeBtn();
    }
  }

  function updateStatus(id, status, errorMsg) {
    const el = document.getElementById(id);
    if (!el) return;
    const badge = el.querySelector('.file-status');
    const errorEl = el.querySelector('.file-error');
    badge.className = `file-status status-${status}`;
    const map = { waiting: 'Esperando', uploading: 'Subiendo', success: 'Listo', error: 'Error' };
    badge.textContent = map[status] || status;

    if (status === 'error' && errorMsg) {
      errorEl.textContent = errorMsg;
      errorEl.style.display = 'block';
    } else if (errorEl) {
      errorEl.textContent = '';
      errorEl.style.display = 'none';
    }
  }

  // Inicializar el Theme Switcher
  setupThemeSwitcher();
});
