/**
 * home.js — Renders the YouTube-style mock feed for CodeSphere
 */

const mockVideos = [
  {
    title: "100 Days of System Design: The Complete Guide",
    channel: "ByteByteGo",
    views: "1.2M",
    time: "2 days ago",
    thumb: "https://images.unsplash.com/photo-1627398242454-45a1465c2479?auto=format&fit=crop&q=80&w=640",
    avatar: "https://ui-avatars.com/api/?name=BBG&background=0A0A0A&color=fff"
  },
  {
    title: "Dynamic Programming - Learn to Solve Algorithmic Problems",
    channel: "freeCodeCamp",
    views: "3.4M",
    time: "1 year ago",
    thumb: "https://images.unsplash.com/photo-1555066931-4365d14bab8c?auto=format&fit=crop&q=80&w=640",
    avatar: "https://ui-avatars.com/api/?name=FCC&background=0A0A0A&color=fff"
  },
  {
    title: "I built my own React in 5 hours",
    channel: "Theo - t3.gg",
    views: "250K",
    time: "12 hours ago",
    thumb: "https://images.unsplash.com/photo-1633356122544-f134324a6cee?auto=format&fit=crop&q=80&w=640",
    avatar: "https://ui-avatars.com/api/?name=T3&background=0A0A0A&color=fff"
  },
  {
    title: "NeetCode 150 - Core Blind 75 Explained",
    channel: "NeetCode",
    views: "890K",
    time: "3 months ago",
    thumb: "https://images.unsplash.com/photo-1526379095098-d400fd0bf935?auto=format&fit=crop&q=80&w=640",
    avatar: "https://ui-avatars.com/api/?name=NC&background=00B8A3&color=fff"
  },
  {
    title: "Fullstack Next.js Portfolio Course",
    channel: "Javascript Mastery",
    views: "1.5M",
    time: "5 months ago",
    thumb: "https://images.unsplash.com/photo-1618477388954-7f1540203f19?auto=format&fit=crop&q=80&w=640",
    avatar: "https://ui-avatars.com/api/?name=JM&background=0A0A0A&color=fff"
  },
  {
    title: "How I pass coding interviews at FAANG",
    channel: "NeetCode",
    views: "2.1M",
    time: "1 year ago",
    thumb: "https://images.unsplash.com/photo-1573164713988-8665fc963095?auto=format&fit=crop&q=80&w=640",
    avatar: "https://ui-avatars.com/api/?name=NC&background=00B8A3&color=fff"
  },
  {
    title: "Stop using useEffect (Use this instead)",
    channel: "Web Dev Simplified",
    views: "450K",
    time: "1 week ago",
    thumb: "https://images.unsplash.com/photo-1555099962-4199c345e5dd?auto=format&fit=crop&q=80&w=640",
    avatar: "https://ui-avatars.com/api/?name=WDS&background=0A0A0A&color=fff"
  },
  {
    title: "Understanding Microservices vs Monoliths",
    channel: "Fireship",
    views: "980K",
    time: "6 months ago",
    thumb: "https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&q=80&w=640",
    avatar: "https://ui-avatars.com/api/?name=FS&background=FF2D55&color=fff"
  },
  {
    title: "Why C++ is still the king of performance",
    channel: "The Cherno",
    views: "320K",
    time: "2 weeks ago",
    thumb: "https://images.unsplash.com/photo-1542831371-29b0f74f9713?auto=format&fit=crop&q=80&w=640",
    avatar: "https://ui-avatars.com/api/?name=TC&background=007AFF&color=fff"
  },
  {
    title: "GraphQL in 100 Seconds",
    channel: "Fireship",
    views: "660K",
    time: "2 years ago",
    thumb: "https://images.unsplash.com/photo-1551033406-611cf9a28f67?auto=format&fit=crop&q=80&w=640",
    avatar: "https://ui-avatars.com/api/?name=FS&background=FF2D55&color=fff"
  },
  {
    title: "Deep Dive into V8 Engine",
    channel: "JSConf",
    views: "1.1M",
    time: "4 years ago",
    thumb: "https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&q=80&w=640",
    avatar: "https://ui-avatars.com/api/?name=JSC&background=FFB800&color=fff"
  },
  {
    title: "Kubernetes Explained in 15 Minutes",
    channel: "TechWorld with Nana",
    views: "2.8M",
    time: "1 year ago",
    thumb: "https://images.unsplash.com/photo-1667372393086-9d4001d4d7dc?auto=format&fit=crop&q=80&w=640",
    avatar: "https://ui-avatars.com/api/?name=TWN&background=0A0A0A&color=fff"
  }
];

function renderHomeFeed() {
  const container = document.getElementById('home-feed-grid');
  if (!container) return;

  const html = mockVideos.map(video => `
    <article class="content-card">
      <div class="card-thumbnail">
        <img src="${video.thumb}" alt="${video.title} thumbnail" loading="lazy" />
      </div>
      <div class="card-details" style="display:flex; gap:12px; margin-top:8px;">
        <img src="${video.avatar}" alt="Avatar" width="36" height="36" style="border-radius:50%; object-fit:cover; flex-shrink:0;" />
        <div class="card-meta" style="min-width:0;">
          <h3 style="font-size:14px; margin:0; color:var(--color-text-primary); display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; overflow:hidden;">
            ${video.title}
          </h3>
          <div style="font-size:12px; color:var(--color-text-muted); margin-top:4px;">
            <div>${video.channel}</div>
            <div>${video.views} • ${video.time}</div>
          </div>
        </div>
      </div>
    </article>
  `).join('');

  container.innerHTML = html;
}

// Initial render
document.addEventListener('DOMContentLoaded', () => {
  renderHomeFeed();
});

// Also re-render if router changes back
document.addEventListener('routechange', ({detail}) => {
  if (detail.route === 'home') {
    renderHomeFeed();
  }
});
