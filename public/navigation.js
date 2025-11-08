const TOOL_CATEGORIES = [
  {
    id: 'pdf-tools',
    label: 'Documentos',
    description: 'Convierte, combina y optimiza tus documentos.',
    items: [
      {
        id: 'reform-office-to-pdf',
        label: 'Office to PDF',
        href: 'index.html',
        keywords: ['office', 'doc', 'docx', 'excel', 'powerpoint', 'presentación'],
      },
      {
        id: 'reform-pdf-to-word',
        label: 'PDF to Word',
        href: 'pdf-to-office.html',
        keywords: ['pdf', 'word', 'docx', 'editable'],
      },
      {
        id: 'reform-pdf-merge',
        label: 'PDF Merge',
        href: 'pdf-merge.html',
        keywords: ['pdf', 'merge', 'combinar', 'ensamblar'],
      },
      {
        id: 'reform-pdf-split',
        label: 'PDF Split',
        status: 'Coming soon',
        keywords: ['pdf', 'split', 'dividir'],
      },
      {
        id: 'reform-pdf-compress',
        label: 'PDF Compress',
        href: 'pdf-compress.html',
        keywords: ['pdf', 'compress', 'optimizar', 'reducir peso'],
      },
      {
        id: 'reform-pdf-ocr',
        label: 'PDF OCR',
        status: 'Coming soon',
        keywords: ['pdf', 'ocr', 'texto'],
      },
      {
        id: 'reform-pdf-rotate',
        label: 'PDF Rotate',
        status: 'Coming soon',
        keywords: ['pdf', 'rotar', 'girar'],
      },
      {
        id: 'reform-pdf-protect',
        label: 'PDF Protect',
        status: 'Coming soon',
        keywords: ['pdf', 'password', 'proteger'],
      },
      {
        id: 'reform-pdf-unlock',
        label: 'PDF Unlock',
        status: 'Coming soon',
        keywords: ['pdf', 'unlock', 'desbloquear'],
      },
      {
        id: 'reform-pdf-sign',
        label: 'PDF Sign',
        status: 'Coming soon',
        keywords: ['pdf', 'firmar', 'firma'],
      },
      {
        id: 'reform-pdf-extract-text',
        label: 'PDF Extract Text',
        status: 'Coming soon',
        keywords: ['pdf', 'texto', 'extract'],
      },
      {
        id: 'reform-pdf-extract-images',
        label: 'PDF Extract Images',
        status: 'Coming soon',
        keywords: ['pdf', 'imagenes', 'extraer'],
      },
      {
        id: 'reform-pdf-reorder-pages',
        label: 'PDF Reorder Pages',
        status: 'Coming soon',
        keywords: ['pdf', 'ordenar', 'reordenar'],
      },
      {
        id: 'reform-pdf-watermark',
        label: 'PDF Watermark',
        status: 'Coming soon',
        keywords: ['pdf', 'marca de agua', 'watermark'],
      },
      {
        id: 'reform-pdf-repair',
        label: 'PDF Repair',
        status: 'Coming soon',
        keywords: ['pdf', 'repair', 'reparar'],
      },
    ],
  },
  {
    id: 'image-tools',
    label: 'Imágenes',
    description: 'Convierte y limpia imágenes en segundos.',
    items: [
      {
        id: 'reform-image-converter',
        label: 'Reform Image',
        href: 'image-converter.html',
        keywords: ['imagen', 'converter', 'jpg', 'png', 'webp', 'svg'],
      },
      {
        id: 'reform-remove-background',
        label: 'Remove Background',
        href: 'remove-background.html',
        keywords: ['imagen', 'fondo', 'recorte', 'remove background', 'ai'],
      },
      {
        id: 'reform-image-resize',
        label: 'Image Resize',
        status: 'Coming soon',
        keywords: ['imagen', 'resize', 'escalar'],
      },
      {
        id: 'reform-image-compress',
        label: 'Image Compress',
        status: 'Coming soon',
        keywords: ['imagen', 'compress', 'optimizar'],
      },
      {
        id: 'reform-image-crop',
        label: 'Image Crop',
        status: 'Coming soon',
        keywords: ['imagen', 'crop', 'recortar'],
      },
      
      {
        id: 'reform-images-to-pdf',
        label: 'Images to PDF',
        status: 'Coming soon',
        keywords: ['imagenes', 'pdf', 'convertir'],
      },
      {
        id: 'reform-image-watermark',
        label: 'Image Watermark',
        status: 'Coming soon',
        keywords: ['imagen', 'watermark', 'marca de agua'],
      },
      {
        id: 'reform-strip-exif',
        label: 'Strip EXIF',
        status: 'Coming soon',
        keywords: ['exif', 'metadata', 'limpiar'],
      },
    ],
  },
  {
    id: 'audio-tools',
    label: 'Audio',
    description: 'Experimentos con procesamiento de audio.',
    items: [
      {
        id: 'reform-audio-suite',
        label: 'Reform Audio',
        href: 'reform-audio.html',
        keywords: ['audio', 'reform', 'mp3', 'wav', 'tools'],
      },
      {
        id: 'reform-audio-compress',
        label: 'Audio Compress',
        href: 'audio-compress.html',
        keywords: ['audio', 'compress', 'optimizar'],
      },
      {
        id: 'reform-audio-trim',
        label: 'Audio Trim',
        status: 'Coming soon',
        keywords: ['audio', 'trim', 'recortar'],
      },
      {
        id: 'reform-audio-join',
        label: 'Audio Join',
        status: 'Coming soon',
        keywords: ['audio', 'join', 'unir'],
      },
      {
        id: 'reform-audio-normalize',
        label: 'Audio Normalize',
        status: 'Coming soon',
        keywords: ['audio', 'normalize', 'nivelar'],
      },
      {
        id: 'reform-audio-to-text',
        label: 'Audio to Text',
        status: 'Coming soon',
        keywords: ['audio', 'texto', 'transcribir'],
      },
    ],
  },
  {
    id: 'video-tools',
    label: 'Video',
    description: 'Edición rápida para tus videos.',
    items: [
      {
        id: 'reform-video-converter',
        label: 'Reform Video',
        href: 'reform-video.html',
        keywords: ['video', 'converter', 'mp4', 'mov'],
      },
      {
        id: 'reform-video-compress',
        label: 'Video Compress',
        href: 'video-compress.html',
        keywords: ['video', 'compress', 'optimizar'],
      },
      {
        id: 'reform-video-trim',
        label: 'Video Trim',
        status: 'Coming soon',
        keywords: ['video', 'trim', 'recortar'],
      },
      {
        id: 'reform-extract-audio',
        label: 'Extract Audio from Video',
        status: 'Coming soon',
        keywords: ['video', 'audio', 'extraer'],
      },
      {
        id: 'reform-gif-from-video',
        label: 'GIF from Video',
        status: 'Coming soon',
        keywords: ['gif', 'video', 'animación'],
      },
      {
        id: 'reform-subtitles-tool',
        label: 'Subtitles Tool',
        status: 'Coming soon',
        keywords: ['subtítulos', 'video', 'captions'],
      },
    ],
  },
  {
    id: 'file-tools',
    label: 'Archivos',
    description: 'Gestiona y transforma archivos pesados.',
    items: [
      {
        id: 'reform-archive',
        label: 'Comprimir en ZIP',
        href: 'archive-zip.html',
        keywords: ['zip', 'comprimir', 'archivo'],
      },
      {
        id: 'reform-unzip',
        label: 'Descomprimir ZIP',
        href: 'extract-archive.html',
        keywords: ['zip', 'extraer', 'archivo', 'descomprimir'],
      },
      {
        id: 'reform-file-split',
        label: 'File Split',
        status: 'Coming soon',
        keywords: ['archivo', 'split', 'dividir'],
      },
      {
        id: 'reform-file-join',
        label: 'File Join',
        status: 'Coming soon',
        keywords: ['archivo', 'join', 'unir'],
      },
    ],
  },
  {
    id: 'utility-tools',
    label: 'Utilidades',
    description: 'Accesorios y extras para tu flujo de trabajo.',
    items: [
      {
        id: 'reform-qr-generator',
        label: 'Generador de QR',
        href: 'qr-generator.html',
        keywords: ['qr', 'code', 'generar', 'codigo', 'wifi', 'url'],
      },
      {
        id: 'reform-url-shortener',
        label: 'URL Shortener',
        status: 'Coming soon',
        keywords: ['url', 'short', 'enlace'],
      },
      {
        id: 'reform-hash-calculator',
        label: 'Hash Calculator',
        status: 'Coming soon',
        keywords: ['hash', 'checksum', 'seguridad'],
      },
      {
        id: 'reform-markdown-to-html',
        label: 'Markdown to HTML',
        status: 'Coming soon',
        keywords: ['markdown', 'html', 'convertir'],
      },
      {
        id: 'reform-html-to-pdf',
        label: 'HTML to PDF',
        status: 'Coming soon',
        keywords: ['html', 'pdf', 'convertir'],
      },
    ],
  },
];

