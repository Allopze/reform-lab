import { showToast, downloadFile, formatBytes, escapeHtml, setupThemeSwitcher } from './utils.js';

document.addEventListener('DOMContentLoaded', () => {
	setupThemeSwitcher();

	const dropzone = document.getElementById('dropzone');
	const fileInput = document.getElementById('fileInput');
	const filesContainer = document.getElementById('filesContainer');
	const audioBtn = document.getElementById('audioBtn');
	const formatSelector = document.getElementById('formatSelector');
	const formatButtons = document.querySelectorAll('.format-btn');
	const bitrateControl = document.getElementById('bitrateControl');
	const bitrateSlider = document.getElementById('bitrateSlider');
	const bitrateValue = document.getElementById('bitrateValue');
	const API_URL = window.location.origin;
	const toastContainer = document.getElementById('toastContainer');

	let selectedFiles = [];
	let selectedFormat = null;
	let selectedBitrate = 128;
		let supported = null; // dynamic ffmpeg capabilities

		// Fetch dynamic capabilities once
		fetch(`${API_URL}/reform-audio/capabilities`).then(r => r.json()).then(json => {
			supported = json?.support || null;
			// Apply immediately if buttons are present
			applyCapabilities();
		}).catch(() => { supported = null; });

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

	if (formatButtons && formatButtons.length) {
		formatButtons.forEach(btn => btn.addEventListener('click', () => selectFormat(btn.dataset.format)));
	}

	if (bitrateSlider) {
		bitrateSlider.addEventListener('input', (e) => {
			selectedBitrate = parseInt(e.target.value, 10);
			if (bitrateValue) bitrateValue.textContent = `${selectedBitrate} kbps`;
		});
	}

	if (audioBtn) {
			audioBtn.addEventListener('click', async () => {
				const waiting = selectedFiles.filter(f => f.status !== 'processing' && f.status !== 'success');
				if (!waiting.length) {
					showToast('Agrega un audio para comenzar', 'warning', toastContainer);
					return;
				}
				await processAudio(waiting);
			});
	}

	function addFiles(files) {
		files.forEach((file) => {
			const id = `a-${Date.now()}-${Math.random().toString(36).slice(2,8)}`;
			const item = { id, file, name: file.name, size: file.size, status: 'waiting', currentFormat: detectAudioFormat(file) };
			selectedFiles.push(item);
			renderItem(item);
		});
		const available = buildAvailableFormats();
		toggleFormatSelector(available);
		const fallback = updateFormatButtons(available);
		if (!selectedFormat && fallback) selectFormat(fallback, { silent: true });
		updateBtn();
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
					<span class="file-format-badge">${item.currentFormat || ''}</span>
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
		const available = buildAvailableFormats();
		toggleFormatSelector(available);
		const fallback = updateFormatButtons(available);
		if (!selectedFormat && fallback) selectFormat(fallback, { silent: true });
		updateBtn();
	}

	function updateBtn() {
		const waiting = selectedFiles.filter(f => f.status === 'waiting');
		const available = buildAvailableFormats();
		if (audioBtn) audioBtn.disabled = waiting.length === 0 || !selectedFormat || !available.includes(selectedFormat);
	}

	function isAudio(file) {
		if (!file) return false;
		const type = file.type?.toLowerCase() || '';
		if (type.startsWith('audio/')) return true;
		const ext = file.name.split('.').pop().toLowerCase();
		return ['mp3','wav','m4a','ogg','aac','flac','opus','oga','webm'].includes(ext);
	}

	function detectAudioFormat(file) {
		const ext = (file.name.split('.').pop() || '').toLowerCase();
		const map = { mp3: 'MP3', wav: 'WAV', m4a: 'M4A', aac: 'AAC', ogg: 'OGG', flac: 'FLAC', webm: 'WEBM', opus: 'OPUS', oga: 'OGG' };
		if (map[ext]) return map[ext];
		const type = (file.type || '').toLowerCase();
		if (type.startsWith('audio/')) return type.split('/')[1].toUpperCase();
		return 'AUDIO';
	}

	function toggleFormatSelector(available) {
		if (!formatSelector) return;
		if (selectedFiles.length === 0) {
			formatSelector.style.display = 'none';
			selectedFormat = null;
			if (bitrateControl) bitrateControl.style.display = 'none';
			return;
		}
		formatSelector.style.display = 'block';
	}

	function buildAvailableFormats() {
		const uniqueFormats = new Set(selectedFiles.map(f => (f.currentFormat || '').toLowerCase()))
		const allowed = Array.from(formatButtons || []).map(btn => btn.dataset.format);
			let base = allowed.filter(fmt => !uniqueFormats.has(fmt));
			if (supported) base = base.filter(fmt => supported[fmt] !== false);
			return base;
	}

	function updateFormatButtons(available) {
		const availableSet = new Set(available);
		let fallback = null;
		(formatButtons || []).forEach(btn => {
			const fmt = btn.dataset.format;
			const enabled = availableSet.has(fmt);
			btn.disabled = !enabled;
			btn.classList.toggle('disabled', !enabled);
			if (btn.classList.contains('active') && !enabled) btn.classList.remove('active');
			if (enabled && !fallback) fallback = fmt;
		});
		if (selectedFormat && !availableSet.has(selectedFormat)) selectedFormat = null;
		return fallback;
	}

	function selectFormat(fmt, options = {}) {
		if (!fmt) return;
		const { silent = false } = options;
		const available = buildAvailableFormats();
		if (!available.includes(fmt)) return;
		selectedFormat = fmt;
		(formatButtons || []).forEach(btn => btn.classList.toggle('active', btn.dataset.format === fmt));
	const lossy = ['mp3','m4a','aac','ogg','opus'].includes(fmt);
		if (bitrateControl) bitrateControl.style.display = lossy ? 'flex' : 'none';
		updateBtn();
		if (!silent) showToast(`Formato: ${fmt.toUpperCase()}`, 'success', toastContainer);
	}

		function applyCapabilities() {
			if (!supported || !formatButtons) return;
			(formatButtons || []).forEach(btn => {
				const fmt = btn.dataset.format;
				const ok = supported[fmt] !== false;
				btn.disabled = !ok;
				btn.classList.toggle('disabled', !ok);
				if (!ok && btn.classList.contains('active')) btn.classList.remove('active');
			});
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
					dl.addEventListener('click', () => downloadFile(data.downloadUrl, data.outputName || 'audio.mp3'));
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

		async function processAudio(waiting) {
			try {
				if (audioBtn) audioBtn.disabled = true;
				const fd = new FormData();
				waiting.forEach(w => fd.append('files', w.file));
				fd.append('bitrate', String(selectedBitrate));
				if (selectedFormat) fd.append('format', selectedFormat);

				waiting.forEach(w => { w.status = 'uploading'; setStatus(w.id, 'uploading'); simulateProgress(w.id); });

				const resp = await fetch(`${API_URL}/reform-audio/compress`, { method: 'POST', body: fd });
				const json = await resp.json().catch(() => ({ items: [] }));
				if (!resp.ok) throw new Error(json.message || 'Error en el procesamiento de audio');

				waiting.forEach(w => { w.status = 'processing'; setStatus(w.id, 'processing', { progress: 100 }); });
				await new Promise(r => setTimeout(r, 300));

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
				if (ok) showToast(`${ok} audio(s) procesado(s)`, 'success', toastContainer);
				if (ko) showToast(`${ko} audio(s) con errores`, 'error', toastContainer);

			} catch (e) {
				showToast(e.message || 'Error inesperado', 'error', toastContainer);
				waiting.forEach(w => setStatus(w.id, 'error', { error: e.message }));
			} finally {
				if (audioBtn) audioBtn.disabled = false;
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
