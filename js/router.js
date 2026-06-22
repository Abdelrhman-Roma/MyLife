// ================= ROUTER MANAGER ================= 
// Manages all page navigation and routing

class Router {
  constructor() {
    this.currentPage = 'dashboard';
    this.pages = {
      'dashboard': '../index.html',
      'todo': './todo.html',
      'habits': './habits.html',
      'goals': './goals.html',
      'calendar': './calendar.html',
      'gym': './gym.html',
      'prayer': './prayer.html',
      'nutrition': './nutrition.html',
      'water': './water.html',
      'sleep': './sleep.html',
      'study': './study.html',
      'statistics': './statistics.html',
      'settings': './settings.html',
      'profile': './profile.html'
    };
  }

  // Navigate to a page
  navigate(pageName) {
    if (this.pages[pageName]) {
      this.currentPage = pageName;
      window.location.href = this.pages[pageName];
      return true;
    }

    return false;
  }

  // Get current page
  getCurrentPage() {
    return this.currentPage;
  }

  // Set active navigation item
  setActiveNav(pageName) {
    const navItems = document.querySelectorAll('.nav-item');
    navItems.forEach(item => {
      item.classList.remove('active');
      if (item.textContent.toLowerCase().includes(pageName.toLowerCase())) {
        item.classList.add('active');
      }
    });
  }

  // Initialize router
  init() {
    const navLinks = document.querySelectorAll('.nav-item');
    navLinks.forEach(link => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        const href = link.getAttribute('href');
        const pageName = href.split('/').pop().replace('.html', '');
        
        // Update active state
        navLinks.forEach(nav => nav.classList.remove('active'));
        link.classList.add('active');
        
        // Navigate
        if (pageName === '') {
          this.navigate('dashboard');
        } else {
          this.navigate(pageName);
        }
      });
    });
  }
}

// Create global router instance
const router = new Router();
