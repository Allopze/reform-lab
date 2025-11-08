import { showToast, escapeHtml, setupThemeSwitcher } from './utils.js';

setupThemeSwitcher();

const dropzone = document.getElementById('dropzone');
const fileInput = document.getElementById('fileInput');
const textInput = document.getElementById('textInput');
const optionsSelector = document.getElementById('optionsSelector');
const generateBtn = document.getElementById('generateBtn');
const qrResult = document.getElementById('qrResult');
const qrCanvasWrapper = document.getElementById('qrCanvasWrapper');
const qrCanvas = document.getElementById('qrCanvas');
const qrSvgWrapper = document.getElementById('qrSvgWrapper');
const qrSvgContainer = document.getElementById('qrSvgContainer');
const qrActions = document.getElementById('qrActions');
const downloadBtn = document.getElementById('downloadBtn');
const downloadBtnLabel = document.getElementById('downloadBtnLabel');
const clearBtn = document.getElementById('clearBtn');
const qrSizeInput = document.getElementById('qrSize');
const qrSizeValue = document.getElementById('qrSizeValue');
const qrColorInput = document.getElementById('qrColor');
const qrBackgroundInput = document.getElementById('qrBackground');
const qrFormatButtons = document.getElementById('qrFormatButtons');

let currentFormat = 'png';
let currentContent = null;
let lastSvgString = '';

// Detectar tipo de contenido automáticamente
function detectContentType(content) {
  // URL
  if (/^https?:\/\/.+/i.test(content)) {
    return { type: 'url', data: content, label: 'URL' };
  }
  
  // Email
  if (/^mailto:/i.test(content)) {
    return { type: 'email', data: content, label: 'Email' };
  }
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(content)) {
    return { type: 'email', data: `mailto:${content}`, label: 'Email' };
  }
  
  // WiFi
  if (/^WIFI:/i.test(content)) {
    return { type: 'wifi', data: content, label: 'WiFi' };
  }
  
  // Teléfono
  if (/^tel:/i.test(content)) {
    return { type: 'phone', data: content, label: 'Teléfono' };
  }
  if (/^\+?[\d\s\-()]{8,}$/.test(content.trim())) {
    return { type: 'phone', data: `tel:${content.replace(/\s+/g, '')}`, label: 'Teléfono' };
  }
  
  // Texto simple
  return { type: 'text', data: content, label: 'Texto' };
}

// Actualizar valor del slider
qrSizeInput.addEventListener('input', () => {
  qrSizeValue.textContent = qrSizeInput.value;
});

// Formato PNG/SVG
qrFormatButtons.addEventListener('click', (e) => {
  const btn = e.target.closest('.quality-option');
  if (!btn) return;
  const fmt = btn.dataset.format;
  if (!fmt || fmt === currentFormat) return;
  currentFormat = fmt;
  qrFormatButtons.querySelectorAll('.quality-option').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  downloadBtnLabel.textContent = `Descargar ${currentFormat.toUpperCase()}`;
});

// Drag & Drop
dropzone.addEventListener('dragover', (e) => {
  e.preventDefault();
  dropzone.classList.add('dragover');
});

dropzone.addEventListener('dragleave', () => {
  dropzone.classList.remove('dragover');
});

dropzone.addEventListener('drop', async (e) => {
  e.preventDefault();
  dropzone.classList.remove('dragover');
  
  // Intentar obtener texto primero
  const text = e.dataTransfer.getData('text/plain');
  if (text && text.trim()) {
    handleTextInput(text.trim());
    return;
  }
  
  // Si no hay texto, buscar archivos
  const files = Array.from(e.dataTransfer.files);
  if (files.length > 0) {
    handleFileInput(files[0]);
  }
});

// Click en dropzone
dropzone.addEventListener('click', () => {
  fileInput.click();
});

// Selección de archivo
fileInput.addEventListener('change', () => {
  if (fileInput.files.length > 0) {
    handleFileInput(fileInput.files[0]);
  }
});

// Paste event
document.addEventListener('paste', (e) => {
  // Solo procesar si no estamos en un input o textarea
  if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
  
  const text = e.clipboardData.getData('text/plain');
  if (text && text.trim()) {
    e.preventDefault();
    handleTextInput(text.trim());
  }
});

// Manejar entrada de texto
async function handleTextInput(text) {
  const detected = detectContentType(text);
  currentContent = detected.data;
  
  showToast(`Detectado: ${detected.label}`, 'success');
  
  // Mostrar opciones y botón
  optionsSelector.style.display = 'block';
  generateBtn.style.display = 'block';
  dropzone.style.opacity = '0.5';
  dropzone.style.pointerEvents = 'none';
  
  // Auto-generar
  await generateQR();
}

