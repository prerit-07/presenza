document.addEventListener('DOMContentLoaded', () => {
  const signupBtn = document.querySelector('.btn-signup');
  const getStartedBtn = document.querySelector('.btn-get-started');

  signupBtn?.addEventListener('click', () => alert('Signup clicked'));
  getStartedBtn?.addEventListener('click', () => alert('Get Started clicked'));

  const navLinks = document.querySelectorAll('.nav-links a');
  navLinks.forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      navLinks.forEach(l => l.classList.remove('active'));
      link.classList.add('active');
    });
  });
});
