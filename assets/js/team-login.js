// ============================================================
// PROJECT ELEVATE FOUNDATION — PRIVATE TEAM LOGIN LOGIC
// ============================================================

(function () {
  'use strict';

  const supabase = window.elevateSupabase;
  const loginForm = document.getElementById('team-login-form');
  const submitBtn = document.getElementById('team-submit-btn');
  const alertEl = document.getElementById('team-login-alert');

  // Forgot password elements
  const forgotModal = document.getElementById('forgot-modal');
  const openForgotBtn = document.getElementById('open-forgot-btn');
  const closeForgotBtn = document.getElementById('close-forgot-btn');
  const forgotForm = document.getElementById('forgot-form');
  const forgotSubmitBtn = document.getElementById('forgot-submit-btn');
  const forgotAlert = document.getElementById('forgot-alert');

  function showAlert(msg, isSuccess = false) {
    if (!alertEl) return;
    alertEl.textContent = msg;
    alertEl.className = 'team-alert ' + (isSuccess ? 'is-success' : 'is-error');
    alertEl.style.display = 'block';
  }

  function hideAlert() {
    if (!alertEl) return;
    alertEl.style.display = 'none';
  }

  function showForgotAlert(msg, isSuccess = false) {
    if (!forgotAlert) return;
    forgotAlert.textContent = msg;
    forgotAlert.className = 'team-alert ' + (isSuccess ? 'is-success' : 'is-error');
    forgotAlert.style.display = 'block';
  }

  function getDashboardUrl() {
    const isSubdir = window.location.pathname.endsWith('/team-login/') || window.location.pathname.endsWith('/team-login');
    return isSubdir ? '../admin.html' : 'admin.html';
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

    // 3. Fallback: Query user_roles directly by user_id
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

    // 4. Fallback: Query user_roles directly by email & auto-link user_id
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

    if (profile.role !== 'manager' && profile.role !== 'super_admin') {
      throw new Error(`Access Denied: Your account role (${profile.role}) is not authorized for team access.`);
    }

    return profile;
  }

  // Pre-check if already signed in with active authorized role
  async function checkExistingSession() {
    if (!supabase) return;
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session || !session.user) return;

      const profile = await resolveUserProfile(session.user);
      if (profile && profile.is_active) {
        window.location.replace(getDashboardUrl());
      }
    } catch (e) {
      console.warn('Session check:', e);
    }
  }

  checkExistingSession();

  // Login handler
  if (loginForm) {
    loginForm.addEventListener('submit', async function (e) {
      e.preventDefault();
      hideAlert();

      if (!supabase) {
        showAlert('Security service could not be initialized. Please reload the page.');
        return;
      }

      const email = document.getElementById('team-email').value.trim();
      const password = document.getElementById('team-password').value;

      if (!email || !password) {
        showAlert('Please enter both your email address and password.');
        return;
      }

      submitBtn.disabled = true;
      const originalText = submitBtn.innerHTML;
      submitBtn.innerHTML = '<span class="spinner-icon"></span> Verifying...';

      try {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: email,
          password: password
        });

        if (error) {
          throw new Error('Invalid email or password. Please check your credentials.');
        }

        const user = data.user;
        if (!user) {
          throw new Error('Authentication failed.');
        }

        // Resilient role & authorization check
        let profile;
        try {
          profile = await resolveUserProfile(user);
        } catch (authErr) {
          await supabase.auth.signOut();
          throw authErr;
        }

        // Record successful login audit log
        try {
          await supabase.from('activity_logs').insert({
            user_id: user.id,
            user_email: user.email,
            user_role: profile.role || 'manager',
            action_type: 'LOGIN_SUCCESS',
            target_type: 'auth',
            details: `Signed into Team Management Portal as ${profile.role}.`
          });
        } catch (_) { }

        showAlert('Verification successful! Opening dashboard...', true);
        setTimeout(() => {
          window.location.replace(getDashboardUrl());
        }, 500);

      } catch (err) {
        showAlert(err.message || 'Login failed. Please try again.');
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalText;
      }
    });
  }

  // Forgot password modal triggers
  if (openForgotBtn && forgotModal) {
    openForgotBtn.addEventListener('click', function () {
      forgotModal.classList.add('is-open');
      if (forgotAlert) forgotAlert.style.display = 'none';
      const emailField = document.getElementById('forgot-email');
      if (emailField) {
        emailField.value = document.getElementById('team-email').value;
        emailField.focus();
      }
    });
  }

  if (closeForgotBtn && forgotModal) {
    closeForgotBtn.addEventListener('click', function () {
      forgotModal.classList.remove('is-open');
    });
  }

  // Forgot password submission
  if (forgotForm) {
    forgotForm.addEventListener('submit', async function (e) {
      e.preventDefault();
      const email = document.getElementById('forgot-email').value.trim();
      if (!email) return;

      forgotSubmitBtn.disabled = true;
      const origText = forgotSubmitBtn.innerHTML;
      forgotSubmitBtn.innerHTML = '<span class="spinner-icon"></span> Sending...';

      try {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: window.location.origin + window.location.pathname
        });

        if (error) throw error;

        showForgotAlert('Password reset instructions have been sent to your email address.', true);
        setTimeout(() => {
          forgotModal.classList.remove('is-open');
          forgotSubmitBtn.disabled = false;
          forgotSubmitBtn.innerHTML = origText;
        }, 3000);
      } catch (err) {
        showForgotAlert(err.message || 'Unable to request password reset. Please try again.');
        forgotSubmitBtn.disabled = false;
        forgotSubmitBtn.innerHTML = origText;
      }
    });
  }

})();
