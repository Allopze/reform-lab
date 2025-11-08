import { showToast, downloadFile, formatBytes, escapeHtml, isPdf, setupThemeSwitcher } from './utils.js';

document.addEventListener('DOMContentLoaded', () => {
  const API_URL = window.location.origin;
  const dropzone = document.getElementById('dropzone');
  const fileInput = document.getElementById('fileInput');
  const convertBtn = document.getElementById('convertBtn');
  const filesContainer = document.getElementById('filesContainer');
  const toastContainer = document.getElementById('toastContainer');

  let selectedFiles = [];

  if (dropzone && fileInput) {
    dropzone.addEventListener('click', () => fileInput.click());
    dropzone.addEventListener('dragover', handleDragOver);
    dropzone.addEventListener('dragleave', handleDragLeave);
    dropzone.addEventListener('drop', handleDrop);
  }
  if (fileInput) fileInput.addEventListener('change', handleFileSelect);
  if (convertBtn) convertBtn.addEventListener('click', handleConvert);

  function handleDragOver(e) {
    e.preventDefault();
    dropzone.classList.add('drag-over');
  }

  function handleDragLeave() {
    dropzone.classList.remove('drag-over');
  }

  function handleDrop(e) {
    e.preventDefault();
    dropzone.classList.remove('drag-over');
    const files = Array.from(e.dataTransfer.files).filter(isPdf);
    if (files.length > 0) {
      addFiles(files);
    } else {
      showToast('Solo se permiten archivos PDF', 'error', toastContainer);
    }
  }

  function handleFileSelect(e) {
    const files = Array.from(e.target.files).filter(isPdf);
    if (files.length > 0) {
      addFiles(files);
    } else {
      showToast('Solo se permiten archivos PDF', 'error', toastContainer);
    }
    fileInput.value = '';
  }

  function addFiles(files) {
    files.forEach(file => {
      const fileId = `file-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const fileData = {
        id: fileId,
        file: file,
        name: file.name,
        size: file.size,
        status: 'waiting',
        progress: 0
      };

      selectedFiles.push(fileData);
      renderFileItem(fileData);
    });

    updateConvertButton();
  }

  function renderFileItem(fileData) {
    const fileItem = document.createElement('div');
    fileItem.className = 'file-item';
    fileItem.id = fileData.id;
    fileItem.innerHTML = `
    <div class="file-icon">PDF</div>
      <div class="file-info">
        <div class="file-name">${escapeHtml(fileData.name)}</div>
        <div class="file-meta">
          <span class="file-size">${formatBytes(fileData.size)}</span>
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
    const fileInfo = fileItem.querySelector('.file-info');
    
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
      const downloadBtn = document.createElement('button');
      downloadBtn.className = 'btn-download';
  downloadBtn.textContent = 'Descargar DOCX';
      downloadBtn.addEventListener('click', () => downloadFile(data.downloadUrl, data.docxName));

      actionsEl.innerHTML = '';
      actionsEl.appendChild(downloadBtn);
      actionsEl.appendChild(createRemoveButton(fileId));
    }

    const existingBlankInfo = fileItem.querySelector('.file-blank-info');
    if (existingBlankInfo) existingBlankInfo.remove();
    const existingShapeInfo = fileItem.querySelector('.file-shape-info');
    if (existingShapeInfo) existingShapeInfo.remove();

    if (status === 'success' && data.blankPagesRemoved > 0 && fileInfo) {
      const blankInfo = document.createElement('div');
      blankInfo.className = 'file-blank-info';
      blankInfo.style.color = 'var(--success)';
      blankInfo.style.fontSize = '0.85rem';
      blankInfo.style.marginTop = '4px';
      const count = data.blankPagesRemoved;
      blankInfo.textContent = `Se eliminaron ${count} página${count === 1 ? '' : 's'} en blanco`;
      fileInfo.appendChild(blankInfo);
    }

    if (status === 'success' && data.shapesRemoved > 0 && fileInfo) {
      const shapeInfo = document.createElement('div');
      shapeInfo.className = 'file-shape-info';
      shapeInfo.style.color = 'var(--success)';
      shapeInfo.style.fontSize = '0.85rem';
      shapeInfo.style.marginTop = '4px';
      const count = data.shapesRemoved;
      shapeInfo.textContent = `Se eliminaron ${count} imagen${count === 1 ? '' : 'es'} de fondo`;
      fileInfo.appendChild(shapeInfo);
    }

    if (status === 'error' && data.error) {
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
    updateConvertButton();
  }

  function updateConvertButton() {
    const waitingFiles = selectedFiles.filter(f => f.status === 'waiting');
    if (convertBtn) convertBtn.disabled = waitingFiles.length === 0;
  }

  async function handleConvert() {
    const waitingFiles = selectedFiles.filter(f => f.status === 'waiting');
    if (waitingFiles.length === 0) return;

    convertBtn.disabled = true;
    const formData = new FormData();
    
    waitingFiles.forEach(fileData => {
      formData.append('files', fileData.file);
    });

    try {
      waitingFiles.forEach(fileData => {
        fileData.status = 'uploading';
        updateFileStatus(fileData.id, 'uploading');
        simulateProgress(fileData.id);
      });

      const response = await fetch(`${API_URL}/pdf-to-office`, {
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
          fileData.docxName = item.docxName;
          fileData.blankPagesRemoved = item.blankPagesRemoved || 0;
          fileData.shapesRemoved = item.shapesRemoved || 0;
          updateFileStatus(fileData.id, 'success', {
            downloadUrl: item.downloadUrl,
            docxName: item.docxName,
            blankPagesRemoved: item.blankPagesRemoved || 0,
            shapesRemoved: item.shapesRemoved || 0
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
        showToast(`${successCount} archivo(s) convertido(s) exitosamente`, 'success', toastContainer);
      }
      
      const errorCount = result.items.filter(i => i.status === 'error').length;
      if (errorCount > 0) {
        showToast(`${errorCount} archivo(s) con errores`, 'error', toastContainer);
      }

      const blankPagesRemovedTotal = result.items.reduce((sum, item) => sum + (item.blankPagesRemoved || 0), 0);
      if (blankPagesRemovedTotal > 0) {
        showToast(`Se eliminaron ${blankPagesRemovedTotal} página(s) en blanco`, 'info', toastContainer);
      }

      const shapesRemovedTotal = result.items.reduce((sum, item) => sum + (item.shapesRemoved || 0), 0);
      if (shapesRemovedTotal > 0) {
        showToast(`Se eliminaron ${shapesRemovedTotal} imagen(es) de fondo`, 'info', toastContainer);
      }

    } catch (error) {
      console.error('Error:', error);
      showToast(error.message, 'error', toastContainer);
      
      waitingFiles.forEach(fileData => {
        fileData.status = 'error';
        updateFileStatus(fileData.id, 'error', { error: error.message });
      });
    } finally {
      convertBtn.disabled = false;
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