// Manejar archivo
async function handleFileInput(file) {
  try {
    generateBtn.disabled = true;
    generateBtn.innerHTML = '<span>Subiendo archivo...</span>';
    generateBtn.style.display = 'block';
    
    const formData = new FormData();
    formData.append('file', file);
    
    const uploadResp = await fetch('/qr/upload', {
      method: 'POST',
      body: formData
    });
    
    if (!uploadResp.ok) {
      const error = await uploadResp.json();
      throw new Error(error.message || 'Error al subir archivo');
    }
    
    const uploadData = await uploadResp.json();
    currentContent = uploadData.url;
    
    const fileType = file.type.startsWith('image/') ? 'Imagen' :
                     file.type.startsWith('audio/') ? 'Audio' :
                     file.type === 'application/pdf' ? 'PDF' : 'Archivo';
    
    showToast(`Detectado: ${fileType} - ${file.name}`, 'success');
    
    // Mostrar opciones y botón
    optionsSelector.style.display = 'block';
    generateBtn.disabled = false;
    generateBtn.innerHTML = '<span>Generar Código QR</span>';
    dropzone.style.opacity = '0.5';
    dropzone.style.pointerEvents = 'none';
    
    // Auto-generar
    await generateQR();
    
  } catch (error) {
    console.error('Error:', error);
    showToast(error.message || 'Error al procesar archivo', 'error');
    generateBtn.disabled = false;
    generateBtn.innerHTML = '<span>Generar Código QR</span>';
  }
}

// Generar QR
async function generateQR() {
  if (!currentContent) return;
  
  try {
    const size = parseInt(qrSizeInput.value);
    const color = qrColorInput.value;
    const background = qrBackgroundInput.value;
    
    generateBtn.disabled = true;
    generateBtn.innerHTML = '<span>Generando QR...</span>';
    
    const response = await fetch('/qr/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        data: currentContent,
        size,
        color,
        background,
        format: currentFormat
      })
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Error al generar QR');
    }
    
    // Reset previous preview
    if (qrSvgContainer) {
      qrSvgContainer.innerHTML = '';
    }
    lastSvgString = '';

    if (currentFormat === 'svg') {
      const svgText = await response.text();
      lastSvgString = svgText;
      qrCanvasWrapper.style.display = 'none';
      qrSvgWrapper.style.display = 'block';
      qrActions.style.display = 'flex';
      qrResult.style.display = 'block';
      qrSvgContainer.innerHTML = svgText;
      
      const svgEl = qrSvgContainer.querySelector('svg');
      if (svgEl) {
        svgEl.setAttribute('width', String(size));
        svgEl.setAttribute('height', String(size));
        svgEl.style.maxWidth = '100%';
        svgEl.style.height = 'auto';
        svgEl.style.borderRadius = '12px';
      }
      downloadBtnLabel.textContent = 'Descargar SVG';
      showToast('Código QR (SVG) generado', 'success');
    } else {
      const blob = await response.blob();
      const img = new Image();
      img.onload = () => {
        qrCanvas.width = size;
        qrCanvas.height = size;
        const ctx = qrCanvas.getContext('2d');
        ctx.drawImage(img, 0, 0);
        qrSvgWrapper.style.display = 'none';
        qrCanvasWrapper.style.display = 'block';
        qrActions.style.display = 'flex';
        qrResult.style.display = 'block';
        downloadBtnLabel.textContent = 'Descargar PNG';
        showToast('Código QR (PNG) generado', 'success');
      };
      img.src = URL.createObjectURL(blob);
    }
    
    generateBtn.disabled = false;
    generateBtn.innerHTML = '<span>Generar Código QR</span>';
    
  } catch (error) {
    console.error('Error:', error);
    showToast(error.message || 'Error al generar QR', 'error');
    generateBtn.disabled = false;
    generateBtn.innerHTML = '<span>Generar Código QR</span>';
  }
}

// Click en botón generar
generateBtn.addEventListener('click', generateQR);

// Descargar QR
downloadBtn.addEventListener('click', () => {
  const ts = Date.now();
  if (currentFormat === 'svg' && lastSvgString) {
    const blob = new Blob([lastSvgString], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.download = `qr-code-${ts}.svg`;
    link.href = url;
    link.click();
    URL.revokeObjectURL(url);
    showToast('Código QR (SVG) descargado', 'success');
  } else {
    const link = document.createElement('a');
    link.download = `qr-code-${ts}.png`;
    link.href = qrCanvas.toDataURL('image/png');
    link.click();
    showToast('Código QR (PNG) descargado', 'success');
  }
});

// Limpiar y crear nuevo QR
clearBtn.addEventListener('click', () => {
  // Reset state
  currentContent = null;
  lastSvgString = '';
  fileInput.value = '';
  
  // Clear canvas
  const ctx = qrCanvas.getContext('2d');
  ctx.clearRect(0, 0, qrCanvas.width, qrCanvas.height);
  
  // Hide results and options
  qrCanvasWrapper.style.display = 'none';
  qrSvgWrapper.style.display = 'none';
  qrActions.style.display = 'none';
  qrResult.style.display = 'none';
  optionsSelector.style.display = 'none';
  generateBtn.style.display = 'none';
  
  // Restore dropzone
  dropzone.style.opacity = '1';
  dropzone.style.pointerEvents = 'auto';
  
  showToast('Listo para generar un nuevo QR', 'info');
});
