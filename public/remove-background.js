import { showToast, downloadFile, formatBytes, escapeHtml, isImage, setupThemeSwitcher } from './utils.js';

document.addEventListener('DOMContentLoaded', () => {
	setupThemeSwitcher();

	const dropzone = document.getElementById('dropzone');
	const fileInput = document.getElementById('fileInput');
	const filesContainer = document.getElementById('filesContainer');
	const removeBtn = document.getElementById('removeBtn');
	const toastContainer = document.getElementById('toastContainer');
  const API_URL = window.location.origin;

	let selectedFiles = [];

	if (dropzone && fileInput) {
		dropzone.addEventListener('click', () => fileInput.click());
		dropzone.addEventListener('dragover', (e) => { e.preventDefault(); dropzone.classList.add('drag-over'); });
		dropzone.addEventListener('dragleave', () => dropzone.classList.remove('drag-over'));
		dropzone.addEventListener('drop', (e) => {
			e.preventDefault();
			dropzone.classList.remove('drag-over');
			const files = Array.from(e.dataTransfer.files).filter(isImage);
			if (!files.length) {
				showToast('Solo se aceptan imágenes', 'error', toastContainer);
				return;
			}
			addFiles(files);
		});
	}

	if (fileInput) {
		fileInput.addEventListener('change', (e) => {
			const files = Array.from(e.target.files).filter(isImage);
			if (!files.length) {
				showToast('Solo se aceptan imágenes', 'error', toastContainer);
				return;
			}
			addFiles(files);
			fileInput.value = '';
		});
	}

	if (removeBtn) {
		removeBtn.addEventListener('click', async () => {
			const waiting = selectedFiles.filter(f => f.status === 'waiting');
			if (!waiting.length) {
				showToast('Agrega al menos una imagen', 'warning', toastContainer);
				return;
			}
			await processRemoveBackground(waiting);
		});
	}

	function addFiles(files) {
		files.forEach((file) => {
			const id = `f-${Date.now()}-${Math.random().toString(36).slice(2,8)}`;
			const item = { id, file, name: file.name, size: file.size, status: 'waiting' };
			selectedFiles.push(item);
			renderItem(item);
		});
		updateRemoveBtn();
	}

	function renderItem(item) {
		const div = document.createElement('div');
		div.className = 'file-item';
		div.id = item.id;
		div.innerHTML = `
			<div class="file-icon">IMG</div>
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
		updateRemoveBtn();
	}

	function updateRemoveBtn() {
		if (removeBtn) removeBtn.disabled = selectedFiles.filter(f => f.status === 'waiting').length === 0;
	}

	function setStatus(id, status, data = {}) {
		const el = document.getElementById(id);
		if (!el) return;
		const statusEl = el.querySelector('.file-status');
		if (statusEl) {
			statusEl.className = `file-status status-${status}`;
			const map = { waiting: 'Esperando', uploading: 'Subiendo', converting: 'Procesando', success: 'Listo', error: 'Error' };
			statusEl.textContent = map[status] || status;
		}
		if (data.progress !== undefined) {
			let bar = el.querySelector('.progress-bar');
			if (!bar) {
				const info = el.querySelector('.file-info');
				if (info) {
					info.insertAdjacentHTML('beforeend', '<div class="progress-bar"><div class="progress-fill" style="width:0%"></div></div>');
				}
				bar = el.querySelector('.progress-bar');
			}
			const fill = el.querySelector('.progress-fill');
			if (fill) fill.style.width = `${data.progress}%`;
		}
		if (status === 'success' && data.downloadUrl) {
			const actions = el.querySelector('.file-actions');
			if (actions) {
				actions.innerHTML = '';
				const btn = document.createElement('button');
				btn.className = 'btn-download';
				btn.textContent = 'Descargar';
				btn.addEventListener('click', () => downloadFile(data.downloadUrl, data.outputName || 'output.png'));
				actions.appendChild(btn);
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

	async function processRemoveBackground(waiting) {
		try {
			if (removeBtn) removeBtn.disabled = true;
			const formData = new FormData();
			waiting.forEach(w => formData.append('files', w.file));

			// statuses
			waiting.forEach(w => { w.status = 'uploading'; setStatus(w.id, 'uploading'); simulateProgress(w.id); });

			const resp = await fetch(`${API_URL}/remove-background`, { method: 'POST', body: formData });
			const json = await resp.json().catch(() => ({ items: [] }));
			if (!resp.ok) throw new Error(json.message || 'Error en la eliminación de fondo');

			// mark converting
			waiting.forEach(w => { w.status = 'converting'; setStatus(w.id, 'converting', { progress: 100 }); });
			await new Promise(r => setTimeout(r, 400));

			json.items.forEach((item, idx) => {
				const w = waiting[idx];
				if (!w) return;
				if (item.status === 'success') {
					w.status = 'success';
					w.downloadUrl = item.downloadUrl;
					w.outputName = item.outputName;
					setStatus(w.id, 'success', { id: w.id, downloadUrl: item.downloadUrl, outputName: item.outputName });
				} else {
					w.status = 'error';
					setStatus(w.id, 'error', { error: item.error || 'Error desconocido' });
				}
			});

			const ok = json.items.filter(i => i.status === 'success').length;
			const ko = json.items.filter(i => i.status === 'error').length;
			if (ok) showToast(`${ok} imagen(es) procesada(s)`, 'success', toastContainer);
			if (ko) showToast(`${ko} imagen(es) con errores`, 'error', toastContainer);

		} catch (e) {
			showToast(e.message || 'Error inesperado', 'error', toastContainer);
			waiting.forEach(w => setStatus(w.id, 'error', { error: e.message }));
		} finally {
			if (removeBtn) removeBtn.disabled = false;
			updateRemoveBtn();
		}
	}

	function simulateProgress(id) {
		let p = 0;
		const iv = setInterval(() => {
			p += Math.random() * 15;
			if (p > 90) p = 90;
			setStatus(id, 'uploading', { progress: p });
			const f = selectedFiles.find(x => x.id === id);
			if (!f || f.status !== 'uploading') clearInterval(iv);
		}, 180);
	}
});
