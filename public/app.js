import { showToast, downloadFile, formatBytes, escapeHtml, setupThemeSwitcher } from './utils.js';

document.addEventListener('DOMContentLoaded', () => {
  const API_URL = window.location.origin;
  const dropzone = document.getElementById('dropzone');
  const fileInput = document.getElementById('fileInput');
  const convertBtn = document.getElementById('convertBtn');
  const filesContainer = document.getElementById('filesContainer');
  const toastContainer = document.getElementById('toastContainer');

  let selectedFiles = [];

  // Event Listeners
  if (dropzone && fileInput) {
    dropzone.addEventListener('click', () => fileInput.click());
    dropzone.addEventListener('dragover', handleDragOver);
    dropzone.addEventListener('dragleave', handleDragLeave);
    dropzone.addEventListener('drop', handleDrop);
  }
  if (fileInput) fileInput.addEventListener('change', handleFileSelect);
  if (convertBtn) convertBtn.addEventListener('click', handleConvert);

  // Health check al cargar
  checkHealth();

  async function checkHealth() {
    try {
      const res = await fetch(`${API_URL}/health`);
      const data = await res.json();
      if (data.libreoffice !== 'detected') {
        showToast('LibreOffice no detectado. Instálalo para poder convertir archivos.', 'warning');
      }
    } catch (error) {
      showToast('Error al conectar con el servidor', 'error');
    }
  }

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
  const files = Array.from(e.dataTransfer.files);
  addFiles(files);
}

function handleFileSelect(e) {
  const files = Array.from(e.target.files);
  addFiles(files);
  fileInput.value = '';
}

function addFiles(files) {
  const validExtensions = ['doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'odt', 'ods', 'odp'];
  
  files.forEach(file => {
    const ext = file.name.split('.').pop().toLowerCase();
    if (!validExtensions.includes(ext)) {
      showToast(`Extensión no válida: ${file.name}`, 'error', toastContainer);
      return;
    }

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
  actionsEl.innerHTML = '';
  actionsEl.appendChild(createRemoveButton(fileData.id));
  filesContainer.appendChild(fileItem);
}

function updateFileStatus(fileId, status, data = {}) {
  const fileItem = document.getElementById(fileId);
  if (!fileItem) {
    console.error(`Elemento con ID ${fileId} no encontrado`);
    return;
  }

  const statusEl = fileItem.querySelector('.file-status');
  const actionsEl = fileItem.querySelector('.file-actions');
  
  if (!statusEl) {
    console.error(`Status element no encontrado en ${fileId}`);
    return;
  }
  
  statusEl.className = `file-status status-${status}`;
  
  const statusText = {
    waiting: 'Esperando',
    uploading: 'Subiendo',
    converting: 'Convirtiendo',
    success: 'Listo',
    error: 'Error'
  };
  
  statusEl.textContent = statusText[status] || status;

  // Actualizar barra de progreso
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

  // Agregar botón de descarga si está listo
  if (status === 'success' && data.downloadUrl && actionsEl) {
    const downloadBtn = document.createElement('button');
    downloadBtn.className = 'btn-download';
  downloadBtn.textContent = 'Descargar PDF';
    downloadBtn.addEventListener('click', () => downloadFile(data.downloadUrl, data.pdfName));

    actionsEl.innerHTML = ''; // Limpiar acciones previas
    actionsEl.appendChild(downloadBtn);
    actionsEl.appendChild(createRemoveButton(fileId)); // Re-add remove button
  }

  // Mostrar error
  if (status === 'error' && data.error) {
    const fileInfo = fileItem.querySelector('.file-info');
    if (fileInfo) {
      // Remover error previo si existe
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

  function createRemoveButton(fileId) {
    const removeBtn = document.createElement('button');
    removeBtn.className = 'btn-remove';
    removeBtn.setAttribute('aria-label', 'Eliminar');
  removeBtn.textContent = 'X';
    removeBtn.addEventListener('click', () => removeFile(fileId));
    return removeBtn;
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
    // Cambiar todos a "subiendo" inmediatamente
    waitingFiles.forEach(fileData => {
      fileData.status = 'uploading';
      updateFileStatus(fileData.id, 'uploading');
      simulateProgress(fileData.id);
    });

    const response = await fetch(`${API_URL}/convert`, {
      method: 'POST',
      body: formData
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Error en la conversión');
    }

    const result = await response.json();
    
    // Cuando llega la respuesta, primero marcar como "convirtiendo"
    waitingFiles.forEach(fileData => {
      fileData.status = 'converting';
      updateFileStatus(fileData.id, 'converting', { progress: 100 });
    });

    // Pequeño delay para que se vea el estado "convirtiendo"
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Actualizar con los resultados finales
    result.items.forEach((item, index) => {
      const fileData = waitingFiles[index];
      if (!fileData) return;

      fileData.status = item.status;
      
      if (item.status === 'success') {
        fileData.downloadUrl = item.downloadUrl;
        fileData.pdfName = item.pdfName;
        updateFileStatus(fileData.id, 'success', {
          downloadUrl: item.downloadUrl,
          pdfName: item.pdfName
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

  } catch (error) {
    console.error('Error:', error);
    showToast(error.message, 'error', toastContainer);
    
    waitingFiles.forEach(fileData => {
      fileData.status = 'error';
      updateFileStatus(fileData.id, 'error', { error: error.message });
    });
  } finally {
    convertBtn.disabled = false;
    updateConvertButton(); // Ensure button state is correct after conversion attempts
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

  // Inicializar el Theme Switcher
  setupThemeSwitcher();
});