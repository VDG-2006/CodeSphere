/**
 * auth-gsap.js - Senior Creative Developer Implementation
 * Handles cinematic animations and auth state transitions.
 */

document.addEventListener('DOMContentLoaded', () => {
  const heroTitle = document.getElementById('hero-title');
  const heroTagline = document.getElementById('hero-tagline');
  const authCard = document.getElementById('auth-card');
  const track = document.getElementById('auth-forms-track');
  
  // 1. Prepare SplitText Effect (Vanilla)
  const text = heroTitle.innerText;
  heroTitle.innerHTML = text.split('').map(char => 
    `<span class="letter inline-block">${char === ' ' ? '&nbsp;' : char}</span>`
  ).join('');

  // 2. Initial Animation Sequence
  const tl = gsap.timeline({ defaults: { ease: "power4.out" } });

  tl.from(".letter", {
    y: 100,
    opacity: 0,
    stagger: 0.05,
    duration: 1.2,
    ease: "elastic.out(1, 0.75)"
  })
  .to(heroTagline, {
    opacity: 1,
    y: -20,
    filter: "blur(0px)",
    duration: 1,
    startAt: { y: 0, filter: "blur(10px)" }
  }, "-=0.8")
  .to(authCard, {
    opacity: 1,
    scale: 1,
    duration: 1.5,
    ease: "elastic.out(1, 0.8)",
    startAt: { opacity: 0, scale: 0.9 }
  }, "-=1");

  // 3. Form Toggle Logic
  const switchToSignup = document.getElementById('switch-to-signup');
  const switchToLogin = document.getElementById('switch-to-login');

  switchToSignup.addEventListener('click', () => {
    gsap.to(track, {
      x: "-50%",
      duration: 0.6,
      ease: "power3.inOut"
    });
  });

  switchToLogin.addEventListener('click', () => {
    gsap.to(track, {
      x: "0%",
      duration: 0.6,
      ease: "power3.inOut"
    });
  });

  // 4. Create Starfield (Background micro-animation)
  const starfield = document.getElementById('starfield');
  for (let i = 0; i < 150; i++) {
    const star = document.createElement('div');
    star.className = 'star';
    const size = Math.random() * 2;
    star.style.width = `${size}px`;
    star.style.height = `${size}px`;
    star.style.left = `${Math.random() * 100}%`;
    star.style.top = `${Math.random() * 100}%`;
    starfield.appendChild(star);
    
    gsap.to(star, {
      opacity: Math.random(),
      duration: 1 + Math.random() * 3,
      repeat: -1,
      yoyo: true,
      delay: Math.random() * 2
    });
  }

  // 5. Button Pulse Effect
  const pulseBtns = document.querySelectorAll('.auth-btn-primary');
  pulseBtns.forEach(btn => {
    btn.addEventListener('mouseenter', () => {
      gsap.to(btn, { scale: 1.02, duration: 0.3 });
    });
    btn.addEventListener('mouseleave', () => {
      gsap.to(btn, { scale: 1, duration: 0.3 });
    });
  });
});
