// ================= THEME MANAGER ================= 
// Manages dark mode and theme switching

class ThemeManager {
  constructor() {
    this.isDarkMode = storage.isDarkMode();
    this.init();
  }

  // Initialize theme
  init() {
    if (this.isDarkMode) {
      this.enableDarkMode();
    }
    this.setupThemeToggle();
  }

  // Enable dark mode
  enableDarkMode() {
    document.body.classList.add('dark-mode');
    const toggle = document.getElementById('darkModeToggle');
    if (toggle) {
      toggle.checked = true;
    }
    this.isDarkMode = true;
    storage.setDarkMode(true);
  }

  // Disable dark mode
  disableDarkMode() {
    document.body.classList.remove('dark-mode');
    const toggle = document.getElementById('darkModeToggle');
    if (toggle) {
      toggle.checked = false;
    }
    this.isDarkMode = false;
    storage.setDarkMode(false);
  }

  // Toggle dark mode
  toggleDarkMode() {
    if (this.isDarkMode) {
      this.disableDarkMode();
    } else {
      this.enableDarkMode();
    }
  }

  // Setup theme toggle listener
  setupThemeToggle() {
    const toggle = document.getElementById('darkModeToggle');
    if (toggle) {
      toggle.addEventListener('change', () => {
        this.toggleDarkMode();
      });
    }
  }

  // Get current theme
  getCurrentTheme() {
    return this.isDarkMode ? 'dark' : 'light';
  }
}

// Create global theme manager instance
const themeManager = new ThemeManager();