const state = {
  openCategory: null,
  drawerOpen: false,
  searchOpen: false,
};

const elements = {
  nav: document.querySelector('[data-nav]'),
  categoriesList: document.querySelector('[data-nav-categories]'),
  mobileTrigger: document.querySelector('[data-nav-mobile-trigger]'),
  drawer: document.querySelector('[data-nav-drawer]'),
  drawerContent: document.querySelector('[data-nav-drawer-content]'),
  drawerDismiss: document.querySelectorAll('[data-nav-drawer-dismiss]'),
  searchTrigger: document.querySelector('[data-nav-search-trigger]'),
  searchOverlay: document.querySelector('[data-nav-search]'),
  searchInput: document.querySelector('[data-nav-search-input]'),
  searchResults: document.querySelector('[data-nav-search-results]'),
  searchDismiss: document.querySelectorAll('[data-nav-search-dismiss]'),
  searchShortcutLabel: document.querySelector('.nav-search-shortcut'),
};

if (elements.nav && elements.categoriesList) {
  initNavigation();
}

function initNavigation() {
  const pointerFine = matchMedia('(pointer: fine)').matches;

  const normalizePath = (pathname) => {
    if (!pathname) return '/';
    const url = new URL(pathname, window.location.origin);
    let normalized = url.pathname.replace(/\\/g, '/');
    if (normalized.endsWith('/') && normalized !== '/') {
      normalized = normalized.slice(0, -1);
    }
    return normalized || '/';
  };

  const catalog = TOOL_CATEGORIES.map((category) => ({
    ...category,
    items: category.items.map((item) => {
      const hrefAbsolute = item.href ? normalizePath(new URL(item.href, window.location.origin).pathname) : null;
      const available = Boolean(hrefAbsolute);
      return {
        ...item,
        status: item.status || (available ? null : 'Coming soon'),
        hrefAbsolute,
        available,
      };
    }),
  }));

  const catalogMap = new Map(catalog.map((category) => [category.id, category]));
  const categoryIndexMap = new Map(catalog.map((category, index) => [category.id, index]));

  const searchIndex = catalog.flatMap((category) =>
    category.items
      .filter((item) => item.available)
      .map((item) => ({
        ...item,
        categoryId: category.id,
        categoryLabel: category.label,
      }))
  );

  const currentPath = normalizePath(window.location.pathname || '/');
  const isCurrent = (item) => {
    if (!item.hrefAbsolute) return false;
    if (currentPath === '/' && item.hrefAbsolute === '/index.html') return true;
    return currentPath === item.hrefAbsolute;
  };

  const triggers = [];
  const triggerByCategory = new Map();
  const hoverCloseTimers = new Map();

  setupShortcutLabel();
  buildDesktopNav();
  buildMobileDrawer();
  bindGlobalEvents();

  function setupShortcutLabel() {
    if (!elements.searchShortcutLabel) return;
    const isMac = /mac/i.test(navigator.platform);
    elements.searchShortcutLabel.textContent = isMac ? '⌘ + K' : 'Ctrl + K';
  }

  function buildDesktopNav() {
    elements.categoriesList.innerHTML = '';

    catalog.forEach((category, index) => {
      const categoryItem = document.createElement('li');
      categoryItem.className = 'nav-category';
      categoryItem.dataset.category = category.id;
      categoryItem.dataset.index = String(index);

      const trigger = document.createElement('button');
      trigger.className = 'nav-trigger';
      trigger.type = 'button';
      trigger.textContent = category.label;
      trigger.setAttribute('aria-haspopup', 'true');
      trigger.setAttribute('aria-expanded', 'false');
      trigger.setAttribute('aria-controls', `${category.id}-menu`);

      const menu = document.createElement('div');
      menu.className = 'mega-menu';
      menu.id = `${category.id}-menu`;
      menu.setAttribute('role', 'menu');
  menu.setAttribute('aria-hidden', 'true');
      menu.hidden = true;
      menu.dataset.loaded = 'false';

      categoryItem.appendChild(trigger);
      categoryItem.appendChild(menu);
      elements.categoriesList.appendChild(categoryItem);

      triggers.push(trigger);
      triggerByCategory.set(category.id, trigger);

      if (category.items.some((item) => isCurrent(item))) {
        trigger.classList.add('is-active');
      }

      trigger.addEventListener('click', (event) => {
        event.preventDefault();
        toggleCategory(category.id);
      });

      trigger.addEventListener('focus', () => {
        openCategory(category.id);
      });

      trigger.addEventListener('keydown', (event) => {
        switch (event.key) {
          case 'ArrowRight':
            event.preventDefault();
            focusSiblingTrigger(index + 1, 'first');
            break;
          case 'ArrowLeft':
            event.preventDefault();
            focusSiblingTrigger(index - 1, 'first');
            break;
          case 'ArrowDown':
            event.preventDefault();
            openCategory(category.id, { focus: 'first' });
            break;
          case 'ArrowUp':
            event.preventDefault();
            openCategory(category.id, { focus: 'last' });
            break;
          case 'Enter':
          case ' ': {
            event.preventDefault();
            openCategory(category.id, { focus: 'first' });
            break;
          }
          case 'Escape':
            event.preventDefault();
            closeCategory(category.id);
            break;
          default:
            break;
        }
      });

      if (pointerFine) {
        const handlePointerEnter = () => {
          cancelHoverClose(category.id);
          openCategory(category.id);
        };

        const handlePointerLeave = () => {
          const activeElement = document.activeElement;
          if (categoryItem.contains(activeElement)) {
            return;
          }
          scheduleHoverClose(category.id);
        };

        trigger.addEventListener('mouseenter', handlePointerEnter);
        trigger.addEventListener('mouseleave', handlePointerLeave);
        categoryItem.addEventListener('mouseenter', () => cancelHoverClose(category.id));
        menu.addEventListener('mouseenter', () => cancelHoverClose(category.id));
        menu.addEventListener('mouseleave', handlePointerLeave);
      }
    });
  }

  function ensureMenuContent(categoryId) {
    const categoryItem = elements.categoriesList.querySelector(`[data-category="${categoryId}"]`);
    if (!categoryItem) return;

    const menu = categoryItem.querySelector('.mega-menu');
    if (!menu || menu.dataset.loaded === 'true') return;

    const category = catalogMap.get(categoryId);
    if (!category) return;

    const list = document.createElement('ul');
    list.className = 'mega-menu-list';

    category.items.forEach((item) => {
      const listItem = document.createElement('li');
      listItem.className = 'mega-menu-item';

      const link = document.createElement(item.available ? 'a' : 'span');
      link.className = 'mega-menu-link';

      if (item.available) {
        link.href = item.href;
        link.setAttribute('role', 'menuitem');
        link.setAttribute('tabindex', '-1');
      } else {
        link.classList.add('is-disabled');
        link.setAttribute('aria-disabled', 'true');
      }

      const textWrapper = document.createElement('span');
      textWrapper.className = 'mega-menu-link-text';
      textWrapper.textContent = item.label;
      link.appendChild(textWrapper);

      if (item.status && item.status !== 'Listo') {
        const status = document.createElement('span');
        status.className = 'mega-menu-status';
        status.textContent = item.status;
        link.appendChild(status);
      }

      if (!item.available) {
        const srStatus = document.createElement('span');
        srStatus.className = 'sr-only';
        srStatus.textContent = 'Coming soon';
        link.appendChild(srStatus);
      } else if (isCurrent(item)) {
        link.classList.add('is-active');
        const trigger = triggerByCategory.get(categoryId);
        if (trigger) {
          trigger.classList.add('is-active');
        }
      }

      if (item.available) {
        link.addEventListener('keydown', (event) => handleMenuItemKeydown(event, categoryId));
        link.addEventListener('focus', () => openCategory(categoryId));
        link.addEventListener('click', closeAllCategories);
      }

      listItem.appendChild(link);
      list.appendChild(listItem);
    });

    menu.appendChild(list);
    menu.dataset.loaded = 'true';
  }

  function scheduleHoverClose(categoryId) {
    cancelHoverClose(categoryId);
    const timeoutId = window.setTimeout(() => {
      hoverCloseTimers.delete(categoryId);
      const categoryItem = elements.categoriesList.querySelector(`[data-category="${categoryId}"]`);
      if (!categoryItem) {
        closeCategory(categoryId);
        return;
      }
      const activeElement = document.activeElement;
      if (categoryItem.contains(activeElement)) {
        return;
      }
      closeCategory(categoryId);
    }, 180);
    hoverCloseTimers.set(categoryId, timeoutId);
  }

  function cancelHoverClose(categoryId) {
    const timeoutId = hoverCloseTimers.get(categoryId);
    if (timeoutId) {
      clearTimeout(timeoutId);
      hoverCloseTimers.delete(categoryId);
    }
  }

  function cancelAllHoverCloseTimers() {
    hoverCloseTimers.forEach((timeoutId) => clearTimeout(timeoutId));
    hoverCloseTimers.clear();
  }

  function buildMobileDrawer() {
    if (!elements.drawerContent) return;

    elements.drawerContent.innerHTML = '';

    const searchButton = document.createElement('button');
    searchButton.type = 'button';
    searchButton.className = 'drawer-search-button';
    searchButton.textContent = 'Buscar herramienta';
    searchButton.addEventListener('click', () => {
      closeDrawer();
      openSearch();
    });
    elements.drawerContent.appendChild(searchButton);

    catalog.forEach((category, index) => {
      const section = document.createElement('section');
      section.className = 'drawer-section';

      const accordion = document.createElement('button');
      accordion.type = 'button';
      accordion.className = 'drawer-accordion';
      accordion.setAttribute('aria-expanded', 'false');
      const panelId = `${category.id}-drawer-panel`;
      accordion.setAttribute('aria-controls', panelId);
      accordion.textContent = category.label;

      const panel = document.createElement('div');
      panel.className = 'drawer-accordion-panel';
      panel.hidden = true;
      panel.id = panelId;

      const list = document.createElement('ul');
      list.className = 'drawer-menu-list';

      category.items.forEach((item) => {
        const itemWrapper = document.createElement('li');
        itemWrapper.className = 'drawer-menu-item';

        const link = document.createElement(item.available ? 'a' : 'span');
        link.className = 'drawer-menu-link';
        link.textContent = item.label;

        if (item.available) {
          link.href = item.href;
          link.addEventListener('click', closeDrawer);
        } else {
          link.classList.add('is-disabled');
          link.setAttribute('aria-disabled', 'true');
        }

        if (item.status && item.status !== 'Listo') {
          const status = document.createElement('span');
          status.className = 'drawer-menu-status';
          status.textContent = item.status;
          link.appendChild(status);
        }

        itemWrapper.appendChild(link);
        list.appendChild(itemWrapper);
      });

      panel.appendChild(list);
      section.appendChild(accordion);
      section.appendChild(panel);
      elements.drawerContent.appendChild(section);

      accordion.addEventListener('click', () => {
        const expanded = accordion.getAttribute('aria-expanded') === 'true';
        accordion.setAttribute('aria-expanded', String(!expanded));
        panel.hidden = expanded;
      });

      accordion.addEventListener('keydown', (event) => {
        if (event.key === 'ArrowDown') {
          event.preventDefault();
          accordion.click();
          const firstLink = panel.querySelector('a.drawer-menu-link');
          if (firstLink) {
            firstLink.focus();
          }
        } else if (event.key === 'ArrowUp') {
          event.preventDefault();
          accordion.setAttribute('aria-expanded', 'false');
          panel.hidden = true;
        }
      });
    });
  }

  function bindGlobalEvents() {
    document.addEventListener('click', (event) => {
      if (!state.openCategory) return;
      const currentCategory = elements.categoriesList.querySelector(`[data-category="${state.openCategory}"]`);
      if (currentCategory && currentCategory.contains(event.target)) {
        return;
      }
      closeAllCategories();
    });

    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') {
        if (state.searchOpen) {
          closeSearch();
          return;
        }
        if (state.drawerOpen) {
          closeDrawer();
          return;
        }
        closeAllCategories();
      }

      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        openSearch();
      }
    });

    if (elements.nav) {
      elements.nav.addEventListener('focusout', handleNavFocusOut);
    }

    if (elements.mobileTrigger) {
      elements.mobileTrigger.addEventListener('click', () => {
        if (state.drawerOpen) {
          closeDrawer();
        } else {
          openDrawer();
        }
      });
    }

    elements.drawerDismiss.forEach((dismiss) => {
      dismiss.addEventListener('click', closeDrawer);
    });

    elements.searchDismiss.forEach((dismiss) => {
      dismiss.addEventListener('click', closeSearch);
    });

    if (elements.searchTrigger) {
      elements.searchTrigger.addEventListener('click', openSearch);
    }

    if (elements.searchInput) {
      elements.searchInput.addEventListener('input', handleSearchInput);
    }

    if (elements.drawer) {
      const panel = elements.drawer.querySelector('.drawer-panel');
      let touchStartX = null;

      if (panel) {
        panel.addEventListener('touchstart', (event) => {
          if (event.touches.length !== 1) return;
          touchStartX = event.touches[0].clientX;
        }, { passive: true });

        panel.addEventListener('touchmove', (event) => {
          if (touchStartX === null) return;
          const currentX = event.touches[0].clientX;
          if (currentX - touchStartX > 70) {
            touchStartX = null;
            closeDrawer();
          }
        }, { passive: true });

        panel.addEventListener('touchend', () => {
          touchStartX = null;
        });
      }
    }
  }

  function toggleCategory(categoryId, options = {}) {
    if (state.openCategory === categoryId) {
      closeCategory(categoryId);
    } else {
      openCategory(categoryId, options);
    }
  }

  function openCategory(categoryId, options = {}) {
    cancelHoverClose(categoryId);
    if (state.openCategory && state.openCategory !== categoryId) {
      closeCategory(state.openCategory);
    }

    const categoryItem = elements.categoriesList.querySelector(`[data-category="${categoryId}"]`);
    if (!categoryItem) return;

    ensureMenuContent(categoryId);

    const trigger = categoryItem.querySelector('.nav-trigger');
    const menu = categoryItem.querySelector('.mega-menu');
    if (!trigger || !menu) return;

    // Move the red selector (active state) to the opened category
    // so the visual indicator follows the user selection, not only the current page.
    triggers.forEach((t) => t.classList.remove('is-active'));
    trigger.classList.add('is-active');

    trigger.classList.add('is-open');
    trigger.setAttribute('aria-expanded', 'true');
    menu.hidden = false;
    menu.setAttribute('aria-hidden', 'false');
    categoryItem.classList.add('is-open');
    state.openCategory = categoryId;

    if (options.focus) {
      focusMenuItem(categoryId, { position: options.focus });
    }
  }

  function closeCategory(categoryId) {
    cancelHoverClose(categoryId);
    const categoryItem = elements.categoriesList.querySelector(`[data-category="${categoryId}"]`);
    if (!categoryItem) {
      state.openCategory = null;
      return;
    }

    const trigger = categoryItem.querySelector('.nav-trigger');
    const menu = categoryItem.querySelector('.mega-menu');
    if (trigger) {
      trigger.classList.remove('is-open');
      trigger.setAttribute('aria-expanded', 'false');
    }
    if (menu) {
      menu.hidden = true;
      menu.setAttribute('aria-hidden', 'true');
    }
    categoryItem.classList.remove('is-open');
    if (state.openCategory === categoryId) {
      state.openCategory = null;
    }
  }

  function closeAllCategories() {
    cancelAllHoverCloseTimers();
    if (!state.openCategory) return;
    closeCategory(state.openCategory);
  }

  function handleMenuItemKeydown(event, categoryId) {
    const categoryItem = elements.categoriesList.querySelector(`[data-category="${categoryId}"]`);
    if (!categoryItem) return;

    const menu = categoryItem.querySelector('.mega-menu');
    if (!menu) return;

    const items = Array.from(menu.querySelectorAll('a.mega-menu-link'));
    if (!items.length) return;

    const currentIndex = items.indexOf(event.currentTarget);
    const lastIndex = items.length - 1;

    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        focusMenuItem(categoryId, { index: currentIndex + 1 });
        break;
      case 'ArrowUp':
        event.preventDefault();
        focusMenuItem(categoryId, { index: currentIndex - 1 });
        break;
      case 'Home':
        event.preventDefault();
        focusMenuItem(categoryId, { index: 0 });
        break;
      case 'End':
        event.preventDefault();
        focusMenuItem(categoryId, { index: lastIndex });
        break;
      case 'ArrowRight': {
        event.preventDefault();
        const nextIndex = (categoryIndexMap.get(categoryId) || 0) + 1;
        focusSiblingTrigger(nextIndex, 'first');
        break;
      }
      case 'ArrowLeft': {
        event.preventDefault();
        const previousIndex = (categoryIndexMap.get(categoryId) || 0) - 1;
        focusSiblingTrigger(previousIndex, 'first');
        break;
      }
      case 'Escape': {
        event.preventDefault();
        closeCategory(categoryId);
        const trigger = triggerByCategory.get(categoryId);
        if (trigger) {
          trigger.focus();
        }
        break;
      }
      case 'Tab':
        closeAllCategories();
        break;
      default:
        break;
    }
  }

  function focusMenuItem(categoryId, options = {}) {
    const categoryItem = elements.categoriesList.querySelector(`[data-category="${categoryId}"]`);
    if (!categoryItem) return;
    const menu = categoryItem.querySelector('.mega-menu');
    if (!menu) return;

    const items = Array.from(menu.querySelectorAll('a.mega-menu-link'));
    if (!items.length) return;

    let targetIndex;
    if (typeof options.index === 'number') {
      const total = items.length;
      targetIndex = ((options.index % total) + total) % total;
    } else if (options.position === 'last') {
      targetIndex = items.length - 1;
    } else {
      targetIndex = 0;
    }

    const target = items[targetIndex];
    if (target) {
      target.focus();
    }
  }

  function focusSiblingTrigger(rawIndex, focusOption = 'first') {
    if (!triggers.length) return;

    const count = triggers.length;
    let normalizedIndex = rawIndex % count;
    if (normalizedIndex < 0) {
      normalizedIndex = (normalizedIndex + count) % count;
    }

    const category = catalog[normalizedIndex];
    if (!category) return;

    openCategory(category.id, { focus: focusOption });

    const trigger = triggerByCategory.get(category.id);
    if (trigger) {
      trigger.focus({ preventScroll: true });
    }
  }

  function handleNavFocusOut(event) {
    if (!elements.nav) return;
    const related = event.relatedTarget;
    if (related && elements.nav.contains(related)) {
      return;
    }
    requestAnimationFrame(() => {
      const active = document.activeElement;
      if (!elements.nav.contains(active)) {
        closeAllCategories();
      }
    });
  }

  function openDrawer() {
    if (!elements.drawer) return;
    closeAllCategories();
    elements.drawer.hidden = false;
    document.body.classList.add('drawer-open');
    state.drawerOpen = true;

    const focusable = elements.drawer.querySelector('button, a');
    if (focusable) {
      focusable.focus();
    }
  }

  function closeDrawer() {
    if (!elements.drawer) return;
    elements.drawer.hidden = true;
    document.body.classList.remove('drawer-open');
    state.drawerOpen = false;
    if (elements.mobileTrigger) {
      elements.mobileTrigger.focus();
    }
  }

  function openSearch() {
    if (!elements.searchOverlay) return;
    closeAllCategories();
    elements.searchOverlay.hidden = false;
    document.body.classList.add('search-open');
    state.searchOpen = true;
    if (elements.searchInput) {
      elements.searchInput.value = '';
      elements.searchInput.focus();
    }
    renderSearchResults('');
  }

  function closeSearch() {
    if (!elements.searchOverlay) return;
    elements.searchOverlay.hidden = true;
    document.body.classList.remove('search-open');
    state.searchOpen = false;
    if (elements.searchTrigger) {
      elements.searchTrigger.focus();
    }
  }

  function handleSearchInput(event) {
    const value = event.target.value || '';
    renderSearchResults(value);
  }

  function renderSearchResults(query) {
    if (!elements.searchResults) return;

    const trimmed = query.trim().toLowerCase();

    if (!trimmed) {
      elements.searchResults.innerHTML = '<p class="search-result-empty">Empieza a escribir para ver resultados.</p>';
      return;
    }

    const results = searchIndex.filter((tool) => {
      const keywords = [tool.label, tool.categoryLabel, ...(tool.keywords || [])].join(' ').toLowerCase();
      return keywords.includes(trimmed);
    });

    if (!results.length) {
      elements.searchResults.innerHTML = '<p class="search-result-empty">Sin coincidencias. Intenta con otro término.</p>';
      return;
    }

    const list = document.createElement('ul');
    list.className = 'search-results-list';

    results.forEach((tool) => {
      const item = document.createElement('li');
      item.className = 'search-result-item';

      const link = document.createElement('a');
      link.className = 'search-result-link';
      link.href = tool.href;
      link.addEventListener('click', closeSearch);

      if (isCurrent(tool)) {
        link.classList.add('is-active');
      }

      const title = document.createElement('span');
      title.className = 'search-result-title';
      title.textContent = tool.label;

      const meta = document.createElement('span');
      meta.className = 'search-result-meta';
      meta.textContent = tool.categoryLabel;

      link.appendChild(title);
      link.appendChild(meta);

      if (tool.status && tool.status !== 'Listo') {
        const status = document.createElement('span');
        status.className = 'search-result-status';
        status.textContent = tool.status;
        link.appendChild(status);
      }

      item.appendChild(link);
      list.appendChild(item);
    });

    elements.searchResults.innerHTML = '';
    elements.searchResults.appendChild(list);
  }
}
