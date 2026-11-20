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
    let approvedItems = [];
    const deletedIds = new Set();

    // 1. Fetch from Supabase (if online and schema is hosted)
    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('content_submissions')
          .select('*')
          .in('status', ['APPROVED', 'DELETED'])
          .order('created_at', { ascending: false });

        if (!error && data && data.length > 0) {
          data.forEach(item => {
            if (item.status === 'DELETED' || item.content_type === 'tombstone') {
              const delId = item.metadata?.deleted_id || item.summary || (item.title && item.title.startsWith('[DELETED] ') ? item.title.replace('[DELETED] ', '') : null);
              if (delId) deletedIds.add(String(delId).trim());
            } else if (item.status === 'APPROVED') {
              approvedItems.push(item);
            }
          });
        }
      } catch (e) {
        console.warn('Supabase public content check:', e);
      }
    }

    // 2. Merge with locally saved custom submissions (unhosted / schema cache resilient)
    try {
      const raw = localStorage.getItem('pef_custom_submissions');
      if (raw) {
        const localCustom = JSON.parse(raw);
        const existingIds = new Set(approvedItems.map(i => String(i.id)));
        localCustom.forEach(item => {
          if (item.status === 'APPROVED' && !existingIds.has(String(item.id))) {
            approvedItems.push(item);
          }
        });
      }
    } catch (_) { }

    // 3. Filter out any locally deleted submission IDs and add to deletedIds
    try {
      const delRaw = localStorage.getItem('pef_deleted_submission_ids');
      if (delRaw) {
        const localDels = JSON.parse(delRaw);
        if (Array.isArray(localDels)) {
          localDels.forEach(id => deletedIds.add(String(id).trim()));
        }
      }
    } catch (_) { }

    // Filter approved items against deleted IDs
    approvedItems = approvedItems.filter(i => !deletedIds.has(String(i.id)));

    // Apply deletions to any hardcoded default DOM elements (team members, sections, etc.)
    applyDomDeletions(deletedIds, approvedItems);

    if (approvedItems.length === 0) return;

    renderApprovedGallery(approvedItems.filter(i => i.content_type === 'gallery'));
    renderApprovedNews(approvedItems.filter(i => i.content_type === 'news_announcement' || i.content_type === 'publication'));
    renderApprovedEvents(approvedItems.filter(i => i.content_type === 'event'));
    renderApprovedAnnouncements(approvedItems.filter(i => i.content_type === 'news_announcement' && (i.metadata?.is_banner || i.summary?.includes('announcement'))));
    renderApprovedPageUpdates(approvedItems);
  }

  function applyDomDeletions(deletedIds, approvedItems) {
    if (!deletedIds || deletedIds.size === 0) return;

    const approvedTeamKeys = new Set(
      (approvedItems || [])
        .map(i => i.metadata?.section_key || i.metadata?.team_id || String(i.id))
        .filter(Boolean)
    );

    const teamMapping = [
      { id: 'default-about-team-1', key: 'about.team.1', selector: '#team-1, [data-team-id="default-about-team-1"]' },
      { id: 'default-about-team-2', key: 'about.team.2', selector: '#team-2, [data-team-id="default-about-team-2"]' },
      { id: 'default-about-team-3', key: 'about.team.3', selector: '#team-3, [data-team-id="default-about-team-3"]' },
      { id: 'default-about-team-4', key: 'about.team.4', selector: '#team-4, [data-team-id="default-about-team-4"]' },
    ];

    teamMapping.forEach(tm => {
      const isDeleted = deletedIds.has(tm.id) || deletedIds.has(tm.key) || deletedIds.has(tm.id.replace('default-about-', ''));
      const hasReplacement = approvedTeamKeys.has(tm.key) || approvedTeamKeys.has(tm.id) || approvedTeamKeys.has(tm.id.replace('default-about-', ''));
      if (isDeleted && !hasReplacement) {
        document.querySelectorAll(tm.selector).forEach(el => el.remove());
      }
    });

    if (deletedIds.has('default-about-values')) {
      document.getElementById('card-values')?.remove();
    }
    if (deletedIds.has('default-about-vision')) {
      document.getElementById('card-vision')?.remove();
    }
    if (deletedIds.has('default-about-mission')) {
      document.getElementById('card-mission')?.remove();
    }
    if (deletedIds.has('default-about-beneficiaries')) {
      document.getElementById('beneficiaries')?.remove();
    }
    if (deletedIds.has('default-about-pillars')) {
      document.getElementById('pillars')?.remove();
    }
    if (deletedIds.has('default-about-timeline')) {
      const tl = document.querySelector('.timeline');
      if (tl) tl.closest('section')?.remove();
    }

    // Programs pillars deletion
    if (deletedIds.has('default-prog-p1') || deletedIds.has('programs.education')) {
      document.getElementById('education')?.remove();
    }
    if (deletedIds.has('default-prog-p2') || deletedIds.has('programs.youth')) {
      document.getElementById('youth')?.remove();
    }
    if (deletedIds.has('default-prog-p3') || deletedIds.has('programs.skills')) {
      document.getElementById('skills')?.remove();
    }
    if (deletedIds.has('default-prog-p4') || deletedIds.has('programs.livelihood')) {
      document.getElementById('livelihood')?.remove();
    }
    if (deletedIds.has('default-prog-p5') || deletedIds.has('programs.community')) {
      document.getElementById('community')?.remove();
    }

    // Home sections deletion
    if (deletedIds.has('default-home-cta')) {
      document.querySelector('.cta-banner')?.remove();
    }
    if (deletedIds.has('default-home-mission')) {
      document.getElementById('mission')?.remove();
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
    if (page === 'home') {
      renderApprovedHomeContent(data.filter(i => (i.metadata?.target_page || i.metadata?.page || '').toLowerCase() === 'home'));
      return;
    }
    if (page === 'programs') {
      renderApprovedProgramsContent(data.filter(i => (i.metadata?.target_page || i.metadata?.page || '').toLowerCase() === 'programs' || i.content_type === 'activity'));
      return;
    }
    if (page === 'volunteer') {
      renderApprovedVolunteerContent(data.filter(i => (i.metadata?.target_page || i.metadata?.page || '').toLowerCase() === 'volunteer'));
      return;
    }
    if (page === 'contact') {
      renderApprovedContactContent(data.filter(i => (i.metadata?.target_page || i.metadata?.page || '').toLowerCase() === 'contact'));
      return;
    }
    if (page === 'donate') {
      renderApprovedDonateContent(data.filter(i => (i.metadata?.target_page || i.metadata?.page || '').toLowerCase() === 'donate'));
      return;
    }
    if (page === 'blog') {
      renderApprovedBlogContent(data.filter(i => (i.metadata?.target_page || i.metadata?.page || '').toLowerCase() === 'blog' || i.content_type === 'news_announcement' || i.content_type === 'publication'));
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

  function renderApprovedHomeContent(items) {
    if (!items || items.length === 0) return;

    items.forEach(item => {
      const meta = item.metadata || {};
      const key = meta.section_key || '';
      const section = (meta.target_section || '').toLowerCase();

      // Hero
      if (key === 'home.hero' || section.includes('hero')) {
        const titleEl = document.querySelector('[data-content-key="home.hero.title"]') || document.querySelector('.hero-text h1');
        if (titleEl && item.title) {
          titleEl.innerHTML = `${escapeHtml(item.title)}<br /><span class="hero-gradient-text">Project Elevate Foundation</span>`;
        }
        const badgeEl = document.querySelector('[data-content-key="home.hero.badge"]') || document.querySelector('.hero-badge');
        if (badgeEl && item.summary) {
          badgeEl.innerHTML = `<span>✨</span> ${escapeHtml(item.summary)}`;
        }
        const leadEl = document.querySelector('[data-content-key="home.hero.lead"]') || document.querySelector('.hero-text p');
        if (leadEl && item.content) {
          leadEl.textContent = item.content;
        }
        if (item.image_url) {
          const img = document.querySelector('[data-image-key="home.hero.banner_img"]') || document.querySelector('.hero-bg img');
          if (img) img.src = item.image_url;
        }
        return;
      }

      // Mission
      if (key === 'home.mission' || section.includes('mission') || section.includes('purpose')) {
        const titleEl = document.querySelector('[data-content-key="home.mission.title"]');
        if (titleEl && item.title) titleEl.textContent = item.title;
        const pEl = document.querySelector('#mission p');
        if (pEl && item.content) pEl.textContent = item.content;
        return;
      }

      // CTA Banner
      if (key === 'home.cta' || section.includes('cta') || section.includes('call to action')) {
        const ctaH2 = document.querySelector('.cta-banner h2');
        if (ctaH2 && item.title) ctaH2.textContent = item.title;
        const ctaP = document.querySelector('.cta-banner p');
        if (ctaP && (item.content || item.summary)) ctaP.textContent = item.content || item.summary;
        return;
      }
    });
  }

  function renderApprovedProgramsContent(items) {
    if (!items || items.length === 0) return;

    items.forEach(item => {
      const meta = item.metadata || {};
      const key = meta.section_key || '';
      const section = (meta.target_section || '').toLowerCase();

      // Hero
      if (key === 'programs.hero' || section.includes('hero')) {
        const heroP = document.querySelector('.page-hero p');
        if (heroP && (item.summary || item.content)) heroP.textContent = item.summary || item.content;
        return;
      }

      // Pillar 1: Education
      if (key === 'programs.education' || section.includes('education') || section.includes('pillar 1') || section.includes('pillar 01')) {
        const title = document.querySelector('[data-content-key="programs.education.title"]');
        if (title && item.title) title.textContent = item.title.replace(/^Pillar 0?1:\s*/i, '');
        const tagline = document.querySelector('[data-content-key="programs.education.tagline"]');
        if (tagline && item.summary) tagline.textContent = item.summary;
        const desc = document.querySelector('[data-content-key="programs.education.desc"]');
        if (desc && item.content) desc.textContent = item.content;
        if (item.image_url) {
          const img = document.querySelector('#education img');
          if (img) img.src = item.image_url;
        }
        return;
      }

      // Pillar 2: Youth
      if (key === 'programs.youth' || section.includes('youth') || section.includes('pillar 2') || section.includes('pillar 02')) {
        const title = document.querySelector('[data-content-key="programs.youth.title"]');
        if (title && item.title) title.textContent = item.title.replace(/^Pillar 0?2:\s*/i, '');
        const tagline = document.querySelector('[data-content-key="programs.youth.tagline"]');
        if (tagline && item.summary) tagline.textContent = item.summary;
        const desc = document.querySelector('[data-content-key="programs.youth.desc"]');
        if (desc && item.content) desc.textContent = item.content;
        if (item.image_url) {
          const img = document.querySelector('#youth img');
          if (img) img.src = item.image_url;
        }
        return;
      }

      // Pillar 3: Skills
      if (key === 'programs.skills' || section.includes('skills') || section.includes('pillar 3') || section.includes('pillar 03')) {
        const title = document.querySelector('[data-content-key="programs.skills.title"]');
        if (title && item.title) title.textContent = item.title.replace(/^Pillar 0?3:\s*/i, '');
        const tagline = document.querySelector('[data-content-key="programs.skills.tagline"]');
        if (tagline && item.summary) tagline.textContent = item.summary;
        const desc = document.querySelector('[data-content-key="programs.skills.desc"]');
        if (desc && item.content) desc.textContent = item.content;
        if (item.image_url) {
          const img = document.querySelector('#skills img');
          if (img) img.src = item.image_url;
        }
        return;
      }

      // Pillar 4: Livelihood
      if (key === 'programs.livelihood' || section.includes('livelihood') || section.includes('pillar 4') || section.includes('pillar 04')) {
        const title = document.querySelector('[data-content-key="programs.livelihood.title"]');
        if (title && item.title) title.textContent = item.title.replace(/^Pillar 0?4:\s*/i, '');
        const tagline = document.querySelector('[data-content-key="programs.livelihood.tagline"]');
        if (tagline && item.summary) tagline.textContent = item.summary;
        const desc = document.querySelector('[data-content-key="programs.livelihood.desc"]');
        if (desc && item.content) desc.textContent = item.content;
        if (item.image_url) {
          const img = document.querySelector('#livelihood img');
          if (img) img.src = item.image_url;
        }
        return;
      }

      // Pillar 5: Community
      if (key === 'programs.community' || section.includes('community') || section.includes('pillar 5') || section.includes('pillar 05')) {
        const title = document.querySelector('[data-content-key="programs.community.title"]');
        if (title && item.title) title.textContent = item.title.replace(/^Pillar 0?5:\s*/i, '');
        const tagline = document.querySelector('[data-content-key="programs.community.tagline"]');
        if (tagline && item.summary) tagline.textContent = item.summary;
        const desc = document.querySelector('[data-content-key="programs.community.desc"]');
        if (desc && item.content) desc.textContent = item.content;
        if (item.image_url) {
          const img = document.querySelector('#community img');
          if (img) img.src = item.image_url;
        }
        return;
      }
    });
  }

  function renderApprovedVolunteerContent(items) {
    if (!items || items.length === 0) return;

    items.forEach(item => {
      const meta = item.metadata || {};
      const key = meta.section_key || '';
      const section = (meta.target_section || '').toLowerCase();

      // Hero
      if (key === 'volunteer.hero' || section.includes('hero')) {
        const heroP = document.querySelector('.page-hero p');
        if (heroP && (item.summary || item.content)) heroP.textContent = item.summary || item.content;
        return;
      }

      // Why Volunteer
      if (key === 'volunteer.why' || section.includes('why')) {
        const headerH2 = document.querySelector('.section-header h2');
        if (headerH2 && item.title) headerH2.textContent = item.title;
        const headerP = document.querySelector('.section-header p');
        if (headerP && (item.summary || item.content)) headerP.textContent = item.summary || item.content;
        return;
      }

      // Volunteer Roles
      if (key === 'volunteer.roles' || section.includes('roles')) {
        const introP = document.querySelector('.volunteer-intro p');
        if (introP && (item.summary || item.content)) introP.textContent = item.summary || item.content;
        return;
      }
    });
  }

  function renderApprovedContactContent(items) {
    if (!items || items.length === 0) return;

    items.forEach(item => {
      const meta = item.metadata || {};
      const key = meta.section_key || '';
      const section = (meta.target_section || '').toLowerCase();

      // Hero
      if (key === 'contact.hero' || section.includes('hero')) {
        const heroP = document.querySelector('.page-hero p');
        if (heroP && (item.summary || item.content)) heroP.textContent = item.summary || item.content;
        return;
      }

      // Contact info
      if (key === 'contact.info' || section.includes('info')) {
        const infoP = document.querySelector('.contact-info p');
        if (infoP && (item.summary || item.content)) infoP.textContent = item.summary || item.content;
        return;
      }
    });
  }

  function renderApprovedDonateContent(items) {
    if (!items || items.length === 0) return;

    items.forEach(item => {
      const meta = item.metadata || {};
      const key = meta.section_key || '';
      const section = (meta.target_section || '').toLowerCase();

      // Hero
      if (key === 'donate.hero' || section.includes('hero')) {
        const heroP = document.querySelector('.page-hero p');
        if (heroP && (item.summary || item.content)) heroP.textContent = item.summary || item.content;
        return;
      }

      // Instructions / Notes
      if (key === 'donate.instructions' || section.includes('payment') || section.includes('instruction')) {
        const momoNote = document.querySelector('.momo-note');
        if (momoNote && (item.content || item.summary)) momoNote.textContent = item.content || item.summary;
        return;
      }
    });
  }

  function renderApprovedBlogContent(items) {
    if (!items || items.length === 0) return;

    items.forEach(item => {
      const meta = item.metadata || {};
      const key = meta.section_key || '';
      const section = (meta.target_section || '').toLowerCase();

      // Hero
      if (key === 'blog.hero' || section.includes('hero')) {
        const heroP = document.querySelector('.page-hero p');
        if (heroP && (item.summary || item.content)) heroP.textContent = item.summary || item.content;
        return;
      }
    });
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

      // 6. Leadership / Team Members
      if (key.startsWith('about.team') || section.includes('leadership') || meta.team_id) {
        let card = null;
        if (key === 'about.team.1' || meta.team_id === 'team-1' || meta.team_id === 'default-about-team-1' || item.id === 'default-about-team-1') {
          card = document.getElementById('team-1') || document.querySelector('[data-team-id="default-about-team-1"]');
        } else if (key === 'about.team.2' || meta.team_id === 'team-2' || meta.team_id === 'default-about-team-2' || item.id === 'default-about-team-2') {
          card = document.getElementById('team-2') || document.querySelector('[data-team-id="default-about-team-2"]');
        } else if (key === 'about.team.3' || meta.team_id === 'team-3' || meta.team_id === 'default-about-team-3' || item.id === 'default-about-team-3') {
          card = document.getElementById('team-3') || document.querySelector('[data-team-id="default-about-team-3"]');
        } else if (key === 'about.team.4' || meta.team_id === 'team-4' || meta.team_id === 'default-about-team-4' || item.id === 'default-about-team-4') {
          card = document.getElementById('team-4') || document.querySelector('[data-team-id="default-about-team-4"]');
        } else {
          card = document.getElementById(`team-${item.id}`);
        }

        const teamGrid = document.querySelector('.team-grid');
        if (card) {
          const h4 = card.querySelector('h4');
          if (h4 && item.title) h4.textContent = item.title;
          const roleEl = card.querySelector('.team-role');
          if (roleEl && (item.summary || meta.role)) roleEl.textContent = item.summary || meta.role;
          const bioEl = card.querySelector('p');
          if (bioEl && item.content) bioEl.textContent = item.content;

          if (item.image_url) {
            const avatar = card.querySelector('.team-avatar');
            if (avatar) {
              avatar.innerHTML = `<img src="${escapeHtml(item.image_url)}" alt="${escapeHtml(item.title)}" />`;
              avatar.style.background = 'transparent';
            }
          }
          card.style.display = '';
          card.classList.add('visible');
        } else if (teamGrid) {
          const newCard = document.createElement('div');
          newCard.className = 'team-card reveal visible';
          newCard.id = `team-${item.id}`;
          const avatarContent = item.image_url
            ? `<img src="${escapeHtml(item.image_url)}" alt="${escapeHtml(item.title)}" />`
            : (meta.avatar_icon || '👤');
          newCard.innerHTML = `
            <div class="team-avatar" style="background:linear-gradient(135deg,#e0f2fe,#7dd3fc)">${avatarContent}</div>
            <h4>${escapeHtml(item.title)}</h4>
            <div class="team-role">${escapeHtml(item.summary || 'Team Member')}</div>
            <p>${escapeHtml(item.content || '')}</p>
          `;
          teamGrid.appendChild(newCard);
        }
        return;
      }

      // 7. Core Values
      if (key === 'about.values' || section.includes('core values') || section.includes('values')) {
        const valuesUl = document.querySelector('.values-list');
        if (valuesUl && (item.content || item.summary)) {
          const text = item.content || item.summary;
          const lines = text.split('\n').map(l => l.replace(/^[0-9]+[\.\)]\s*|^[✦•\-*]\s*/, '').trim()).filter(Boolean);
          if (lines.length > 0) {
            valuesUl.innerHTML = lines.map(line => `<li>✦ ${escapeHtml(line)}</li>`).join('');
          }
        }
        return;
      }

      // 8. Target Beneficiaries
      if (key === 'about.beneficiaries' || section.includes('beneficiar')) {
        const grid = document.querySelector('.beneficiaries-grid');
        if (grid && item.content) {
          const lines = item.content.split('\n').filter(Boolean);
          if (lines.length > 0) {
            const icons = ['🧒', '🏫', '🌟', '👩', '🛠️', '🏡'];
            grid.innerHTML = lines.map((line, idx) => {
              const clean = line.replace(/^[0-9]+[\.\)]\s*/, '');
              const colonIdx = clean.indexOf(':');
              const bTitle = colonIdx !== -1 ? clean.substring(0, colonIdx).trim() : clean;
              const bDesc = colonIdx !== -1 ? clean.substring(colonIdx + 1).trim() : '';
              const icon = icons[idx % icons.length];
              return `
                <div class="beneficiary-card reveal visible">
                  <div class="beneficiary-icon">${icon}</div>
                  <div class="beneficiary-content">
                    <h4>${escapeHtml(bTitle)}</h4>
                    <p>${escapeHtml(bDesc)}</p>
                  </div>
                </div>
              `;
            }).join('');
          }
        }
        return;
      }

      // 9. Strategic Focus Areas (5 Pillars)
      if (key === 'about.pillars' || section.includes('pillar')) {
        const pGrid = document.querySelector('.pillars-grid');
        if (pGrid && item.content) {
          const lines = item.content.split('\n').filter(Boolean);
          if (lines.length > 0) {
            pGrid.innerHTML = lines.map((line, idx) => {
              let num = `Pillar 0${idx + 1}`;
              let rest = line;
              if (line.toLowerCase().startsWith('pillar')) {
                const colon = line.indexOf(':');
                if (colon !== -1) {
                  num = line.substring(0, colon).trim();
                  rest = line.substring(colon + 1).trim();
                }
              }
              const dash = rest.indexOf('—') !== -1 ? rest.indexOf('—') : rest.indexOf('-');
              const pTitle = dash !== -1 ? rest.substring(0, dash).trim() : rest;
              const pDesc = dash !== -1 ? rest.substring(dash + 1).trim() : '';
              return `
                <div class="pillar-card reveal visible">
                  <span class="pillar-num">${escapeHtml(num)}</span>
                  <h3>${escapeHtml(pTitle)}</h3>
                  <p>${escapeHtml(pDesc)}</p>
                </div>
              `;
            }).join('');
          }
        }
        return;
      }

      // 10. Milestones Timeline
      if (key === 'about.timeline' || section.includes('timeline')) {
        const tl = document.querySelector('.timeline');
        if (tl && item.content) {
          const lines = item.content.split('\n').filter(Boolean);
          if (lines.length > 0) {
            tl.innerHTML = lines.map((line, idx) => {
              const colon = line.indexOf(':');
              const month = colon !== -1 ? line.substring(0, colon).trim() : `Milestone ${idx + 1}`;
              const text = colon !== -1 ? line.substring(colon + 1).trim() : line;
              const isRight = idx % 2 === 1;
              return `
                <div class="tl-item ${isRight ? 'tl-right' : ''} reveal visible">
                  <div class="tl-dot"></div>
                  <div class="tl-year">${escapeHtml(month)}</div>
                  <div class="tl-content">
                    <h4>Milestone</h4>
                    <p>${escapeHtml(text)}</p>
                  </div>
                </div>
              `;
            }).join('');
          }
        }
        return;
      }

      // 11. Custom Section or Additional Published Content
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
