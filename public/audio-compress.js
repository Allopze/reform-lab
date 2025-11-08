import { showToast, downloadFile, formatBytes, escapeHtml, setupThemeSwitcher } from './utils.js';

document.addEventListener('DOMContentLoaded', () => {
  setupThemeSwitcher();

  const dropzone = document.getElementById('dropzone');
  const fileInput = document.getElementById('fileInput');
  const filesContainer = document.getElementById('filesContainer');
  const compressBtn = document.getElementById('compressBtn');
  const formatButtons = Array.from(document.querySelectorAll('.format-btn'));
  const compressionControls = document.getElementById('compressionControls');
  const bitrateControl = document.getElementById('bitrateControl');
  const bitrateSlider = document.getElementById('bitrateSlider');
  const bitrateValue = document.getElementById('bitrateValue');
  const toastContainer = document.getElementById('toastContainer');
  const API_URL = window.location.origin;

  let selectedFiles = [];
  let selectedFormat = 'mp3';
  let selectedBitrate = 128;
  let supported = null; // dynamic ffmpeg capabilities

  // Fetch dynamic capabilities
  fetch(`${API_URL}/reform-audio/capabilities`).then(r => r.json()).then(json => {
    supported = json?.support || null;
    applyCapabilities();
  }).catch(() => {
    supported = null; // fallback: no filtering
  });

  // Dropzone events
  if (dropzone && fileInput) {
    dropzone.addEventListener('click', () => fileInput.click());
    dropzone.addEventListener('dragover', (e) => { e.preventDefault(); dropzone.classList.add('drag-over'); });
    dropzone.addEventListener('dragleave', () => dropzone.classList.remove('drag-over'));
    dropzone.addEventListener('drop', (e) => {
      e.preventDefault();
      dropzone.classList.remove('drag-over');
      const files = Array.from(e.dataTransfer.files).filter(isAudio);
      if (!files.length) {
        showToast('Solo se aceptan archivos de audio', 'error', toastContainer);
        return;
      }
      addFiles(files);
    });
  }

  if (fileInput) {
    fileInput.addEventListener('change', (e) => {
      const files = Array.from(e.target.files).filter(isAudio);
      if (!files.length) {
        showToast('Solo se aceptan archivos de audio', 'error', toastContainer);
        return;
      }
      addFiles(files);
      fileInput.value = '';
    });
  }

  // Format selection
  formatButtons.forEach(btn => btn.addEventListener('click', () => selectFormat(btn.dataset.format)));

  // Bitrate slider
  if (bitrateSlider) {
    bitrateSlider.addEventListener('input', (e) => {
      selectedBitrate = parseInt(e.target.value, 10);
      if (bitrateValue) bitrateValue.textContent = `${selectedBitrate} kbps`;
    });
  }

  // Compress action
  if (compressBtn) {
    compressBtn.addEventListener('click', async () => {
      const waiting = selectedFiles.filter(f => f.status === 'waiting');
      if (!waiting.length) {
        showToast('Agrega al menos un audio', 'warning', toastContainer);
        return;
      }
      await compressAudio(waiting);
    });
  }

  function addFiles(files) {
    files.forEach(file => {
      const id = `ac-${Date.now()}-${Math.random().toString(36).slice(2,8)}`;
      const item = { id, file, name: file.name, size: file.size, status: 'waiting' };
      selectedFiles.push(item);
      renderItem(item);
    });
    updateBtn();
    // Show controls once there is at least one file
    if (compressionControls) compressionControls.style.display = selectedFiles.length ? 'block' : 'none';
    // Ensure a supported format is selected
    applyCapabilities();
    ensureSelectedFormat();
  }

  function renderItem(item) {
    const div = document.createElement('div');
    div.className = 'file-item';
    div.id = item.id;
    div.innerHTML = `
      <div class="file-icon">AUD</div>
      <div class="file-info">
        <div class="file-name">${escapeHtml(item.name)}</div>
        <div class="file-meta">
          <span class="file-size">${formatBytes(item.size)}</span>
          <span class="file-status status-waiting">Esperando</span>
        </div>
      </div>
      <div class="file-actions">
        <button class="btn-remove" aria-label="Eliminar">X</button>
      </div>`;

    div.querySelector('.btn-remove').addEventListener('click', () => removeFile(item.id));
    filesContainer.appendChild(div);
  }

  function removeFile(id) {
    selectedFiles = selectedFiles.filter(f => f.id !== id);
    const el = document.getElementById(id);
    if (el) { el.style.animation = 'slideOut 0.3s ease'; setTimeout(() => el.remove(), 300); }
    updateBtn();
  }

  function updateBtn() {
    const hasWaiting = selectedFiles.some(f => f.status === 'waiting');
    if (compressBtn) compressBtn.disabled = !hasWaiting;
  }

  function isAudio(file) {
    if (!file) return false;
    const type = file.type?.toLowerCase() || '';
    if (type.startsWith('audio/')) return true;
    const ext = file.name.split('.').pop().toLowerCase();
    return ['mp3','wav','m4a','aac','ogg','opus','flac','oga','webm'].includes(ext);
  }

  function selectFormat(fmt) {
    if (!fmt) return;
    if (supported && supported[fmt] === false) return; // prevent selecting unsupported
    selectedFormat = fmt;
    formatButtons.forEach(btn => btn.classList.toggle('active', btn.dataset.format === fmt));
    const lossy = ['mp3','m4a','aac','ogg','opus'].includes(fmt);
    if (bitrateControl) bitrateControl.style.display = lossy ? 'flex' : 'none';
  }

  function applyCapabilities() {
    if (!supported) return;
    formatButtons.forEach(btn => {
      const fmt = btn.dataset.format;
      const ok = supported[fmt] !== false; // default true if missing
      btn.disabled = !ok;
      btn.classList.toggle('disabled', !ok);
      if (!ok && btn.classList.contains('active')) btn.classList.remove('active');
    });
  }

  function ensureSelectedFormat() {
    if (supported && supported[selectedFormat] === false) {
      const firstEnabled = formatButtons.find(b => !b.disabled)?.dataset.format;
      if (firstEnabled) selectFormat(firstEnabled);
    }
  }

  function setStatus(id, status, data = {}) {
    const el = document.getElementById(id);
    if (!el) return;
    const statusEl = el.querySelector('.file-status');
    if (statusEl) {
      statusEl.className = `file-status status-${status}`;
      const map = { waiting: 'Esperando', uploading: 'Subiendo', processing: 'Procesando', success: 'Listo', error: 'Error' };
      statusEl.textContent = map[status] || status;
    }
    if (data.progress !== undefined) {
      let bar = el.querySelector('.progress-bar');
      if (!bar) {
        const info = el.querySelector('.file-info');
        if (info) info.insertAdjacentHTML('beforeend', '<div class="progress-bar"><div class="progress-fill" style="width:0%"></div></div>');
        bar = el.querySelector('.progress-bar');
      }
      const fill = el.querySelector('.progress-fill');
      if (fill) fill.style.width = `${data.progress}%`;
    }
    if (status === 'success' && data.downloadUrl) {
      const actions = el.querySelector('.file-actions');
      if (actions) {
        actions.innerHTML = '';
        const dl = document.createElement('button');
        dl.className = 'btn-download';
        dl.textContent = 'Descargar';
        dl.addEventListener('click', () => downloadFile(data.downloadUrl, data.outputName || `audio.${selectedFormat}`));
        actions.appendChild(dl);
        const rm = document.createElement('button');
        rm.className = 'btn-remove';
        rm.textContent = 'X';
        rm.addEventListener('click', () => removeFile(data.id));
        actions.appendChild(rm);
      }
    }
    if (status === 'error' && data.error) {
      const info = el.querySelector('.file-info');
      if (info) {
        const old = info.querySelector('.file-error');
        if (old) old.remove();
        const err = document.createElement('div');
        err.className = 'file-error';
        err.style.color = 'var(--error)';
        err.style.fontSize = '0.85rem';
        err.style.marginTop = '4px';
        err.textContent = data.error;
        info.appendChild(err);
      }
    }
  }

  async function compressAudio(waiting) {
    try {
      if (compressBtn) compressBtn.disabled = true;

      const fd = new FormData();
      waiting.forEach(w => fd.append('files', w.file));
      fd.append('format', selectedFormat);
      fd.append('bitrate', String(selectedBitrate));

      waiting.forEach(w => { w.status = 'uploading'; setStatus(w.id, 'uploading'); simulateProgress(w.id); });

      const resp = await fetch(`${API_URL}/reform-audio/compress`, { method: 'POST', body: fd });
      const json = await resp.json().catch(() => ({ items: [] }));
      if (!resp.ok) throw new Error(json.message || 'Error en la compresión');

      waiting.forEach(w => { w.status = 'processing'; setStatus(w.id, 'processing', { progress: 100 }); });
      await new Promise(r => setTimeout(r, 250));

      json.items.forEach((it, idx) => {
        const w = waiting[idx];
        if (!w) return;
        if (it.status === 'success') {
          w.status = 'success';
          setStatus(w.id, 'success', { id: w.id, downloadUrl: it.downloadUrl, outputName: it.outputName });
        } else {
          w.status = 'error';
          setStatus(w.id, 'error', { error: it.error || 'Error desconocido' });
        }
      });

      const ok = json.items.filter(i => i.status === 'success').length;
      const ko = json.items.filter(i => i.status === 'error').length;
      if (ok) showToast(`${ok} audio(s) comprimido(s)`, 'success', toastContainer);
      if (ko) showToast(`${ko} audio(s) con errores`, 'error', toastContainer);

    } catch (e) {
      showToast(e.message || 'Error inesperado', 'error', toastContainer);
      waiting.forEach(w => setStatus(w.id, 'error', { error: e.message }));
    } finally {
      if (compressBtn) compressBtn.disabled = false;
      updateBtn();
    }
  }

  function simulateProgress(id) {
    let p = 0;
    const iv = setInterval(() => {
      p += Math.random() * 18;
      if (p > 90) p = 90;
      setStatus(id, 'uploading', { progress: p });
      const f = selectedFiles.find(x => x.id === id);
      if (!f || f.status !== 'uploading') clearInterval(iv);
    }, 200);
  }
});
