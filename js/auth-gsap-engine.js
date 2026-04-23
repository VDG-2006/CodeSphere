/**
 * auth-gsap-engine.js
 * Core Motion Specification & Auth Logic
 */

document.addEventListener('DOMContentLoaded', () => {
  gsap.registerPlugin(ScrollTrigger);

  const heroContainer = document.getElementById('hero-main-container');
  const authContainer = document.getElementById('auth-container');
  const landingSection = document.getElementById('getting-started-view');

  // 1. Entrance Animations
  const tl = gsap.timeline({ 
    defaults: { ease: "power4.out", duration: 1 },
    onComplete: () => {
      // Final fallback to ensure everything is visible
      gsap.set(".hero-description, .hero-cta-group, .feature-card-v2", { opacity: 1, visibility: 'visible' });
    }
  });

  // Title Reveal
  tl.to(".hero-reveal-text span", {
    y: 0,
    opacity: 1,
    stagger: 0.05,
    delay: 0.5
  })
  .from(".hero-description", {
    y: 20,
    opacity: 0
  }, "-=0.5")
  .from(".hero-cta-group", {
    y: 20,
    opacity: 0
  }, "-=0.6");

  // Scroll Reveal for Feature Cards
  gsap.utils.toArray(".feature-card-v2").forEach(card => {
    gsap.to(card, {
      scrollTrigger: {
        trigger: card,
        start: "top 85%",
        toggleActions: "play none none none"
      },
      filter: "blur(0px)",
      opacity: 1,
      y: 0,
      duration: 1,
      ease: "power2.out"
    });
  });

  // 2. State Transitions (Hero -> Auth)
  const showAuth = (mode = 'login') => {
    const isSignup = mode === 'signup';
    
    // Set initial form states before showing container
    if (isSignup) {
      loginForm.style.display = 'none';
      loginForm.style.opacity = '0';
      signupForm.style.display = 'block';
      signupForm.style.opacity = '1';
      document.getElementById('auth-title').innerText = 'Initialize Hub';
      document.getElementById('auth-subtitle').innerText = 'Create your secure developer identity.';
    } else {
      signupForm.style.display = 'none';
      signupForm.style.opacity = '0';
      loginForm.style.display = 'block';
      loginForm.style.opacity = '1';
      document.getElementById('auth-title').innerText = 'Portal Access';
      document.getElementById('auth-subtitle').innerText = 'Sign in to your workspace.';
    }

    const tlTransition = gsap.timeline();
    tlTransition.to(heroContainer, {
      x: -100,
      opacity: 0,
      duration: 0.8,
      display: 'none',
      ease: "power3.in"
    })
    .set(authContainer, { visibility: 'visible', display: 'block' })
    .to(authContainer, {
      x: 0,
      opacity: 1,
      duration: 0.8,
      ease: "power3.out"
    });
  };

  document.getElementById('get-started-btn')?.addEventListener('click', () => showAuth('signup'));
  document.getElementById('hero-login-btn')?.addEventListener('click', () => showAuth('login'));

  // 3. Auth Form Toggling (Login <-> Signup)
  const loginForm = document.getElementById('login-form');
  const signupForm = document.getElementById('signup-form');
  const formWrapper = document.querySelector('.auth-form-wrapper');

  const toggleAuthMode = (mode) => {
    const isSignup = mode === 'signup';
    const outgoing = isSignup ? loginForm : signupForm;
    const incoming = isSignup ? signupForm : loginForm;

    // 1. Snapshot current height to prevent jump
    const startHeight = formWrapper.offsetHeight;
    
    // 2. Cross-fade Sequence
    const tl = gsap.timeline();
    
    tl.to(outgoing, { 
      opacity: 0, 
      duration: 0.4, 
      ease: "power2.inOut",
      onComplete: () => {
        outgoing.style.display = 'none';
        incoming.style.display = 'block';
        
        // Match height of incoming
        const endHeight = incoming.scrollHeight;
        gsap.fromTo(formWrapper, { height: startHeight }, {
          height: endHeight,
          duration: 0.5,
          ease: "power4.inOut",
          clearProps: "height"
        });

        gsap.fromTo(incoming, { opacity: 0, y: 10 }, { 
          opacity: 1, 
          y: 0, 
          duration: 0.4, 
          ease: "power2.out" 
        });
      }
    });
  };

  document.getElementById('switch-to-signup')?.addEventListener('click', () => toggleAuthMode('signup'));
  document.getElementById('switch-to-login')?.addEventListener('click', () => toggleAuthMode('login'));

  // 4. Hover Effects & Sleek Button Interaction
  const buttons = document.querySelectorAll('.neon-btn, .auth-v2-btn');
  buttons.forEach(btn => {
    btn.addEventListener('mouseenter', () => gsap.to(btn, { scale: 1.03, duration: 0.3, ease: "power2.out" }));
    btn.addEventListener('mouseleave', () => gsap.to(btn, { scale: 1, duration: 0.3, ease: "power2.out" }));
  });

  // 5. Auth API Logic
  const handleAuth = async (endpoint, payload) => {
    try {
      const response = await fetch(`/api/auth/${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await response.json();
      
      if (data.success) {
        // Synchronize with global session management
        sessionStorage.setItem('cs_token', data.token);
        sessionStorage.setItem('cs_user', JSON.stringify(data.data || data.user));
        
        // Success Transition
        gsap.to(landingSection, {
          backgroundColor: '#000',
          opacity: 0,
          duration: 1.2,
          onComplete: () => {
            // Trigger global auth init if available, or just redirect
            if (window.CodeSphere?.auth?.initAuth) {
              window.CodeSphere.auth.initAuth();
            }
            window.location.href = 'home.html#home';
          }
        });
      } else {
        alert(data.message || "Authentication failed");
      }
    } catch (error) {
      console.error("Auth Error:", error);
    }
  };

  // Listeners for Forms
  loginForm?.addEventListener('submit', (e) => {
    e.preventDefault();
    const identifier = loginForm.querySelector('input[type="email"]').value;
    const password = loginForm.querySelector('input[type="password"]').value;
    handleAuth('login', { identifier, password });
  });

  signupForm?.addEventListener('submit', (e) => {
    e.preventDefault();
    const username = signupForm.querySelector('input[name="username"]').value;
    const email = signupForm.querySelector('input[type="email"]').value;
    const password = signupForm.querySelector('input[type="password"]').value;
    const handles = {
      leetcode: signupForm.querySelector('input[name="leetcode"]').value,
      codeforces: signupForm.querySelector('input[name="codeforces"]').value
    };
    handleAuth('register', { username, email, password, handles });
  });
});
