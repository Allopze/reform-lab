import { showToast, formatBytes, escapeHtml, setupThemeSwitcher } from './utils.js';

document.addEventListener('DOMContentLoaded', () => {
  setupThemeSwitcher();

  const dropzone = document.getElementById('dropzone');
  const fileInput = document.getElementById('fileInput');
  const filesContainer = document.getElementById('filesContainer');
  const videoBtn = document.getElementById('videoBtn');
  const formatSelector = document.getElementById('formatSelector');
  const formatButtons = Array.from(document.querySelectorAll('.format-btn'));
  const toastContainer = document.getElementById('toastContainer');

  let selectedFiles = [];
  let selectedFormat = 'mp4';

  if (formatSelector) {
    formatSelector.style.display = 'none';
  }

  // Dropzone
  if (dropzone && fileInput) {
    dropzone.addEventListener('click', () => fileInput.click());
    dropzone.addEventListener('dragover', (e) => { e.preventDefault(); dropzone.classList.add('drag-over'); });
    dropzone.addEventListener('dragleave', () => dropzone.classList.remove('drag-over'));
    dropzone.addEventListener('drop', (e) => {
      e.preventDefault();
      dropzone.classList.remove('drag-over');
      const files = Array.from(e.dataTransfer.files).filter(isVideo);
      if (!files.length) {
        showToast('Solo se aceptan archivos de video', 'error', toastContainer);
        return;
      }
      addFiles(files);
    });
  }

  if (fileInput) {
    fileInput.addEventListener('change', (e) => {
      const files = Array.from(e.target.files).filter(isVideo);
      if (!files.length) {
        showToast('Solo se aceptan archivos de video', 'error', toastContainer);
        return;
      }
      addFiles(files);
      fileInput.value = '';
    });
  }

  formatButtons
    .filter(btn => !btn.disabled)
    .forEach(btn => {
      btn.addEventListener('click', () => {
        const fmt = btn.dataset.format;
        if (!fmt) return;
        selectedFormat = fmt;
        formatButtons.forEach(b => b.classList.toggle('active', b === btn));
      });
    });


  if (videoBtn) {
    videoBtn.addEventListener('click', handleConvert);
  }

  function addFiles(files) {
    files.forEach(file => {
      const id = `v-${Date.now()}-${Math.random().toString(36).slice(2,8)}`;
      const item = { id, file, name: file.name, size: file.size, status: 'waiting' };
      selectedFiles.push(item);
      renderItem(item);
    });
    if (formatSelector) {
      formatSelector.style.display = selectedFiles.length ? 'block' : 'none';
    }
    updateBtn();
  }

  function renderItem(item) {
    const div = document.createElement('div');
    div.className = 'file-item';
    div.id = item.id;
    div.innerHTML = `
      <div class="file-icon">VID</div>
      <div class="file-info">
        <div class="file-name">${escapeHtml(item.name)}</div>
        <div class="file-meta">
          <span class="file-size">${formatBytes(item.size)}</span>
          <span class="file-status status-waiting">Esperando</span>
        </div>
      </div>
      <div class="file-actions"></div>`;

    const actions = div.querySelector('.file-actions');
    actions.appendChild(createRemoveButton(item.id));
    filesContainer.appendChild(div);
  }

  function removeFile(id) {
    selectedFiles = selectedFiles.filter(f => f.id !== id);
    const el = document.getElementById(id);
    if (el) { el.style.animation = 'slideOut 0.3s ease'; setTimeout(() => el.remove(), 300); }
    if (formatSelector) {
      formatSelector.style.display = selectedFiles.length ? 'block' : 'none';
    }
    updateBtn();
  }

  function createRemoveButton(id) {
    const btn = document.createElement('button');
    btn.className = 'btn-remove';
    btn.type = 'button';
    btn.setAttribute('aria-label', 'Eliminar');
    btn.textContent = 'X';
    btn.addEventListener('click', () => removeFile(id));
    return btn;
  }

  function updateBtn() {
    const hasWaiting = selectedFiles.some(f => f.status === 'waiting');
    if (videoBtn) videoBtn.disabled = !hasWaiting;
  }

  function setStatus(id, status, text) {
    const el = document.getElementById(id);
    if (!el) return;
    const statusEl = el.querySelector('.file-status');
    if (!statusEl) return;
    statusEl.className = `file-status status-${status}`;
    statusEl.textContent = text || status;
  }

  async function handleConvert() {
    const waiting = selectedFiles.filter(f => f.status === 'waiting');
    if (!waiting.length) return;

    videoBtn.disabled = true;
    try {
      // Mark all as processing
      waiting.forEach(item => {
        item.status = 'processing';
        setStatus(item.id, 'converting', 'Procesando...');
      });

  const form = new FormData();
  form.append('format', selectedFormat);
  waiting.forEach(item => form.append('files', item.file, item.name));

      const resp = await fetch('/reform-video/compress', { method: 'POST', body: form });
      if (!resp.ok) {
        const err = await resp.json().catch(() => ({}));
        throw new Error(err.message || `Error ${resp.status}`);
      }
      const data = await resp.json();

      // Render results aligned by index
      (data.items || []).forEach((item, idx) => {
        const src = waiting[idx];
        if (!src) return;
        const row = document.getElementById(src.id);
        if (!row) return;
        const actions = row.querySelector('.file-actions');
        if (item.status === 'success') {
          const fmtLabel = item.format ? item.format.toUpperCase() : '';
          const pipelineLabel = item.pipeline ? ` (${item.pipeline})` : '';
          const statusLabel = fmtLabel ? `Listo · ${fmtLabel}${pipelineLabel}` : `Listo${pipelineLabel}`;
          setStatus(src.id, 'success', statusLabel.trim());
          if (actions) {
            actions.innerHTML = '';
            const downloadLink = document.createElement('a');
            downloadLink.className = 'btn-download';
            downloadLink.href = item.downloadUrl;
            downloadLink.download = item.outputName || `${src.name.split('.').shift() || 'video'}_reformed.${selectedFormat}`;
            downloadLink.textContent = item.outputName || 'Descargar';
            actions.appendChild(downloadLink);
            actions.appendChild(createRemoveButton(src.id));
          }
          src.status = 'done';
        } else {
          setStatus(src.id, 'error', item.error || 'Error');
          src.status = 'error';
        }
      });

      // Cleanup processed items from the selection
      selectedFiles = selectedFiles.filter(f => f.status === 'waiting');
      showToast('Conversión completada', 'success', toastContainer);
    } catch (e) {
      console.error(e);
      waiting.forEach(item => {
        item.status = 'error';
        setStatus(item.id, 'error', e.message || 'Error');
      });
      showToast(e.message || 'Error al convertir video', 'error', toastContainer);
    } finally {
      updateBtn();
    }
  }

  function isVideo(file) {
    if (!file) return false;
    const type = (file.type || '').toLowerCase();
    if (type.startsWith('video/')) return true;
    const ext = (file.name.split('.').pop() || '').toLowerCase();
    return ['mp4','mov','webm','mkv','avi'].includes(ext);
  }
});
