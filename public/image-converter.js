import { showToast, downloadFile, formatBytes, escapeHtml, isImage, setupThemeSwitcher } from './utils.js';

document.addEventListener('DOMContentLoaded', () => {
  const API_URL = window.location.origin;
  const dropzone = document.getElementById('dropzone');
  const fileInput = document.getElementById('fileInput');
  const convertBtn = document.getElementById('convertBtn');
  const filesContainer = document.getElementById('filesContainer');
  const toastContainer = document.getElementById('toastContainer');
  const formatSelector = document.getElementById('formatSelector');
  const formatButtons = document.querySelectorAll('.format-btn');
  const qualityControl = document.getElementById('qualityControl');
  const qualitySlider = document.getElementById('qualitySlider');
  const qualityValue = document.getElementById('qualityValue');

  let selectedFiles = [];
  let selectedFormat = null;
  let selectedQuality = 90;
  let noFormatsToastShown = false;

  if (dropzone) {
    dropzone.addEventListener('click', () => fileInput.click());
    dropzone.addEventListener('dragover', handleDragOver);
    dropzone.addEventListener('dragleave', handleDragLeave);
    dropzone.addEventListener('drop', handleDrop);
  }
  
  if (fileInput) {
    fileInput.addEventListener('change', handleFileSelect);
  }

  if (convertBtn) {
    convertBtn.addEventListener('click', handleConvert);
  }

  if (formatButtons) {
    formatButtons.forEach(btn => {
      btn.addEventListener('click', () => selectFormat(btn.dataset.format));
    });
  }

  if (qualitySlider) {
    qualitySlider.addEventListener('input', (e) => {
      selectedQuality = e.target.value;
      if (qualityValue) {
        qualityValue.textContent = selectedQuality;
      }
    });
  }

  function handleDragOver(e) {
    e.preventDefault();
    if (dropzone) dropzone.classList.add('drag-over');
  }

  function handleDragLeave() {
    if (dropzone) dropzone.classList.remove('drag-over');
  }

  function handleDrop(e) {
    e.preventDefault();
    if (dropzone) dropzone.classList.remove('drag-over');
    const files = Array.from(e.dataTransfer.files).filter(isImage);
    if (files.length > 0) {
      addFiles(files);
    } else {
      showToast('Solo se permiten archivos de imagen', 'error', toastContainer);
    }
  }

  function handleFileSelect(e) {
    const files = Array.from(e.target.files);
    addFiles(files);
    fileInput.value = '';
  }

  function addFiles(files) {
    files.forEach(file => {
      if (!isImage(file)) {
        showToast(`Archivo no válido: ${file.name}`, 'error', toastContainer);
        return;
      }

      const fileId = `file-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const currentFormat = detectImageFormat(file);
      const fileData = {
        id: fileId,
        file,
        name: file.name,
        size: file.size,
        currentFormat,
        status: 'waiting',
        progress: 0
      };

      selectedFiles.push(fileData);
      renderFileItem(fileData);
    });

    const availableFormats = buildAvailableFormats();
    if (availableFormats.length === 0) {
      if (!noFormatsToastShown) {
        showToast('No hay formatos de salida disponibles para los archivos seleccionados', 'warning', toastContainer);
        noFormatsToastShown = true;
      }
    } else {
      noFormatsToastShown = false;
    }
    const fallbackFormat = updateFormatOptions(availableFormats);
    if (!selectedFormat && fallbackFormat) {
      selectFormat(fallbackFormat, { silent: true });
    } else {
      updateConvertButton();
    }
  }

  function detectImageFormat(file) {
    const ext = file.name.split('.').pop().toLowerCase();
    const formatMap = {
      jpg: 'JPG',
      jpeg: 'JPG',
      png: 'PNG',
      gif: 'GIF',
      webp: 'WEBP',
      tiff: 'TIFF',
      tif: 'TIFF',
      bmp: 'BMP',
      ico: 'ICO',
      svg: 'SVG'
    };
    return formatMap[ext] || ext.toUpperCase();
  }

  function selectFormat(format, options = {}) {
    if (!format) return;

    const { silent = false } = options;
    const availableFormats = buildAvailableFormats();

    if (!availableFormats.includes(format)) {
      if (!silent) {
        if (availableFormats.length === 0) {
          showToast('No hay formatos de salida disponibles para los archivos seleccionados', 'warning', toastContainer);
        } else {
          showToast('Ese formato no está disponible para los archivos añadidos', 'warning', toastContainer);
        }
      }
      return;
    }

    selectedFormat = format;

    formatButtons.forEach(btn => {
      btn.classList.toggle('active', btn.dataset.format === format);
    });

    const supportsQuality = ['jpg', 'jpeg', 'png', 'webp', 'tiff'].includes(format);
    if (qualityControl) {
      qualityControl.style.display = supportsQuality ? 'flex' : 'none';
    }

    updateConvertButton();

    if (!silent) {
      showToast(`Formato seleccionado: ${format.toUpperCase()}`, 'success', toastContainer);
    }
  }

  function buildAvailableFormats() {
    const uniqueFormats = new Set(selectedFiles.map(f => f.currentFormat.toLowerCase()));
    const buttonList = Array.from(formatButtons || []);
    return buttonList
      .map(btn => btn.dataset.format)
      .filter(fmt => !uniqueFormats.has(fmt));
  }

  function updateFormatOptions(availableFormats) {
    if (!formatSelector) return null;

    if (selectedFiles.length === 0) {
      formatSelector.style.display = 'none';
      formatButtons.forEach(btn => {
        btn.classList.remove('active');
        btn.disabled = false;
        btn.classList.remove('disabled');
      });
      selectedFormat = null;
      if (qualityControl) {
        qualityControl.style.display = 'none';
      }
      noFormatsToastShown = false;
      return null;
    }

    formatSelector.style.display = 'block';

    const availableSet = new Set(availableFormats);
    let fallback = null;

    formatButtons.forEach(btn => {
      const fmt = btn.dataset.format;
      const isEnabled = availableSet.has(fmt);
      btn.disabled = !isEnabled;
      btn.classList.toggle('disabled', !isEnabled);
      if (!isEnabled) {
        btn.classList.remove('active');
      } else if (!fallback) {
        fallback = fmt;
      }
    });

    if (selectedFormat && !availableSet.has(selectedFormat)) {
      selectedFormat = null;
      if (qualityControl) {
        qualityControl.style.display = 'none';
      }
    }

    return fallback;
  }

  function renderFileItem(fileData) {
    const fileItem = document.createElement('div');
    fileItem.className = 'file-item';
    fileItem.id = fileData.id;
    fileItem.innerHTML = `
  <div class="file-icon">IMG</div>
      <div class="file-info">
        <div class="file-name">${escapeHtml(fileData.name)}</div>
        <div class="file-meta">
          <span class="file-size">${formatBytes(fileData.size)}</span>
          <span class="file-format-badge">${fileData.currentFormat}</span>
          <span class="file-status status-waiting">Esperando</span>
        </div>
      </div>
      <div class="file-actions"></div>
    `;
    const actionsEl = fileItem.querySelector('.file-actions');
    actionsEl.appendChild(createRemoveButton(fileData.id));
    filesContainer.appendChild(fileItem);
  }

  function createRemoveButton(fileId) {
    const removeBtn = document.createElement('button');
    removeBtn.className = 'btn-remove';
    removeBtn.setAttribute('aria-label', 'Eliminar');
  removeBtn.textContent = 'X';
    removeBtn.addEventListener('click', () => removeFile(fileId));
    return removeBtn;
  }

  function updateFileStatus(fileId, status, data = {}) {
    const fileItem = document.getElementById(fileId);
    if (!fileItem) return;

    const statusEl = fileItem.querySelector('.file-status');
    const actionsEl = fileItem.querySelector('.file-actions');
    if (!statusEl) return;

    statusEl.className = `file-status status-${status}`;
    const statusText = {
      waiting: 'Esperando',
      uploading: 'Subiendo',
      converting: 'Convirtiendo',
      success: 'Listo',
      error: 'Error'
    };
    statusEl.textContent = statusText[status] || status;

    if (status === 'uploading') {
      const progressBar = fileItem.querySelector('.progress-bar');
      if (!progressBar) {
        const fileInfo = fileItem.querySelector('.file-info');
        if (fileInfo) {
          fileInfo.insertAdjacentHTML('beforeend', '<div class="progress-bar"><div class="progress-fill" style="width: 0%"></div></div>');
        }
      }
    }

    if (data.progress !== undefined) {
      const progressFill = fileItem.querySelector('.progress-fill');
      if (progressFill) {
        progressFill.style.width = `${data.progress}%`;
      }
    }

    if (status === 'success' && data.downloadUrl && actionsEl) {
      const formatBadge = fileItem.querySelector('.file-format-badge');
      if (formatBadge && data.format) {
        formatBadge.textContent = `${formatBadge.textContent} → ${data.format.toUpperCase()}`;
        formatBadge.style.background = 'rgba(16, 185, 129, 0.2)';
        formatBadge.style.color = 'var(--success)';
      }

      actionsEl.innerHTML = '';
      const downloadBtn = document.createElement('button');
      downloadBtn.className = 'btn-download';
  downloadBtn.textContent = 'Descargar';
      downloadBtn.addEventListener('click', () => downloadFile(data.downloadUrl, data.outputName));
      actionsEl.appendChild(downloadBtn);
      actionsEl.appendChild(createRemoveButton(fileId));
    }

    if (status === 'error' && data.error) {
      const fileInfo = fileItem.querySelector('.file-info');
      if (fileInfo) {
        const oldError = fileInfo.querySelector('.file-error');
        if (oldError) oldError.remove();

        const errorMsg = document.createElement('div');
        errorMsg.className = 'file-error';
        errorMsg.style.color = 'var(--error)';
        errorMsg.style.fontSize = '0.85rem';
        errorMsg.style.marginTop = '4px';
        errorMsg.textContent = data.error;
        fileInfo.appendChild(errorMsg);
      }
    }
  }

  function removeFile(fileId) {
    selectedFiles = selectedFiles.filter(f => f.id !== fileId);
    const fileItem = document.getElementById(fileId);
    if (fileItem) {
      fileItem.style.animation = 'slideOut 0.3s ease';
      setTimeout(() => fileItem.remove(), 300);
    }

    if (selectedFiles.length === 0 && formatSelector) {
      formatSelector.style.display = 'none';
      selectedFormat = null;
      if (formatButtons) {
        formatButtons.forEach(btn => btn.classList.remove('active'));
      }
      if (qualityControl) {
        qualityControl.style.display = 'none';
      }
    }

    const availableFormats = buildAvailableFormats();
    if (availableFormats.length === 0) {
      if (!noFormatsToastShown) {
        showToast('No hay formatos de salida disponibles para los archivos seleccionados', 'warning', toastContainer);
        noFormatsToastShown = true;
      }
    } else {
      noFormatsToastShown = false;
    }
    const fallbackFormat = updateFormatOptions(availableFormats);
    if (!selectedFormat && fallbackFormat) {
      selectFormat(fallbackFormat, { silent: true });
    } else {
      updateConvertButton();
    }
  }

  function updateConvertButton() {
    const waitingFiles = selectedFiles.filter(f => f.status === 'waiting');
    const availableFormats = buildAvailableFormats();
    if (convertBtn) {
      convertBtn.disabled = waitingFiles.length === 0 || !selectedFormat || !availableFormats.includes(selectedFormat);
    }
  }

  async function handleConvert() {
    const waitingFiles = selectedFiles.filter(f => f.status === 'waiting');
    if (waitingFiles.length === 0 || !selectedFormat || !convertBtn) return;

    convertBtn.disabled = true;
    const formData = new FormData();
    waitingFiles.forEach(fileData => {
      formData.append('files', fileData.file);
    });
    formData.append('format', selectedFormat);
    formData.append('quality', selectedQuality);

    try {
      waitingFiles.forEach(fileData => {
        fileData.status = 'uploading';
        updateFileStatus(fileData.id, 'uploading');
        simulateProgress(fileData.id);
      });

      const response = await fetch(`${API_URL}/convert-image`, {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Error en la conversión');
      }

      const result = await response.json();

      waitingFiles.forEach(fileData => {
        fileData.status = 'converting';
        updateFileStatus(fileData.id, 'converting', { progress: 100 });
      });

      await new Promise(resolve => setTimeout(resolve, 500));

      result.items.forEach((item, index) => {
        const fileData = waitingFiles[index];
        if (!fileData) return;

        fileData.status = item.status;

        if (item.status === 'success') {
          fileData.downloadUrl = item.downloadUrl;
          fileData.outputName = item.outputName;
          updateFileStatus(fileData.id, 'success', {
            downloadUrl: item.downloadUrl,
            outputName: item.outputName,
            format: item.format
          });
        } else {
          fileData.error = item.error;
          updateFileStatus(fileData.id, 'error', {
            error: item.error || 'Error desconocido'
          });
        }
      });

      const successCount = result.items.filter(i => i.status === 'success').length;
      if (successCount > 0) {
        showToast(`${successCount} imagen(es) convertida(s) exitosamente`, 'success', toastContainer);
      }

      const errorCount = result.items.filter(i => i.status === 'error').length;
      if (errorCount > 0) {
        showToast(`${errorCount} imagen(es) con errores`, 'error', toastContainer);
      }

    } catch (error) {
      showToast(error.message, 'error', toastContainer);

      waitingFiles.forEach(fileData => {
        fileData.status = 'error';
        updateFileStatus(fileData.id, 'error', { error: error.message });
      });
    } finally {
      if (convertBtn) {
        convertBtn.disabled = false;
      }
      updateConvertButton();
    }
  }

  function simulateProgress(fileId) {
    let progress = 0;
    const interval = setInterval(() => {
      progress += Math.random() * 15;
      if (progress > 90) progress = 90;

      updateFileStatus(fileId, 'uploading', { progress });

      const fileData = selectedFiles.find(f => f.id === fileId);
      if (!fileData || fileData.status !== 'uploading') {
        clearInterval(interval);
      }
    }, 200);
  }

  setupThemeSwitcher();
});
