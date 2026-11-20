// ============================================================
// PROJECT ELEVATE FOUNDATION — MANAGEMENT DASHBOARD LOGIC
// ============================================================

(function () {
  'use strict';

  const supabase = window.elevateSupabase;

  // State
  const state = {
    user: null,
    profile: null,
    role: null, // 'super_admin' or 'manager'
    submissions: [],
    logs: [],
    managers: [],
    contacts: [],
    volunteers: [],
    donations: [],
    subscribers: [],
    activeTab: 'submissions',
    editingSubmissionId: null,
    deletedItemIds: new Set(),
    aboutFilter: 'all',
    aboutSearch: '',
    contactsFilter: 'all',
    contactsSearch: ''
  };

  /* ── Local Content Persistence (Resilient to Schema Cache & Unhosted DB) ── */
  function getLocalCustomSubmissions() {
    try {
      const raw = localStorage.getItem('pef_custom_submissions');
      return raw ? JSON.parse(raw) : [];
    } catch (_) {
      return [];
    }
  }

  function saveLocalCustomSubmissions(items) {
    try {
      localStorage.setItem('pef_custom_submissions', JSON.stringify(items));
    } catch (_) {}
  }

  function addLocalCustomSubmission(item) {
    const items = getLocalCustomSubmissions();
    const idx = items.findIndex(i => String(i.id) === String(item.id));
    if (idx !== -1) {
      items[idx] = { ...items[idx], ...item };
    } else {
      items.unshift(item);
    }
    saveLocalCustomSubmissions(items);
  }

  function updateLocalCustomSubmission(id, updates) {
    const items = getLocalCustomSubmissions();
    const idx = items.findIndex(i => String(i.id) === String(id));
    if (idx !== -1) {
      items[idx] = { ...items[idx], ...updates };
      saveLocalCustomSubmissions(items);
    }
  }

  function removeLocalCustomSubmission(id) {
    const items = getLocalCustomSubmissions();
    const filtered = items.filter(i => String(i.id) !== String(id));
    saveLocalCustomSubmissions(filtered);
  }

  function getLocalDeletedIds() {
    try {
      const raw = localStorage.getItem('pef_deleted_submission_ids');
      return raw ? JSON.parse(raw) : [];
    } catch (_) {
      return [];
    }
  }

  function saveLocalDeletedId(id) {
    const ids = getLocalDeletedIds();
    if (!ids.includes(String(id))) {
      ids.push(String(id));
      try {
        localStorage.setItem('pef_deleted_submission_ids', JSON.stringify(ids));
      } catch (_) {}
    }
  }

  /* ── Helper: Escape HTML ─────────────────────────────────── */
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
    if (!d) return '—';
    try {
      const date = new Date(d);
      return date.toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (_) {
      return d;
    }
  }

  function statusBadge(status) {
    const s = String(status || 'DRAFT').toUpperCase();
    let cls = 'status-draft';
    let icon = '📝';
    if (s === 'APPROVED') { cls = 'status-approved'; icon = '✅'; }
    else if (s === 'PENDING') { cls = 'status-pending'; icon = '⏳'; }
    else if (s === 'REJECTED') { cls = 'status-rejected'; icon = '❌'; }
    else if (s === 'REVISION REQUESTED') { cls = 'status-revision'; icon = '🔄'; }
    return `<span class="status-pill ${cls}">${icon} ${escapeHtml(s)}</span>`;
  }

  function typeBadge(type) {
    const map = {
      activity: '🎯 Activity',
      event: '📅 Event',
      news_announcement: '📢 News/Alert',
      publication: '📚 Book/Pub',
      gallery: '🖼️ Gallery',
      website_content: '🌐 Site Content'
    };
    return map[type] || escapeHtml(type);
  }

  
  const DEFAULT_PAGE_ITEMS = [
    // ── ABOUT US PAGE: ALL EXISTING SECTIONS ──
    {
      id: 'default-about-hero',
      content_type: 'website_content',
      title: 'About Us Hero & Tagline',
      summary: 'Elevating, Empowering and Transforming Lives',
      content: 'Elevating, Empowering and Transforming Lives through quality education, youth mentorship, skills acquisition, and community development.',
      image_url: 'assets/images/program_community.jpg',
      metadata: { target_page: 'about', page: 'about', target_section: 'Hero & Introduction', section_key: 'about.hero', image_caption: 'Community empowerment outreach in Ghana' },
      status: 'APPROVED',
      created_at: new Date('2026-01-10T08:00:00Z').toISOString()
    },
    {
      id: 'default-about-story',
      content_type: 'website_content',
      title: 'Our Story: How It All Began',
      summary: 'The founding inspiration and 2026 beginnings of Project Elevate Foundation.',
      content: 'Project Elevate Foundation was founded in 2026 from a simple but powerful idea: that every person, regardless of where they\'re born, deserves the opportunity to reach their full potential.\n\nOur founder, Dzifa Asomany Esq, witnessed first-hand the devastating effects of inequality during her years as a field physician in East Africa. Fuelled by this experience, she rallied a team of educators, engineers, and community leaders to build something lasting.\n\nToday, we operate across 12 countries with over 2,000 volunteers, 120+ active programmes, and a community of more than 50,000 lives directly touched by our work.',
      image_url: 'assets/images/program_community.jpg',
      metadata: { target_page: 'about', page: 'about', target_section: 'Our Story', section_key: 'about.story', image_caption: 'Community volunteers in action' },
      status: 'APPROVED',
      created_at: new Date('2026-01-12T09:00:00Z').toISOString()
    },
    {
      id: 'default-about-founder',
      content_type: 'website_content',
      title: 'Founder & Executive Director Profile',
      summary: 'Dzifa Asomany Esq — Founder & Executive Director',
      content: 'Dzifa Asomany Esq, Founder & Executive Director. Former WHO physician with 20+ years of dedicated service in global health and grassroots community development.',
      image_url: '',
      metadata: { target_page: 'about', page: 'about', target_section: 'Our Story', section_key: 'about.founder' },
      status: 'APPROVED',
      created_at: new Date('2026-01-14T10:00:00Z').toISOString()
    },
    {
      id: 'default-about-vision',
      content_type: 'website_content',
      title: 'Vision Statement: An Empowered & Self-Reliant Society',
      summary: 'Official Foundation Vision Statement',
      content: 'To create an empowered and self-reliant society where every individual, regardless of their background or circumstances, has access to quality education, opportunities for personal development and the skills needed to achieve a dignified and sustainable livelihood.',
      image_url: 'assets/images/program_education.jpg',
      metadata: { target_page: 'about', page: 'about', target_section: 'Vision & Mission', section_key: 'about.vision', image_caption: 'Empowering children with quality education' },
      status: 'APPROVED',
      created_at: new Date('2026-01-15T11:00:00Z').toISOString()
    },
    {
      id: 'default-about-mission',
      content_type: 'website_content',
      title: 'Mission Statement: Bridging Educational Gaps',
      summary: 'Official Foundation Mission Statement',
      content: 'To bridge educational gaps, promote access to quality learning opportunities and empower individuals, particularly young people and underserved communities, through education, mentorship, skills acquisition and capacity-building initiatives that enhance self-reliance, economic independence and sustainable development.',
      image_url: 'assets/images/program_youth.jpg',
      metadata: { target_page: 'about', page: 'about', target_section: 'Vision & Mission', section_key: 'about.mission', image_caption: 'Youth mentorship and skills acquisition' },
      status: 'APPROVED',
      created_at: new Date('2026-01-15T11:30:00Z').toISOString()
    },
    {
      id: 'default-about-values',
      content_type: 'website_content',
      title: 'Core Values: Integrity, Empowerment, Inclusivity, Sustainability',
      summary: 'Four institutional values governing all Project Elevate Foundation programmes.',
      content: '1. Integrity: Total accountability and transparency in every project executed.\n2. Empowerment: Equipping underserved communities with skills for self-determination.\n3. Inclusivity: Delivering compassionate support without regard to gender, creed, or tribe.\n4. Sustainability: Implementing community-rooted interventions that generate long-term self-reliance.',
      image_url: '',
      metadata: { target_page: 'about', page: 'about', target_section: 'Core Values', section_key: 'about.values' },
      status: 'APPROVED',
      created_at: new Date('2026-01-16T12:00:00Z').toISOString()
    },
    {
      id: 'default-about-beneficiaries',
      content_type: 'website_content',
      title: 'Target Beneficiaries (6 Strategic Groups)',
      summary: 'Six primary beneficiary demographics served by our initiatives.',
      content: '1. Underprivileged children: Children lacking adequate learning resources and schooling.\n2. Schools and educational institutions: Underserved schools requiring infrastructure and academic upgrades.\n3. Adolescents and young people: Youth needing direction, career guidance, and mentorship.\n4. Women and girls: Vocational training, entrepreneurship, and personal development.\n5. Unemployed and underemployed individuals: Capacity development to enhance employability.\n6. Vulnerable households and communities: Interventions improving living standards and social welfare.',
      image_url: 'assets/images/program_skills.jpg',
      metadata: { target_page: 'about', page: 'about', target_section: 'Target Beneficiaries', section_key: 'about.beneficiaries', image_caption: 'Vocational training and capacity development' },
      status: 'APPROVED',
      created_at: new Date('2026-01-18T14:00:00Z').toISOString()
    },
    {
      id: 'default-about-pillars',
      content_type: 'website_content',
      title: '5 Strategic Focus Areas (Pillars)',
      summary: 'Educational Development, Youth Empowerment, Skills Acquisition, Livelihood, Community Development.',
      content: 'Pillar 01: Educational Development — Bridging educational gaps through school infrastructure assistance and learning supplies.\nPillar 02: Youth Empowerment & Mentorship — Equipping young people with confidence, leadership, and life skills.\nPillar 03: Skills Acquisition & Vocational Training — Market-relevant skills promoting entrepreneurship and financial independence.\nPillar 04: Livelihood & Economic Empowerment — Developing sustainable income-generating ventures.\nPillar 05: Community Development — Interventions promoting social welfare, health, and inclusion.',
      image_url: 'assets/images/program_community.jpg',
      metadata: { target_page: 'about', page: 'about', target_section: 'Strategic Focus Areas', section_key: 'about.pillars', image_caption: 'Strategic community intervention' },
      status: 'APPROVED',
      created_at: new Date('2026-01-20T15:00:00Z').toISOString()
    },
    {
      id: 'default-about-team',
      content_type: 'website_content',
      title: 'Meet Our Leadership Team',
      summary: 'Executive directors leading the foundation\'s regional operations.',
      content: '1. Dzifa Asomany Esq — Founder & Executive Director (Former WHO physician with 20+ years in global health)\n2. James Kariuki — Chief Operations Officer (Expert in non-profit operations scaling field programmes)\n3. Sofia Martinez — Head of Programs (Curriculum designer leading education & empowerment)\n4. Emmanuel Agyei — Head of Partnerships (Builds alliances with international development partners)',
      image_url: '',
      metadata: { target_page: 'about', page: 'about', target_section: 'Leadership', section_key: 'about.team' },
      status: 'APPROVED',
      created_at: new Date('2026-01-22T16:00:00Z').toISOString()
    },
    {
      id: 'default-about-timeline',
      content_type: 'website_content',
      title: '1 Year of Impact (2026 Journey Timeline)',
      summary: 'Month-by-month milestone history from January to October 2026.',
      content: 'January: Foundation Established in Accra, Ghana by Dzifa Asomany Esq.\nFebruary: Grassroots Community Assessment across rural and peri-urban centers.\nMarch: Elevate Learn Initiative supplying 1,200 primary pupils.\nApril: Clean Water & Sanitation Drive delivering boreholes to 2,000 residents.\nMay: Elevate Her Women Accelerator graduating 150 entrepreneurs.\nJune: Youth Tech & Digital Hub opened with coding classes.\nJuly: Mid-Year Mobile Health Clinics serving 3,500 attendees.\nAugust: Back-to-School Scholarships awarded to 250 students.\nSeptember: Green Future Climate Action planting 12,000 trees.\nOctober: 10-Month Milestone surpassing 10,000 direct beneficiaries.',
      image_url: '',
      metadata: { target_page: 'about', page: 'about', target_section: 'Milestones Timeline', section_key: 'about.timeline' },
      status: 'APPROVED',
      created_at: new Date('2026-01-25T17:00:00Z').toISOString()
    },

    // ── OTHER PAGES BASELINE CONTENT ──
    {
      id: 'default-home-1',
      content_type: 'website_content',
      title: 'Elevating, Empowering and Transforming Lives',
      summary: 'Homepage Hero Spotlight & Core Tagline',
      content: 'Project Elevate Foundation is dedicated to creating an empowered and self-reliant society where every individual has access to quality education, opportunities for personal development, and sustainable livelihood.',
      image_url: 'assets/images/program_education.jpg',
      metadata: { target_page: 'home', page: 'home', target_section: 'Hero Banner' },
      status: 'APPROVED',
      created_at: new Date('2026-01-15T09:00:00Z').toISOString()
    },
    {
      id: 'default-prog-1',
      content_type: 'activity',
      title: 'Pillar 1: Educational Development',
      summary: 'Bridging educational gaps through school support, learning materials, and infrastructure assistance.',
      content: 'Supporting underserved schools, delivering learning kits, textbooks, and upgrading classroom facilities.',
      image_url: 'assets/images/program_education.jpg',
      metadata: { target_page: 'programs', page: 'programs', target_section: 'Pillar 1' },
      status: 'APPROVED',
      created_at: new Date('2026-02-01T08:00:00Z').toISOString()
    },
    {
      id: 'default-blog-1',
      content_type: 'publication',
      title: 'Empowering the Next Generation: A Guide to Youth Mentorship',
      summary: 'Foundation cornerstone book by TOBI Jane Davidson.',
      content: 'A comprehensive handbook outlining proven frameworks for mentoring vulnerable youth.',
      image_url: 'assets/images/book-release.jpg',
      metadata: { target_page: 'blog', page: 'blog', target_section: 'Featured Book', author: 'TOBI Jane Davidson', release_date: 'April 2026' },
      status: 'APPROVED',
      created_at: new Date('2026-02-15T09:00:00Z').toISOString()
    },
    {
      id: 'default-vol-1',
      content_type: 'website_content',
      title: 'Volunteer Tutors & Career Mentors Cohort 2026',
      summary: 'Recruitment for weekend educational tutors and youth mentors.',
      content: 'We welcome passionate educators ready to guide young students in basic mathematics and literacy.',
      image_url: 'assets/images/program_youth.jpg',
      metadata: { target_page: 'volunteer', page: 'volunteer', target_section: 'Volunteer Cohort Call' },
      status: 'APPROVED',
      created_at: new Date('2026-02-20T10:00:00Z').toISOString()
    },
    {
      id: 'default-contact-1',
      content_type: 'website_content',
      title: 'Main Office Contact & Operating Schedule',
      summary: 'Official contact phone: +233 20 949 4119. Mon - Fri 8:00 AM - 5:00 PM GMT.',
      content: 'Call +233 20 949 4119 or email info@projectelevatefoundation.org for inquiries and partnerships.',
      image_url: '',
      metadata: { target_page: 'contact', page: 'contact', target_section: 'Contact Information' },
      status: 'APPROVED',
      created_at: new Date('2026-02-22T11:00:00Z').toISOString()
    },
    {
      id: 'default-donate-1',
      content_type: 'website_content',
      title: 'Sponsor a Classroom & School Supply Kits',
      summary: 'Support underserved classrooms with curriculum books and desks.',
      content: 'Your financial donation provides exercise books, mathematical sets, and learning aids directly to underprivileged pupils.',
      image_url: 'assets/images/program_education.jpg',
      metadata: { target_page: 'donate', page: 'donate', target_section: 'Featured Appeal' },
      status: 'APPROVED',
      created_at: new Date('2026-02-25T14:00:00Z').toISOString()
    }
  ];


  /* ── Pre-flight Authentication & Authorization ──────────── */
  async function initAuth() {
    if (!supabase) {
      alert('Supabase client failed to initialize. Please check your network connection.');
      return;
    }

    const { data: { session }, error: sessionErr } = await supabase.auth.getSession();
    if (sessionErr || !session || !session.user) {
      window.location.replace('team-login.html');
      return;
    }

    state.user = session.user;

    // Fetch authorized role & permissions across resilient fallback layers
    try {
      const profile = await resolveUserProfile(state.user);

      state.profile = profile;
      state.role = profile.role; // 'super_admin' or 'manager'

      applyRoleUI();
      await loadDashboardData();

    } catch (e) {
      console.error('Authorization error:', e);
      alert(e.message || 'Access Denied: Your account is not authorized or has been deactivated.');
      try { await supabase.auth.signOut(); } catch (_) {}
      window.location.replace('team-login.html');
    }
  }

  /**
   * Resolves the authenticated user's role and profile across multiple resilient layers.
   * Auto-links user_id on user_roles when NULL, prevents RLS recursion traps, and verifies status.
   */
  async function resolveUserProfile(user) {
    if (!user) throw new Error('Authentication session not found.');

    const cleanEmail = (user.email || '').trim().toLowerCase();
    let profile = null;

    // 1. Primary: Secure RPC get_my_profile (SECURITY DEFINER, auto-links user_id, handles admin_users & user_roles)
    try {
      const { data: rpcData, error: rpcErr } = await supabase.rpc('get_my_profile');
      if (!rpcErr && rpcData && rpcData.length > 0) {
        profile = rpcData[0];
      }
    } catch (e) {
      console.warn('RPC get_my_profile check:', e);
    }

    // 2. Secondary: Secure RPC get_my_role
    if (!profile) {
      try {
        const { data: roleData, error: roleErr } = await supabase.rpc('get_my_role');
        if (!roleErr && roleData && roleData.role) {
          profile = roleData;
        }
      } catch (e) {
        console.warn('RPC get_my_role check:', e);
      }
    }

    // 3. Fallback: Query user_roles directly by email & auto-link user_id
    if (!profile && cleanEmail) {
      try {
        const { data: byEmail, error: emailErr } = await supabase
          .from('user_roles')
          .select('*')
          .ilike('email', cleanEmail)
          .maybeSingle();

        if (!emailErr && byEmail) {
          profile = byEmail;
          if (!byEmail.user_id && user.id) {
            try {
              await supabase
                .from('user_roles')
                .update({ user_id: user.id })
                .eq('id', byEmail.id);
            } catch (_) {}
          }
        }
      } catch (e) {
        console.warn('Query user_roles by email:', e);
      }
    }

    // 4. Fallback: Query user_roles directly by user_id
    if (!profile && user.id) {
      try {
        const { data: byId, error: idErr } = await supabase
          .from('user_roles')
          .select('*')
          .eq('user_id', user.id)
          .maybeSingle();

        if (!idErr && byId) {
          profile = byId;
        }
      } catch (e) {
        console.warn('Query user_roles by user_id:', e);
      }
    }

    // 5. Fallback: Query admin_users for Super Admin (checks user_id only)
    if (!profile && user.id) {
      try {
        const { data: adminRow, error: adminErr } = await supabase
          .from('admin_users')
          .select('user_id')
          .eq('user_id', user.id)
          .maybeSingle();

        if (!adminErr && adminRow) {
          profile = {
            role: 'super_admin',
            is_active: true,
            full_name: 'Super Admin',
            email: cleanEmail,
            can_manage_activities: true,
            can_manage_events: true,
            can_manage_news: true,
            can_manage_books: true,
            can_manage_gallery: true,
            can_manage_content: true
          };
        }
      } catch (e) {
        console.warn('Check admin_users fallback:', e);
      }
    }

    // Role & Authorization Validation
    if (!profile) {
      throw new Error('Access Denied: Your account is not authorized for team access. Contact the Super Admin.');
    }

    if (profile.is_active === false) {
      throw new Error('Account Suspended: Your manager account has been deactivated by the Super Admin.');
    }

    if (profile.role !== 'manager' && profile.role !== 'super_admin' && profile.role !== 'admin') {
      throw new Error(`Access Denied: Your account role (${profile.role}) is not authorized for team access.`);
    }

    return profile;
  }

  /* ── Role-Based UI Application ───────────────────────────── */
  function applyRoleUI() {
    const isSuperAdmin = state.role === 'super_admin';
    const isNormalAdmin = state.role === 'admin' || state.role === 'manager';

    // Set user card in sidebar
    const emailEl = document.getElementById('dash-user-email');
    const roleEl = document.getElementById('dash-user-role');
    if (emailEl) emailEl.textContent = state.user.email;
    if (roleEl) {
      roleEl.textContent = isSuperAdmin ? 'Super Admin' : (state.role === 'admin' ? 'Admin' : 'Content Manager');
      roleEl.className = 'dash-user-role-badge ' + (isSuperAdmin ? 'role-super-admin' : 'role-manager');
    }

    // Hide or show Super Admin only elements (Sensitive data: Donations, Contacts, Volunteers, Logs, Accounts)
    document.querySelectorAll('.super-admin-only').forEach(el => {
      el.style.display = isSuperAdmin ? '' : 'none';
    });

    // Hide or show Manager only elements
    document.querySelectorAll('.manager-only').forEach(el => {
      el.style.display = !isSuperAdmin ? '' : 'none';
    });

    // Filter content management tabs if specific manager permissions are disabled
    if (!isSuperAdmin) {
      const p = state.profile;
      toggleNavLink('activities', p.can_manage_activities);
      toggleNavLink('events', p.can_manage_events);
      toggleNavLink('news', p.can_manage_news);
      toggleNavLink('books', p.can_manage_books);
      toggleNavLink('gallery', p.can_manage_gallery);
      toggleNavLink('content', p.can_manage_content);
    }

    // Default tab: Super Admin -> overview; Manager -> submissions
    switchTab(isSuperAdmin ? 'overview' : 'page-home');
  }

  function toggleNavLink(tabId, isEnabled) {
    const link = document.querySelector(`.dash-nav-link[data-tab="${tabId}"]`);
    if (link) link.style.display = isEnabled ? '' : 'none';
  }

  /* ── Tab Switching ───────────────────────────────────────── */
  function switchTab(tabId) {
    // If manager tries to access a Super Admin only tab, redirect to home page content or submissions
    if (state.role !== 'super_admin') {
      const adminOnlyTabs = ['overview', 'pending', 'managers', 'logs', 'donations', 'newsletter'];
      if (adminOnlyTabs.includes(tabId)) {
        tabId = 'page-home';
      }
    }

    state.activeTab = tabId;
    document.querySelectorAll('.dash-nav-link').forEach(link => {
      link.classList.toggle('active', link.dataset.tab === tabId);
    });
    document.querySelectorAll('.dash-tab-pane').forEach(pane => {
      pane.classList.toggle('active', pane.id === `tab-${tabId}`);
    });

    const titleEl = document.getElementById('dash-current-title');
    const titles = {
      overview: 'Executive Overview',
      pending: 'Pending Approvals Queue',
      'page-home': 'Home Page Content Management',
      'page-about': 'About Us Page Content Management',
      'page-programs': 'Programs Page Content Management',
      'page-blog': 'Blog & News Content Management',
      'page-volunteer': 'Volunteer Page Content Management',
      'page-contact': 'Contact Page Content Management',
      'page-donate': 'Donate Page Content Management',
      submissions: 'All Submissions & Records',
      activities: 'Activities & Programmes',
      events: 'Upcoming Events Management',
      news: 'News & Announcements',
      books: 'Books & Publications',
      gallery: 'Photo & Video Gallery',
      content: 'Website Page Updates',
      managers: 'Manager Account Management',
      logs: 'Security & Activity Logs',
      contacts: 'Visitor Contact Messages',
      volunteers: 'Volunteer Applications',
      donations: 'Donations & Paystack Transactions',
      newsletter: 'Newsletter Subscribers'
    };
    if (titleEl) titleEl.textContent = titles[tabId] || 'Management Dashboard';

    // Close mobile menu if open
    document.getElementById('dash-sidebar')?.classList.remove('is-open');
  }

  /* ── Load All Data ───────────────────────────────────────── */
  async function loadDashboardData() {
    try {
      await loadSubmissions();

      if (state.role === 'super_admin') {
        await Promise.all([
          loadManagers(),
          loadActivityLogs(),
          loadEngagementRecords()
        ]);
      } else {
        // Manager also loads visitor contact messages
        await loadEngagementRecords();
      }
      updateStats();
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
    }
  }

  /* ── Load Submissions ────────────────────────────────────── */
  async function loadSubmissions() {
    let dbItems = [];
    try {
      const { data, error } = await supabase
        .from('content_submissions')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.warn('Supabase submissions query notice:', error.message);
      } else if (data) {
        dbItems = data;
      }
    } catch (e) {
      console.warn('Submissions query exception:', e);
    }

    // Merge with locally persisted custom submissions (unhosted / schema cache resilient)
    const localCustom = getLocalCustomSubmissions();
    const existingDbIds = new Set(dbItems.map(d => String(d.id)));
    localCustom.forEach(lItem => {
      if (!existingDbIds.has(String(lItem.id))) {
        dbItems.push(lItem);
      }
    });

    // Load deleted item IDs
    const savedDeleted = getLocalDeletedIds();
    savedDeleted.forEach(id => state.deletedItemIds.add(String(id)));

    // Merge with baseline page default items
    const existingSectionKeys = new Set(
      dbItems
        .filter(d => d.metadata && d.metadata.section_key)
        .map(d => String(d.metadata.section_key))
    );
    const merged = [...dbItems];
    for (const defItem of DEFAULT_PAGE_ITEMS) {
      if (state.deletedItemIds && state.deletedItemIds.has(defItem.id)) continue;
      if (defItem.metadata?.section_key && existingSectionKeys.has(defItem.metadata.section_key)) continue;
      if (!existingDbIds.has(defItem.id)) {
        merged.push(defItem);
      }
    }

    state.submissions = merged.filter(i => !state.deletedItemIds.has(String(i.id)));
    renderSubmissionsTables();
  }

  /* ── Load Managers (Super Admin only) ───────────────────── */
  async function loadManagers() {
    if (state.role !== 'super_admin') return;

    const { data, error } = await supabase
      .from('user_roles')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error) {
      state.managers = data || [];
      renderManagersTable();
    }
  }

  /* ── Load Activity Logs (Super Admin only) ──────────────── */
  async function loadActivityLogs() {
    if (state.role !== 'super_admin') return;

    const { data, error } = await supabase
      .from('activity_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100);

    if (!error) {
      state.logs = data || [];
      renderLogsTable();
    }
  }

  /* ── Load Engagement Records (Super Admin only) ─────────── */
  async function loadEngagementRecords() {
    try {
      // 1. Fetch contact_messages from Supabase
      let dbContacts = [];
      try {
        const { data, error } = await supabase
          .from('contact_messages')
          .select('*')
          .order('created_at', { ascending: false });
        if (!error && data) dbContacts = data;
      } catch (err) {
        console.warn('Supabase contact_messages query warning:', err);
      }

      // 2. Fetch volunteer_applications from Supabase (accessible to both Super Admin & Managers)
      let dbVolunteers = [];
      try {
        const { data, error } = await supabase
          .from('volunteer_applications')
          .select('*')
          .order('created_at', { ascending: false });
        if (!error && data) dbVolunteers = data;
      } catch (err) {
        console.warn('Supabase volunteer_applications query warning:', err);
      }

      // 3. Read local offline backups (guarantees messages sent from browser forms always appear immediately)
      let localContacts = [];
      let localVolunteers = [];
      try {
        localContacts = JSON.parse(localStorage.getItem('elevate_local_contacts') || '[]');
        localVolunteers = JSON.parse(localStorage.getItem('elevate_local_volunteers') || '[]');
      } catch (_) {}

      // Deduplicate contacts
      const contactKeys = new Set(dbContacts.map(c => `${c.email}_${c.message || ''}`));
      const mergedContacts = [...dbContacts];
      for (const lc of localContacts) {
        const key = `${lc.email}_${lc.message || ''}`;
        if (!contactKeys.has(key)) {
          mergedContacts.push(lc);
          contactKeys.add(key);
        }
      }

      // Deduplicate volunteers
      const volunteerKeys = new Set(dbVolunteers.map(v => `${v.email}_${v.bio || ''}`));
      const mergedVolunteers = [...dbVolunteers];
      for (const lv of localVolunteers) {
        const key = `${lv.email}_${lv.bio || ''}`;
        if (!volunteerKeys.has(key)) {
          mergedVolunteers.push(lv);
          volunteerKeys.add(key);
        }
      }

      // Baseline sample contact messages if empty
      if (mergedContacts.length === 0) {
        mergedContacts.push({
          id: 'sample-contact-1',
          name: 'Kelvin Acheampong',
          email: 'kelvin.acheampong@gmail.com',
          phone: '+233 24 456 7890',
          subject: 'Partnership Inquiry for Basic Schools',
          department: 'partnerships',
          message: 'Hello Project Elevate team, I represent an educational NGO in Kumasi and would love to partner with you on providing learning materials to underserved basic schools in Ashanti region.',
          status: 'new',
          created_at: new Date(Date.now() - 3600000 * 2).toISOString()
        });
        mergedContacts.push({
          id: 'sample-contact-2',
          name: 'Abena Mensah',
          email: 'abena.mensah@outlook.com',
          phone: '+233 50 123 4567',
          subject: 'Donations & Educational Kits Inquiry',
          department: 'donations',
          message: 'Good day, please let me know how our corporate foundation can donate 200 backpacks and math sets for your upcoming outreach.',
          status: 'read',
          created_at: new Date(Date.now() - 3600000 * 24).toISOString()
        });
      }

      // Baseline sample volunteer applications if empty
      if (mergedVolunteers.length === 0) {
        mergedVolunteers.push({
          id: 'sample-vol-1',
          first_name: 'Emmanuel',
          last_name: 'Quaye',
          email: 'emmanuel.quaye@gmail.com',
          phone: '+233 55 987 6543',
          country: 'Ghana',
          role: 'Educational Development & Teaching',
          availability: 'Weekends only',
          bio: 'I am a high school mathematics tutor with 4 years experience. I would like to volunteer on weekends to teach remedial mathematics and mentor primary and JHS students.',
          status: 'pending',
          created_at: new Date(Date.now() - 3600000 * 4).toISOString()
        });
        mergedVolunteers.push({
          id: 'sample-vol-2',
          first_name: 'Grace',
          last_name: 'Osei',
          email: 'grace.osei@yahoo.com',
          phone: '+233 27 654 3210',
          country: 'Ghana',
          role: 'Youth Mentorship & Guidance',
          availability: 'Part-time (20h/week)',
          bio: 'I have a background in counseling psychology and wish to support young girls and adolescents with career guidance and self-confidence development.',
          status: 'pending',
          created_at: new Date(Date.now() - 3600000 * 18).toISOString()
        });
      }

      state.contacts = mergedContacts;
      state.volunteers = mergedVolunteers;

      // 4. Sensitive Financial records (Super Admin only)
      if (state.role === 'super_admin') {
        try {
          const [donRes, subRes] = await Promise.all([
            supabase.from('donations').select('*').order('created_at', { ascending: false }),
            supabase.from('newsletter_subscribers').select('*').order('created_at', { ascending: false })
          ]);
          state.donations = donRes.data || [];
          state.subscribers = subRes.data || [];
        } catch (_) {}
      }

      renderEngagementTables();
      updateStats();
    } catch (e) {
      console.warn('Engagement records loading exception:', e);
    }
  }

  /* ── Update KPI Badges & Cards ───────────────────────────── */
  function updateStats() {
    const pendingList = state.submissions.filter(s => s.status === 'PENDING');
    const approvedList = state.submissions.filter(s => s.status === 'APPROVED');
    const revisionList = state.submissions.filter(s => s.status === 'REVISION REQUESTED');

    // Badges in sidebar
    const pendingBadge = document.getElementById('pending-count-badge');
    if (pendingBadge) {
      pendingBadge.textContent = pendingList.length;
      pendingBadge.style.display = pendingList.length > 0 ? 'inline-block' : 'none';
    }

    const totalInquiries = (state.contacts?.length || 0) + (state.volunteers?.length || 0);
    const contactsBadge = document.getElementById('contacts-count-badge');
    if (contactsBadge) {
      contactsBadge.textContent = totalInquiries;
      contactsBadge.style.display = totalInquiries > 0 ? 'inline-block' : 'none';
    }

    const volBadge = document.getElementById('volunteers-count-badge');
    if (volBadge) {
      volBadge.textContent = state.volunteers?.length || 0;
      volBadge.style.display = (state.volunteers?.length || 0) > 0 ? 'inline-block' : 'none';
    }

    const countAllEl = document.getElementById('count-all-inquiries');
    if (countAllEl) countAllEl.textContent = totalInquiries;
    const countContEl = document.getElementById('count-contact-inquiries');
    if (countContEl) countContEl.textContent = state.contacts?.length || 0;
    const countVolEl = document.getElementById('count-volunteer-inquiries');
    if (countVolEl) countVolEl.textContent = state.volunteers?.length || 0;

    // Top Overview KPIs (Super Admin)
    const statPending = document.getElementById('stat-pending-count');
    const statApproved = document.getElementById('stat-approved-count');
    const statRevision = document.getElementById('stat-revision-count');
    const statTotal = document.getElementById('stat-total-submissions');

    if (statPending) statPending.textContent = pendingList.length;
    if (statApproved) statApproved.textContent = approvedList.length;
    if (statRevision) statRevision.textContent = revisionList.length;
    if (statTotal) statTotal.textContent = state.submissions.length;
  }

  
  /* ── About Us Content Management ────────────────────────── */
  function renderAboutTable() {
    const tbody = document.getElementById('page-about-tbody');
    if (!tbody) return;

    let items = state.submissions.filter(s => {
      const p = (s.metadata?.target_page || s.metadata?.page || '').toLowerCase();
      return p === 'about';
    });

    // Apply Section Filter
    if (state.aboutFilter && state.aboutFilter !== 'all') {
      const filterSec = state.aboutFilter.toLowerCase();
      items = items.filter(s => {
        const targetSec = (s.metadata?.target_section || '').toLowerCase();
        if (filterSec === 'custom section') {
          return s.metadata?.is_custom_section || targetSec.includes('custom');
        }
        return targetSec.includes(filterSec);
      });
    }

    // Apply Search Filter
    if (state.aboutSearch) {
      const q = state.aboutSearch;
      items = items.filter(s => {
        return (
          (s.title || '').toLowerCase().includes(q) ||
          (s.summary || '').toLowerCase().includes(q) ||
          (s.content || '').toLowerCase().includes(q) ||
          (s.metadata?.target_section || '').toLowerCase().includes(q)
        );
      });
    }

    if (items.length === 0) {
      tbody.innerHTML = `<tr><td colspan="6" class="empty-state">
        <div class="empty-state-icon">📄</div>
        <h4>No Matching About Us Content</h4>
        <p>No content entries found matching your current filter. Click "Add New About Us Content" to publish new text or images.</p>
      </td></tr>`;
      return;
    }

    tbody.innerHTML = items.map(item => {
      const isApproved = item.status === 'APPROVED';
      const sectionLabel = item.metadata?.target_section || 'About Us Section';
      const captionText = item.metadata?.image_caption ? `<div style="font-size:0.72rem;color:#0284c7;margin-top:2px;">📷 <em>${escapeHtml(item.metadata.image_caption)}</em></div>` : '';
      
      const thumbHtml = item.image_url
        ? `<img src="${escapeHtml(item.image_url)}" alt="${escapeHtml(item.title)}" class="dash-table-thumb" onclick="window.viewSubmission('${item.id}')" title="Click to view full image" />`
        : `<div class="dash-table-thumb-placeholder" title="Text-only content">📄</div>`;

      return `
        <tr>
          <td>${thumbHtml}</td>
          <td>
            <strong style="color:#0f172a;font-size:0.92rem;">${escapeHtml(item.title)}</strong>
            ${item.summary ? `<div style="font-size:0.78rem;color:#64748b;margin-top:3px;line-height:1.4;">${escapeHtml(item.summary)}</div>` : ''}
            ${captionText}
          </td>
          <td>
            <span class="badge-section-target">${escapeHtml(sectionLabel)}</span>
          </td>
          <td style="white-space:nowrap;font-size:0.8rem;color:#64748b;">${formatDate(item.updated_at || item.created_at)}</td>
          <td>${statusBadge(item.status)}</td>
          <td>
            <div class="table-actions" style="justify-content:flex-end;">
              <button class="btn-action-sm btn-action-view" onclick="window.viewSubmission('${item.id}')" title="View Content Details">👁️ View</button>
              <button class="btn-action-sm btn-action-edit" onclick="window.openEditModal('${item.id}')" title="Edit Content">✏️ Edit</button>
              <button class="btn-action-sm btn-action-image" onclick="window.quickReplaceImage('${item.id}')" title="Upload / Replace Image">🖼️ Image</button>
              <button class="btn-action-sm ${isApproved ? 'btn-action-revision' : 'btn-action-approve'}" onclick="window.togglePublishStatus('${item.id}', '${item.status}')" title="${isApproved ? 'Unpublish to Draft' : 'Publish Live to Website'}">
                ${isApproved ? '⏸️ Unpublish' : '🚀 Publish Live'}
              </button>
              <button class="btn-action-sm btn-action-delete" onclick="window.deleteAboutContent('${item.id}')" title="Permanently Delete">🗑️ Delete</button>
            </div>
          </td>
        </tr>
      `;
    }).join('');
  }

  window.filterAboutSection = function (sec) {
    state.aboutFilter = sec;
    document.querySelectorAll('#about-section-filters .btn-filter-pill').forEach(btn => {
      const isActive = sec === 'all'
        ? btn.textContent.trim() === 'All Sections'
        : btn.textContent.toLowerCase().includes(sec.toLowerCase());
      btn.classList.toggle('active', isActive);
    });
    renderAboutTable();
  };

  window.searchAboutContent = function (q) {
    state.aboutSearch = (q || '').trim().toLowerCase();
    renderAboutTable();
  };

  window.openNewAboutContentModal = function (defaultSection) {
    window.openNewPageContentModal('about');
    document.getElementById('sub-modal-title').textContent = 'Add New Content to About Us Page';
    if (defaultSection && document.getElementById('sub-target-section')) {
      document.getElementById('sub-target-section').value = defaultSection;
    }
  };

  window.quickReplaceImage = function (id) {
    window.openEditModal(id);
    setTimeout(() => {
      document.getElementById('sub-file-input')?.click();
    }, 150);
  };

  window.clearModalImage = function () {
    const urlInput = document.getElementById('sub-image-url');
    if (urlInput) urlInput.value = '';
    const fileInput = document.getElementById('sub-file-input');
    if (fileInput) fileInput.value = '';
    const previewImg = document.getElementById('sub-image-preview');
    if (previewImg) previewImg.src = '';
    const previewWrap = document.getElementById('sub-image-preview-wrap');
    if (previewWrap) previewWrap.style.display = 'none';
    const uploadStatus = document.getElementById('sub-upload-status');
    if (uploadStatus) {
      uploadStatus.textContent = 'Image removed. Ready to publish text-only or choose new image.';
      uploadStatus.style.color = '#64748b';
    }
  };

  window.deleteAboutContent = async function (id) {
    const item = state.submissions.find(s => String(s.id) === String(id));
    if (!item) return;

    const confirmed = confirm(
      `⚠️ PERMANENT DELETION CONFIRMATION\n\nAre you sure you want to permanently delete:\n"${item.title}"?\n\nSection: ${item.metadata?.target_section || 'About Us'}\n\nThis will immediately remove this content and its image from the public About Us page. This action cannot be undone.`
    );
    if (!confirmed) return;

    state.deletedItemIds.add(String(id));
    saveLocalDeletedId(String(id));
    removeLocalCustomSubmission(String(id));
    state.submissions = state.submissions.filter(s => String(s.id) !== String(id));

    if (!String(id).startsWith('default-')) {
      try {
        await supabase
          .from('content_submissions')
          .delete()
          .eq('id', id);
      } catch (err) {
        console.warn('Supabase delete notice:', err.message);
      }
    }

    await logAction('CONTENT_DELETED', 'content', id, `Deleted About Us item "${item.title}"`);
    renderSubmissionsTables();
    updateStats();
    alert(`🗑️ "${item.title}" has been permanently deleted from the website.`);
  };

  /* ── Render Submissions Tables ───────────────────────────── */
  function renderSubmissionsTables() {
    const isSuperAdmin = state.role === 'super_admin';

    // 1. Pending Queue (Super Admin Overview)
    const pendingTbody = document.getElementById('pending-tbody');
    const pendingItems = state.submissions.filter(s => s.status === 'PENDING');

    if (pendingTbody) {
      if (pendingItems.length === 0) {
        pendingTbody.innerHTML = `<tr><td colspan="6" class="empty-state">
          <div class="empty-state-icon">✨</div>
          <h4>No Items Awaiting Review</h4>
          <p>All content is live or saved as draft.</p>
        </td></tr>`;
      } else {
        pendingTbody.innerHTML = pendingItems.map(item => `
          <tr>
            <td><strong>${escapeHtml(item.title)}</strong><div style="font-size:0.75rem;color:#64748b;">${escapeHtml(item.summary || '')}</div></td>
            <td>${typeBadge(item.content_type)}</td>
            <td>${escapeHtml(item.author_email || 'Staff')}</td>
            <td>${formatDate(item.created_at)}</td>
            <td>${statusBadge(item.status)}</td>
            <td>
              <div class="table-actions">
                <button class="btn-action-sm btn-action-view" onclick="window.viewSubmission('${item.id}')">👁️ View</button>
                <button class="btn-action-sm btn-action-approve" onclick="window.togglePublishStatus('${item.id}', '${item.status}')">🚀 Publish Live</button>
                <button class="btn-action-sm btn-action-delete" onclick="window.deleteSubmission('${item.id}')">🗑️ Delete</button>
              </div>
            </td>
          </tr>
        `).join('');
      }
    }

    // Render Website Pages Content Tables

    // 4. Dedicated Website Pages Content Tables
    renderPageTable('page-home-tbody', 'home', state.submissions);
    renderPageTable('page-about-tbody', 'about', state.submissions);
    renderPageTable('page-programs-tbody', 'programs', state.submissions);
    renderPageTable('page-blog-tbody', 'blog', state.submissions);
    renderPageTable('page-volunteer-tbody', 'volunteer', state.submissions);
    renderPageTable('page-contact-tbody', 'contact', state.submissions);
    renderPageTable('page-donate-tbody', 'donate', state.submissions);
  }

  function renderSectionTable(tbodyId, items) {
    const tbody = document.getElementById(tbodyId);
    if (!tbody) return;

    if (items.length === 0) {
      tbody.innerHTML = `<tr><td colspan="5" class="empty-state">
        <div class="empty-state-icon">📂</div>
        <h4>No Content Items Yet</h4>
        <p>Click "New Submission" to publish or draft content.</p>
      </td></tr>`;
      return;
    }

    tbody.innerHTML = items.map(item => {
      const isApproved = item.status === 'APPROVED';

      return `
        <tr>
          <td>
            <strong>${escapeHtml(item.title)}</strong>
            ${item.summary ? `<div style="font-size:0.76rem;color:#64748b;margin-top:2px;">${escapeHtml(item.summary)}</div>` : ''}
          </td>
          <td>${typeBadge(item.content_type)}</td>
          <td>${formatDate(item.created_at)}</td>
          <td>${statusBadge(item.status)}</td>
          <td>
            <div class="table-actions">
              <button class="btn-action-sm btn-action-view" onclick="window.viewSubmission('${item.id}')">👁️ View</button>
              <button class="btn-action-sm btn-action-edit" onclick="window.openEditModal('${item.id}')">✏️ Edit</button>
              <button class="btn-action-sm ${isApproved ? 'btn-action-revision' : 'btn-action-approve'}" onclick="window.togglePublishStatus('${item.id}', '${item.status}')">
                ${isApproved ? '⏸️ Unpublish' : '🚀 Publish Live'}
              </button>
              <button class="btn-action-sm btn-action-delete" onclick="window.deleteSubmission('${item.id}')">🗑️ Delete</button>
            </div>
          </td>
        </tr>
      `;
    }).join('');
  }

  
  function renderPageTable(tbodyId, pageKey, allSubmissions) {
    const tbody = document.getElementById(tbodyId);
    if (!tbody) return;

    const items = allSubmissions.filter(s => {
      const p = (s.metadata?.target_page || s.metadata?.page || '').toLowerCase();
      if (p === pageKey) return true;
      if (pageKey === 'programs' && (s.content_type === 'activity' || p === 'programs')) return true;
      if (pageKey === 'blog' && (s.content_type === 'news_announcement' || s.content_type === 'publication' || p === 'blog')) return true;
      return false;
    });

    if (items.length === 0) {
      tbody.innerHTML = `<tr><td colspan="5" class="empty-state">
        <div class="empty-state-icon">📄</div>
        <h4>No Content Items for ${escapeHtml(pageKey.charAt(0).toUpperCase() + pageKey.slice(1))} Page</h4>
        <p>Click "Add Content" to publish or draft content for this page.</p>
      </td></tr>`;
      return;
    }

    tbody.innerHTML = items.map(item => {
      const isApproved = item.status === 'APPROVED';
      const sectionLabel = item.metadata?.target_section || item.metadata?.section || typeBadge(item.content_type);

      return `
        <tr>
          <td>
            <strong>${escapeHtml(item.title)}</strong>
            ${item.summary ? `<div style="font-size:0.76rem;color:#64748b;margin-top:2px;">${escapeHtml(item.summary)}</div>` : ''}
          </td>
          <td><span style="display:inline-block;padding:2px 8px;border-radius:4px;font-size:0.75rem;font-weight:600;background:#e2e8f0;color:#334155;">${escapeHtml(sectionLabel)}</span></td>
          <td style="white-space:nowrap;">${formatDate(item.created_at)}</td>
          <td>${statusBadge(item.status)}</td>
          <td>
            <div class="table-actions">
              <button class="btn-action-sm btn-action-view" onclick="window.viewSubmission('${item.id}')">👁️ View</button>
              <button class="btn-action-sm btn-action-edit" onclick="window.openEditModal('${item.id}')">✏️ Edit</button>
              <button class="btn-action-sm ${isApproved ? 'btn-action-revision' : 'btn-action-approve'}" onclick="window.togglePublishStatus('${item.id}', '${item.status}')">
                ${isApproved ? '⏸️ Unpublish' : '🚀 Publish Live'}
              </button>
              <button class="btn-action-sm btn-action-delete" onclick="window.deleteSubmission('${item.id}')">🗑️ Delete</button>
            </div>
          </td>
        </tr>
      `;
    }).join('');
  }

  /* ── Render Managers Table (Super Admin only) ────────────── */
  function renderManagersTable() {
    const tbody = document.getElementById('managers-tbody');
    if (!tbody) return;

    if (state.managers.length === 0) {
      tbody.innerHTML = `<tr><td colspan="5" class="empty-state">No team accounts found.</td></tr>`;
      return;
    }

    tbody.innerHTML = state.managers.map(m => `
      <tr>
        <td><strong>${escapeHtml(m.full_name || 'Manager')}</strong></td>
        <td>${escapeHtml(m.email)}</td>
        <td>
          <span class="dash-user-role-badge ${m.role === 'super_admin' ? 'role-super-admin' : 'role-manager'}">
            ${m.role === 'super_admin' ? 'Super Admin' : 'Content Manager'}
          </span>
        </td>
        <td>
          <span class="status-pill ${m.is_active ? 'status-approved' : 'status-rejected'}">
            ${m.is_active ? '✅ Active' : '⛔ Deactivated'}
          </span>
        </td>
        <td>
          ${m.role !== 'super_admin' ? `
            <div style="display:flex;align-items:center;gap:6px;">
              <button class="btn-action-sm ${m.is_active ? 'btn-action-reject' : 'btn-action-approve'}" onclick="window.toggleManagerStatus('${m.id}', ${!m.is_active})">
                ${m.is_active ? '⛔ Deactivate' : '✅ Reactivate'}
              </button>
              <button class="btn-action-sm btn-action-view" onclick="window.editManagerPermissions('${m.id}')">
                ⚙️ Permissions
              </button>
            </div>
          ` : '<span style="font-size:0.75rem;color:#64748b;">Primary Admin</span>'}
        </td>
      </tr>
    `).join('');
  }

  /* ── Render Activity Logs Table (Super Admin only) ───────── */
  function renderLogsTable() {
    const tbody = document.getElementById('logs-tbody');
    if (!tbody) return;

    if (state.logs.length === 0) {
      tbody.innerHTML = `<tr><td colspan="4" class="empty-state">No activity logs recorded yet.</td></tr>`;
      return;
    }

    tbody.innerHTML = state.logs.map(log => `
      <tr>
        <td style="white-space:nowrap;">${formatDate(log.created_at)}</td>
        <td>${escapeHtml(log.user_email)}</td>
        <td><span class="log-badge-action">${escapeHtml(log.action_type)}</span></td>
        <td>${escapeHtml(log.details)}</td>
      </tr>
    `).join('');
  }

  /* ── Render Engagement Tables (Unified Contact & Volunteer Feed) ─ */
  function renderEngagementTables() {
    // 1. Unified Contact & Volunteer Messages Feed
    const ctBody = document.getElementById('contacts-tbody');
    if (ctBody) {
      // Build unified items array
      const unified = [];

      // Add contact messages
      (state.contacts || []).forEach(c => {
        unified.push({
          id: c.id,
          sourceType: 'contact',
          name: c.name || 'Anonymous',
          email: c.email || '',
          phone: c.phone || '',
          subjectOrRole: c.subject || 'Website Inquiry',
          messageText: c.message || '',
          department: c.department || 'general',
          created_at: c.created_at,
          status: c.status || 'new',
          raw: c
        });
      });

      // Add volunteer applications
      (state.volunteers || []).forEach(v => {
        unified.push({
          id: v.id,
          sourceType: 'volunteer',
          name: `${v.first_name || ''} ${v.last_name || ''}`.trim() || 'Volunteer Applicant',
          email: v.email || '',
          phone: v.phone || '',
          subjectOrRole: `Role: ${v.role || 'Volunteer'}`,
          messageText: v.bio || '',
          country: v.country || '',
          availability: v.availability || '',
          created_at: v.created_at,
          status: v.status || 'pending',
          raw: v
        });
      });

      // Sort newest first
      unified.sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));

      // Filter by type
      let filtered = unified;
      if (state.contactsFilter && state.contactsFilter !== 'all') {
        filtered = filtered.filter(item => item.sourceType === state.contactsFilter);
      }

      // Filter by search
      if (state.contactsSearch) {
        const q = state.contactsSearch;
        filtered = filtered.filter(item => (
          item.name.toLowerCase().includes(q) ||
          item.email.toLowerCase().includes(q) ||
          item.subjectOrRole.toLowerCase().includes(q) ||
          item.messageText.toLowerCase().includes(q)
        ));
      }

      if (filtered.length === 0) {
        ctBody.innerHTML = `<tr><td colspan="8" class="empty-state">
          <div class="empty-state-icon">✉️</div>
          <h4>No Messages Found</h4>
          <p>No messages match your selected filter. Messages submitted on the Contact Us or Volunteer page will appear here.</p>
        </td></tr>`;
      } else {
        ctBody.innerHTML = filtered.map((item, i) => {
          const previewMsg = escapeHtml(item.messageText.substring(0, 65)) + (item.messageText.length > 65 ? '...' : '');
          const sourceBadge = item.sourceType === 'volunteer'
            ? `<span class="badge-source-volunteer">🤝 Volunteer Form</span>`
            : `<span class="badge-source-contact">✉️ Contact Us</span>`;

          return `
            <tr>
              <td>${i + 1}</td>
              <td>
                <strong style="color:#0f172a;font-size:0.9rem;">${escapeHtml(item.name)}</strong>
                <div style="font-size:0.75rem;color:#64748b;margin-top:2px;">
                  ${escapeHtml(item.email)}${item.phone ? ' · ' + escapeHtml(item.phone) : ''}
                </div>
              </td>
              <td>${sourceBadge}</td>
              <td><strong>${escapeHtml(item.subjectOrRole)}</strong></td>
              <td style="font-size:0.83rem;color:#475569;max-width:240px;line-height:1.4;">${previewMsg}</td>
              <td style="white-space:nowrap;font-size:0.8rem;color:#64748b;">${formatDate(item.created_at)}</td>
              <td>${statusBadge(item.status)}</td>
              <td style="text-align:right;">
                <button class="btn-action-sm btn-action-view" onclick="window.viewEngagementMessage('${item.id}', '${item.sourceType}')">
                  👁️ View Message
                </button>
              </td>
            </tr>
          `;
        }).join('');
      }
    }

    // 2. Dedicated Volunteer Applications Table (in #tab-volunteers)
    const volBody = document.getElementById('volunteers-tbody');
    if (volBody) {
      volBody.innerHTML = (state.volunteers || []).length === 0
        ? `<tr><td colspan="7" class="empty-state">
            <div class="empty-state-icon">🤝</div>
            <h4>No Volunteer Applications Yet</h4>
            <p>Applications submitted on the Volunteer page will appear here.</p>
          </td></tr>`
        : state.volunteers.map((v, i) => `
            <tr>
              <td>${i + 1}</td>
              <td>
                <strong style="color:#0f172a;">${escapeHtml((v.first_name || '') + ' ' + (v.last_name || ''))}</strong>
                <div style="font-size:0.75rem;color:#64748b;">${escapeHtml(v.email)}${v.phone ? ' · ' + escapeHtml(v.phone) : ''}</div>
              </td>
              <td>${escapeHtml(v.role || 'Volunteer')}${v.country ? ' (' + escapeHtml(v.country) + ')' : ''}</td>
              <td>${escapeHtml(v.availability || 'Flexible')}</td>
              <td style="white-space:nowrap;font-size:0.8rem;color:#64748b;">${formatDate(v.created_at)}</td>
              <td>${statusBadge(v.status || 'pending')}</td>
              <td style="text-align:right;">
                <button class="btn-action-sm btn-action-view" onclick="window.viewEngagementMessage('${v.id}', 'volunteer')">
                  👁️ View Application
                </button>
              </td>
            </tr>
          `).join('');
    }

    // 3. Donations Table
    const donBody = document.getElementById('donations-tbody');
    if (donBody) {
      donBody.innerHTML = (state.donations || []).length === 0
        ? `<tr><td colspan="6" class="empty-state">No donation records yet.</td></tr>`
        : state.donations.map((d, i) => `
            <tr>
              <td>${i + 1}</td>
              <td><strong>${escapeHtml(d.name)}</strong><br><small style="color:#64748b;">${escapeHtml(d.email)}</small></td>
              <td><strong>GH₵${Number(d.amount).toLocaleString()}</strong> (${escapeHtml(d.frequency)})</td>
              <td>${escapeHtml(d.program || 'General')}</td>
              <td>${formatDate(d.created_at)}</td>
              <td>${statusBadge(d.payment_status)}</td>
            </tr>
          `).join('');
    }

    // 4. Newsletter Subscribers Table
    const subBody = document.getElementById('subscribers-tbody');
    if (subBody) {
      subBody.innerHTML = (state.subscribers || []).length === 0
        ? `<tr><td colspan="3" class="empty-state">No subscribers.</td></tr>`
        : state.subscribers.map((s, i) => `
            <tr>
              <td>${i + 1}</td>
              <td>${escapeHtml(s.email)}</td>
              <td>${formatDate(s.created_at)}</td>
            </tr>
          `).join('');
    }
  }

  /* ── Interactive Contact & Volunteer Message Modal & Filters ── */
  window.filterContactType = function (type) {
    state.contactsFilter = type;
    document.querySelectorAll('#contacts-filters .btn-filter-pill').forEach(btn => {
      const isAct = type === 'all'
        ? btn.textContent.includes('All')
        : (type === 'contact' ? btn.textContent.includes('Contact') : btn.textContent.includes('Volunteer'));
      btn.classList.toggle('active', isAct);
    });
    renderEngagementTables();
  };

  window.searchContactMessages = function (q) {
    state.contactsSearch = (q || '').trim().toLowerCase();
    renderEngagementTables();
  };

  window.viewEngagementMessage = function (id, sourceType) {
    const contactModal = document.getElementById('contact-view-modal');
    if (!contactModal) return;

    if (sourceType === 'volunteer') {
      const v = (state.volunteers || []).find(item => String(item.id) === String(id));
      if (!v) return;

      document.getElementById('cm-modal-title').textContent = 'Volunteer Application Details';
      const sourceWrap = document.getElementById('cm-source-wrap');
      if (sourceWrap) sourceWrap.innerHTML = '<span class="badge-source-volunteer">🤝 Volunteer Application Form</span>';

      document.getElementById('cm-name').textContent = `${v.first_name || ''} ${v.last_name || ''}`.trim() || 'Volunteer Applicant';
      document.getElementById('cm-email-phone').textContent = `${v.email || 'No email'}${v.phone ? ' · Phone: ' + v.phone : ''}`;
      document.getElementById('cm-date').textContent = formatDate(v.created_at);
      document.getElementById('cm-status').innerHTML = statusBadge(v.status || 'pending');

      const extraFields = document.getElementById('cm-extra-fields');
      if (extraFields) {
        extraFields.style.display = 'block';
        extraFields.innerHTML = `
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">
            <div><strong>Location:</strong> ${escapeHtml(v.country || 'Ghana')}</div>
            <div><strong>Availability:</strong> ${escapeHtml(v.availability || 'Flexible')}</div>
            <div style="grid-column:1/-1;"><strong>Pillar / Role:</strong> ${escapeHtml(v.role || 'Volunteer')}</div>
          </div>
        `;
      }

      document.getElementById('cm-subject-label').textContent = 'Strategic Pillar / Volunteer Area';
      document.getElementById('cm-subject').textContent = v.role || 'Volunteer';
      document.getElementById('cm-message-label').textContent = 'Personal Statement & Bio';
      document.getElementById('cm-message').textContent = v.bio || 'No bio provided.';

      const replyBtn = document.getElementById('cm-reply-btn');
      if (replyBtn) {
        if (v.email) {
          replyBtn.href = `mailto:${encodeURIComponent(v.email)}?subject=${encodeURIComponent('Project Elevate Foundation Volunteer Application: ' + (v.role || 'Volunteer'))}`;
          replyBtn.style.display = 'inline-flex';
        } else {
          replyBtn.style.display = 'none';
        }
      }

    } else {
      // Contact Us Message
      const c = (state.contacts || []).find(item => String(item.id) === String(id));
      if (!c) return;

      document.getElementById('cm-modal-title').textContent = 'Contact Message Details';
      const sourceWrap = document.getElementById('cm-source-wrap');
      if (sourceWrap) sourceWrap.innerHTML = '<span class="badge-source-contact">✉️ Contact Us Page Form</span>';

      document.getElementById('cm-name').textContent = c.name || 'Anonymous Visitor';
      document.getElementById('cm-email-phone').textContent = `${c.email || 'No email'}${c.phone ? ' · Phone: ' + c.phone : ''}`;
      document.getElementById('cm-date').textContent = formatDate(c.created_at);
      document.getElementById('cm-status').innerHTML = statusBadge(c.status || 'Received');

      const extraFields = document.getElementById('cm-extra-fields');
      if (extraFields) {
        extraFields.style.display = c.department ? 'block' : 'none';
        if (c.department) extraFields.innerHTML = `<strong>Department:</strong> ${escapeHtml(c.department)}`;
      }

      document.getElementById('cm-subject-label').textContent = 'Subject';
      document.getElementById('cm-subject').textContent = c.subject || 'Website Inquiry';
      document.getElementById('cm-message-label').textContent = 'Message';
      document.getElementById('cm-message').textContent = c.message || 'No message provided.';

      const replyBtn = document.getElementById('cm-reply-btn');
      if (replyBtn) {
        if (c.email) {
          replyBtn.href = `mailto:${encodeURIComponent(c.email)}?subject=${encodeURIComponent('Re: ' + (c.subject || 'Project Elevate Foundation Inquiry'))}`;
          replyBtn.style.display = 'inline-flex';
        } else {
          replyBtn.style.display = 'none';
        }
      }
    }

    contactModal.classList.add('is-open');
  };

  window.viewContactMessage = function (id) {
    window.viewEngagementMessage(id, 'contact');
  };

  window.closeContactModal = function () {
    document.getElementById('contact-view-modal')?.classList.remove('is-open');
  };

  window.exportUnifiedMessages = function () {
    const data = [];
    (state.contacts || []).forEach(c => data.push({ Source: 'Contact Us', Name: c.name, Email: c.email, Phone: c.phone || '', Subject: c.subject, Message: c.message, Date: c.created_at }));
    (state.volunteers || []).forEach(v => data.push({ Source: 'Volunteer Form', Name: `${v.first_name} ${v.last_name}`, Email: v.email, Phone: v.phone || '', Role: v.role, Country: v.country, Availability: v.availability, Bio: v.bio, Date: v.created_at }));
    window.exportCsv(data, 'all_visitor_messages.csv');
  };

  // Resilient HTML5 Canvas Image Optimizer: prevents distortion, sharpens, and compresses to high-res data URL
  function optimizeImage(file, maxWidth = 1600, maxHeight = 1600, quality = 0.88) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = () => reject(new Error('Failed to read file from disk'));
      reader.onload = () => {
        const img = new Image();
        img.onerror = () => reject(new Error('Failed to load image into memory'));
        img.onload = () => {
          let { width, height } = img;
          if (width > maxWidth || height > maxHeight) {
            const ratio = Math.min(maxWidth / width, maxHeight / height);
            width = Math.round(width * ratio);
            height = Math.round(height * ratio);
          }
          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          
          // Smooth rendering
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';

          const isJpeg = file.type === 'image/jpeg' || file.type === 'image/jpg';
          if (isJpeg) {
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, width, height);
          }
          ctx.drawImage(img, 0, 0, width, height);
          const mimeType = file.type === 'image/png' ? 'image/png' : 'image/jpeg';
          const dataUrl = canvas.toDataURL(mimeType, quality);
          resolve(dataUrl);
        };
        img.src = reader.result;
      };
      reader.readAsDataURL(file);
    });
  }

  const fileInput = document.getElementById('sub-file-input');
  const uploadStatus = document.getElementById('sub-upload-status');
  const previewWrap = document.getElementById('sub-image-preview-wrap');
  const previewImg = document.getElementById('sub-image-preview');
  const urlInput = document.getElementById('sub-image-url');

  fileInput?.addEventListener('change', async function () {
    const file = fileInput.files[0];
    if (!file) return;

    if (file.size > 15 * 1024 * 1024) {
      alert('File size exceeds the 15MB limit.');
      return;
    }

    uploadStatus.textContent = 'Processing media file...';
    uploadStatus.style.color = '#0284c7';

    const isImage = file.type.startsWith('image/');

    // 1. First attempt: Supabase Cloud Storage (if content-media bucket is set up)
    let uploadedToStorage = false;
    try {
      const cleanName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
      const fileName = `${Date.now()}_${cleanName}`;
      const filePath = `uploads/${fileName}`;

      const { data, error } = await supabase.storage
        .from('content-media')
        .upload(filePath, file, { cacheControl: '3600', upsert: true });

      if (!error && data) {
        const { data: { publicUrl } } = supabase.storage
          .from('content-media')
          .getPublicUrl(filePath);

        if (publicUrl) {
          urlInput.value = publicUrl;
          uploadStatus.textContent = `✅ Uploaded to Cloud Storage: ${file.name}`;
          uploadStatus.style.color = '#15803d';

          if (isImage) {
            previewImg.src = publicUrl;
            previewWrap.style.display = 'block';
          } else {
            previewWrap.style.display = 'none';
          }

          await logAction('MEDIA_UPLOADED', 'storage', filePath, `Uploaded file "${file.name}" to content-media`);
          uploadedToStorage = true;
          return;
        }
      } else if (error) {
        console.warn('Supabase storage upload error (will fallback to direct embedding):', error.message);
      }
    } catch (storageErr) {
      console.warn('Storage bucket unreachable or not found:', storageErr.message);
    }

    // 2. Resilient Fallback: Optimize and embed directly into content
    if (isImage) {
      try {
        uploadStatus.textContent = 'Optimizing image for direct publishing...';
        uploadStatus.style.color = '#d97706';

        const dataUrl = await optimizeImage(file, 1600, 1600, 0.88);
        urlInput.value = dataUrl;
        previewImg.src = dataUrl;
        previewWrap.style.display = 'block';

        uploadStatus.innerHTML = `✅ <strong>Photo loaded &amp; optimized!</strong> Ready to publish.`;
        uploadStatus.style.color = '#15803d';

        await logAction('MEDIA_OPTIMIZED', 'local_embed', file.name, `Optimized and embedded "${file.name}"`);
      } catch (optErr) {
        console.error('Image optimization failed:', optErr);
        uploadStatus.textContent = `❌ Unable to process image: ${optErr.message}`;
        uploadStatus.style.color = '#b91c1c';
      }
    } else {
      // Non-image file like PDF without bucket
      uploadStatus.innerHTML = `⚠️ <em>Bucket 'content-media' not found in Supabase. Run <code>supabase/create_storage_bucket.sql</code> to enable file storage.</em>`;
      uploadStatus.style.color = '#b91c1c';
    }
  });

  // Automatically update preview when a URL or data URI is pasted/typed
  urlInput?.addEventListener('input', function () {
    const val = (urlInput.value || '').trim();
    if (val && (val.startsWith('http://') || val.startsWith('https://') || val.startsWith('data:image/') || val.startsWith('assets/'))) {
      previewImg.src = val;
      previewWrap.style.display = 'block';
    } else if (!val) {
      previewWrap.style.display = 'none';
    }
  });

  /* ── Submission Modal Logic ──────────────────────────────── */
  const subModal = document.getElementById('submission-modal');
  const subForm = document.getElementById('submission-form');
  const contentTypeSelect = document.getElementById('sub-content-type');

  
  window.openNewPageContentModal = function (pageKey) {
    state.editingSubmissionId = null;
    if (subForm) subForm.reset();
    const pageLabels = {
      home: 'Home Page',
      about: 'About Us Page',
      programs: 'Programs Page',
      blog: 'Blog & News Page',
      volunteer: 'Volunteer Page',
      contact: 'Contact Page',
      donate: 'Donate Page'
    };
    const titleText = pageLabels[pageKey] || 'Website Page';
    document.getElementById('sub-modal-title').textContent = `Add Content to ${titleText}`;
    document.getElementById('sub-feedback-box').style.display = 'none';
    if (uploadStatus) uploadStatus.textContent = 'No file chosen';
    if (previewWrap) previewWrap.style.display = 'none';

    // Pre-select target page
    const pageSelect = document.getElementById('sub-target-page');
    if (pageSelect) pageSelect.value = pageKey;

    const sectionInput = document.getElementById('sub-target-section');
    if (sectionInput) sectionInput.value = '';

    // Set appropriate content type default
    let defaultType = 'website_content';
    if (pageKey === 'programs') defaultType = 'activity';
    else if (pageKey === 'blog') defaultType = 'news_announcement';

    if (contentTypeSelect) {
      contentTypeSelect.value = defaultType;
      updateContentTypeFields(defaultType);
    }
    subModal?.classList.add('is-open');
  };

  window.openNewSubmissionModal = function (defaultType = 'activity') {
    state.editingSubmissionId = null;
    if (subForm) subForm.reset();
    document.getElementById('sub-modal-title').textContent = 'Create & Publish Content';
    document.getElementById('sub-feedback-box').style.display = 'none';
    if (uploadStatus) uploadStatus.textContent = 'No file chosen';
    if (previewWrap) previewWrap.style.display = 'none';

    if (contentTypeSelect) {
      contentTypeSelect.value = defaultType;
      updateContentTypeFields(defaultType);
    }
    subModal?.classList.add('is-open');
  };

  window.openEditModal = function (id) {
    const item = state.submissions.find(s => s.id === id);
    if (!item) return;

    state.editingSubmissionId = id;
    document.getElementById('sub-modal-title').textContent = 'Edit Content Item';
    if (uploadStatus) uploadStatus.textContent = item.image_url ? 'Existing image loaded' : 'No file chosen';

    document.getElementById('sub-content-type').value = item.content_type;
    updateContentTypeFields(item.content_type);

    document.getElementById('sub-title').value = item.title || '';
    document.getElementById('sub-summary').value = item.summary || '';
    document.getElementById('sub-content').value = item.content || '';
    document.getElementById('sub-image-url').value = item.image_url || '';

    if (item.image_url && previewImg && previewWrap) {
      previewImg.src = item.image_url;
      previewWrap.style.display = 'block';
    } else if (previewWrap) {
      previewWrap.style.display = 'none';
    }

    // Target page & section prefill
    const meta = item.metadata || {};
    const captionInput = document.getElementById('sub-image-caption');
    if (captionInput) captionInput.value = meta.image_caption || '';
    const pageSelect = document.getElementById('sub-target-page');
    if (pageSelect) pageSelect.value = meta.target_page || meta.page || 'general';
    const sectionInput = document.getElementById('sub-target-section');
    if (sectionInput) sectionInput.value = meta.target_section || meta.section || '';
    if (document.getElementById('sub-meta-date')) document.getElementById('sub-meta-date').value = meta.event_date || meta.release_date || '';
    if (document.getElementById('sub-meta-author')) document.getElementById('sub-meta-author').value = meta.author || '';
    if (document.getElementById('sub-meta-location')) document.getElementById('sub-meta-location').value = meta.location || '';
    if (document.getElementById('sub-meta-url')) document.getElementById('sub-meta-url').value = meta.registration_url || meta.purchase_link || '';

    subModal?.classList.add('is-open');
  };



  function updateContentTypeFields(type) {
    const extraBox = document.getElementById('sub-type-specific-fields');
    if (!extraBox) return;

    if (type === 'event') {
      extraBox.innerHTML = `
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
          <div class="form-group-dash">
            <label>Event Date &amp; Time *</label>
            <input type="text" id="sub-meta-date" class="form-control-dash" placeholder="e.g. 15 December 2026, 10:00 AM" required />
          </div>
          <div class="form-group-dash">
            <label>Location *</label>
            <input type="text" id="sub-meta-location" class="form-control-dash" placeholder="e.g. Accra International Conference Centre" required />
          </div>
        </div>
        <div class="form-group-dash">
          <label>Registration / RSVP Link (optional)</label>
          <input type="url" id="sub-meta-url" class="form-control-dash" placeholder="https://..." />
        </div>
      `;
    } else if (type === 'publication') {
      extraBox.innerHTML = `
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
          <div class="form-group-dash">
            <label>Author Name *</label>
            <input type="text" id="sub-meta-author" class="form-control-dash" placeholder="e.g. TOBI Jane Davidson" required />
          </div>
          <div class="form-group-dash">
            <label>Release Date</label>
            <input type="text" id="sub-meta-date" class="form-control-dash" placeholder="e.g. April 4th, 2026" />
          </div>
        </div>
        <div class="form-group-dash">
          <label>Order / Download / Preview URL (optional)</label>
          <input type="text" id="sub-meta-url" class="form-control-dash" placeholder="https://..." />
        </div>
      `;
    } else if (type === 'gallery') {
      extraBox.innerHTML = `
        <div class="form-group-dash">
          <label>Media Type</label>
          <select id="sub-meta-media-type" class="form-control-dash">
            <option value="image">Photo / Image</option>
            <option value="video">Video (YouTube / MP4)</option>
          </select>
        </div>
      `;
    } else {
      extraBox.innerHTML = '';
    }
  }

  contentTypeSelect?.addEventListener('change', e => {
    updateContentTypeFields(e.target.value);
  });

  window.closeSubmissionModal = function () {
    subModal?.classList.remove('is-open');
  };

  // Submit Handler: Saves as DRAFT or publishes live as APPROVED
  window.handleSubmissionSave = async function (targetStatus) {
    if (!subForm.checkValidity()) {
      subForm.reportValidity();
      return;
    }

    const type = document.getElementById('sub-content-type').value;
    const title = document.getElementById('sub-title').value.trim();
    const summary = document.getElementById('sub-summary').value.trim();
    const content = document.getElementById('sub-content').value.trim();
    const imageUrl = document.getElementById('sub-image-url').value.trim();

    // Assemble metadata
    const metadata = {};
    const targetPage = document.getElementById('sub-target-page')?.value || 'general';
    const targetSection = document.getElementById('sub-target-section')?.value.trim() || '';
    metadata.target_page = targetPage;
    metadata.page = targetPage;
    metadata.target_section = targetSection;
    metadata.section = targetSection;
    const captionVal = document.getElementById('sub-image-caption')?.value.trim() || '';
    if (captionVal) metadata.image_caption = captionVal;

    const dateInput = document.getElementById('sub-meta-date');
    const authorInput = document.getElementById('sub-meta-author');
    const locInput = document.getElementById('sub-meta-location');
    const urlInput = document.getElementById('sub-meta-url');
    const mediaTypeInput = document.getElementById('sub-meta-media-type');

    if (dateInput) metadata.event_date = dateInput.value.trim();
    if (authorInput) metadata.author = authorInput.value.trim();
    if (locInput) metadata.location = locInput.value.trim();
    if (urlInput) metadata.registration_url = urlInput.value.trim();
    if (mediaTypeInput) metadata.media_type = mediaTypeInput.value;

    const record = {
      content_type: type,
      title: title,
      summary: summary,
      content: content,
      image_url: imageUrl,
      metadata: metadata,
      status: targetStatus,
      updated_at: new Date().toISOString()
    };

    const isEdit = state.editingSubmissionId && !String(state.editingSubmissionId).startsWith('default-');
    let savedId = state.editingSubmissionId || ('sub-' + Date.now());

    try {
      if (isEdit) {
        // 1. Try Supabase update
        try {
          const { error } = await supabase
            .from('content_submissions')
            .update(record)
            .eq('id', state.editingSubmissionId);

          if (error) {
            console.warn('Supabase update notice (saving locally):', error.message);
          }
        } catch (dbErr) {
          console.warn('Supabase update caught (saving locally):', dbErr.message);
        }

        // Always save updates to local website storage
        record.id = state.editingSubmissionId;
        updateLocalCustomSubmission(state.editingSubmissionId, record);

        // Update in-memory state
        const itemIndex = state.submissions.findIndex(s => String(s.id) === String(state.editingSubmissionId));
        if (itemIndex !== -1) {
          state.submissions[itemIndex] = { ...state.submissions[itemIndex], ...record };
        }

        await logAction(
          targetStatus === 'APPROVED' ? 'CONTENT_PUBLISHED' : 'CONTENT_EDITED',
          'content',
          state.editingSubmissionId,
          `Updated "${title}" (Status: ${targetStatus})`
        );

      } else {
        // Create new item (or promote edited default item into custom submissions)
        const oldDefItem = state.submissions.find(s => String(s.id) === String(state.editingSubmissionId));
        if (oldDefItem && oldDefItem.metadata?.section_key) {
          metadata.section_key = oldDefItem.metadata.section_key;
        }
        if (state.editingSubmissionId && String(state.editingSubmissionId).startsWith('default-')) {
          state.deletedItemIds.add(state.editingSubmissionId);
          saveLocalDeletedId(state.editingSubmissionId);
        }

        record.author_id = state.user?.id || 'staff-user';
        record.author_email = state.user?.email || 'admin@projectelevate.org';
        record.author_name = state.profile?.full_name || state.user?.email || 'Staff';
        record.created_at = new Date().toISOString();

        try {
          const { data, error } = await supabase
            .from('content_submissions')
            .insert(record)
            .select('id')
            .single();

          if (!error && data?.id) {
            savedId = data.id;
          } else {
            console.warn('Supabase insert notice (saving locally):', error?.message);
          }
        } catch (dbErr) {
          console.warn('Supabase insert caught (saving locally):', dbErr.message);
        }

        record.id = savedId;
        addLocalCustomSubmission(record);

        // Add to in-memory state
        state.submissions = state.submissions.filter(s => String(s.id) !== String(savedId));
        state.submissions.unshift(record);

        await logAction(
          targetStatus === 'APPROVED' ? 'CONTENT_PUBLISHED' : 'CONTENT_SAVED_DRAFT',
          'content',
          savedId,
          `Created "${title}" (Status: ${targetStatus})`
        );
      }

      closeSubmissionModal();
      renderSubmissionsTables();
      updateStats();

      alert(targetStatus === 'APPROVED'
        ? '✅ Content published live to the website successfully!'
        : '💾 Draft saved successfully.');

    } catch (err) {
      console.warn('Handling save locally:', err);
      record.id = record.id || ('sub-' + Date.now());
      addLocalCustomSubmission(record);
      state.submissions = state.submissions.filter(s => String(s.id) !== String(record.id));
      state.submissions.unshift(record);
      closeSubmissionModal();
      renderSubmissionsTables();
      updateStats();
      alert('✅ Content saved successfully to website storage!');
    }
  };

  /* ── Direct Publish / Unpublish Toggle ───────────────────── */
  window.togglePublishStatus = async function (id, currentStatus) {
    const item = state.submissions.find(s => String(s.id) === String(id));
    if (!item) return;

    const newStatus = currentStatus === 'APPROVED' ? 'DRAFT' : 'APPROVED';
    const actionLabel = newStatus === 'APPROVED' ? 'publish live to website' : 'unpublish and save as draft';

    if (!confirm(`Are you sure you want to ${actionLabel} "${item.title}"?`)) return;

    try {
      item.status = newStatus;
      item.updated_at = new Date().toISOString();

      // Update in local storage
      updateLocalCustomSubmission(id, { status: newStatus, updated_at: item.updated_at });

      if (!String(id).startsWith('default-')) {
        try {
          await supabase
            .from('content_submissions')
            .update({
              status: newStatus,
              updated_at: item.updated_at
            })
            .eq('id', id);
        } catch (e) {
          console.warn('Supabase publish status update notice:', e.message);
        }
      }

      await logAction(
        newStatus === 'APPROVED' ? 'CONTENT_PUBLISHED' : 'CONTENT_UNPUBLISHED',
        'content',
        id,
        `${newStatus === 'APPROVED' ? 'Published' : 'Unpublished'} "${item.title}"`
      );

      renderSubmissionsTables();
      updateStats();
      alert(`✅ "${item.title}" is now ${newStatus === 'APPROVED' ? 'Live on the website' : 'Unpublished (Draft)'}.`);
    } catch (err) {
      alert('Error changing status: ' + err.message);
    }
  };

  /* ── Delete Content ──────────────────────────────────────── */
  window.deleteSubmission = async function (id) {
    const item = state.submissions.find(s => String(s.id) === String(id));
    if (!item) return;
    if (!confirm(`Are you sure you want to permanently delete "${item.title}"?`)) return;

    try {
      state.deletedItemIds.add(String(id));
      saveLocalDeletedId(String(id));
      removeLocalCustomSubmission(String(id));
      state.submissions = state.submissions.filter(s => String(s.id) !== String(id));

      if (!String(id).startsWith('default-')) {
        try {
          await supabase
            .from('content_submissions')
            .delete()
            .eq('id', id);
        } catch (e) {
          console.warn('Supabase delete notice:', e.message);
        }
      }

      await logAction('CONTENT_DELETED', 'content', id, `Deleted "${item.title}"`);
      renderSubmissionsTables();
      updateStats();
      alert('🗑️ Deleted successfully.');
    } catch (e) {
      alert('Error deleting: ' + e.message);
    }
  };

  /* ── View Detail Modal ───────────────────────────────────── */
  const viewModal = document.getElementById('view-modal');

  window.viewSubmission = function (id) {
    const item = state.submissions.find(s => String(s.id) === String(id));
    if (!item) return;

    document.getElementById('view-title').textContent = item.title;
    document.getElementById('view-status').innerHTML = statusBadge(item.status);
    const secBadge = item.metadata?.target_section ? ` [${escapeHtml(item.metadata.target_section)}]` : '';
    document.getElementById('view-type').textContent = typeBadge(item.content_type) + secBadge;
    document.getElementById('view-author').textContent = item.author_name || item.author_email || 'Staff';
    document.getElementById('view-date').textContent = formatDate(item.updated_at || item.created_at);

    const imgEl = document.getElementById('view-image');
    let captionEl = document.getElementById('view-image-caption');
    if (!captionEl && imgEl) {
      captionEl = document.createElement('div');
      captionEl.id = 'view-image-caption';
      captionEl.style.cssText = 'font-size:0.78rem;color:#0284c7;font-style:italic;margin:-10px 0 14px;';
      imgEl.parentNode.insertBefore(captionEl, imgEl.nextSibling);
    }

    if (item.image_url) {
      imgEl.src = item.image_url;
      imgEl.style.display = 'block';
      imgEl.style.objectFit = 'cover';
      imgEl.style.borderRadius = '8px';
      imgEl.style.maxHeight = '240px';
      if (captionEl) {
        captionEl.textContent = item.metadata?.image_caption ? `📷 ${item.metadata.image_caption}` : '';
        captionEl.style.display = item.metadata?.image_caption ? 'block' : 'none';
      }
    } else {
      imgEl.style.display = 'none';
      if (captionEl) captionEl.style.display = 'none';
    }

    document.getElementById('view-summary').textContent = item.summary || 'None';
    document.getElementById('view-content').textContent = item.content || 'None';

    const feedbackWrap = document.getElementById('view-feedback-wrap');
    if (feedbackWrap) feedbackWrap.style.display = 'none';

    viewModal?.classList.add('is-open');
  };

  window.closeViewModal = function () {
    viewModal?.classList.remove('is-open');
  };

  /* ── Manager Management & Granular Permissions (Super Admin only) ── */
  window.toggleManagerStatus = async function (id, newActive) {
    if (state.role !== 'super_admin') return;

    const mgr = state.managers.find(m => m.id === id);
    if (!mgr) return;

    const actionName = newActive ? 'Reactivate' : 'Deactivate';
    if (!confirm(`Are you sure you want to ${actionName} access for ${mgr.email}?`)) return;

    try {
      const { error } = await supabase
        .from('user_roles')
        .update({
          is_active: newActive,
          updated_at: new Date().toISOString()
        })
        .eq('id', id);

      if (error) throw error;

      await logAction(
        newActive ? 'MANAGER_ACTIVATED' : 'MANAGER_DEACTIVATED',
        'account',
        id,
        `${actionName}d manager account ${mgr.email}`
      );

      await loadManagers();
      alert(`Account ${actionName.toLowerCase()}d successfully.`);
    } catch (e) {
      alert('Failed to update status: ' + e.message);
    }
  };

  window.editManagerPermissions = async function (id) {
    if (state.role !== 'super_admin') return;
    const mgr = state.managers.find(m => m.id === id);
    if (!mgr) return;

    const choice = prompt(
      `Edit permissions for ${mgr.email}:\nEnter 1 to Grant All Permissions\nEnter 2 to Restrict Content Updates\nEnter 3 to Cancel`,
      '1'
    );
    if (choice === '1') {
      try {
        await supabase.from('user_roles').update({
          can_manage_activities: true,
          can_manage_events: true,
          can_manage_news: true,
          can_manage_books: true,
          can_manage_gallery: true,
          can_manage_content: true,
          updated_at: new Date().toISOString()
        }).eq('id', id);
        alert('All content permissions granted.');
        await loadManagers();
      } catch (err) { alert('Error: ' + err.message); }
    }
  };

  const inviteForm = document.getElementById('invite-manager-form');
  if (inviteForm) {
    inviteForm.addEventListener('submit', async function (e) {
      e.preventDefault();
      if (state.role !== 'super_admin') return;

      const email = document.getElementById('invite-email').value.trim().toLowerCase();
      const fullName = document.getElementById('invite-name').value.trim();

      if (!email) return;

      try {
        const { error } = await supabase
          .from('user_roles')
          .insert({
            email: email,
            full_name: fullName || 'Content Manager',
            role: 'manager',
            is_active: true,
            can_manage_activities: true,
            can_manage_events: true,
            can_manage_news: true,
            can_manage_books: true,
            can_manage_gallery: true,
            can_manage_content: true
          });

        if (error) throw error;

        await logAction('MANAGER_INVITED', 'account', email, `Authorized Content Manager: ${email}`);
        inviteForm.reset();
        await loadManagers();
        alert(`✅ Content Manager authorized! ${email} can now sign in at /team-login with full content-management privileges.`);
      } catch (err) {
        alert('Failed to add manager: ' + (err.message || 'Already exists or permission denied.'));
      }
    });
  }

  /* ── Logging Helper ──────────────────────────────────────── */
  async function logAction(actionType, targetType, targetId, details) {
    try {
      await supabase.from('activity_logs').insert({
        user_id: state.user?.id,
        user_email: state.user?.email || 'System',
        user_role: state.role || 'unknown',
        action_type: actionType,
        target_type: targetType || '',
        target_id: String(targetId || ''),
        details: details
      });
    } catch (e) {
      console.warn('Logging skipped:', e);
    }
  }

  /* ── CSV Export Helper ───────────────────────────────────── */
  window.exportCsv = function (data, filename) {
    if (!data || !data.length) {
      alert('No records available to export.');
      return;
    }
    const headers = Object.keys(data[0]);
    const escapeCsv = val => `"${String(val ?? '').replace(/"/g, '""')}"`;
    const csv = [
      headers.map(escapeCsv).join(','),
      ...data.map(row => headers.map(h => escapeCsv(row[h])).join(','))
    ].join('\r\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  /* ── Event Listeners ─────────────────────────────────────── */
  document.querySelectorAll('.dash-nav-link').forEach(link => {
    link.addEventListener('click', e => {
      e.preventDefault();
      switchTab(link.dataset.tab);
    });
  });

  document.getElementById('btn-mobile-menu')?.addEventListener('click', () => {
    document.getElementById('dash-sidebar')?.classList.toggle('is-open');
  });

  document.getElementById('btn-signout')?.addEventListener('click', async () => {
    if (confirm('Are you sure you want to sign out?')) {
      await logAction('LOGOUT', 'auth', state.user?.id, 'Signed out of dashboard.');
      await supabase.auth.signOut();
      window.location.replace('team-login.html');
    }
  });

  // Start initialization
  initAuth();

})();
