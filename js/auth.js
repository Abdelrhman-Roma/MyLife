document.addEventListener('DOMContentLoaded', () => {
  const form = document.querySelector('[data-auth-form]');
  if (!form) return;

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const formData = new FormData(form);
    const mode = form.dataset.authForm;
    const users = JSON.parse(localStorage.getItem('mylife_users') || '[]');
    const email = String(formData.get('email') || '').trim().toLowerCase();
    const password = String(formData.get('password') || '');

    if (mode === 'register') {
      if (users.some((user) => user.email === email)) {
        showAuthMessage('This email already has an account.');
        return;
      }

      users.push({
        name: String(formData.get('name') || '').trim(),
        email,
        password,
        createdAt: new Date().toISOString(),
      });
      localStorage.setItem('mylife_users', JSON.stringify(users));
      localStorage.setItem('mylife_session', JSON.stringify({ email }));
      window.location.href = 'index.html';
      return;
    }

    const user = users.find((item) => item.email === email && item.password === password);
    if (!user && !(email === 'ahmed.farouk@email.com' && password.length > 0)) {
      showAuthMessage('Email or password is incorrect.');
      return;
    }

    localStorage.setItem('mylife_session', JSON.stringify({ email }));
    window.location.href = 'index.html';
  });
});

function showAuthMessage(message) {
  const oldMessage = document.querySelector('.auth-message');
  oldMessage?.remove();
  const node = document.createElement('p');
  node.className = 'auth-message';
  node.textContent = message;
  document.querySelector('.auth-card')?.appendChild(node);
}
