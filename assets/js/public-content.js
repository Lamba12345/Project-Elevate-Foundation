// ============================================================
// PROJECT ELEVATE FOUNDATION — PUBLIC APPROVED CONTENT LOADER
// Safely queries ONLY 'APPROVED' content from Supabase.
// Never exposes administrative, draft, or pending controls.
// ============================================================

(function () {
  'use strict';

  const supabase = window.elevateSupabase;

  function escapeHtml(str) {
    if (str === null || str === undefined) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function formatDate(d) {
    if (!d) return '';
    try {
      const date = new Date(d);
      return date.toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'short',
        year: 'numeric'
      });
    } catch (_) {
      return d;
    }
  }

  async function loadApprovedPublicContent() {
    if (!supabase) return;

    try {
      // Query ONLY approved content (also enforced by database RLS)
      const { data, error } = await supabase
        .from('content_submissions')
        .select('*')
        .eq('status', 'APPROVED')
        .order('created_at', { ascending: false });

      if (error || !data || data.length === 0) return;

      renderApprovedGallery(data.filter(i => i.content_type === 'gallery'));
      renderApprovedNews(data.filter(i => i.content_type === 'news_announcement' || i.content_type === 'publication'));
      renderApprovedEvents(data.filter(i => i.content_type === 'event'));
      renderApprovedAnnouncements(data.filter(i => i.content_type === 'news_announcement' && (i.metadata?.is_banner || i.summary?.includes('announcement'))));
      renderApprovedPageUpdates(data);

    } catch (e) {
      console.warn('Public content loader (using default static content):', e);
    }
  }

  // 1. Photo and Video Gallery
  function renderApprovedGallery(items) {
    const galleryGrid = document.getElementById('public-gallery-grid');
    if (!galleryGrid || items.length === 0) return;

    items.forEach(item => {
      const card = document.createElement('div');
      card.className = 'gallery-card card reveal visible';
      const mediaHtml = item.metadata?.media_type === 'video'
        ? `<div class="gallery-video-wrap"><iframe src="${escapeHtml(item.image_url)}" title="${escapeHtml(item.title)}" allowfullscreen></iframe></div>`
        : `<div class="gallery-img-wrap"><img src="${escapeHtml(item.image_url || 'assets/images/program_community.jpg')}" alt="${escapeHtml(item.title)}" /></div>`;

      card.innerHTML = `
        ${mediaHtml}
        <div class="gallery-body">
          <div class="gallery-title">${escapeHtml(item.title)}</div>
          <p class="gallery-caption">${escapeHtml(item.summary || item.content || '')}</p>
        </div>
      `;
      galleryGrid.prepend(card);
    });
  }

  // 2. News, Stories & Publications (Blog & Preview)
  function renderApprovedNews(items) {
    if (items.length === 0) return;

    // Blog Page Grid
    const blogPostsContainer = document.querySelector('.blog-posts');
    if (blogPostsContainer) {
      items.forEach(item => {
        // Prevent duplicate if already in DOM
        if (document.getElementById(`pub-item-${item.id}`)) return;

        const isPub = item.content_type === 'publication';
        const tag = isPub ? 'Publication' : (item.metadata?.category || 'News');
        const author = isPub ? (item.metadata?.author || 'TOBI Jane Davidson') : (item.author_name || 'Project Elevate');
        const dateStr = item.metadata?.release_date || formatDate(item.created_at);

        const article = document.createElement('article');
        article.className = 'blog-post-card card reveal visible';
        article.id = `pub-item-${item.id}`;
        article.innerHTML = `
          <div class="bpc-img">
            <img src="${escapeHtml(item.image_url || (isPub ? 'assets/images/book-release.jpg' : 'assets/images/program_education.jpg'))}" alt="${escapeHtml(item.title)}" />
            <span class="tag ${isPub ? 'tag-accent' : ''}">${escapeHtml(tag)}</span>
          </div>
          <div class="bpc-body">
            <div class="blog-meta">
              <span>📅 ${escapeHtml(dateStr)}</span>
              <span>·</span>
              <span>by ${escapeHtml(author)}</span>
            </div>
            <h3><a href="javascript:void(0)">${escapeHtml(item.title)}</a></h3>
            <p>${escapeHtml(item.summary || item.content || '')}</p>
            ${item.metadata?.purchase_link ? `<a href="${escapeHtml(item.metadata.purchase_link)}" target="_blank" class="blog-read-more">Learn More / Order →</a>` : '<a href="javascript:void(0)" class="blog-read-more">Read More →</a>'}
          </div>
        `;
        blogPostsContainer.prepend(article);
      });
    }

    // Index Blog Preview
    const indexGrid = document.querySelector('.blog-grid');
    if (indexGrid && items.length > 0) {
      const topItems = items.slice(0, 2);
      topItems.forEach(item => {
        const isPub = item.content_type === 'publication';
        const card = document.createElement('article');
        card.className = 'blog-card card reveal visible';
        card.innerHTML = `
          <div class="blog-img-wrap">
            <img src="${escapeHtml(item.image_url || 'assets/images/program_education.jpg')}" alt="${escapeHtml(item.title)}" />
            <span class="tag ${isPub ? 'tag-accent' : ''}">${escapeHtml(isPub ? 'Book Release' : 'News')}</span>
          </div>
          <div class="blog-body">
            <div class="blog-date">📅 ${escapeHtml(item.metadata?.release_date || formatDate(item.created_at))}</div>
            <h4><a href="blog.html">${escapeHtml(item.title)}</a></h4>
            <p>${escapeHtml(item.summary || item.content || '')}</p>
            <a href="blog.html" class="blog-read-more">Read Story →</a>
          </div>
        `;
        indexGrid.prepend(card);
      });
    }
  }

  // 3. Events
  function renderApprovedEvents(items) {
    const eventsGrid = document.getElementById('public-events-grid');
    if (!eventsGrid || items.length === 0) return;

    items.forEach(item => {
      const card = document.createElement('div');
      card.className = 'event-card card reveal visible';
      card.innerHTML = `
        <div class="event-card-header">
          <span class="event-category-tag">Upcoming Event</span>
        </div>
        <div class="event-card-title">${escapeHtml(item.title)}</div>
        <div class="event-card-meta">
          <span>📅 ${escapeHtml(item.metadata?.event_date || formatDate(item.created_at))}</span>
          <span>📍 ${escapeHtml(item.metadata?.location || 'Accra, Ghana')}</span>
        </div>
        <p class="event-card-desc">${escapeHtml(item.summary || item.content || '')}</p>
        ${item.metadata?.registration_url ? `<div><a href="${escapeHtml(item.metadata.registration_url)}" class="btn btn-outline btn-sm" target="_blank">Register / Inquire →</a></div>` : ''}
      `;
      eventsGrid.prepend(card);
    });
  }

  // 4. Announcements
  function renderApprovedAnnouncements(items) {
    if (items.length === 0) return;
    const a = items[0];

    let banner = document.getElementById('public-announcement-banner');
    if (!banner) {
      banner = document.createElement('div');
      banner.id = 'public-announcement-banner';
      banner.style.cssText = 'background:linear-gradient(90deg,#0f172a,#0284c7);color:#fff;padding:10px 16px;text-align:center;font-size:0.86rem;position:relative;z-index:999;';
      document.body.prepend(banner);
    }

    banner.innerHTML = `
      <div style="display:inline-flex;align-items:center;gap:8px;max-width:1200px;margin:0 auto;flex-wrap:wrap;justify-content:center;">
        <span style="background:#eab308;color:#000;font-weight:800;font-size:0.7rem;padding:2px 7px;border-radius:4px;text-transform:uppercase;">Notice</span>
        <span><strong>${escapeHtml(a.title)}:</strong> ${escapeHtml(a.summary || a.content || '')}</span>
      </div>
    `;
  }

  
  // 5. Page-Specific Dynamic Updates
  function detectCurrentPage() {
    const p = window.location.pathname.toLowerCase();
    if (p.includes('about')) return 'about';
    if (p.includes('programs')) return 'programs';
    if (p.includes('blog')) return 'blog';
    if (p.includes('volunteer')) return 'volunteer';
    if (p.includes('contact')) return 'contact';
    if (p.includes('donate')) return 'donate';
    return 'home';
  }

  function renderApprovedPageUpdates(data) {
    const page = detectCurrentPage();
    if (page === 'about') {
      renderApprovedAboutContent(data.filter(i => (i.metadata?.target_page || i.metadata?.page || '').toLowerCase() === 'about'));
      return;
    }

    const pageItems = data.filter(i => {
      const p = (i.metadata?.target_page || i.metadata?.page || '').toLowerCase();
      return p === page;
    });

    if (pageItems.length === 0) return;

    // Check if page has hero announcement or banner
    const bannerItem = pageItems.find(i => (i.metadata?.target_section && i.metadata.target_section.toLowerCase().includes('banner')) || i.metadata?.is_banner);
    if (bannerItem && !document.getElementById('public-announcement-banner')) {
      renderApprovedAnnouncements([bannerItem]);
    }
  }

  function renderApprovedAboutContent(items) {
    if (!items || items.length === 0) return;

    const dynamicContainer = document.getElementById('dynamic-about-sections');
    if (dynamicContainer) dynamicContainer.innerHTML = '';

    items.forEach(item => {
      const meta = item.metadata || {};
      const key = meta.section_key || '';
      const section = (meta.target_section || '').toLowerCase();

      // 1. Hero Tagline
      if (key === 'about.hero' || section.includes('hero')) {
        const heroP = document.querySelector('[data-content-key="about.hero.tagline"]') || document.querySelector('.page-hero p');
        if (heroP && (item.summary || item.content)) heroP.textContent = item.summary || item.content;
        return;
      }

      // 2. Story: Heading, Paragraphs, Image
      if (key === 'about.story' || section === 'our story') {
        const storyTitle = document.querySelector('[data-content-key="about.story.title"]');
        if (storyTitle && item.title) storyTitle.textContent = item.title;

        // Paragraphs
        if (item.content) {
          const paragraphs = item.content.split('\n\n').filter(Boolean);
          const p1 = document.querySelector('[data-content-key="about.story.p1"]');
          const p2 = document.querySelector('[data-content-key="about.story.p2"]');
          const p3 = document.querySelector('[data-content-key="about.story.p3"]');
          if (p1 && paragraphs[0]) p1.textContent = paragraphs[0];
          if (p2 && paragraphs[1]) p2.textContent = paragraphs[1];
          if (p3 && paragraphs[2]) p3.textContent = paragraphs[2];
        }

        // Image
        if (item.image_url) {
          const img = document.querySelector('[data-image-key="about.story.image"]');
          if (img) {
            img.src = item.image_url;
            img.className = 'about-media-img';
            if (meta.image_caption) {
              let captionEl = document.getElementById('about-story-caption');
              if (!captionEl) {
                captionEl = document.createElement('div');
                captionEl.id = 'about-story-caption';
                captionEl.className = 'about-caption-wrap';
                img.parentNode.appendChild(captionEl);
              }
              captionEl.innerHTML = `<span>📷</span> <span>${escapeHtml(meta.image_caption)}</span>`;
            }
          }
        }
        return;
      }

      // 3. Founder Signature
      if (key === 'about.founder' || section.includes('founder')) {
        const sigName = document.querySelector('[data-content-key="about.story.sig_name"]');
        const sigTitle = document.querySelector('[data-content-key="about.story.sig_title"]');
        if (sigName && item.title) sigName.textContent = item.title;
        if (sigTitle && item.summary) sigTitle.textContent = item.summary;
        return;
      }

      // 4. Vision Statement
      if (key === 'about.vision' || section.includes('vision')) {
        const visP = document.querySelector('[data-content-key="about.vision.text"]');
        if (visP && item.content) visP.textContent = item.content;
        return;
      }

      // 5. Mission Statement
      if (key === 'about.mission' || section.includes('mission')) {
        const misP = document.querySelector('[data-content-key="about.mission.text"]');
        if (misP && item.content) misP.textContent = item.content;
        return;
      }

      // 6. Custom Section or Additional Published Content
      if (dynamicContainer) {
        const secEl = document.createElement('section');
        secEl.className = 'section dynamic-about-section reveal visible';
        secEl.id = `about-custom-sec-${item.id}`;

        const paragraphsHtml = (item.content || item.summary || '')
          .split('\n\n')
          .filter(Boolean)
          .map(p => `<p style="margin-top:14px;font-size:0.95rem;line-height:1.65;color:var(--text-mid);white-space:pre-wrap;">${escapeHtml(p)}</p>`)
          .join('');

        const imageHtml = item.image_url ? `
          <div class="story-visual">
            <img src="${escapeHtml(item.image_url)}" alt="${escapeHtml(item.title)}" class="about-media-img" loading="lazy" />
            ${meta.image_caption ? `<div class="about-caption-wrap"><span>📷</span> <span>${escapeHtml(meta.image_caption)}</span></div>` : ''}
          </div>
        ` : '';

        const gridClass = item.image_url ? 'story-grid' : 'single-col-grid';

        secEl.innerHTML = `
          <div class="container">
            <div class="${gridClass}">
              <div class="story-text">
                <span class="section-label">${escapeHtml(meta.target_section || 'Special Focus')}</span>
                <h2>${escapeHtml(item.title)}</h2>
                ${paragraphsHtml}
              </div>
              ${imageHtml}
            </div>
          </div>
        `;
        dynamicContainer.appendChild(secEl);
      }
    });
  }


  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      loadApprovedPublicContent();
    });
  } else {
    loadApprovedPublicContent();
  }

})();
