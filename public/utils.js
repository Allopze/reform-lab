export function showToast(message, type = 'info', container = document.getElementById('toastContainer')) {
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `<div class="toast-message">${escapeHtml(message)}</div>`;
  if (container) {
    container.appendChild(toast);
  }

  setTimeout(() => {
    toast.style.animation = 'toastIn 0.3s ease reverse';
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}

export function downloadFile(url, filename) {
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

export function formatBytes(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
}

export function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

export function escapeAttr(str) {
  if (!str) return '';
  return str.replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

export async function safeJson(res) {
  try {
    return await res.json();
  } catch {
    return {};
  }
}

export function isPdf(file) {
  const ext = file.name.split('.').pop().toLowerCase();
  return ext === 'pdf' || file.type === 'application/pdf';
}

export function isImage(file) {
  return file.type.startsWith('image/');
}

// Theme Switcher Logic
let currentTheme = 'dark';
const html = document.documentElement; // Get it once

export function initTheme() {
  const storedTheme = localStorage.getItem('theme');
  if (storedTheme === 'dark' || storedTheme === 'light') {
    currentTheme = storedTheme;
  } else {
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    currentTheme = prefersDark ? 'dark' : 'light';
    localStorage.setItem('theme', currentTheme);
  }
  html.setAttribute('data-theme', currentTheme);
}

export function toggleTheme() {
  currentTheme = currentTheme === 'dark' ? 'light' : 'dark';
  html.setAttribute('data-theme', currentTheme);
  localStorage.setItem('theme', currentTheme);

  document.body.style.transition = 'background-color 0.3s ease';
  setTimeout(() => {
    document.body.style.transition = '';
  }, 300);
}

export function setupThemeSwitcher(themeToggleId = 'themeToggle') {
  const themeToggle = document.getElementById(themeToggleId);
  if (themeToggle) {
    themeToggle.addEventListener('click', (e) => {
      e.preventDefault();
      toggleTheme();
    });
  }
  initTheme();
  const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
  const handleChange = () => initTheme();
  if (typeof mediaQuery.addEventListener === 'function') {
    mediaQuery.addEventListener('change', handleChange);
  } else if (typeof mediaQuery.addListener === 'function') {
    mediaQuery.addListener(handleChange);
  }
}