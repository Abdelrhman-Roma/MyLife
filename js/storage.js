// ================= STORAGE MANAGER ================= 
// Manages all local storage operations for the app

class StorageManager {
  constructor() {
    this.prefix = 'mylife_';
  }

  // Save data to localStorage
  save(key, value) {
    try {
      const fullKey = this.prefix + key;
      const jsonValue = JSON.stringify(value);
      localStorage.setItem(fullKey, jsonValue);
      return true;
    } catch (error) {
      console.error('Error saving to storage:', error);
      return false;
    }
  }

  // Get data from localStorage
  get(key, defaultValue = null) {
    try {
      const fullKey = this.prefix + key;
      const item = localStorage.getItem(fullKey);
      return item ? JSON.parse(item) : defaultValue;
    } catch (error) {
      console.error('Error reading from storage:', error);
      return defaultValue;
    }
  }

  // Remove specific data
  remove(key) {
    try {
      const fullKey = this.prefix + key;
      localStorage.removeItem(fullKey);
      return true;
    } catch (error) {
      console.error('Error removing from storage:', error);
      return false;
    }
  }

  // Clear all app data
  clear() {
    try {
      const keys = Object.keys(localStorage);
      keys.forEach(key => {
        if (key.startsWith(this.prefix)) {
          localStorage.removeItem(key);
        }
      });
      return true;
    } catch (error) {
      console.error('Error clearing storage:', error);
      return false;
    }
  }

  // Save tasks
  saveTasks(tasks) {
    return this.save('tasks', tasks);
  }

  // Get tasks
  getTasks() {
    return this.get('tasks', []);
  }

  // Save habits
  saveHabits(habits) {
    return this.save('habits', habits);
  }

  // Get habits
  getHabits() {
    return this.get('habits', []);
  }

  // Save goals
  saveGoals(goals) {
    return this.save('goals', goals);
  }

  // Get goals
  getGoals() {
    return this.get('goals', []);
  }

  // Save user preferences
  savePreferences(preferences) {
    return this.save('preferences', preferences);
  }

  // Get user preferences
  getPreferences() {
    return this.get('preferences', {});
  }

  // Save dark mode preference
  setDarkMode(isDark) {
    return this.save('darkMode', isDark);
  }

  // Get dark mode preference
  isDarkMode() {
    return this.get('darkMode', false);
  }

  // Get all data
  getAllData() {
    return {
      tasks: this.getTasks(),
      habits: this.getHabits(),
      goals: this.getGoals(),
      preferences: this.getPreferences(),
      darkMode: this.isDarkMode()
    };
  }
}

// Create global instance
const storage = new StorageManager();
