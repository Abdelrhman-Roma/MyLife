// ================= UTILITY FUNCTIONS ================= 
// Common helper functions used throughout the app

class Utils {
  // Format date to readable string
  static formatDate(date) {
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    return new Date(date).toLocaleDateString('en-US', options);
  }

  // Format time (HH:MM)
  static formatTime(date) {
    const time = new Date(date);
    return time.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
  }

  // Get day of week
  static getDayOfWeek(date) {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    return days[new Date(date).getDay()];
  }

  // Calculate percentage
  static calculatePercentage(current, total) {
    return total === 0 ? 0 : Math.round((current / total) * 100);
  }

  // Generate unique ID
  static generateId() {
    return 'id_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  // Check if element exists
  static elementExists(selector) {
    return document.querySelector(selector) !== null;
  }

  // Show notification
  static showNotification(message, type = 'success', duration = 3000) {
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.textContent = message;
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      padding: 15px 20px;
      background: ${type === 'success' ? '#2ecc71' : type === 'error' ? '#ff6b6b' : '#4aa3ff'};
      color: white;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      z-index: 10000;
      animation: slideIn 0.3s ease-out;
    `;
    document.body.appendChild(notification);
    setTimeout(() => {
      notification.style.animation = 'slideOut 0.3s ease-out';
      setTimeout(() => notification.remove(), 300);
    }, duration);
  }

  // Debounce function
  static debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  }

  // Throttle function
  static throttle(func, limit) {
    let inThrottle;
    return function(...args) {
      if (!inThrottle) {
        func.apply(this, args);
        inThrottle = true;
        setTimeout(() => inThrottle = false, limit);
      }
    };
  }

  // Clone object deeply
  static deepClone(obj) {
    return JSON.parse(JSON.stringify(obj));
  }

  // Merge objects
  static merge(target, source) {
    return { ...target, ...source };
  }

  // Filter array
  static filterArray(array, predicate) {
    return array.filter(predicate);
  }

  // Find in array
  static findInArray(array, predicate) {
    return array.find(predicate);
  }

  // Sort array
  static sortArray(array, compareFn) {
    return [...array].sort(compareFn);
  }

  // Get query parameter from URL
  static getQueryParam(param) {
    const searchParams = new URLSearchParams(window.location.search);
    return searchParams.get(param);
  }

  // Set page title
  static setPageTitle(title) {
    document.title = title + ' - MYLIFE';
  }

  // Add CSS animation
  static addAnimation(element, animationName) {
    element.style.animation = `${animationName} 0.3s ease-out`;
  }

  // Remove animation
  static removeAnimation(element) {
    element.style.animation = '';
  }

  // Get element dimensions
  static getElementDimensions(element) {
    const rect = element.getBoundingClientRect();
    return {
      width: rect.width,
      height: rect.height,
      top: rect.top,
      left: rect.left
    };
  }

  // Scroll to element
  static scrollToElement(element) {
    element.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  // Get scroll position
  static getScrollPosition() {
    return {
      x: window.scrollX,
      y: window.scrollY
    };
  }

  // Check if element is in viewport
  static isElementInViewport(element) {
    const rect = element.getBoundingClientRect();
    return (
      rect.top >= 0 &&
      rect.left >= 0 &&
      rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
      rect.right <= (window.innerWidth || document.documentElement.clientWidth)
    );
  }

  // Parse JSON safely
  static parseJSON(jsonString, defaultValue = null) {
    try {
      return JSON.parse(jsonString);
    } catch (error) {
      console.error('Error parsing JSON:', error);
      return defaultValue;
    }
  }

  // Validate email
  static validateEmail(email) {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
  }

  // Validate phone
  static validatePhone(phone) {
    const re = /^[0-9\-\+\s\(\)]*$/;
    return re.test(phone) && phone.length >= 10;
  }

  // Get random item from array
  static getRandomItem(array) {
    return array[Math.floor(Math.random() * array.length)];
  }

  // Sleep/delay
  static sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
