/* FloodLens account authentication — Supabase Auth */
(function () {
  'use strict';

  const config = window.FLOODLENS_AUTH_CONFIG || {};
  const supabaseLibrary = window.supabase;
  const isConfigured = Boolean(
    config.supabaseUrl &&
    config.publishableKey &&
    supabaseLibrary &&
    typeof supabaseLibrary.createClient === 'function'
  );

  let client = null;
  let currentSession = null;
  let mode = 'signin';

  if (isConfigured) {
    client = supabaseLibrary.createClient(config.supabaseUrl, config.publishableKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true
      }
    });
  }

  const create = (tag, className, text) => {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  };

  const navInner = document.querySelector('.nav-inner');
  const navToggle = document.getElementById('navToggle');
  const accountButton = create('button', 'fl-auth-trigger', 'Sign in');
  accountButton.type = 'button';
  accountButton.id = 'flAuthTrigger';
  accountButton.setAttribute('aria-haspopup', 'dialog');
  if (navInner && !document.getElementById('flAuthTrigger')) {
    if (navToggle) navInner.insertBefore(accountButton, navToggle);
    else navInner.appendChild(accountButton);
  }

  const overlay = create('div', 'fl-auth-overlay');
  overlay.id = 'flAuthOverlay';
  overlay.setAttribute('role', 'presentation');
  overlay.innerHTML = `
    <section class="fl-auth-card" role="dialog" aria-modal="true" aria-labelledby="flAuthTitle">
      <header class="fl-auth-header">
        <div class="fl-auth-brand"><span class="fl-auth-brand-icon"><i class="fa-solid fa-water"></i></span><div><strong>FloodLens Account</strong><small>Secure access for your FloodLens workspace</small></div></div>
        <button type="button" class="fl-auth-close" aria-label="Close">&times;</button>
      </header>
      <div class="fl-auth-body">
        <div class="fl-auth-tabs" role="tablist" aria-label="Account access">
          <button type="button" role="tab" data-auth-mode="signin" aria-selected="true">Sign in</button>
          <button type="button" role="tab" data-auth-mode="signup" aria-selected="false">Create account</button>
        </div>
        <div class="fl-auth-setup" id="flAuthSetup" hidden>
          <i class="fa-solid fa-plug-circle-exclamation"></i>
          <strong>Connect Supabase to enable accounts</strong>
          <p>Add your Supabase Project URL and Publishable key to <code>public/auth-config.js</code>, then redeploy the frontend. Do not use a service-role or secret key here.</p>
        </div>
        <form class="fl-auth-form" id="flAuthForm" novalidate>
          <h2 id="flAuthTitle">Welcome back</h2>
          <p class="fl-auth-subtitle" id="flAuthSubtitle">Sign in to your FloodLens account.</p>
          <label class="fl-auth-field fl-auth-name" id="flAuthNameWrap" hidden>Full name<input id="flAuthName" name="name" type="text" autocomplete="name" maxlength="80" placeholder="Your name"></label>
          <label class="fl-auth-field">Email address<input id="flAuthEmail" name="email" type="email" autocomplete="email" required maxlength="254" placeholder="you@example.com"></label>
          <label class="fl-auth-field" id="flAuthPasswordWrap">Password<input id="flAuthPassword" name="password" type="password" autocomplete="current-password" minlength="8" required placeholder="At least 8 characters"></label>
          <label class="fl-auth-field" id="flAuthConfirmWrap" hidden>Confirm password<input id="flAuthConfirm" name="confirm" type="password" autocomplete="new-password" minlength="8" placeholder="Re-enter your password"></label>
          <button class="fl-auth-primary" id="flAuthSubmit" type="submit">Sign in</button>
          <button class="fl-auth-link" id="flAuthForgot" type="button">Forgot password?</button>
        </form>
        <form class="fl-auth-form" id="flAuthResetForm" hidden>
          <h2>Choose a new password</h2>
          <p class="fl-auth-subtitle">Set a new password for your FloodLens account.</p>
          <label class="fl-auth-field">New password<input id="flAuthNewPassword" type="password" autocomplete="new-password" minlength="8" required placeholder="At least 8 characters"></label>
          <label class="fl-auth-field">Confirm new password<input id="flAuthNewPasswordConfirm" type="password" autocomplete="new-password" minlength="8" required placeholder="Re-enter your password"></label>
          <button class="fl-auth-primary" type="submit">Update password</button>
        </form>
        <div class="fl-auth-account" id="flAuthAccount" hidden>
          <div class="fl-auth-avatar" id="flAuthAvatar">U</div>
          <h2 id="flAuthAccountName">Your account</h2>
          <p class="fl-auth-account-email" id="flAuthAccountEmail"></p>
          <span class="fl-auth-session-pill"><i class="fa-solid fa-circle-check"></i> Signed in</span>
          <button class="fl-auth-primary fl-auth-signout" id="flAuthSignOut" type="button">Sign out</button>
        </div>
        <p class="fl-auth-status" id="flAuthStatus" role="status" aria-live="polite"></p>
        <p class="fl-auth-legal">By continuing, you agree to use FloodLens responsibly. Account access does not make sample flood alerts official or verified.</p>
      </div>
    </section>
  `;
  document.body.appendChild(overlay);

  const $ = (selector) => overlay.querySelector(selector);
  const form = $('#flAuthForm');
  const resetForm = $('#flAuthResetForm');
  const accountView = $('#flAuthAccount');
  const status = $('#flAuthStatus');
  const setupNotice = $('#flAuthSetup');

  function showStatus(message, kind) {
    status.textContent = message || '';
    status.className = 'fl-auth-status' + (kind ? ' is-' + kind : '');
  }

  function setMode(nextMode) {
    mode = nextMode;
    const isSignup = mode === 'signup';
    $('#flAuthTitle').textContent = isSignup ? 'Create your account' : 'Welcome back';
    $('#flAuthSubtitle').textContent = isSignup
      ? 'Join FloodLens to submit and manage your flood observations.'
      : 'Sign in to your FloodLens account.';
    $('#flAuthNameWrap').hidden = !isSignup;
    $('#flAuthConfirmWrap').hidden = !isSignup;
    $('#flAuthPassword').autocomplete = isSignup ? 'new-password' : 'current-password';
    $('#flAuthSubmit').textContent = isSignup ? 'Create account' : 'Sign in';
    $('#flAuthForgot').hidden = isSignup;
    overlay.querySelectorAll('[data-auth-mode]').forEach(button => {
      const active = button.dataset.authMode === mode;
      button.setAttribute('aria-selected', String(active));
      button.classList.toggle('is-active', active);
    });
    form.hidden = false;
    resetForm.hidden = true;
    accountView.hidden = true;
    setupNotice.hidden = isConfigured;
    showStatus('', '');
    if (!isConfigured) {
      form.querySelectorAll('input,button').forEach(control => control.disabled = true);
      $('#flAuthForgot').disabled = true;
    } else {
      form.querySelectorAll('input,button').forEach(control => control.disabled = false);
    }
  }

  function openAuth() {
    overlay.classList.add('is-open');
    document.body.classList.add('fl-auth-lock');
    if (!currentSession) setMode('signin');
    else showAccount();
    setTimeout(() => overlay.querySelector('.fl-auth-close').focus(), 0);
  }

  function closeAuth() {
    overlay.classList.remove('is-open');
    document.body.classList.remove('fl-auth-lock');
    accountButton.focus();
  }

  function showAccount() {
    form.hidden = true;
    resetForm.hidden = true;
    setupNotice.hidden = true;
    accountView.hidden = false;
    const user = currentSession && currentSession.user;
    const email = user?.email || 'Signed-in user';
    const name = user?.user_metadata?.full_name || email.split('@')[0] || 'Your account';
    $('#flAuthAccountName').textContent = name;
    $('#flAuthAccountEmail').textContent = email;
    $('#flAuthAvatar').textContent = (name.trim()[0] || 'U').toUpperCase();
    showStatus('', '');
  }

  function renderSession(session) {
    currentSession = session || null;
    if (accountButton) {
      accountButton.textContent = currentSession
        ? (currentSession.user?.user_metadata?.full_name || currentSession.user?.email || 'Account')
        : 'Sign in';
      accountButton.classList.toggle('is-authenticated', Boolean(currentSession));
      accountButton.setAttribute('aria-label', currentSession ? 'Open account menu' : 'Sign in');
    }
    if (currentSession && overlay.classList.contains('is-open') && !resetForm.hidden) return;
    if (currentSession && overlay.classList.contains('is-open')) showAccount();
  }

  accountButton.addEventListener('click', openAuth);
  overlay.querySelector('.fl-auth-close').addEventListener('click', closeAuth);
  overlay.addEventListener('click', event => {
    if (event.target === overlay) closeAuth();
  });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && overlay.classList.contains('is-open')) closeAuth();
  });

  overlay.querySelectorAll('[data-auth-mode]').forEach(button => {
    button.addEventListener('click', () => setMode(button.dataset.authMode));
  });

  form.addEventListener('submit', async event => {
    event.preventDefault();
    if (!client) return;
    const email = $('#flAuthEmail').value.trim();
    const password = $('#flAuthPassword').value;
    const submit = $('#flAuthSubmit');
    if (!email || !password) return showStatus('Enter your email address and password.', 'error');
    if (password.length < 8) return showStatus('Use a password with at least 8 characters.', 'error');
    if (mode === 'signup') {
      const fullName = $('#flAuthName').value.trim();
      const confirm = $('#flAuthConfirm').value;
      if (!fullName) return showStatus('Enter your full name.', 'error');
      if (password !== confirm) return showStatus('The passwords do not match.', 'error');
      submit.disabled = true; submit.textContent = 'Creating account…';
      try {
        const { data, error } = await client.auth.signUp({
          email,
          password,
          options: {
            data: { full_name: fullName },
            emailRedirectTo: window.location.origin + '/'
          }
        });
        if (error) throw error;
        if (data.session) {
          renderSession(data.session);
          showAccount();
          showStatus('Account created successfully.', 'success');
        } else {
          setMode('signin');
          $('#flAuthEmail').value = email;
          showStatus('Account created. Check your email and confirm your address before signing in.', 'success');
        }
      } catch (error) {
        showStatus(error.message || 'Could not create the account. Try again.', 'error');
      } finally {
        submit.disabled = false; submit.textContent = 'Create account';
      }
    } else {
      submit.disabled = true; submit.textContent = 'Signing in…';
      try {
        const { data, error } = await client.auth.signInWithPassword({ email, password });
        if (error) throw error;
        renderSession(data.session);
        showAccount();
        showStatus('You are signed in.', 'success');
      } catch (error) {
        showStatus(error.message || 'Sign in failed. Check your email and password.', 'error');
      } finally {
        submit.disabled = false; submit.textContent = 'Sign in';
      }
    }
  });

  $('#flAuthForgot').addEventListener('click', async () => {
    if (!client) return;
    const email = $('#flAuthEmail').value.trim();
    if (!email) return showStatus('Enter your account email first.', 'error');
    try {
      const { error } = await client.auth.resetPasswordForEmail(email, {
        redirectTo: window.location.origin + '/'
      });
      if (error) throw error;
      showStatus('Password reset link sent. Check your inbox.', 'success');
    } catch (error) {
      showStatus(error.message || 'Could not send the password reset email.', 'error');
    }
  });

  resetForm.addEventListener('submit', async event => {
    event.preventDefault();
    if (!client) return;
    const password = $('#flAuthNewPassword').value;
    const confirmation = $('#flAuthNewPasswordConfirm').value;
    if (password.length < 8) return showStatus('Use a password with at least 8 characters.', 'error');
    if (password !== confirmation) return showStatus('The passwords do not match.', 'error');
    const submit = resetForm.querySelector('button[type="submit"]');
    submit.disabled = true; submit.textContent = 'Updating…';
    try {
      const { error } = await client.auth.updateUser({ password });
      if (error) throw error;
      resetForm.hidden = true;
      if (currentSession) showAccount();
      showStatus('Password updated successfully.', 'success');
    } catch (error) {
      showStatus(error.message || 'Could not update your password.', 'error');
    } finally {
      submit.disabled = false; submit.textContent = 'Update password';
    }
  });

  $('#flAuthSignOut').addEventListener('click', async () => {
    if (!client) return;
    const button = $('#flAuthSignOut');
    button.disabled = true; button.textContent = 'Signing out…';
    try {
      const { error } = await client.auth.signOut();
      if (error) throw error;
      renderSession(null);
      setMode('signin');
      showStatus('You have signed out.', 'success');
    } catch (error) {
      showStatus(error.message || 'Could not sign out.', 'error');
    } finally {
      button.disabled = false; button.textContent = 'Sign out';
    }
  });

  window.FloodLensAuth = {
    isConfigured: () => Boolean(client),
    isSignedIn: () => Boolean(currentSession?.user),
    getAccessToken: () => currentSession?.access_token || null,
    getUser: () => currentSession?.user || null,
    open: openAuth,
    requireSignIn(message) {
      if (!client || !currentSession?.user) {
        openAuth();
        if (message) showStatus(message, 'info');
        return false;
      }
      return true;
    }
  };

  if (client) {
    client.auth.onAuthStateChange((event, session) => {
      renderSession(session);
      if (event === 'PASSWORD_RECOVERY') {
        overlay.classList.add('is-open');
        document.body.classList.add('fl-auth-lock');
        form.hidden = true;
        accountView.hidden = true;
        resetForm.hidden = false;
        setupNotice.hidden = true;
        showStatus('Enter a new password for your account.', 'info');
      }
    });
    client.auth.getSession().then(({ data, error }) => {
      if (!error) renderSession(data.session);
    }).catch(() => {});
  }

  window.addEventListener('hashchange', () => {
    if (window.location.hash.includes('type=recovery') && client) openAuth();
  });
  setMode('signin');
})();
