// Dropdown functionality for the navbar
document.addEventListener('DOMContentLoaded', () => {
  const dropdown = document.querySelector('.dropdown');
  const dropdownToggle = document.getElementById('moreToolsDropdown');
  const dropdownMenu = document.getElementById('moreToolsMenu');

  if (!dropdown || !dropdownToggle || !dropdownMenu) {
    return; // Exit if elements don't exist on this page
  }

  // Toggle dropdown on click
  dropdownToggle.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    dropdown.classList.toggle('active');
  });

  // Close dropdown when clicking outside
  document.addEventListener('click', (e) => {
    if (!dropdown.contains(e.target)) {
      dropdown.classList.remove('active');
    }
  });

  // Close dropdown on escape key
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      dropdown.classList.remove('active');
    }
  });

  // Prevent dropdown from closing when clicking inside menu
  dropdownMenu.addEventListener('click', (e) => {
    if (e.target.classList.contains('disabled')) {
      e.preventDefault();
    }
  });
});