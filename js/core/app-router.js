/**
 * app-router.js
 * Consolidated CodeSphere V2 SPA Router
 * Unifies navigation, sidebar state, and data hydration.
 */

class AppRouter {
  constructor() {
    this.currentViewId = null;
    this.currentParam = null;
    
    // DOM References
    this.appShell = document.getElementById('app-shell');
    this.sidebar = document.getElementById('main-sidebar');
    this.sidebarLinks = document.querySelectorAll('.sidebar-link');
    this.sidebarToggle = document.getElementById('sidebar-toggle');
    this.mainPlayer = document.getElementById('main-player');

    this.init();
  }

  init() {
    window.addEventListener('hashchange', () => this.handleRoute());
    
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => this.handleRoute());
    } else {
      this.handleRoute();
    }
    
    // Sidebar Toggle Logic (Unified)
    this.sidebarToggle?.addEventListener('click', () => {
      if (!this.sidebar || !this.appShell) return;
      const isHidden = this.sidebar.classList.contains('hidden');
      if (isHidden) {
        this.sidebar.classList.remove('hidden');
        this.sidebar.classList.add('lg:block');
        this.appShell.classList.add('lg:ml-64');
      } else {
        this.sidebar.classList.add('hidden');
        this.sidebar.classList.remove('lg:block');
        this.appShell.classList.remove('lg:ml-64');
      }
    });

    // Global exposure
    window.CodeSphere = window.CodeSphere || {};
    window.CodeSphere.switchView = (route) => this.switchView(route);
  }

  handleRoute() {
    const hash = window.location.hash.replace('#', '') || 'home';
    this.switchView(hash);
  }

  async switchView(route) {
    const [viewId, param] = route.split('/');
    const user = JSON.parse(sessionStorage.getItem('cs_user') || 'null');

    // 1. Auth Guard
    const publicRoutes = ['getting-started', 'login', 'signup'];
    if (!user && !publicRoutes.includes(viewId)) {
      window.location.hash = '#getting-started';
      return;
    }

    // 2. Prevent redundant transitions
    if (viewId === this.currentViewId && param === this.currentParam) return;

    // 3. UI Cleanup
    this.sidebarLinks.forEach(link => {
      const linkRoute = link.getAttribute('data-route') || link.getAttribute('data-category')?.toLowerCase();
      link.classList.toggle('active', linkRoute === viewId);
    });

    // 4. Player Cleanup
    if (this.currentViewId === 'player' && viewId !== 'player') {
      if (this.mainPlayer) {
        this.mainPlayer.pause();
        this.mainPlayer.src = '';
      }
    }

    // 5. Sidebar Visibility State (Unified)
    const hideSidebarRoutes = ['profile', 'settings', 'getting-started', 'login', 'signup'];
    if (hideSidebarRoutes.includes(viewId)) {
      this.sidebar?.classList.add('hidden');
      this.sidebar?.classList.remove('lg:block');
      this.appShell?.classList.remove('lg:ml-64');
    } else if (user) {
      this.sidebar?.classList.remove('hidden');
      this.sidebar?.classList.add('lg:block');
      this.appShell?.classList.add('lg:ml-64');
    }

    // 6. Resolve Target View
    console.log(`[Router] Switching to: ${viewId}`, { user: !!user });
    const targetId = viewId === 'player' ? 'player-view' : 
                     viewId === 'profile' ? 'profile-view' : 
                     viewId === 'getting-started' ? 'getting-started-view' : 
                     viewId === 'login' ? 'login-view' :
                     viewId === 'signup' ? 'signup-view' :
                     'home-view';

    const outgoingView = document.querySelector('.view-container:not(.hidden)');
    const incomingView = document.getElementById(targetId);
    
    console.log(`[Router] Target: ${targetId}`, { found: !!incomingView });

    if (!incomingView) {
      console.warn(`[Router] View not found: ${targetId}.`);
      if (viewId !== 'home') this.switchView('home');
      return;
    }

    // 7. Transition Sequence (GSAP)
    const tl = gsap.timeline();
    if (outgoingView && outgoingView !== incomingView) {
      tl.to(outgoingView, { opacity: 0, duration: 0.2, onComplete: () => {
        outgoingView.classList.add('hidden');
      }});
    }

    // 8. Content Loading & Hydration Control (H-10)
    try {
      if (viewId === 'player' && param) {
        if (window.CodeSphere?.loadPlayerView) await window.CodeSphere.loadPlayerView(param);
      } else if (viewId === 'profile') {
        // Trigger dashboard sync only on profile view entry
        if (window.CodeSphere?.dashboard?.syncAllPlatforms && user?.handles?.leetcode) {
          window.CodeSphere.dashboard.syncAllPlatforms(user.handles.leetcode);
        }
      } else if (['home', 'trending', 'java', 'dsa', 'webdev', 'ai'].includes(viewId)) {
        if (window.CodeSphere?.loadGridView) await window.CodeSphere.loadGridView(viewId);
      }
    } catch (err) {
      console.error('[Router] Content Load Error:', err);
    }

    this.currentViewId = viewId;
    this.currentParam = param;

    // 9. Reveal Incoming
    document.querySelectorAll('.view-container').forEach(v => {
      v.classList.remove('active');
      v.style.display = 'none';
      v.style.pointerEvents = 'none';
    });

    incomingView.classList.add('active');
    incomingView.style.display = 'flex';
    incomingView.style.pointerEvents = 'auto';
    
    // 10. Scroll Lock for Overlays
    if (['login', 'signup'].includes(viewId)) {
      document.body.classList.add('no-scroll');
    } else {
      document.body.classList.remove('no-scroll');
      window.scrollTo(0, 0);
    }
    
    if (this.currentViewId === null) {
      incomingView.style.opacity = '1';
    } else {
      tl.fromTo(incomingView, { opacity: 0 }, { 
        opacity: 1, 
        duration: 0.4, 
        ease: "power2.out"
      });
    }

    this.currentViewId = viewId;
    this.currentParam = param;
  }
}

export const router = new AppRouter();
window.CodeSphere.router = router;
