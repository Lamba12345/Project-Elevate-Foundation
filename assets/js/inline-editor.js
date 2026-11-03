/**
 * PROJECT ELEVATE FOUNDATION — INLINE CONTENT EDITOR
 * 
 * Provides authorized editors with:
 * - Discreet login & editing mode activation
 * - Direct inline text editing with live save/discard
 * - Click-to-replace image upload & preview
 * - News articles creation, editing, and deletion
 * - Sitewide announcement banner management
 * - Community events management
 * - Gallery photos upload & caption management
 * - Full database integration via Spring Boot REST API
 */

(function () {
  'use strict';

  // Determine API base URL
  const API_BASE = (window.location.protocol === 'file:' || (window.location.port !== '8080' && window.location.port !== ''))
    ? 'http://localhost:8080'
    : '';

  // Editor State
  const state = {
    isLoggedIn: false,
    isEditing: false,
    currentUser: null,
    token: localStorage.getItem('elevate_editor_token') || null,
    savedContent: {},
    pendingChanges: {},
    activeImageTarget: null,
    editingArticleId: null,
    newsArticles: [],
    announcements: [],
    galleryItems: [],
    events: []
  };

  /* ── Helper: Auth Headers ────────────────────────────────── */
  function getAuthHeaders(isJson = true) {
    const headers = {};
    if (isJson) headers['Content-Type'] = 'application/json';
    if (state.token) headers['Authorization'] = `Bearer ${state.token}`;
    return headers;
  }

  /* ── Helper: Toast Notification ─────────────────────────── */
  function toast(message, type = 'success') {
    if (window.showToast) {
      window.showToast(message, type);
      return;
    }
    let el = document.getElementById('toast');
    if (!el) {
      el = document.createElement('div');
      el.id = 'toast';
      el.className = 'toast';
      document.body.appendChild(el);
    }
    el.className = `toast ${type}`;
    const icon = type === 'success' ? '✅' : (type === 'info' ? 'ℹ️' : '❌');
    el.innerHTML = `<span>${icon}</span><span>${message}</span>`;
    el.classList.add('show');
    setTimeout(() => el.classList.remove('show'), 4000);
  }

  /* ── 1. CONTENT HYDRATION (Load from DB) ─────────────────── */
  async function loadSiteContent() {
    try {
      const res = await fetch(`${API_BASE}/api/content`);
      if (!res.ok) return;
      const data = await res.json();
      state.savedContent = data || {};

      // Hydrate all [data-content-key] elements
      document.querySelectorAll('[data-content-key]').forEach(el => {
        const key = el.getAttribute('data-content-key');
        if (state.savedContent[key] !== undefined) {
          // Use innerHTML if markup exists, or textContent
          if (state.savedContent[key].includes('<') && state.savedContent[key].includes('>')) {
            el.innerHTML = state.savedContent[key];
          } else {
            el.textContent = state.savedContent[key];
          }
        }
      });

      // Hydrate all [data-image-key] elements
      document.querySelectorAll('[data-image-key]').forEach(el => {
        const key = el.getAttribute('data-image-key');
        if (state.savedContent[key]) {
          let src = state.savedContent[key];
          if (src.startsWith('/uploads/') && API_BASE) {
            src = `${API_BASE}${src}`;
          }
          if (el.tagName.toLowerCase() === 'img') {
            el.src = src;
          } else {
            el.style.backgroundImage = `url('${src}')`;
          }
        }
      });
    } catch (err) {
      console.warn('Elevate Content API not reachable yet. Using default content.');
    }
  }

  /* ── 2. ANNOUNCEMENTS ────────────────────────────────────── */
  async function loadAnnouncements() {
    try {
      const res = await fetch(`${API_BASE}/api/announcements`);
      if (!res.ok) return;
      const data = await res.json();
      state.announcements = data;

      const banner = document.getElementById('elevate-announcement-banner');
      if (!banner) return;

      if (data && data.length > 0 && data[0].active) {
        const a = data[0];
        const contentSpan = banner.querySelector('.elevate-banner-text');
        const tagSpan = banner.querySelector('.elevate-banner-tag');
        const linkA = banner.querySelector('.elevate-banner-link');

        if (tagSpan) tagSpan.textContent = a.badge || 'ANNOUNCEMENT';
        if (contentSpan) contentSpan.textContent = a.message;
        if (linkA) {
          if (a.linkUrl && a.linkText) {
            linkA.href = a.linkUrl;
            linkA.textContent = a.linkText;
            linkA.style.display = 'inline';
          } else {
            linkA.style.display = 'none';
          }
        }
        banner.classList.add('is-active');
      } else {
        banner.classList.remove('is-active');
      }
    } catch (err) {
      // ignore
    }
  }

  /* ── 3. NEWS ARTICLES (Blog & Index) ─────────────────────── */
  async function loadNewsArticles() {
    try {
      const res = await fetch(`${API_BASE}/api/news`);
      if (!res.ok) return;
      const articles = await res.json();
      if (!articles || articles.length === 0) return;
      state.newsArticles = articles;

      // Update Blog Page if present
      renderBlogPage(articles);

      // Update Index Blog Preview if present
      renderIndexNewsPreview(articles);
    } catch (err) {
      // fallback to static
    }
  }

  /* ── 3b. PUBLIC GALLERY & EVENTS ─────────────────────────── */
  async function loadPublicGallery() {
    const grid = document.getElementById('public-gallery-grid');
    if (!grid) return;
    try {
      const res = await fetch(`${API_BASE}/api/gallery`);
      if (!res.ok) return;
      const items = await res.json();
      state.galleryItems = items;
      if (!items || items.length === 0) return;

      grid.innerHTML = items.map(item => {
        let url = item.imageUrl;
        if (url.startsWith('/uploads/') && API_BASE) url = `${API_BASE}${url}`;
        return `
          <div class="gallery-card card reveal visible" data-gallery-id="${item.id}">
            <div class="gallery-img-wrap">
              <img src="${url}" alt="${item.title}" data-image-key="gallery.item.${item.id}" />
            </div>
            <div class="gallery-body">
              <div class="gallery-title" data-content-key="gallery.title.${item.id}">${item.title}</div>
              <p class="gallery-caption" data-content-key="gallery.caption.${item.id}">${item.caption || ''}</p>
            </div>
          </div>
        `;
      }).join('');

      if (state.isEditing) {
        enableInlineTextEditing();
        enableImageEditing();
      }
    } catch (e) {
      // fallback
    }
  }

  async function loadPublicEvents() {
    const grid = document.getElementById('public-events-grid');
    if (!grid) return;
    try {
      const res = await fetch(`${API_BASE}/api/events`);
      if (!res.ok) return;
      const events = await res.json();
      state.events = events;
      if (!events || events.length === 0) return;

      grid.innerHTML = events.map(e => `
        <div class="event-card card reveal visible" data-event-id="${e.id}">
          <div class="event-card-header">
            <span class="event-category-tag">${e.category || 'Event'}</span>
            <span class="event-status-tag">${e.status || 'Upcoming'}</span>
          </div>
          <div class="event-card-title" data-content-key="event.title.${e.id}">${e.title}</div>
          <div class="event-card-meta">
            <span>📅 ${e.eventDate} ${e.eventTime ? '· ' + e.eventTime : ''}</span>
            <span>📍 ${e.location || 'Accra, Ghana'}</span>
          </div>
          <p class="event-card-desc" data-content-key="event.desc.${e.id}">${e.description || ''}</p>
          <div>
            <a href="${e.registerUrl || 'contact.html'}" class="btn btn-outline btn-sm">Register / Inquire →</a>
          </div>
        </div>
      `).join('');

      if (state.isEditing) {
        enableInlineTextEditing();
      }
    } catch (e) {
      // fallback
    }
  }

  function renderBlogPage(articles) {
    const featuredEl = document.getElementById('blog-featured');
    const postsContainer = document.querySelector('.blog-posts');
    if (!postsContainer) return;

    // Featured article
    const featured = articles.find(a => a.featured) || articles[0];
    if (featured && featuredEl) {
      featuredEl.dataset.articleId = featured.id;
      let imgUrl = featured.imageUrl;
      if (imgUrl.startsWith('/uploads/') && API_BASE) imgUrl = `${API_BASE}${imgUrl}`;
      const img = featuredEl.querySelector('.bf-img img');
      const tag = featuredEl.querySelector('.bf-img .tag');
      const meta = featuredEl.querySelector('.blog-meta');
      const h2 = featuredEl.querySelector('h2 a');
      const p = featuredEl.querySelector('p');

      if (img) img.src = imgUrl;
      if (tag) tag.textContent = featured.category;
      if (meta) meta.innerHTML = `<span>📅 ${featured.publishDate}</span><span>·</span><span>${featured.readTime}</span><span>·</span><span>by ${featured.author}</span>`;
      if (h2) h2.textContent = featured.title;
      if (p) p.textContent = featured.excerpt || featured.content;

      injectArticleEditButtons(featuredEl, featured.id);
    }

    // Grid articles (skip featured)
    const rest = articles.filter(a => a !== featured);
    if (rest.length > 0) {
      postsContainer.innerHTML = '';
      rest.forEach(a => {
        let imgUrl = a.imageUrl;
        if (imgUrl.startsWith('/uploads/') && API_BASE) imgUrl = `${API_BASE}${imgUrl}`;

        const art = document.createElement('article');
        art.className = 'blog-post-card card reveal visible';
        art.dataset.category = a.category.toLowerCase();
        art.dataset.articleId = a.id;
        art.innerHTML = `
          <div class="bpc-img">
            <img src="${imgUrl}" alt="${a.title}" />
            <span class="tag ${a.category === 'empowerment' ? 'tag-accent' : ''}">${a.category}</span>
          </div>
          <div class="bpc-body">
            <div class="blog-meta"><span>📅 ${a.publishDate}</span><span>·</span><span>${a.readTime}</span></div>
            <h3><a href="#">${a.title}</a></h3>
            <p>${a.excerpt || a.content}</p>
            <a href="#" class="blog-read-more">Read More →</a>
          </div>
        `;
        injectArticleEditButtons(art, a.id);
        postsContainer.appendChild(art);
      });
    }
  }

  function renderIndexNewsPreview(articles) {
    const grid = document.querySelector('.blog-grid');
    if (!grid) return;

    const slice = articles.slice(0, 3);
    grid.innerHTML = '';
    slice.forEach((a, idx) => {
      let imgUrl = a.imageUrl;
      if (imgUrl.startsWith('/uploads/') && API_BASE) imgUrl = `${API_BASE}${imgUrl}`;

      const art = document.createElement('article');
      art.className = 'blog-card card reveal visible';
      art.style.transitionDelay = `${idx * 0.1}s`;
      art.dataset.articleId = a.id;
      art.innerHTML = `
        <div class="blog-img-wrap">
          <img src="${imgUrl}" alt="${a.title}" />
          <span class="tag ${a.category === 'empowerment' ? 'tag-accent' : ''}">${a.category}</span>
        </div>
        <div class="blog-body">
          <div class="blog-date">📅 ${a.publishDate}</div>
          <h4><a href="blog.html">${a.title}</a></h4>
          <p>${a.excerpt || a.content}</p>
          <a href="blog.html" class="blog-read-more">Read More →</a>
        </div>
      `;
      injectArticleEditButtons(art, a.id);
      grid.appendChild(art);
    });
  }

  function injectArticleEditButtons(cardEl, articleId) {
    if (cardEl.querySelector('.elevate-card-actions')) return;
    const actions = document.createElement('div');
    actions.className = 'elevate-card-actions';
    actions.innerHTML = `
      <button type="button" class="elevate-card-btn btn-edit" data-edit-article="${articleId}">✎ Edit</button>
      <button type="button" class="elevate-card-btn btn-delete" data-delete-article="${articleId}">🗑 Delete</button>
    `;
    cardEl.style.position = 'relative';
    cardEl.appendChild(actions);

    actions.querySelector('[data-edit-article]').addEventListener('click', (e) => {
      e.stopPropagation();
      openArticleModal(articleId);
    });

    actions.querySelector('[data-delete-article]').addEventListener('click', (e) => {
      e.stopPropagation();
      deleteArticle(articleId);
    });
  }

  /* ── 4. EDITOR UI INITIALIZATION ─────────────────────────── */
  function injectEditorUI() {
    // 1) Announcement Banner
    if (!document.getElementById('elevate-announcement-banner')) {
      const banner = document.createElement('div');
      banner.id = 'elevate-announcement-banner';
      banner.innerHTML = `
        <div class="elevate-banner-inner">
          <span class="elevate-banner-tag">Announcement</span>
          <span class="elevate-banner-text">Loading updates...</span>
          <a href="#" class="elevate-banner-link" target="_blank">Learn More →</a>
          <button class="elevate-banner-close" aria-label="Close Announcement">&times;</button>
        </div>
      `;
      document.body.prepend(banner);

      banner.querySelector('.elevate-banner-close').addEventListener('click', () => {
        banner.classList.remove('is-active');
      });

      banner.addEventListener('click', (e) => {
        if (state.isEditing && !e.target.classList.contains('elevate-banner-close')) {
          openAnnouncementModal();
        }
      });
    }

    // 2) Top Floating Editor Toolbar
    if (!document.getElementById('elevate-editor-bar')) {
      const bar = document.createElement('div');
      bar.id = 'elevate-editor-bar';
      bar.innerHTML = `
        <div class="elevate-bar-left">
          <div class="elevate-mode-badge">
            <span class="elevate-pulse-dot"></span>
            <span>Editing Mode Active</span>
          </div>
          <div class="elevate-user-tag">Editor: <strong id="elevate-bar-username">editor</strong></div>
          <div class="elevate-unsaved-badge" id="elevate-unsaved-badge">
            <span>⚠️</span><span id="elevate-unsaved-count">0</span> unsaved
          </div>
        </div>
        <div class="elevate-bar-actions">
          <button class="elevate-bar-btn elevate-btn-action" id="elevate-bar-add-news">➕ News Article</button>
          <button class="elevate-bar-btn elevate-btn-action" id="elevate-bar-announcement">📢 Announcement</button>
          <button class="elevate-bar-btn elevate-btn-action" id="elevate-bar-events">📅 Events</button>
          <button class="elevate-bar-btn elevate-btn-action" id="elevate-bar-gallery">🖼️ Gallery</button>
          <button class="elevate-bar-btn elevate-btn-save" id="elevate-bar-save" disabled>💾 Save Changes</button>
          <button class="elevate-bar-btn elevate-btn-cancel" id="elevate-bar-cancel">✖ Discard</button>
          <button class="elevate-bar-btn elevate-btn-exit" id="elevate-bar-exit">🚪 Exit</button>
        </div>
      `;
      document.body.prepend(bar);

      // Event listeners for toolbar buttons
      document.getElementById('elevate-bar-save').addEventListener('click', saveAllChanges);
      document.getElementById('elevate-bar-cancel').addEventListener('click', discardAllChanges);
      document.getElementById('elevate-bar-add-news').addEventListener('click', () => openArticleModal(null));
      document.getElementById('elevate-bar-announcement').addEventListener('click', openAnnouncementModal);
      document.getElementById('elevate-bar-events').addEventListener('click', openEventModal);
      document.getElementById('elevate-bar-gallery').addEventListener('click', openGalleryModal);
      document.getElementById('elevate-bar-exit').addEventListener('click', exitEditingMode);
    }

    // 3) Discreet Bottom-Right Trigger Button
    if (!document.getElementById('elevate-discreet-trigger')) {
      const trigger = document.createElement('button');
      trigger.id = 'elevate-discreet-trigger';
      trigger.className = 'elevate-discreet-trigger';
      trigger.setAttribute('aria-label', 'Edit Website');
      trigger.title = 'Edit Website (Ctrl+Shift+E)';
      trigger.innerHTML = `
        <span class="trigger-icon">✎</span>
        <span class="trigger-text">Edit Website</span>
      `;
      document.body.appendChild(trigger);

      trigger.addEventListener('click', handleTriggerClick);
    }

    // 4) Footer Discreet Link
    const footerBottomLinks = document.querySelector('.footer-bottom-links');
    if (footerBottomLinks && !document.getElementById('footer-edit-link')) {
      const link = document.createElement('a');
      link.id = 'footer-edit-link';
      link.className = 'footer-edit-link';
      link.href = 'javascript:void(0)';
      link.innerHTML = '✏️ Edit Website';
      footerBottomLinks.appendChild(link);
      link.addEventListener('click', handleTriggerClick);
    }

    // 5) Inject Modals into DOM
    injectModals();
  }

  /* ── 5. MODAL HTML TEMPLATES ─────────────────────────────── */
  function injectModals() {
    if (document.getElementById('elevate-modals-container')) return;
    const container = document.createElement('div');
    container.id = 'elevate-modals-container';
    container.innerHTML = `
      <!-- Login Modal -->
      <div class="elevate-modal-backdrop" id="modal-login-backdrop">
        <div class="elevate-modal">
          <div class="elevate-modal-header">
            <h3>🔐 Editor Sign In</h3>
            <button class="elevate-modal-close" data-close="modal-login-backdrop">&times;</button>
          </div>
          <form id="elevate-login-form">
            <div class="elevate-modal-body">
              <div class="elevate-alert elevate-alert-error" id="login-error-alert"></div>
              <p style="margin-top:0;color:#64748b;font-size:0.9rem">
                Sign in with authorized credentials to activate inline website editing.
              </p>
              <div class="elevate-form-group">
                <label for="login-username">Username</label>
                <input type="text" id="login-username" class="elevate-form-control" placeholder="editor" required autocomplete="username" />
              </div>
              <div class="elevate-form-group">
                <label for="login-password">Password</label>
                <input type="password" id="login-password" class="elevate-form-control" placeholder="••••••••" required autocomplete="current-password" />
              </div>
              <div style="background:#f8fafc;border:1px dashed #cbd5e1;border-radius:8px;padding:10px 14px;font-size:0.8rem;color:#475569;">
                <strong>Demo Credentials:</strong><br />
                Username: <code style="color:#059669;font-weight:700">editor</code> &nbsp;|&nbsp;
                Password: <code style="color:#059669;font-weight:700">Elevate2026!</code>
              </div>
            </div>
            <div class="elevate-modal-footer">
              <button type="button" class="elevate-bar-btn elevate-btn-cancel" data-close="modal-login-backdrop">Cancel</button>
              <button type="submit" class="elevate-bar-btn elevate-btn-save" id="login-submit-btn">Sign In &amp; Edit</button>
            </div>
          </form>
        </div>
      </div>

      <!-- Image Replace Modal -->
      <div class="elevate-modal-backdrop" id="modal-image-backdrop">
        <div class="elevate-modal elevate-modal-wide">
          <div class="elevate-modal-header">
            <h3>🖼️ Replace Website Image</h3>
            <button class="elevate-modal-close" data-close="modal-image-backdrop">&times;</button>
          </div>
          <div class="elevate-modal-body">
            <div class="elevate-alert elevate-alert-error" id="image-error-alert"></div>
            
            <div class="elevate-image-preview-wrap">
              <img id="image-replace-preview" src="" alt="Preview" />
            </div>

            <div class="elevate-drop-zone" id="image-drop-zone">
              <div class="elevate-drop-icon">☁️</div>
              <strong>Choose replacement image</strong>
              <div style="font-size:0.82rem;color:#64748b;margin-top:4px">
                Drag and drop your file here, or click to browse (JPG, PNG, WEBP, GIF, SVG — max 15MB)
              </div>
              <input type="file" id="image-file-input" accept="image/*" style="display:none" />
            </div>

            <div class="elevate-form-group">
              <label for="image-alt-text">Image Caption / Alt Text</label>
              <input type="text" id="image-alt-text" class="elevate-form-control" placeholder="Describe the image..." />
            </div>
          </div>
          <div class="elevate-modal-footer">
            <button type="button" class="elevate-bar-btn elevate-btn-cancel" data-close="modal-image-backdrop">Cancel</button>
            <button type="button" class="elevate-bar-btn elevate-btn-save" id="image-save-btn">Upload &amp; Publish</button>
          </div>
        </div>
      </div>

      <!-- News Article Modal -->
      <div class="elevate-modal-backdrop" id="modal-article-backdrop">
        <div class="elevate-modal elevate-modal-wide">
          <div class="elevate-modal-header">
            <h3 id="article-modal-title">📰 Add New Article</h3>
            <button class="elevate-modal-close" data-close="modal-article-backdrop">&times;</button>
          </div>
          <form id="elevate-article-form">
            <div class="elevate-modal-body">
              <div class="elevate-alert elevate-alert-error" id="article-error-alert"></div>
              
              <div class="elevate-form-group">
                <label for="article-title">Article Title *</label>
                <input type="text" id="article-title" class="elevate-form-control" required placeholder="e.g. Clean Water Initiative Expands to 10 New Villages" />
              </div>

              <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;">
                <div class="elevate-form-group">
                  <label for="article-category">Category *</label>
                  <select id="article-category" class="elevate-form-control">
                    <option value="education">Education</option>
                    <option value="community">Community</option>
                    <option value="empowerment">Empowerment</option>
                    <option value="health">Health</option>
                    <option value="volunteer">Volunteer Story</option>
                  </select>
                </div>
                <div class="elevate-form-group">
                  <label for="article-author">Author</label>
                  <input type="text" id="article-author" class="elevate-form-control" placeholder="Dzifa Asomany Esq" />
                </div>
              </div>

              <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;">
                <div class="elevate-form-group">
                  <label for="article-date">Publish Date</label>
                  <input type="text" id="article-date" class="elevate-form-control" placeholder="October 28, 2026" />
                </div>
                <div class="elevate-form-group">
                  <label for="article-read-time">Read Time</label>
                  <input type="text" id="article-read-time" class="elevate-form-control" placeholder="5 min read" />
                </div>
              </div>

              <div class="elevate-form-group">
                <label for="article-excerpt">Short Summary / Excerpt *</label>
                <textarea id="article-excerpt" class="elevate-form-control" rows="2" required placeholder="Brief summary of the story..."></textarea>
              </div>

              <div class="elevate-form-group">
                <label for="article-content">Full Story Content</label>
                <textarea id="article-content" class="elevate-form-control" rows="4" placeholder="Detailed story content..."></textarea>
              </div>

              <div class="elevate-form-group">
                <label for="article-image-url">Image URL or Local Path</label>
                <input type="text" id="article-image-url" class="elevate-form-control" value="assets/images/program_education.jpg" />
                <div class="elevate-input-hint">You can also upload an image using the button below.</div>
                <div style="margin-top:8px">
                  <input type="file" id="article-file-input" accept="image/*" style="display:none" />
                  <button type="button" class="elevate-bar-btn elevate-btn-action" id="article-upload-trigger">📁 Upload Image from Device</button>
                </div>
              </div>

              <div class="elevate-form-group" style="display:flex;align-items:center;gap:8px;">
                <input type="checkbox" id="article-featured" style="width:18px;height:18px;cursor:pointer" />
                <label for="article-featured" style="margin:0;cursor:pointer">Set as Featured Story on Blog</label>
              </div>
            </div>
            <div class="elevate-modal-footer">
              <button type="button" class="elevate-bar-btn elevate-btn-cancel" data-close="modal-article-backdrop">Cancel</button>
              <button type="submit" class="elevate-bar-btn elevate-btn-save" id="article-save-btn">Save &amp; Publish</button>
            </div>
          </form>
        </div>
      </div>

      <!-- Announcement Modal -->
      <div class="elevate-modal-backdrop" id="modal-announcement-backdrop">
        <div class="elevate-modal">
          <div class="elevate-modal-header">
            <h3>📢 Website Announcement</h3>
            <button class="elevate-modal-close" data-close="modal-announcement-backdrop">&times;</button>
          </div>
          <form id="elevate-announcement-form">
            <div class="elevate-modal-body">
              <div class="elevate-alert elevate-alert-error" id="announcement-error-alert"></div>
              
              <div class="elevate-form-group" style="display:flex;align-items:center;gap:10px;">
                <input type="checkbox" id="ann-active" style="width:18px;height:18px;cursor:pointer" checked />
                <label for="ann-active" style="margin:0;cursor:pointer;font-weight:700">Display Sitewide Announcement Banner</label>
              </div>

              <div class="elevate-form-group">
                <label for="ann-badge">Badge Label</label>
                <input type="text" id="ann-badge" class="elevate-form-control" placeholder="NEW ANNOUNCEMENT" />
              </div>

              <div class="elevate-form-group">
                <label for="ann-message">Announcement Message *</label>
                <textarea id="ann-message" class="elevate-form-control" rows="3" required placeholder="Important update for website visitors..."></textarea>
              </div>

              <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;">
                <div class="elevate-form-group">
                  <label for="ann-link-text">Action Link Text</label>
                  <input type="text" id="ann-link-text" class="elevate-form-control" placeholder="Apply Now" />
                </div>
                <div class="elevate-form-group">
                  <label for="ann-link-url">Action Link URL</label>
                  <input type="text" id="ann-link-url" class="elevate-form-control" placeholder="volunteer.html" />
                </div>
              </div>
            </div>
            <div class="elevate-modal-footer">
              <button type="button" class="elevate-bar-btn elevate-btn-cancel" data-close="modal-announcement-backdrop">Cancel</button>
              <button type="submit" class="elevate-bar-btn elevate-btn-save">Save &amp; Update Banner</button>
            </div>
          </form>
        </div>
      </div>

      <!-- Events Modal -->
      <div class="elevate-modal-backdrop" id="modal-event-backdrop">
        <div class="elevate-modal elevate-modal-wide">
          <div class="elevate-modal-header">
            <h3>📅 Community Events Management</h3>
            <button class="elevate-modal-close" data-close="modal-event-backdrop">&times;</button>
          </div>
          <div class="elevate-modal-body">
            <div id="events-list-container" style="max-height:220px;overflow-y:auto;margin-bottom:20px;border-bottom:1px solid #e2e8f0;padding-bottom:12px">
              <p style="color:#64748b;font-size:0.88rem">Loading events...</p>
            </div>
            <h4 style="margin:0 0 12px 0;font-size:1rem;color:#0f172a">➕ Add / Update Event</h4>
            <form id="elevate-event-form">
              <input type="hidden" id="event-id" />
              <div class="elevate-form-group">
                <label for="event-title">Event Title *</label>
                <input type="text" id="event-title" class="elevate-form-control" required placeholder="e.g. Annual Community Impact Gala" />
              </div>
              <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;">
                <div class="elevate-form-group">
                  <label for="event-date">Date *</label>
                  <input type="text" id="event-date" class="elevate-form-control" required placeholder="November 28, 2026" />
                </div>
                <div class="elevate-form-group">
                  <label for="event-time">Time</label>
                  <input type="text" id="event-time" class="elevate-form-control" placeholder="6:00 PM - 10:00 PM GMT" />
                </div>
              </div>
              <div class="elevate-form-group">
                <label for="event-location">Location</label>
                <input type="text" id="event-location" class="elevate-form-control" placeholder="Accra Conference Centre & Online" />
              </div>
              <div class="elevate-form-group">
                <label for="event-desc">Description</label>
                <textarea id="event-desc" class="elevate-form-control" rows="2" placeholder="Event description..."></textarea>
              </div>
              <div style="display:flex;justify-content:flex-end;gap:10px;margin-top:10px">
                <button type="submit" class="elevate-bar-btn elevate-btn-save">Save Event</button>
              </div>
            </form>
          </div>
        </div>
      </div>

      <!-- Gallery Modal -->
      <div class="elevate-modal-backdrop" id="modal-gallery-backdrop">
        <div class="elevate-modal elevate-modal-wide">
          <div class="elevate-modal-header">
            <h3>🖼️ Community Photo Gallery</h3>
            <button class="elevate-modal-close" data-close="modal-gallery-backdrop">&times;</button>
          </div>
          <div class="elevate-modal-body">
            <h4 style="margin:0 0 10px 0;font-size:0.95rem;color:#334155">Current Gallery Photos:</h4>
            <div class="elevate-gallery-manager-grid" id="gallery-manager-grid">
              <p style="color:#64748b;font-size:0.88rem">Loading gallery items...</p>
            </div>

            <h4 style="margin:16px 0 10px 0;font-size:0.95rem;color:#0f172a">➕ Add New Photo to Gallery</h4>
            <form id="elevate-gallery-form">
              <div class="elevate-form-group">
                <label for="gallery-title">Photo Title *</label>
                <input type="text" id="gallery-title" class="elevate-form-control" required placeholder="e.g. Borehole Commissioning Ceremony" />
              </div>
              <div class="elevate-form-group">
                <label for="gallery-caption">Caption</label>
                <input type="text" id="gallery-caption" class="elevate-form-control" placeholder="Brief description of the photo..." />
              </div>
              <div class="elevate-form-group">
                <label for="gallery-file">Upload Image *</label>
                <input type="file" id="gallery-file" class="elevate-form-control" accept="image/*" required />
              </div>
              <div style="display:flex;justify-content:flex-end;gap:10px;margin-top:12px">
                <button type="submit" class="elevate-bar-btn elevate-btn-save" id="gallery-save-btn">Upload &amp; Add Photo</button>
              </div>
            </form>
          </div>
        </div>
      </div>
    `;
    document.body.appendChild(container);

    // Setup modal close listeners
    container.querySelectorAll('[data-close]').forEach(btn => {
      btn.addEventListener('click', () => {
        const modalId = btn.getAttribute('data-close');
        closeModal(modalId);
      });
    });

    // Close on backdrop click
    container.querySelectorAll('.elevate-modal-backdrop').forEach(backdrop => {
      backdrop.addEventListener('click', (e) => {
        if (e.target === backdrop) {
          closeModal(backdrop.id);
        }
      });
    });

    // Form handlers
    setupLoginForm();
    setupImageModal();
    setupArticleForm();
    setupAnnouncementForm();
    setupEventForm();
    setupGalleryForm();
  }

  function openModal(id) {
    const el = document.getElementById(id);
    if (el) el.classList.add('is-open');
  }

  function closeModal(id) {
    const el = document.getElementById(id);
    if (el) el.classList.remove('is-open');
  }

  /* ── 6. AUTHENTICATION FLOW ──────────────────────────────── */
  async function verifySession() {
    if (!state.token) return false;
    try {
      const res = await fetch(`${API_BASE}/api/auth/verify`, {
        headers: getAuthHeaders(false)
      });
      if (res.ok) {
        const data = await res.json();
        state.isLoggedIn = true;
        state.currentUser = data.username;
        return true;
      }
    } catch (e) {
      // offline or error
    }
    state.isLoggedIn = false;
    state.token = null;
    localStorage.removeItem('elevate_editor_token');
    return false;
  }

  function handleTriggerClick() {
    if (!state.isLoggedIn) {
      openModal('modal-login-backdrop');
    } else {
      toggleEditingMode();
    }
  }

  function setupLoginForm() {
    const form = document.getElementById('elevate-login-form');
    if (!form) return;

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const usernameInput = document.getElementById('login-username');
      const passwordInput = document.getElementById('login-password');
      const errorAlert = document.getElementById('login-error-alert');
      const submitBtn = document.getElementById('login-submit-btn');

      errorAlert.classList.remove('is-visible');
      errorAlert.textContent = '';
      submitBtn.disabled = true;
      submitBtn.textContent = 'Authenticating...';

      try {
        const res = await fetch(`${API_BASE}/api/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            username: usernameInput.value.trim(),
            password: passwordInput.value
          })
        });

        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || 'Authentication failed');
        }

        // Success!
        state.token = data.token;
        state.currentUser = data.username;
        state.isLoggedIn = true;
        localStorage.setItem('elevate_editor_token', data.token);

        closeModal('modal-login-backdrop');
        form.reset();
        toast(`Welcome back, ${data.fullName || data.username}! Editing mode active.`);
        enterEditingMode();

      } catch (err) {
        errorAlert.textContent = err.message || 'Invalid username or password.';
        errorAlert.classList.add('is-visible');
      } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Sign In & Edit';
      }
    });
  }

  /* ── 7. EDITING MODE TOGGLE ──────────────────────────────── */
  function toggleEditingMode() {
    if (state.isEditing) {
      exitEditingMode();
    } else {
      enterEditingMode();
    }
  }

  function enterEditingMode() {
    state.isEditing = true;
    document.body.classList.add('elevate-editing-active');

    const bar = document.getElementById('elevate-editor-bar');
    if (bar) bar.classList.add('is-visible');

    const trigger = document.getElementById('elevate-discreet-trigger');
    if (trigger) trigger.classList.add('is-active');

    const userEl = document.getElementById('elevate-bar-username');
    if (userEl && state.currentUser) userEl.textContent = state.currentUser;

    enableInlineTextEditing();
    enableImageEditing();
  }

  function exitEditingMode() {
    if (Object.keys(state.pendingChanges).length > 0) {
      if (!confirm('You have unsaved changes. Exit editing mode without saving?')) {
        return;
      }
      discardAllChanges();
    }

    state.isEditing = false;
    document.body.classList.remove('elevate-editing-active');

    const bar = document.getElementById('elevate-editor-bar');
    if (bar) bar.classList.remove('is-visible');

    const trigger = document.getElementById('elevate-discreet-trigger');
    if (trigger) trigger.classList.remove('is-active');

    disableInlineTextEditing();
    toast('Exited editing mode.');
  }

  /* ── 8. INLINE TEXT EDITING ──────────────────────────────── */
  function enableInlineTextEditing() {
    document.querySelectorAll('[data-content-key]').forEach(el => {
      el.setAttribute('contenteditable', 'true');
      el.setAttribute('spellcheck', 'false');

      // Save initial value if not saved yet
      const key = el.getAttribute('data-content-key');
      if (state.savedContent[key] === undefined) {
        state.savedContent[key] = el.innerHTML;
      }

      // Add input change listener once
      if (!el._hasEditorListener) {
        el.addEventListener('input', () => {
          const currentHtml = el.innerHTML;
          const original = state.savedContent[key];

          if (currentHtml !== original) {
            state.pendingChanges[key] = currentHtml;
          } else {
            delete state.pendingChanges[key];
          }
          updateUnsavedState();
        });

        // Prevent accidental navigation when clicking links while in edit mode
        if (el.tagName.toLowerCase() === 'a') {
          el.addEventListener('click', (e) => {
            if (state.isEditing) e.preventDefault();
          });
        }

        el._hasEditorListener = true;
      }
    });
  }

  function disableInlineTextEditing() {
    document.querySelectorAll('[data-content-key]').forEach(el => {
      el.setAttribute('contenteditable', 'false');
    });
  }

  function updateUnsavedState() {
    const count = Object.keys(state.pendingChanges).length;
    const badge = document.getElementById('elevate-unsaved-badge');
    const countEl = document.getElementById('elevate-unsaved-count');
    const saveBtn = document.getElementById('elevate-bar-save');

    if (count > 0) {
      if (badge) badge.classList.add('has-changes');
      if (countEl) countEl.textContent = count;
      if (saveBtn) saveBtn.disabled = false;
    } else {
      if (badge) badge.classList.remove('has-changes');
      if (countEl) countEl.textContent = '0';
      if (saveBtn) saveBtn.disabled = true;
    }
  }

  async function saveAllChanges() {
    const count = Object.keys(state.pendingChanges).length;
    if (count === 0) return;

    const saveBtn = document.getElementById('elevate-bar-save');
    const origText = saveBtn.innerHTML;
    saveBtn.disabled = true;
    saveBtn.innerHTML = '💾 Saving...';

    try {
      const res = await fetch(`${API_BASE}/api/content/batch`, {
        method: 'PUT',
        headers: getAuthHeaders(true),
        body: JSON.stringify({ items: state.pendingChanges })
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || 'Failed to save changes');
      }

      // Apply pending changes into saved state
      Object.assign(state.savedContent, state.pendingChanges);
      state.pendingChanges = {};
      updateUnsavedState();

      toast(`Successfully saved ${count} change(s) permanently!`);
    } catch (err) {
      toast(err.message || 'Failed to save changes to database', 'error');
    } finally {
      saveBtn.innerHTML = origText;
    }
  }

  function discardAllChanges() {
    // Revert all modified elements back to saved values
    Object.keys(state.pendingChanges).forEach(key => {
      const el = document.querySelector(`[data-content-key="${key}"]`);
      if (el && state.savedContent[key] !== undefined) {
        el.innerHTML = state.savedContent[key];
      }
    });

    state.pendingChanges = {};
    updateUnsavedState();
    toast('Discarded unsaved changes.', 'info');
  }

  /* ── 9. IMAGE REPLACEMENT & UPLOADING ────────────────────── */
  function enableImageEditing() {
    document.querySelectorAll('[data-image-key]').forEach(el => {
      if (el._hasImageClickListener) return;

      el.addEventListener('click', (e) => {
        if (!state.isEditing) return;
        e.preventDefault();
        e.stopPropagation();
        openImageReplaceModal(el);
      });

      el._hasImageClickListener = true;
    });
  }

  let selectedImageFile = null;

  function openImageReplaceModal(targetEl) {
    state.activeImageTarget = targetEl;
    const previewImg = document.getElementById('image-replace-preview');
    const altInput = document.getElementById('image-alt-text');
    const errorAlert = document.getElementById('image-error-alert');
    const fileInput = document.getElementById('image-file-input');

    selectedImageFile = null;
    fileInput.value = '';
    errorAlert.classList.remove('is-visible');

    const currentSrc = targetEl.tagName.toLowerCase() === 'img'
      ? targetEl.src
      : targetEl.style.backgroundImage.replace(/url\(['"]?(.*?)['"]?\)/i, '$1');

    previewImg.src = currentSrc;
    altInput.value = targetEl.getAttribute('alt') || '';

    openModal('modal-image-backdrop');
  }

  function setupImageModal() {
    const dropZone = document.getElementById('image-drop-zone');
    const fileInput = document.getElementById('image-file-input');
    const previewImg = document.getElementById('image-replace-preview');
    const saveBtn = document.getElementById('image-save-btn');
    const errorAlert = document.getElementById('image-error-alert');

    if (!dropZone || !fileInput) return;

    dropZone.addEventListener('click', () => fileInput.click());

    dropZone.addEventListener('dragover', (e) => {
      e.preventDefault();
      dropZone.classList.add('dragover');
    });

    dropZone.addEventListener('dragleave', () => {
      dropZone.classList.remove('dragover');
    });

    dropZone.addEventListener('drop', (e) => {
      e.preventDefault();
      dropZone.classList.remove('dragover');
      if (e.dataTransfer.files && e.dataTransfer.files[0]) {
        handleImageFileSelect(e.dataTransfer.files[0]);
      }
    });

    fileInput.addEventListener('change', () => {
      if (fileInput.files && fileInput.files[0]) {
        handleImageFileSelect(fileInput.files[0]);
      }
    });

    function handleImageFileSelect(file) {
      if (!file.type.startsWith('image/')) {
        errorAlert.textContent = 'Selected file must be an image (JPG, PNG, WEBP, GIF, SVG).';
        errorAlert.classList.add('is-visible');
        return;
      }
      errorAlert.classList.remove('is-visible');
      selectedImageFile = file;

      // Live Instant Preview before upload
      const reader = new FileReader();
      reader.onload = (e) => {
        previewImg.src = e.target.result;
      };
      reader.readAsDataURL(file);
    }

    saveBtn.addEventListener('click', async () => {
      if (!selectedImageFile) {
        errorAlert.textContent = 'Please select a replacement image first.';
        errorAlert.classList.add('is-visible');
        return;
      }

      saveBtn.disabled = true;
      saveBtn.textContent = 'Uploading...';
      errorAlert.classList.remove('is-visible');

      try {
        const formData = new FormData();
        formData.append('file', selectedImageFile);

        const uploadRes = await fetch(`${API_BASE}/api/uploads`, {
          method: 'POST',
          headers: getAuthHeaders(false),
          body: formData
        });

        const uploadData = await uploadRes.json();
        if (!uploadRes.ok) {
          throw new Error(uploadData.error || 'Failed to upload image');
        }

        const uploadedUrl = uploadData.url;
        const target = state.activeImageTarget;
        if (target) {
          const imageKey = target.getAttribute('data-image-key');
          const altText = document.getElementById('image-alt-text').value;

          // Update DOM immediately
          let fullUrl = uploadedUrl;
          if (uploadedUrl.startsWith('/uploads/') && API_BASE) {
            fullUrl = `${API_BASE}${uploadedUrl}`;
          }

          if (target.tagName.toLowerCase() === 'img') {
            target.src = fullUrl;
            if (altText) target.alt = altText;
          } else {
            target.style.backgroundImage = `url('${fullUrl}')`;
          }

          // Persist key to database
          if (imageKey) {
            await fetch(`${API_BASE}/api/content/${imageKey}`, {
              method: 'PUT',
              headers: getAuthHeaders(true),
              body: JSON.stringify({
                value: uploadedUrl,
                contentType: 'image',
                label: imageKey
              })
            });
            state.savedContent[imageKey] = uploadedUrl;
          }
        }

        closeModal('modal-image-backdrop');
        toast('Image successfully replaced and published!');
      } catch (err) {
        errorAlert.textContent = err.message || 'Image upload failed.';
        errorAlert.classList.add('is-visible');
      } finally {
        saveBtn.disabled = false;
        saveBtn.textContent = 'Upload & Publish';
      }
    });
  }

  /* ── 10. ARTICLE CREATION & EDITING ──────────────────────── */
  function openArticleModal(articleId = null) {
    state.editingArticleId = articleId;
    const modalTitle = document.getElementById('article-modal-title');
    const form = document.getElementById('elevate-article-form');
    const errorAlert = document.getElementById('article-error-alert');
    errorAlert.classList.remove('is-visible');
    form.reset();

    if (articleId) {
      modalTitle.textContent = '✎ Edit Article';
      const a = state.newsArticles.find(x => x.id === Number(articleId));
      if (a) {
        document.getElementById('article-title').value = a.title || '';
        document.getElementById('article-category').value = a.category || 'community';
        document.getElementById('article-author').value = a.author || '';
        document.getElementById('article-date').value = a.publishDate || '';
        document.getElementById('article-read-time').value = a.readTime || '';
        document.getElementById('article-excerpt').value = a.excerpt || '';
        document.getElementById('article-content').value = a.content || '';
        document.getElementById('article-image-url').value = a.imageUrl || '';
        document.getElementById('article-featured').checked = !!a.featured;
      }
    } else {
      modalTitle.textContent = '➕ Add New Article';
      const now = new Date();
      const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
      document.getElementById('article-date').value = `${monthNames[now.getMonth()]} ${now.getDate()}, ${now.getFullYear()}`;
      document.getElementById('article-author').value = state.currentUser || 'Editorial Team';
    }

    openModal('modal-article-backdrop');
  }

  function setupArticleForm() {
    const form = document.getElementById('elevate-article-form');
    const uploadTrigger = document.getElementById('article-upload-trigger');
    const fileInput = document.getElementById('article-file-input');
    const imageUrlInput = document.getElementById('article-image-url');

    if (uploadTrigger && fileInput) {
      uploadTrigger.addEventListener('click', () => fileInput.click());
      fileInput.addEventListener('change', async () => {
        if (!fileInput.files || !fileInput.files[0]) return;
        const file = fileInput.files[0];
        const formData = new FormData();
        formData.append('file', file);
        uploadTrigger.textContent = 'Uploading...';
        uploadTrigger.disabled = true;

        try {
          const res = await fetch(`${API_BASE}/api/uploads`, {
            method: 'POST',
            headers: getAuthHeaders(false),
            body: formData
          });
          const data = await res.json();
          if (res.ok) {
            imageUrlInput.value = data.url;
            toast('Article image uploaded!');
          }
        } catch (e) {
          toast('Failed to upload image', 'error');
        } finally {
          uploadTrigger.textContent = '📁 Upload Image from Device';
          uploadTrigger.disabled = false;
        }
      });
    }

    if (form) {
      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const errorAlert = document.getElementById('article-error-alert');
        const submitBtn = document.getElementById('article-save-btn');
        submitBtn.disabled = true;

        const payload = {
          title: document.getElementById('article-title').value.trim(),
          category: document.getElementById('article-category').value,
          author: document.getElementById('article-author').value.trim(),
          publishDate: document.getElementById('article-date').value.trim(),
          readTime: document.getElementById('article-read-time').value.trim() || '4 min read',
          excerpt: document.getElementById('article-excerpt').value.trim(),
          content: document.getElementById('article-content').value.trim(),
          imageUrl: document.getElementById('article-image-url').value.trim() || 'assets/images/program_education.jpg',
          featured: document.getElementById('article-featured').checked
        };

        try {
          const url = state.editingArticleId
            ? `${API_BASE}/api/news/${state.editingArticleId}`
            : `${API_BASE}/api/news`;
          const method = state.editingArticleId ? 'PUT' : 'POST';

          const res = await fetch(url, {
            method,
            headers: getAuthHeaders(true),
            body: JSON.stringify(payload)
          });

          if (!res.ok) {
            const err = await res.json();
            throw new Error(err.error || 'Failed to save article');
          }

          closeModal('modal-article-backdrop');
          toast(state.editingArticleId ? 'Article updated successfully!' : 'New article published!');
          await loadNewsArticles();
        } catch (err) {
          errorAlert.textContent = err.message;
          errorAlert.classList.add('is-visible');
        } finally {
          submitBtn.disabled = false;
        }
      });
    }
  }

  async function deleteArticle(articleId) {
    if (!confirm('Are you sure you want to delete this article?')) return;
    try {
      const res = await fetch(`${API_BASE}/api/news/${articleId}`, {
        method: 'DELETE',
        headers: getAuthHeaders(false)
      });
      if (!res.ok) throw new Error();
      toast('Article deleted successfully.');
      await loadNewsArticles();
    } catch {
      toast('Failed to delete article.', 'error');
    }
  }

  /* ── 11. ANNOUNCEMENTS MODAL ─────────────────────────────── */
  function openAnnouncementModal() {
    const errorAlert = document.getElementById('announcement-error-alert');
    errorAlert.classList.remove('is-visible');

    if (state.announcements && state.announcements.length > 0) {
      const a = state.announcements[0];
      document.getElementById('ann-active').checked = a.active;
      document.getElementById('ann-badge').value = a.badge || 'ANNOUNCEMENT';
      document.getElementById('ann-message').value = a.message || '';
      document.getElementById('ann-link-text').value = a.linkText || '';
      document.getElementById('ann-link-url').value = a.linkUrl || '';
    }
    openModal('modal-announcement-backdrop');
  }

  function setupAnnouncementForm() {
    const form = document.getElementById('elevate-announcement-form');
    if (!form) return;

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const existingId = state.announcements && state.announcements.length > 0
        ? state.announcements[0].id : null;

      const payload = {
        title: 'Sitewide Announcement',
        badge: document.getElementById('ann-badge').value.trim() || 'ANNOUNCEMENT',
        message: document.getElementById('ann-message').value.trim(),
        linkText: document.getElementById('ann-link-text').value.trim(),
        linkUrl: document.getElementById('ann-link-url').value.trim(),
        active: document.getElementById('ann-active').checked,
        type: 'info'
      };

      try {
        const url = existingId ? `${API_BASE}/api/announcements/${existingId}` : `${API_BASE}/api/announcements`;
        const method = existingId ? 'PUT' : 'POST';

        const res = await fetch(url, {
          method,
          headers: getAuthHeaders(true),
          body: JSON.stringify(payload)
        });

        if (!res.ok) throw new Error();

        closeModal('modal-announcement-backdrop');
        toast('Announcement updated!');
        await loadAnnouncements();
      } catch {
        toast('Failed to update announcement.', 'error');
      }
    });
  }

  /* ── 12. EVENTS MANAGEMENT ───────────────────────────────── */
  async function openEventModal() {
    openModal('modal-event-backdrop');
    await refreshEventsList();
  }

  async function refreshEventsList() {
    const container = document.getElementById('events-list-container');
    if (!container) return;

    try {
      const res = await fetch(`${API_BASE}/api/events`);
      if (!res.ok) return;
      const events = await res.json();
      state.events = events;

      if (events.length === 0) {
        container.innerHTML = '<p style="color:#64748b;font-size:0.85rem">No events found. Add your first event below.</p>';
        return;
      }

      container.innerHTML = events.map(e => `
        <div style="display:flex;align-items:center;justify-content:space-between;padding:8px 12px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:6px;margin-bottom:6px">
          <div>
            <strong style="color:#0f172a;font-size:0.9rem">${e.title}</strong>
            <div style="font-size:0.78rem;color:#64748b">📅 ${e.eventDate} ${e.eventTime ? '· ' + e.eventTime : ''} · 📍 ${e.location || 'Online'}</div>
          </div>
          <button type="button" class="elevate-card-btn btn-delete" data-del-event="${e.id}">Delete</button>
        </div>
      `).join('');

      container.querySelectorAll('[data-del-event]').forEach(btn => {
        btn.addEventListener('click', async () => {
          const id = btn.getAttribute('data-del-event');
          if (confirm('Delete this event?')) {
            await fetch(`${API_BASE}/api/events/${id}`, {
              method: 'DELETE',
              headers: getAuthHeaders(false)
            });
            toast('Event deleted.');
            await refreshEventsList();
            await loadPublicEvents();
          }
        });
      });
    } catch {
      container.innerHTML = '<p style="color:#ef4444;font-size:0.85rem">Failed to load events.</p>';
    }
  }

  function setupEventForm() {
    const form = document.getElementById('elevate-event-form');
    if (!form) return;

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const payload = {
        title: document.getElementById('event-title').value.trim(),
        eventDate: document.getElementById('event-date').value.trim(),
        eventTime: document.getElementById('event-time').value.trim(),
        location: document.getElementById('event-location').value.trim(),
        description: document.getElementById('event-desc').value.trim(),
        category: 'Community',
        status: 'Upcoming'
      };

      try {
        const res = await fetch(`${API_BASE}/api/events`, {
          method: 'POST',
          headers: getAuthHeaders(true),
          body: JSON.stringify(payload)
        });

        if (!res.ok) throw new Error();
        form.reset();
        toast('Event created successfully!');
        await refreshEventsList();
        await loadPublicEvents();
      } catch {
        toast('Failed to save event.', 'error');
      }
    });
  }

  /* ── 13. GALLERY MANAGEMENT ──────────────────────────────── */
  async function openGalleryModal() {
    openModal('modal-gallery-backdrop');
    await refreshGalleryManager();
  }

  async function refreshGalleryManager() {
    const grid = document.getElementById('gallery-manager-grid');
    if (!grid) return;

    try {
      const res = await fetch(`${API_BASE}/api/gallery`);
      if (!res.ok) return;
      const items = await res.json();
      state.galleryItems = items;

      if (items.length === 0) {
        grid.innerHTML = '<p style="color:#64748b;font-size:0.85rem;grid-column:1/-1">No gallery photos. Upload one below.</p>';
        return;
      }

      grid.innerHTML = items.map(item => {
        let url = item.imageUrl;
        if (url.startsWith('/uploads/') && API_BASE) url = `${API_BASE}${url}`;
        return `
          <div class="elevate-gallery-thumb">
            <img src="${url}" alt="${item.title}" />
            <button type="button" class="elevate-gallery-thumb-del" data-del-gallery="${item.id}" title="Delete Photo">&times;</button>
            <div class="elevate-gallery-thumb-caption" title="${item.title}">${item.title}</div>
          </div>
        `;
      }).join('');

      grid.querySelectorAll('[data-del-gallery]').forEach(btn => {
        btn.addEventListener('click', async () => {
          const id = btn.getAttribute('data-del-gallery');
          if (confirm('Delete this gallery photo?')) {
            await fetch(`${API_BASE}/api/gallery/${id}`, {
              method: 'DELETE',
              headers: getAuthHeaders(false)
            });
            toast('Gallery photo deleted.');
            await refreshGalleryManager();
            await loadPublicGallery();
          }
        });
      });
    } catch {
      grid.innerHTML = '<p style="color:#ef4444;font-size:0.85rem;grid-column:1/-1">Failed to load gallery.</p>';
    }
  }

  function setupGalleryForm() {
    const form = document.getElementById('elevate-gallery-form');
    if (!form) return;

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const fileInput = document.getElementById('gallery-file');
      const titleInput = document.getElementById('gallery-title');
      const captionInput = document.getElementById('gallery-caption');
      const saveBtn = document.getElementById('gallery-save-btn');

      if (!fileInput.files || !fileInput.files[0]) {
        toast('Please choose a photo to upload', 'error');
        return;
      }

      saveBtn.disabled = true;
      saveBtn.textContent = 'Uploading...';

      try {
        const formData = new FormData();
        formData.append('file', fileInput.files[0]);

        const uploadRes = await fetch(`${API_BASE}/api/uploads`, {
          method: 'POST',
          headers: getAuthHeaders(false),
          body: formData
        });

        const uploadData = await uploadRes.json();
        if (!uploadRes.ok) throw new Error(uploadData.error || 'Upload failed');

        // Add gallery item
        const galleryRes = await fetch(`${API_BASE}/api/gallery`, {
          method: 'POST',
          headers: getAuthHeaders(true),
          body: JSON.stringify({
            title: titleInput.value.trim(),
            caption: captionInput.value.trim(),
            imageUrl: uploadData.url,
            category: 'community',
            displayOrder: state.galleryItems.length + 1
          })
        });

        if (!galleryRes.ok) throw new Error('Failed to record gallery item');

        form.reset();
        toast('New photo added to gallery!');
        await refreshGalleryManager();
        await loadPublicGallery();
      } catch (err) {
        toast(err.message || 'Failed to upload photo to gallery', 'error');
      } finally {
        saveBtn.disabled = false;
        saveBtn.textContent = 'Upload & Add Photo';
      }
    });
  }

  /* ── 14. KEYBOARD SHORTCUTS ──────────────────────────────── */
  function setupKeyboardShortcuts() {
    window.addEventListener('keydown', (e) => {
      // Ctrl+Shift+E or Alt+E to toggle editing mode
      if ((e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'e') ||
          (e.altKey && e.key.toLowerCase() === 'e')) {
        e.preventDefault();
        handleTriggerClick();
      }

      // Ctrl+S to save pending changes when in edit mode
      if (e.ctrlKey && e.key.toLowerCase() === 's' && state.isEditing) {
        e.preventDefault();
        saveAllChanges();
      }

      // Esc to close any open modal
      if (e.key === 'Escape') {
        const openModalEl = document.querySelector('.elevate-modal-backdrop.is-open');
        if (openModalEl) closeModal(openModalEl.id);
      }
    });
  }

  /* ── 15. INITIALIZATION ENTRY POINT ──────────────────────── */
  async function init() {
    injectEditorUI();
    setupKeyboardShortcuts();

    // Load dynamic data in parallel
    await Promise.allSettled([
      loadSiteContent(),
      loadAnnouncements(),
      loadNewsArticles(),
      loadPublicGallery(),
      loadPublicEvents()
    ]);

    // Check if editor already logged in
    const isAuthed = await verifySession();
    if (isAuthed) {
      enterEditingMode();
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // Export for testing / debugging in console
  window.ElevateEditor = {
    getState: () => ({ ...state }),
    toggleEditMode: toggleEditingMode,
    enterEditingMode,
    exitEditingMode,
    saveAllChanges,
    discardAllChanges
  };

})();
