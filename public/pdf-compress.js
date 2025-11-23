import { showToast, formatBytes, setupThemeSwitcher } from './utils.js';

document.addEventListener('DOMContentLoaded', () => {
	setupThemeSwitcher();

	const dropzone = document.getElementById('dropzone');
	const fileInput = document.getElementById('fileInput');
	const compressBtn = document.getElementById('compressBtn');
	const downloadBtn = document.getElementById('downloadBtn');
	const compressionSummary = document.getElementById('compressionSummary');
	const summaryOriginal = document.querySelector('[data-summary-original]');
	const summaryCompressed = document.querySelector('[data-summary-compressed]');
	const summarySavings = document.querySelector('[data-summary-savings]');
	const summaryProgress = document.querySelector('[data-summary-progress]');
	const summaryRatio = document.querySelector('[data-summary-ratio]');
	const toastContainer = document.getElementById('toastContainer');
	const qualityButtons = document.querySelectorAll('.quality-option');

	let selectedFile = null;
	let selectedPreset = 'balanced';

	if (dropzone && fileInput) {
		dropzone.addEventListener('click', () => fileInput.click());
		dropzone.addEventListener('dragover', (event) => {
			event.preventDefault();
			dropzone.classList.add('drag-over');
		});
		dropzone.addEventListener('dragleave', () => dropzone.classList.remove('drag-over'));
		dropzone.addEventListener('drop', (event) => {
			event.preventDefault();
			dropzone.classList.remove('drag-over');
			const file = event.dataTransfer?.files?.[0];
			if (!file) {
				return;
			}
			processFile(file);
		});
	}

	if (fileInput) {
		fileInput.addEventListener('change', (event) => {
			const file = event.target.files?.[0];
			if (!file) {
				return;
			}
			processFile(file);
			fileInput.value = '';
		});
	}

	qualityButtons.forEach((button) => {
		button.addEventListener('click', () => {
			qualityButtons.forEach((btn) => btn.classList.remove('active'));
			button.classList.add('active');
			selectedPreset = button.dataset.compression || selectedPreset;
			updateSummary();
		});
	});

	if (compressBtn) {
		compressBtn.addEventListener('click', async () => {
			if (!selectedFile) {
				showToast('Selecciona un PDF para comenzar.', 'warning', toastContainer);
				return;
			}

			try {
				compressBtn.disabled = true;
				compressBtn.innerHTML = '<span>Comprimiendo...</span>';

				const formData = new FormData();
				formData.append('file', selectedFile);
				formData.append('preset', selectedPreset);

				const response = await fetch('/compress-pdf', {
					method: 'POST',
					body: formData
				});

				if (!response.ok) {
					const error = await response.json();
					throw new Error(error.message || 'Error al comprimir PDF');
				}

				const result = await response.json();

				// Actualizar resumen con datos reales
				if (summaryOriginal) {
					summaryOriginal.textContent = formatBytes(result.originalSize);
				}
				if (summaryCompressed) {
					summaryCompressed.textContent = formatBytes(result.compressedSize);
				}
				if (summarySavings) {
					summarySavings.textContent = `${formatBytes(result.savings)} (${result.savingsPercent}%)`;
				}
				if (summaryProgress) {
					summaryProgress.style.width = `${result.savingsPercent}%`;
				}
				if (summaryRatio) {
					summaryRatio.textContent = `Ahorro real ${result.savingsPercent}%`;
				}

				// Mostrar botón de descarga
				if (downloadBtn) {
					downloadBtn.hidden = false;
					downloadBtn.onclick = () => {
						const link = document.createElement('a');
						link.href = result.downloadUrl;
						link.download = result.outputName;
						link.click();
						showToast('PDF comprimido descargado', 'success', toastContainer);
					};
				}

				showToast(`PDF comprimido exitosamente (${result.savingsPercent}% más pequeño)`, 'success', toastContainer);

			} catch (error) {
				console.error('Error:', error);
				showToast(error.message || 'Error al comprimir el PDF', 'error', toastContainer);
			} finally {
				compressBtn.disabled = false;
				compressBtn.innerHTML = '<span>Comprimir PDF</span>';
			}
		});
	}

	if (downloadBtn) {
		downloadBtn.addEventListener('click', () => {
			// El click handler se configura dinámicamente después de comprimir
		});
	}

	function processFile(file) {
		if (!isPdf(file)) {
			showToast('Solo se admiten archivos PDF.', 'error', toastContainer);
			return;
		}

		selectedFile = file;
		updateSummary();
		showToast(`Archivo listo: ${file.name}`, 'success', toastContainer);
	}

	function updateSummary() {
		if (!selectedFile || !compressionSummary) {
			if (compressBtn) {
				compressBtn.disabled = true;
			}
			if (compressionSummary) {
				compressionSummary.hidden = true;
			}
			return;
		}

		const { size } = selectedFile;
		const { ratio, label } = getPresetRatio(selectedPreset);
		const estimatedSize = Math.max(1, Math.round(size * ratio));
		const savings = Math.max(0, size - estimatedSize);

		if (summaryOriginal) {
			summaryOriginal.textContent = formatBytes(size);
		}
		if (summaryCompressed) {
			summaryCompressed.textContent = formatBytes(estimatedSize);
		}
		if (summarySavings) {
			summarySavings.textContent = `${formatBytes(savings)} (${label})`;
		}
		if (summaryProgress) {
			summaryProgress.style.width = `${Math.round((1 - ratio) * 100)}%`;
		}
		if (summaryRatio) {
			summaryRatio.textContent = `Ahorro estimado ${Math.round((1 - ratio) * 100)}%`;
		}

		compressionSummary.hidden = false;
		if (compressBtn) {
			compressBtn.disabled = false;
		}
		if (downloadBtn) {
			downloadBtn.hidden = true;
		}
	}

	function getPresetRatio(preset) {
		switch (preset) {
			case 'strong':
				return { ratio: 0.3, label: 'máximo' };
			case 'high':
				return { ratio: 0.7, label: 'suave' };
			case 'balanced':
			default:
				return { ratio: 0.5, label: 'equilibrado' };
		}
	}

	function isPdf(file) {
		if (!file) return false;
		const type = file.type?.toLowerCase() || '';
		if (type === 'application/pdf') return true;
		const extension = file.name?.split('.').pop()?.toLowerCase();
		return extension === 'pdf';
	}
});
