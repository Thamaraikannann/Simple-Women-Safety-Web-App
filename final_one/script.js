/**
 * She Shield AI — script.js
 * Single clean file. One DOMContentLoaded. No duplicate listeners.
 * Modules: SOS, Contacts, Voice (section), Fake Call, Counters,
 *          Toast, Scroll Reveal, Active Nav,
 *          AI Assistant (VTT, Commands, Danger Detection, Demo)
 */
'use strict';

/* ============================================================
   CONFIG
   ============================================================ */

/**
 * AWS API Gateway endpoint for SOS alerts.
 *
 * HOW TO UPDATE FOR YOUR DEPLOYMENT:
 * Replace the URL below with your real API Gateway invoke URL.
 * Format: https://{api-id}.execute-api.{region}.amazonaws.com/{stage}/sos
 *
 * Example:
 *   const API_ENDPOINT = 'https://abc123xyz.execute-api.ap-south-1.amazonaws.com/prod/sos';
 *
 * For S3 static hosting: this file is served as-is, so just update
 * the string below before uploading to your S3 bucket.
 */
const API_ENDPOINT = 'https://YOUR_API_ID.execute-api.YOUR_REGION.amazonaws.com/YOUR_STAGE/sos';

/**
 * Request timeout for the SOS API call (milliseconds).
 * AbortController cancels the fetch if the API doesn't respond in time.
 */
const SOS_TIMEOUT_MS = 8000;
const STAT_TARGETS  = [
  { id: 'stat-users',  target: 12500 },
  { id: 'stat-alerts', target: 3200  },
  { id: 'stat-cities', target: 48    }
];
const VOICE_KEYWORDS = ['help', 'save me', 'emergency'];
const LS_KEY         = 'sheShieldContacts';

/* ============================================================
   UTILS
   ============================================================ */

/** Show a Bootstrap toast. */
function showToast(message, icon = 'bi-shield-check') {
  const container = document.getElementById('toast-container');
  if (!container) return;
  const el = document.createElement('div');
  el.className = 'toast shield-toast align-items-center border-0';
  el.setAttribute('role', 'alert');
  el.setAttribute('aria-live', 'assertive');
  el.innerHTML = `<div class="toast-body">
    <i class="bi ${icon} me-2" style="color:#e91e8c;font-size:1.1rem;"></i>${message}
  </div>`;
  container.appendChild(el);
  const t = new bootstrap.Toast(el, { delay: 4000 });
  t.show();
  el.addEventListener('hidden.bs.toast', () => el.remove());
}

/** Escape HTML to prevent XSS in dynamic content. */
function escapeHtml(str) {
  const d = document.createElement('div');
  d.textContent = str;
  return d.innerHTML;
}

/** Generate a unique ID. */
function generateId() {
  return (typeof crypto !== 'undefined' && crypto.randomUUID)
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2) + Date.now().toString(36);
}

/** Get SpeechRecognition constructor or null. */
function getSpeechAPI() {
  return window.SpeechRecognition || window.webkitSpeechRecognition || null;
}

/* ============================================================
   SOS MODULE
   ============================================================ */
let sosActive = false;

function initSos() {
  const btn = document.getElementById('sos-btn');
  if (!btn) return;
  btn.addEventListener('click', triggerSos);
}

async function triggerSos() {
  if (sosActive) return;
  sosActive = true;

  const btn = document.getElementById('sos-btn');
  if (btn) {
    btn.innerHTML = `<span class="spinner-border spinner-border-sm text-white" role="status" aria-hidden="true"></span>`;
    btn.style.animation = 'none';
  }

  if (!navigator.geolocation) {
    showToast('Geolocation is not supported by your browser.', 'bi-exclamation-triangle-fill');
    resetSosButton();
    return;
  }

  navigator.geolocation.getCurrentPosition(
    async (pos) => {
      const { latitude, longitude, accuracy } = pos.coords;
      displayCoords(latitude, longitude);

      const payload = {
        latitude,
        longitude,
        accuracy: accuracy ? Math.round(accuracy) : null,
        timestamp: new Date().toISOString(),
        appId: 'she-shield-ai'
      };

      await sendSosAlert(payload);
      resetSosButton();
    },
    (geoErr) => {
      // Geolocation denied or unavailable — still attempt API call without coords
      if (geoErr.code === geoErr.PERMISSION_DENIED) {
        showToast(
          'Location access denied. Enable location permissions for full SOS functionality.',
          'bi-geo-alt-fill'
        );
      } else {
        showToast(
          'Could not get your location. Sending SOS without coordinates.',
          'bi-exclamation-triangle-fill'
        );
      }

      // Send SOS without coordinates so contacts are still alerted
      const payload = {
        latitude: null,
        longitude: null,
        accuracy: null,
        timestamp: new Date().toISOString(),
        appId: 'she-shield-ai'
      };
      sendSosAlert(payload).finally(() => resetSosButton());
    },
    { timeout: 10000, enableHighAccuracy: true }
  );
}

/**
 * POST the SOS payload to the AWS API Gateway endpoint.
 * Shows a success toast on HTTP 2xx, an error toast on any failure.
 *
 * @param {Object} payload - { latitude, longitude, accuracy, timestamp, appId }
 * @returns {Promise<void>}
 */
async function sendSosAlert(payload) {
  // AbortController lets us cancel the request if it hangs
  const controller = new AbortController();
  const timeoutId  = setTimeout(() => controller.abort(), SOS_TIMEOUT_MS);

  try {
    const response = await fetch(API_ENDPOINT, {
      method:  'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept':        'application/json'
      },
      body:   JSON.stringify(payload),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (response.ok) {
      // HTTP 200–299: API accepted the alert
      showToast(
        '🚨 Emergency alert sent successfully! Your contacts have been notified.',
        'bi-check-circle-fill'
      );
    } else {
      // HTTP 4xx / 5xx: API returned an error status
      const statusText = `(HTTP ${response.status})`;
      console.error(`SOS API error ${statusText}:`, await response.text().catch(() => ''));
      showToast(
        `⚠️ Alert sent but server responded with an error ${statusText}. Please call emergency services directly.`,
        'bi-exclamation-triangle-fill'
      );
    }

  } catch (err) {
    clearTimeout(timeoutId);

    if (err.name === 'AbortError') {
      // Request timed out
      console.error('SOS request timed out after', SOS_TIMEOUT_MS, 'ms');
      showToast(
        '⏱️ Request timed out. Check your connection and try again, or call emergency services directly.',
        'bi-exclamation-triangle-fill'
      );
    } else {
      // Network error (offline, CORS, DNS failure, etc.)
      console.error('SOS network error:', err);
      showToast(
        '📡 Network error — could not reach the server. Please call emergency services directly: 112',
        'bi-exclamation-triangle-fill'
      );
    }
  }
}

function displayCoords(lat, lng) {
  const el = document.getElementById('sos-coords');
  if (!el) return;
  el.textContent = `📍 Lat: ${lat.toFixed(6)}  |  Lng: ${lng.toFixed(6)}`;
  el.classList.remove('d-none');
}

function resetSosButton() {
  sosActive = false;
  const btn = document.getElementById('sos-btn');
  if (!btn) return;
  // Restore full button content (icon + label + sub-text)
  btn.innerHTML = `
    <i class="bi bi-exclamation-octagon-fill sos-btn-icon"></i>
    <span class="sos-btn-label">SOS</span>
    <span class="sos-btn-sub">Tap to Alert</span>`;
  btn.style.animation = '';
}

/* ============================================================
   CONTACTS MODULE
   ============================================================ */

function getContacts() {
  try { return JSON.parse(localStorage.getItem(LS_KEY)) || []; }
  catch { return []; }
}

function saveContacts(contacts) {
  localStorage.setItem(LS_KEY, JSON.stringify(contacts));
}

function initContacts() {
  const form = document.getElementById('contact-form');
  if (!form) return;

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const name  = document.getElementById('contact-name').value.trim();
    const rel   = document.getElementById('contact-rel').value.trim();
    const phone = document.getElementById('contact-phone').value.trim();

    if (!name || !rel || !phone) {
      form.classList.add('was-validated');
      showToast('Please fill in all contact fields.', 'bi-exclamation-circle-fill');
      return;
    }

    const contacts = getContacts();
    contacts.push({ id: generateId(), name, relationship: rel, phone });
    saveContacts(contacts);
    renderContacts();
    showToast(`Contact "${name}" saved!`, 'bi-person-check-fill');
    form.reset();
    form.classList.remove('was-validated');
  });

  renderContacts();
}

function renderContacts() {
  const list  = document.getElementById('contacts-list');
  const noMsg = document.getElementById('no-contacts-msg');
  if (!list) return;

  // Remove all cards (keep the no-contacts message node)
  Array.from(list.children).forEach(child => {
    if (child.id !== 'no-contacts-msg') child.remove();
  });

  const contacts = getContacts();

  if (contacts.length === 0) {
    if (noMsg) noMsg.style.display = '';
    return;
  }
  if (noMsg) noMsg.style.display = 'none';

  contacts.forEach(c => {
    const card = document.createElement('div');
    card.className = 'contact-card';
    card.dataset.id = c.id;
    card.innerHTML = `
      <div class="contact-avatar"><i class="bi bi-person-fill"></i></div>
      <div class="flex-grow-1">
        <div style="font-family:'Plus Jakarta Sans',sans-serif;font-weight:700;font-size:0.95rem;">
          ${escapeHtml(c.name)}
        </div>
        <div class="small text-muted">${escapeHtml(c.relationship)} &bull; ${escapeHtml(c.phone)}</div>
      </div>
      <button class="btn-delete-contact" data-id="${c.id}" aria-label="Delete ${escapeHtml(c.name)}">
        <i class="bi bi-trash3-fill"></i>
      </button>`;
    list.appendChild(card);
  });

  // Bind delete buttons after rendering
  list.querySelectorAll('.btn-delete-contact').forEach(btn => {
    btn.addEventListener('click', () => deleteContact(btn.dataset.id));
  });
}

function deleteContact(id) {
  saveContacts(getContacts().filter(c => c.id !== id));
  renderContacts();
  showToast('Contact deleted.', 'bi-trash3-fill');
}

/* ============================================================
   VOICE SECTION MODULE  (the #voice section, not AI assistant)
   ============================================================ */
let voiceSectionRecognition = null;
let voiceSectionActive      = false;

function initVoice() {
  const btn    = document.getElementById('start-voice-btn');
  const status = document.getElementById('voice-status');
  if (!btn) return;

  if (!getSpeechAPI()) {
    btn.disabled    = true;
    btn.textContent = 'Voice Detection Unavailable';
    if (status) status.textContent = 'Your browser does not support the Web Speech API. Try Chrome or Edge.';
    return;
  }

  btn.addEventListener('click', () => {
    voiceSectionActive ? stopVoiceSection() : startVoiceSection();
  });
}

function startVoiceSection() {
  const SR     = getSpeechAPI();
  const btn    = document.getElementById('start-voice-btn');
  const status = document.getElementById('voice-status');
  const mic    = document.getElementById('mic-indicator');

  voiceSectionRecognition = new SR();
  voiceSectionRecognition.continuous     = true;
  voiceSectionRecognition.interimResults = true;
  voiceSectionRecognition.lang           = 'en-US';

  voiceSectionRecognition.onstart = () => {
    voiceSectionActive = true;
    if (btn) {
      btn.innerHTML = '<i class="bi bi-mic-mute-fill"></i> Stop Listening';
      btn.style.background = 'linear-gradient(135deg,#c2185b,#880e4f)';
    }
    if (mic) mic.classList.add('listening');
    if (status) status.textContent = '🎙️ Listening… Say "help", "save me", or "emergency"';
  };

  voiceSectionRecognition.onresult = (event) => {
    for (let i = event.resultIndex; i < event.results.length; i++) {
      const transcript = event.results[i][0].transcript.toLowerCase();
      if (VOICE_KEYWORDS.some(kw => transcript.includes(kw))) {
        if (status) status.textContent = `⚠️ Keyword: "${transcript.trim()}" — Triggering SOS!`;
        triggerSos();
        stopVoiceSection();
        break;
      }
    }
  };

  voiceSectionRecognition.onerror = (event) => {
    if (status) status.textContent = `Voice error: ${event.error}. Please try again.`;
    stopVoiceSection();
  };

  voiceSectionRecognition.onend = () => {
    if (voiceSectionActive) stopVoiceSection();
  };

  voiceSectionRecognition.start();
}

function stopVoiceSection() {
  voiceSectionActive = false;
  if (voiceSectionRecognition) {
    try { voiceSectionRecognition.stop(); } catch (_) {}
    voiceSectionRecognition = null;
  }
  const btn    = document.getElementById('start-voice-btn');
  const mic    = document.getElementById('mic-indicator');
  const status = document.getElementById('voice-status');
  if (btn) {
    btn.innerHTML = '<i class="bi bi-mic-fill"></i> Start Voice Detection';
    btn.style.background = '';
  }
  if (mic) mic.classList.remove('listening');
  if (status && !status.textContent.includes('Keyword')) {
    status.textContent = 'Voice detection stopped.';
  }
}

/* ============================================================
   FAKE CALL MODULE
   ============================================================ */
let oscillator = null;
let audioCtx   = null;

function initFakeCall() {
  const modalEl   = document.getElementById('fakeCallModal');
  const acceptBtn = document.getElementById('accept-call-btn');
  const rejectBtn = document.getElementById('reject-call-btn');
  if (!modalEl) return;

  modalEl.addEventListener('show.bs.modal',   () => playRingtone());
  modalEl.addEventListener('hidden.bs.modal', () => stopRingtone());

  if (acceptBtn) {
    acceptBtn.addEventListener('click', () => {
      stopRingtone();
      bootstrap.Modal.getInstance(modalEl)?.hide();
      showToast('Call accepted. Stay safe!', 'bi-telephone-fill');
    });
  }
  if (rejectBtn) {
    rejectBtn.addEventListener('click', () => {
      stopRingtone();
      bootstrap.Modal.getInstance(modalEl)?.hide();
    });
  }
}

function playRingtone() {
  try {
    audioCtx   = new (window.AudioContext || window.webkitAudioContext)();
    oscillator = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(440, audioCtx.currentTime);
    oscillator.frequency.setValueAtTime(480, audioCtx.currentTime + 0.5);
    oscillator.frequency.setValueAtTime(440, audioCtx.currentTime + 1.0);
    gain.gain.setValueAtTime(0.25, audioCtx.currentTime);
    oscillator.connect(gain);
    gain.connect(audioCtx.destination);
    oscillator.start();
  } catch (err) {
    console.warn('Web Audio API unavailable:', err);
  }
}

function stopRingtone() {
  try {
    if (oscillator) { oscillator.stop(); oscillator.disconnect(); oscillator = null; }
    if (audioCtx)   { audioCtx.close(); audioCtx = null; }
  } catch (_) {}
}

/* ============================================================
   COUNTERS MODULE
   ============================================================ */

function initCounters() {
  const section = document.getElementById('stats');
  if (!section) return;

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        STAT_TARGETS.forEach(({ id, target }) => {
          const el = document.getElementById(id);
          if (el) animateCounter(el, target);
        });
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.3 });

  observer.observe(section);
}

function animateCounter(el, target) {
  const duration = 2000;
  const start    = performance.now();
  function step(now) {
    const progress = Math.min((now - start) / duration, 1);
    const eased    = 1 - Math.pow(1 - progress, 3);
    el.textContent = Math.round(eased * target).toLocaleString();
    if (progress < 1) requestAnimationFrame(step);
    else el.textContent = target.toLocaleString();
  }
  requestAnimationFrame(step);
}

/* ============================================================
   SCROLL REVEAL
   ============================================================ */

function initScrollReveal() {
  const cards = document.querySelectorAll('.reveal-card');
  if (!cards.length) return;
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.1 });
  cards.forEach(c => observer.observe(c));
}

/* ============================================================
   ACTIVE NAV HIGHLIGHT
   ============================================================ */

function initActiveNav() {
  const sections = document.querySelectorAll('section[id]');
  const links    = document.querySelectorAll('.nav-link-custom');
  if (!sections.length || !links.length) return;

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        links.forEach(link => {
          link.classList.toggle(
            'active-section',
            link.getAttribute('href') === `#${entry.target.id}`
          );
        });
      }
    });
  }, { threshold: 0.3 });

  sections.forEach(s => observer.observe(s));
}

/* ============================================================
   AI ASSISTANT — SHARED HELPERS
   ============================================================ */

/** Update the status bar in the AI hero banner. */
function updateAIStatus(mode, lastAction) {
  const modeEl = document.getElementById('ai-status-mode');
  const lastEl = document.getElementById('ai-status-last');
  if (modeEl && mode)       modeEl.textContent = mode;
  if (lastEl && lastAction) lastEl.textContent = lastAction;
}

/** Pulse the AI brain core visual. */
function pulseBrain(duration = 2000) {
  const core = document.getElementById('ai-brain-core');
  if (!core) return;
  core.classList.add('active');
  setTimeout(() => core.classList.remove('active'), duration);
}

/** Add a timestamped entry to the activity feed. */
function addActivityEntry(message, type = '') {
  const feed = document.getElementById('ai-activity-feed');
  if (!feed) return;
  const empty = feed.querySelector('.ai-activity-empty');
  if (empty) empty.remove();

  const now  = new Date();
  const time = `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}:${String(now.getSeconds()).padStart(2,'0')}`;
  const item = document.createElement('div');
  item.className = `ai-activity-item${type ? ' ' + type : ''}`;
  item.innerHTML = `<span>${message}</span><span class="ai-activity-time">${time}</span>`;
  feed.insertBefore(item, feed.firstChild);
  while (feed.children.length > 8) feed.removeChild(feed.lastChild);
}

/** Toggle the waveform animation. */
function setWaveform(active) {
  document.getElementById('vtt-waveform')?.classList.toggle('active', active);
}

/* ============================================================
   AI ASSISTANT — VOICE TO TEXT MODULE
   ============================================================ */
const vttModule = (() => {
  let rec    = null;
  let active = false;

  function init() {
    const btn         = document.getElementById('vtt-btn');
    const btnIcon     = document.getElementById('vtt-btn-icon');
    const wrapper     = document.getElementById('vtt-mic-wrapper');
    const transcript  = document.getElementById('vtt-transcript');
    const fallback    = document.getElementById('vtt-fallback');

    if (!btn) return;

    if (!getSpeechAPI()) {
      btn.disabled    = true;
      btn.style.opacity = '0.4';
      if (fallback) fallback.classList.remove('d-none');
      return;
    }

    btn.addEventListener('click', () => { active ? stop() : start(); });

    function start() {
      const SR = getSpeechAPI();
      rec = new SR();
      rec.continuous     = true;
      rec.interimResults = true;
      rec.lang           = 'en-US';

      if (transcript) transcript.innerHTML = '';

      rec.onstart = () => {
        active = true;
        btn.classList.add('active');
        if (btnIcon) btnIcon.className = 'bi bi-stop-fill';
        if (wrapper) wrapper.classList.add('listening');
        if (transcript) transcript.classList.add('active');
        setWaveform(true);
        updateAIStatus('Voice to Text', 'Listening…');
        addActivityEntry('🎙️ Voice to Text started');
        pulseBrain(500);
      };

      rec.onresult = (event) => {
        let final = '', interim = '';
        for (let i = 0; i < event.results.length; i++) {
          const t = event.results[i][0].transcript;
          if (event.results[i].isFinal) final += t + ' ';
          else interim += t;
        }
        if (transcript) {
          transcript.innerHTML =
            `<span>${escapeHtml(final)}</span>` +
            (interim ? `<span style="color:rgba(255,255,255,0.4);font-style:italic;">${escapeHtml(interim)}</span>` : '');
        }
      };

      rec.onerror = (e) => {
        showToast(`Voice error: ${e.error}`, 'bi-exclamation-triangle-fill');
        stop();
      };

      // Auto-restart for continuous mode
      rec.onend = () => {
        if (active) {
          try { rec.start(); } catch (_) {}
        }
      };

      rec.start();
    }

    function stop() {
      active = false;
      if (rec) { try { rec.stop(); } catch (_) {} rec = null; }
      btn.classList.remove('active');
      if (btnIcon) btnIcon.className = 'bi bi-mic-fill';
      if (wrapper) wrapper.classList.remove('listening');
      if (transcript) transcript.classList.remove('active');
      setWaveform(false);
      updateAIStatus('Standby', 'Voice to Text stopped');
      addActivityEntry('⏹️ Voice to Text stopped');
    }
  }

  return { init };
})();

/* ============================================================
   AI ASSISTANT — VOICE COMMANDS MODULE
   ============================================================ */

/**
 * Central command handler — used by both voice recognition
 * and clickable chips so behaviour is always identical.
 */
function handleVoiceCommand(transcript) {
  const COMMANDS = [
    {
      match:  ['trigger sos', 'sos'],
      action: () => triggerSos(),
      label:  'SOS triggered!'
    },
    {
      match:  ['show contacts', 'contacts'],
      action: () => document.getElementById('contacts')?.scrollIntoView({ behavior: 'smooth' }),
      label:  'Scrolling to Emergency Contacts…'
    },
    {
      match:  ['fake call', 'fake'],
      action: () => {
        const m = document.getElementById('fakeCallModal');
        if (m) new bootstrap.Modal(m).show();
      },
      label: 'Opening Fake Call…'
    },
    {
      match:  ['help', 'save me', 'emergency'],
      action: () => triggerSos(),
      label:  'Emergency detected — SOS triggered!'
    }
  ];

  const lower = transcript.toLowerCase().trim();

  for (const cmd of COMMANDS) {
    if (cmd.match.some(kw => lower.includes(kw))) {
      cmd.action();

      const resultText = document.getElementById('cmd-result-text');
      const resultBox  = document.getElementById('cmd-result');
      if (resultText) resultText.textContent = `Voice command recognized: "${cmd.label}"`;
      if (resultBox)  resultBox.classList.remove('d-none');

      showToast(`Voice command: ${cmd.label}`, 'bi-check-circle-fill');
      addActivityEntry(`🗣️ Command: "${lower}" → ${cmd.label}`, 'success');
      updateAIStatus('Command Mode', cmd.label);
      pulseBrain(1200);

      setTimeout(() => resultBox?.classList.add('d-none'), 4000);
      return;
    }
  }

  showToast(`Command not recognized: "${lower}"`, 'bi-question-circle-fill');
  addActivityEntry(`❓ Unknown command: "${lower}"`);
}

const cmdModule = (() => {
  let rec    = null;
  let active = false;

  function init() {
    const btn = document.getElementById('cmd-btn');
    if (!btn) return;

    if (!getSpeechAPI()) {
      btn.disabled    = true;
      btn.textContent = 'Not Supported';
      return;
    }

    btn.addEventListener('click', () => { active ? stop() : start(); });

    function start() {
      const SR = getSpeechAPI();
      rec = new SR();
      rec.continuous     = false;
      rec.interimResults = false;
      rec.lang           = 'en-US';

      active = true;
      btn.innerHTML        = '<i class="bi bi-stop-fill"></i> Stop Listening';
      btn.classList.add('active');

      rec.onresult = (event) => {
        handleVoiceCommand(event.results[0][0].transcript);
      };

      rec.onerror = (e) => {
        showToast(`Command error: ${e.error}`, 'bi-exclamation-triangle-fill');
        stop();
      };

      rec.onend = () => stop();
      rec.start();
    }

    function stop() {
      active = false;
      if (rec) { try { rec.stop(); } catch (_) {} rec = null; }
      const btn2 = document.getElementById('cmd-btn');
      if (btn2) {
        btn2.innerHTML = '<i class="bi bi-mic-fill"></i> Start Command Mode';
        btn2.classList.remove('active');
      }
    }
  }

  return { init };
})();

/* ============================================================
   AI ASSISTANT — DANGER DETECTION MODULE
   ============================================================ */
const dangerModule = (() => {
  let rec    = null;
  let active = false;

  const DANGER_WORDS = ['help', 'save me', 'danger', 'unsafe', 'emergency'];

  function init() {
    const btn = document.getElementById('danger-btn');
    if (!btn) return;

    if (!getSpeechAPI()) {
      btn.disabled    = true;
      btn.textContent = 'Not Supported';
      const st = document.getElementById('danger-status-text');
      if (st) st.textContent = 'Speech API not available';
      return;
    }

    btn.addEventListener('click', () => { active ? stop() : start(); });
  }

  function start() {
    const SR  = getSpeechAPI();
    const btn = document.getElementById('danger-btn');

    rec = new SR();
    rec.continuous     = true;
    rec.interimResults = true;
    rec.lang           = 'en-US';

    active = true;
    setStatus('active', '🟢 Listening for danger…');
    if (btn) {
      btn.innerHTML = '<i class="bi bi-stop-fill"></i> Stop Safety Listening';
      btn.classList.add('active');
    }
    addActivityEntry('👂 Safety listening started', 'success');
    updateAIStatus('Safety Listening', 'Active');

    rec.onresult = (event) => {
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const text  = event.results[i][0].transcript.toLowerCase();
        const found = DANGER_WORDS.find(w => text.includes(w));
        if (found) { onDangerDetected(found); break; }
      }
    };

    rec.onerror = (e) => {
      if (e.error !== 'no-speech') {
        showToast(`Danger detection error: ${e.error}`, 'bi-exclamation-triangle-fill');
        stop();
      }
    };

    // Keep running continuously
    rec.onend = () => {
      if (active) { try { rec.start(); } catch (_) {} }
    };

    rec.start();
  }

  function onDangerDetected(keyword) {
    setStatus('danger', '🚨 Danger word detected!');

    const detectedBox  = document.getElementById('danger-detected');
    const detectedWord = document.getElementById('danger-detected-word');
    if (detectedWord) detectedWord.textContent = `"${keyword}"`;
    if (detectedBox)  detectedBox.classList.remove('d-none');

    // Flash matching danger chip
    document.querySelectorAll('.ai-danger-chip').forEach(c => {
      if (c.textContent.trim() === keyword) {
        c.classList.add('flash');
        setTimeout(() => c.classList.remove('flash'), 1400);
      }
    });

    showToast(`⚠️ Danger detected: "${keyword}" — SOS triggered!`, 'bi-exclamation-triangle-fill');
    addActivityEntry(`🚨 Danger keyword: "${keyword}"`, 'danger');
    updateAIStatus('SOS Triggered', `Keyword: "${keyword}"`);
    pulseBrain(2000);
    triggerSos();

    setTimeout(() => {
      if (active) setStatus('active', '🟢 Listening for danger…');
      detectedBox?.classList.add('d-none');
    }, 6000);
  }

  function setStatus(state, message) {
    const dot  = document.getElementById('danger-dot');
    const text = document.getElementById('danger-status-text');
    if (dot) {
      dot.className = 'ai-status-dot';
      if (state === 'active') dot.classList.add('active');
      if (state === 'danger') dot.classList.add('danger');
    }
    if (text) text.textContent = message;
  }

  function stop() {
    active = false;
    if (rec) { try { rec.stop(); } catch (_) {} rec = null; }
    setStatus('', 'Inactive');
    const btn = document.getElementById('danger-btn');
    if (btn) {
      btn.innerHTML = '<i class="bi bi-ear-fill"></i> Start Safety Listening';
      btn.classList.remove('active');
    }
    document.getElementById('danger-detected')?.classList.add('d-none');
    addActivityEntry('⏹️ Safety listening stopped');
    updateAIStatus('Standby', 'Safety listening stopped');
  }

  return { init };
})();

/* ============================================================
   AI ASSISTANT — CLICKABLE CHIPS
   ============================================================ */
function initClickableChips() {
  document.querySelectorAll('.ai-chip-clickable').forEach(chip => {
    chip.addEventListener('click', () => {
      const cmd = chip.dataset.cmd;
      if (!cmd) return;

      // Visual feedback
      chip.classList.add('fired');
      setTimeout(() => chip.classList.remove('fired'), 1500);

      // Run through the unified command handler
      handleVoiceCommand(cmd);
      pulseBrain(1500);
    });
  });
}

/* ============================================================
   AI ASSISTANT — DEMO MODE
   Simulates a full AI flow without needing a microphone.
   ============================================================ */
function initDemoMode() {
  const btn = document.getElementById('ai-demo-btn');
  if (!btn) return;

  const steps = [
    { delay: 0,    fn: () => {
        updateAIStatus('Demo Running…', 'Starting demo sequence');
        pulseBrain(800);
        addActivityEntry('🎬 Demo mode started', 'success');
        showToast('Demo started — watch the AI in action!', 'bi-play-circle-fill');
      }
    },
    { delay: 800,  fn: () => {
        setWaveform(true);
        document.getElementById('vtt-mic-wrapper')?.classList.add('listening');
        document.getElementById('vtt-btn')?.classList.add('active');
        updateAIStatus('Listening…', 'Voice to Text active');
        addActivityEntry('🎙️ Voice to Text activated');
      }
    },
    { delay: 1800, fn: () => {
        const box = document.getElementById('vtt-transcript');
        if (box) {
          box.classList.add('active');
          box.innerHTML = '<span style="color:rgba(255,255,255,0.4);font-style:italic;">She Shield AI is listening…</span>';
        }
      }
    },
    { delay: 2800, fn: () => {
        const box = document.getElementById('vtt-transcript');
        if (box) box.innerHTML = '<span>I need help, please send my location…</span>';
        addActivityEntry('📝 Transcript: "I need help, please send my location…"');
        pulseBrain(1000);
      }
    },
    { delay: 3800, fn: () => {
        setWaveform(false);
        document.getElementById('vtt-mic-wrapper')?.classList.remove('listening');
        document.getElementById('vtt-btn')?.classList.remove('active');
        updateAIStatus('Processing…', 'Keyword detected');
        addActivityEntry('⚠️ Danger keyword detected: "help"', 'danger');
        document.querySelectorAll('.ai-danger-chip').forEach(c => {
          if (c.textContent.trim() === 'help') {
            c.classList.add('flash');
            setTimeout(() => c.classList.remove('flash'), 1200);
          }
        });
      }
    },
    { delay: 4600, fn: () => {
        updateAIStatus('SOS Triggered', 'Emergency alert sent');
        pulseBrain(2000);
        addActivityEntry('🚨 SOS triggered automatically', 'danger');
        showToast('⚠️ Demo: Danger detected — SOS triggered!', 'bi-exclamation-triangle-fill');
        const detectedBox  = document.getElementById('danger-detected');
        const detectedWord = document.getElementById('danger-detected-word');
        if (detectedWord) detectedWord.textContent = '"help"';
        if (detectedBox)  detectedBox.classList.remove('d-none');
        setTimeout(() => detectedBox?.classList.add('d-none'), 3000);
      }
    },
    { delay: 6000, fn: () => {
        addActivityEntry('✅ Emergency contacts notified', 'success');
        addActivityEntry('📍 Location shared via AWS SNS', 'success');
        updateAIStatus('Standby', 'Demo complete');
        showToast('Demo complete! All systems working.', 'bi-check-circle-fill');
      }
    },
    { delay: 7200, fn: () => {
        btn.disabled = false;
        btn.innerHTML = '<i class="bi bi-play-circle-fill"></i> Run Live Demo <span class="ai-demo-cta-sub">No mic needed</span>';
      }
    }
  ];

  btn.addEventListener('click', () => {
    btn.disabled = true;
    btn.innerHTML = '<i class="bi bi-hourglass-split"></i> Running… <span class="ai-demo-cta-sub">Watch the cards</span>';
    steps.forEach(s => setTimeout(s.fn, s.delay));
  });
}

/* ============================================================
   SINGLE DOMContentLoaded — all inits here, nowhere else
   ============================================================ */
document.addEventListener('DOMContentLoaded', () => {
  // Core features
  initSos();
  initContacts();
  initVoice();
  initFakeCall();
  initCounters();

  // UI enhancements
  initScrollReveal();
  initActiveNav();

  // AI assistant modules
  vttModule.init();
  cmdModule.init();
  dangerModule.init();
  initClickableChips();
  initDemoMode();

  // Ensure mic indicator in voice section starts without d-none
  // (visibility is controlled by .listening class, not d-none)
  document.getElementById('mic-indicator')?.classList.remove('d-none');
});

/* ============================================================
   CHATBOT MODULE
   Multilingual, rule-based safety chatbot.
   Languages: English (en), Hindi (hi), Tamil (ta)
   ============================================================ */

/* ----------------------------------------------------------
   LANGUAGE CONTENT
   All responses are stored here — easy to extend.
   ---------------------------------------------------------- */
const CHATBOT_CONTENT = {

  en: {
    welcome: "👋 Hi! I'm She Shield AI — your personal safety assistant. How can I help you stay safe today?",
    placeholder: "Type a message…",
    quickLabels: { sos:'Trigger SOS', tips:'Safety Tips', contacts:'Contacts', fakecall:'Fake Call', advice:'Safety Advice' },

    // Intent responses — matched by keywords
    intents: [
      {
        keys: ['unsafe', 'not safe', 'feel unsafe', 'scared', 'afraid', 'frightened'],
        response: "🛡️ I hear you. You're not alone.\n\n**Immediate steps:**\n• Move to a well-lit, crowded area\n• Call someone you trust\n• Use the SOS button below to alert your contacts\n\nWould you like me to trigger SOS now?",
        emergency: true
      },
      {
        keys: ['following', 'being followed', 'someone following', 'stalker', 'stalking'],
        response: "⚠️ Stay calm. Here's what to do:\n\n1. Don't go home directly — go to a public place\n2. Call a trusted person and stay on the line\n3. Note the person's description\n4. Trigger SOS to alert your emergency contacts\n\nShall I trigger SOS for you?",
        emergency: true
      },
      {
        keys: ['help', 'save me', 'danger', 'emergency', 'sos', 'attack', 'attacked'],
        response: "🚨 **EMERGENCY DETECTED**\n\nTriggering SOS alert now. Your location will be shared with your emergency contacts.\n\nStay in a safe place. Help is on the way.",
        emergency: true,
        action: 'sos'
      },
      {
        keys: ['travel', 'travelling alone', 'travel safe', 'alone at night', 'night travel'],
        response: "🌙 **Safe Travel Tips:**\n\n• Share your live location with a trusted contact\n• Keep your phone charged\n• Sit near the driver or in well-lit areas\n• Trust your instincts — if something feels wrong, leave\n• Use the Fake Call feature to exit uncomfortable situations",
        emergency: false
      },
      {
        keys: ['contact help', 'call help', 'who to call', 'helpline', 'emergency number'],
        response: "📞 **Emergency Numbers (India):**\n\n• Police: **100**\n• Women Helpline: **1091**\n• Emergency: **112**\n• Ambulance: **108**\n\nYou can also add personal contacts in the Emergency Contacts section.",
        emergency: false
      },
      {
        keys: ['safety tips', 'tips', 'advice', 'stay safe', 'how to be safe'],
        response: "💡 **Quick Safety Tips:**\n\n1. Always share your location when travelling\n2. Keep emergency numbers saved\n3. Trust your gut — leave if uncomfortable\n4. Use the Fake Call feature to escape situations\n5. Stay in well-lit, populated areas at night\n6. Keep your phone charged",
        emergency: false,
        action: 'tips'
      },
      {
        keys: ['fake call', 'pretend call', 'escape call', 'simulate call'],
        response: "📱 Opening the Fake Call feature for you. This will simulate an incoming call so you can exit any uncomfortable situation discreetly.",
        emergency: false,
        action: 'fakecall'
      },
      {
        keys: ['contacts', 'emergency contacts', 'add contact', 'saved contacts'],
        response: "👥 Taking you to the Emergency Contacts section where you can add and manage trusted contacts who will be alerted during an SOS.",
        emergency: false,
        action: 'contacts'
      },
      {
        keys: ['hello', 'hi', 'hey', 'good morning', 'good evening', 'namaste'],
        response: "👋 Hello! I'm She Shield AI, your safety companion. I'm here 24/7 to help you stay safe.\n\nYou can ask me about safety tips, emergency procedures, or use the quick buttons below.",
        emergency: false
      },
      {
        keys: ['what can you do', 'features', 'help me', 'how does this work'],
        response: "🤖 **I can help you with:**\n\n• 🚨 Trigger SOS alerts\n• 📍 Share your location\n• 💡 Safety tips & advice\n• 📞 Emergency contact info\n• 📱 Fake call to escape situations\n• 🎙️ Voice-activated emergency detection\n\nJust type or use the quick buttons below!",
        emergency: false
      }
    ],

    // Fallback when no intent matches
    fallback: "I'm here to help you stay safe. You can ask me about safety tips, emergency procedures, or use the quick action buttons below. 💙",
    sosConfirm: "🚨 SOS alert triggered! Your emergency contacts are being notified with your location.",
    tipsAction: "📍 Scrolling to Safety Tips section…",
    contactsAction: "📍 Scrolling to Emergency Contacts…",
    fakecallAction: "📱 Opening Fake Call…",
    adviceResponse: "🛡️ **She Shield AI Safety Advice:**\n\n• Always be aware of your surroundings\n• Keep your phone charged and accessible\n• Share your location with trusted contacts\n• Trust your instincts — they're usually right\n• Know your emergency numbers by heart\n• Use our SOS button in any emergency",
    langSwitched: "🌐 Language set to English. How can I help you stay safe?",
    scenariosLabel: "Try asking:"
  },

  hi: {
    welcome: "👋 नमस्ते! मैं She Shield AI हूँ — आपकी व्यक्तिगत सुरक्षा सहायक। आज मैं आपकी कैसे मदद कर सकती हूँ?",
    placeholder: "संदेश टाइप करें…",
    quickLabels: { sos:'SOS भेजें', tips:'सुरक्षा टिप्स', contacts:'संपर्क', fakecall:'नकली कॉल', advice:'सुरक्षा सलाह' },

    intents: [
      {
        keys: ['असुरक्षित', 'डर', 'खतरा', 'unsafe', 'danger', 'scared'],
        response: "🛡️ आप अकेली नहीं हैं। मैं यहाँ हूँ।\n\n**तुरंत करें:**\n• भीड़-भाड़ वाली जगह जाएं\n• किसी विश्वसनीय व्यक्ति को कॉल करें\n• नीचे SOS बटन दबाएं\n\nक्या मैं अभी SOS भेजूं?",
        emergency: true
      },
      {
        keys: ['मदद', 'बचाओ', 'help', 'save me', 'emergency', 'sos'],
        response: "🚨 **आपातकाल!**\n\nSOS अलर्ट भेजा जा रहा है। आपकी लोकेशन आपके संपर्कों को भेजी जाएगी।\n\nसुरक्षित जगह रहें।",
        emergency: true,
        action: 'sos'
      },
      {
        keys: ['सुरक्षा टिप्स', 'tips', 'सलाह', 'सुरक्षित'],
        response: "💡 **सुरक्षा टिप्स:**\n\n1. अकेले यात्रा करते समय लोकेशन शेयर करें\n2. आपातकालीन नंबर याद रखें\n3. फोन हमेशा चार्ज रखें\n4. अंधेरे में भीड़ वाली जगह रहें\n5. नकली कॉल फीचर का उपयोग करें",
        emergency: false,
        action: 'tips'
      },
      {
        keys: ['नमस्ते', 'hello', 'hi', 'हेलो'],
        response: "👋 नमस्ते! मैं She Shield AI हूँ। आपकी सुरक्षा मेरी प्राथमिकता है। मैं आपकी कैसे मदद कर सकती हूँ?",
        emergency: false
      },
      {
        keys: ['आपातकालीन नंबर', 'helpline', 'police', 'पुलिस'],
        response: "📞 **आपातकालीन नंबर:**\n\n• पुलिस: **100**\n• महिला हेल्पलाइन: **1091**\n• आपातकाल: **112**\n• एम्बुलेंस: **108**",
        emergency: false
      }
    ],

    fallback: "मैं आपकी सुरक्षा के लिए यहाँ हूँ। सुरक्षा टिप्स, आपातकालीन प्रक्रियाओं के बारे में पूछें या नीचे दिए बटन का उपयोग करें। 💙",
    sosConfirm: "🚨 SOS अलर्ट भेजा गया! आपके संपर्कों को आपकी लोकेशन भेजी जा रही है।",
    tipsAction: "📍 सुरक्षा टिप्स पर जा रहे हैं…",
    contactsAction: "📍 आपातकालीन संपर्क पर जा रहे हैं…",
    fakecallAction: "📱 नकली कॉल खुल रही है…",
    adviceResponse: "🛡️ **सुरक्षा सलाह:**\n\n• हमेशा अपने आसपास सतर्क रहें\n• फोन चार्ज रखें\n• विश्वसनीय लोगों के साथ लोकेशन शेयर करें\n• आपातकालीन नंबर याद रखें\n• SOS बटन का उपयोग करें",
    langSwitched: "🌐 भाषा हिंदी में बदल दी गई है। मैं आपकी कैसे मदद कर सकती हूँ?",
    scenariosLabel: "पूछें:"
  },

  ta: {
    welcome: "👋 வணக்கம்! நான் She Shield AI — உங்கள் தனிப்பட்ட பாதுகாப்பு உதவியாளர். இன்று நான் உங்களுக்கு எப்படி உதவலாம்?",
    placeholder: "செய்தி தட்டச்சு செய்யுங்கள்…",
    quickLabels: { sos:'SOS அனுப்பு', tips:'பாதுகாப்பு குறிப்புகள்', contacts:'தொடர்புகள்', fakecall:'போலி அழைப்பு', advice:'பாதுகாப்பு ஆலோசனை' },

    intents: [
      {
        keys: ['பாதுகாப்பற்றது', 'பயம்', 'ஆபத்து', 'unsafe', 'danger', 'scared'],
        response: "🛡️ நீங்கள் தனியாக இல்லை. நான் இங்கே இருக்கிறேன்.\n\n**உடனடியாக செய்யுங்கள்:**\n• நிறைய மக்கள் இருக்கும் இடத்திற்கு செல்லுங்கள்\n• நம்பகமான நபரை அழையுங்கள்\n• கீழே SOS பொத்தானை அழுத்துங்கள்\n\nநான் இப்போது SOS அனுப்பட்டுமா?",
        emergency: true
      },
      {
        keys: ['உதவி', 'காப்பாற்று', 'help', 'save me', 'emergency', 'sos'],
        response: "🚨 **அவசரநிலை!**\n\nSOS எச்சரிக்கை அனுப்பப்படுகிறது. உங்கள் இருப்பிடம் உங்கள் தொடர்புகளுக்கு அனுப்பப்படும்.\n\nபாதுகாப்பான இடத்தில் இருங்கள்.",
        emergency: true,
        action: 'sos'
      },
      {
        keys: ['பாதுகாப்பு குறிப்புகள்', 'tips', 'ஆலோசனை', 'பாதுகாப்பாக'],
        response: "💡 **பாதுகாப்பு குறிப்புகள்:**\n\n1. தனியாக பயணிக்கும்போது இருப்பிடம் பகிருங்கள்\n2. அவசர எண்களை நினைவில் வையுங்கள்\n3. தொலைபேசியை எப்போதும் சார்ஜ் செய்யுங்கள்\n4. இரவில் நிறைய மக்கள் இருக்கும் இடத்தில் இருங்கள்\n5. போலி அழைப்பு அம்சத்தை பயன்படுத்துங்கள்",
        emergency: false,
        action: 'tips'
      },
      {
        keys: ['வணக்கம்', 'hello', 'hi', 'நமஸ்காரம்'],
        response: "👋 வணக்கம்! நான் She Shield AI. உங்கள் பாதுகாப்பு என் முன்னுரிமை. நான் உங்களுக்கு எப்படி உதவலாம்?",
        emergency: false
      },
      {
        keys: ['அவசர எண்', 'helpline', 'police', 'காவல்துறை'],
        response: "📞 **அவசர எண்கள்:**\n\n• காவல்துறை: **100**\n• பெண்கள் உதவி: **1091**\n• அவசரநிலை: **112**\n• ஆம்புலன்ஸ்: **108**",
        emergency: false
      }
    ],

    fallback: "நான் உங்கள் பாதுகாப்பிற்காக இங்கே இருக்கிறேன். பாதுகாப்பு குறிப்புகள் அல்லது அவசர நடைமுறைகளைப் பற்றி கேளுங்கள். 💙",
    sosConfirm: "🚨 SOS எச்சரிக்கை அனுப்பப்பட்டது! உங்கள் தொடர்புகளுக்கு இருப்பிடம் அனுப்பப்படுகிறது.",
    tipsAction: "📍 பாதுகாப்பு குறிப்புகளுக்கு செல்கிறோம்…",
    contactsAction: "📍 அவசர தொடர்புகளுக்கு செல்கிறோம்…",
    fakecallAction: "📱 போலி அழைப்பு திறக்கப்படுகிறது…",
    adviceResponse: "🛡️ **பாதுகாப்பு ஆலோசனை:**\n\n• எப்போதும் சுற்றுப்புறத்தில் கவனமாக இருங்கள்\n• தொலைபேசியை சார்ஜ் செய்யுங்கள்\n• நம்பகமான நபர்களுடன் இருப்பிடம் பகிருங்கள்\n• அவசர எண்களை மனப்பாடம் செய்யுங்கள்\n• SOS பொத்தானை பயன்படுத்துங்கள்",
    langSwitched: "🌐 மொழி தமிழுக்கு மாற்றப்பட்டது. நான் உங்களுக்கு எப்படி உதவலாம்?",
    scenariosLabel: "கேளுங்கள்:"
  },

  /* ----------------------------------------------------------
     TANGLISH (tg) — Tamil written in English letters.
     Tone: friendly, supportive, like a helpful college friend.
     Easy to read for Tamil Nadu students.
     To edit: just update the strings below — no Tamil script needed.
     ---------------------------------------------------------- */
  tg: {
    welcome: "👋 Vanakkam! Naan She Shield AI — ungal personal safety assistant. Epdi help pannattum?",
    placeholder: "Message type pannunga…",

    // Quick action button labels in Tanglish
    quickLabels: {
      sos:      'SOS Anuppu',
      tips:     'Safety Tips',
      contacts: 'Contacts Paaru',
      fakecall: 'Fake Call',
      advice:   'Safety Advice'
    },

    // Scenario chip label
    scenariosLabel: "Kelu:",

    // ── Intents ──────────────────────────────────────────────
    // Each intent has:
    //   keys      — keywords to match in user input (lowercase)
    //   response  — Tanglish reply shown in the chat bubble
    //   emergency — true = red bubble + inline SOS button
    //   action    — optional app action to trigger automatically
    intents: [
      {
        // User feels unsafe or scared
        keys: ['unsafe', 'not safe', 'feel unsafe', 'scared', 'afraid', 'bayam', 'pavam', 'pedi'],
        response: "🛡️ Bayapadatheenga, neenga thaniyadhu illai.\n\n**Ippo pannum:**\n• Niraiya people irukka public place ku move aagunga\n• Trusted friend ku call pannunga\n• Keezhey irukka SOS button press pannunga — ungal contacts ku alert pogum\n\nNaan ippo SOS trigger pannattuma?",
        emergency: true
      },
      {
        // Someone is following the user
        keys: ['following', 'follow panran', 'follow pandra', 'stalker', 'pinna varuran', 'pinna varaan'],
        response: "⚠️ Calm aagunga. Ithey pannunga:\n\n1. Veetuku direct poga vendam — public place ku ponga\n2. Trusted person ku call pannunga, line la irunga\n3. Avan description note pannunga\n4. SOS trigger pannunga — contacts ku alert pogum\n\nSOS anuppattuma?",
        emergency: true
      },
      {
        // Emergency keywords — auto-trigger SOS
        keys: ['help', 'save me', 'danger', 'emergency', 'sos', 'attack', 'attacked', 'aabathu', 'kaapathungo', 'udavi'],
        response: "🚨 **EMERGENCY DETECT AAGUTHU!**\n\nSOS alert ippo anuppurom. Ungal location emergency contacts ku share aagum.\n\nSafe place la irunga. Help varum.",
        emergency: true,
        action: 'sos'
      },
      {
        // Travelling alone safety
        keys: ['travel', 'travelling alone', 'alone at night', 'night travel', 'thaniyadhu travel', 'bus la'],
        response: "🌙 **Thaniyadhu Travel — Safety Tips:**\n\n• Trusted contact ku live location share pannunga\n• Phone charge la vaikkuunga\n• Driver pakkam or well-lit area la utkaarunga\n• Uncomfortable feel aana — udane irangiduveenga\n• Fake Call feature use pannunga — escape aaga easy",
        emergency: false
      },
      {
        // Emergency numbers
        keys: ['contact help', 'call help', 'helpline', 'emergency number', 'yaaru ku call', 'police number'],
        response: "📞 **Emergency Numbers (India):**\n\n• Police: **100**\n• Women Helpline: **1091**\n• Emergency: **112**\n• Ambulance: **108**\n\nPersonal contacts Emergency Contacts section la add pannunga.",
        emergency: false
      },
      {
        // Safety tips
        keys: ['safety tips', 'tips', 'advice', 'safe aaga', 'epdi safe', 'eppadi safe'],
        response: "💡 **Quick Safety Tips:**\n\n1. Travel panna location share pannunga\n2. Emergency numbers save pannunga\n3. Uncomfortable feel aana — udane leave pannunga\n4. Fake Call feature use pannunga\n5. Night la well-lit, crowded area la irunga\n6. Phone always charge la vaikkuunga",
        emergency: false,
        action: 'tips'
      },
      {
        // Fake call
        keys: ['fake call', 'pretend call', 'escape call', 'fake call pannunga'],
        response: "📱 Fake Call feature open pannurom. Uncomfortable situation la irundhu discreetly escape aaga ithey use pannunga.",
        emergency: false,
        action: 'fakecall'
      },
      {
        // Emergency contacts
        keys: ['contacts', 'emergency contacts', 'contact add', 'yaaru contacts'],
        response: "👥 Emergency Contacts section ku anuppurom — trusted contacts add pannunga. SOS trigger aana avangaluku alert pogum.",
        emergency: false,
        action: 'contacts'
      },
      {
        // Greeting
        keys: ['hello', 'hi', 'hey', 'vanakkam', 'hai', 'good morning', 'good evening'],
        response: "👋 Vanakkam! Naan She Shield AI. Ungal safety en responsibility. Epdi help pannattum?",
        emergency: false
      },
      {
        // What can the app do
        keys: ['what can you do', 'features', 'help me', 'how does this work', 'enna pannuveenga', 'epdi use'],
        response: "🤖 **Naan ungaluku help pannuvadhu:**\n\n• 🚨 SOS alerts trigger pannurom\n• 📍 Location share pannurom\n• 💡 Safety tips sollurom\n• 📞 Emergency contact info kudurom\n• 📱 Fake call — uncomfortable situations la escape aaga\n• 🎙️ Voice-activated emergency detection\n\nType pannunga or keezhey irukka buttons use pannunga!",
        emergency: false
      }
    ],

    // Shown when no intent matches
    fallback: "Naan ungal safety ku help panna ready. Safety tips, emergency procedures pathi kelu or keezhey irukka quick buttons use pannunga. 💙",

    // Responses for quick action buttons
    sosConfirm:      "🚨 SOS alert anuppitom! Ungal emergency contacts ku location share aaguthu.",
    tipsAction:      "📍 Safety Tips section ku pokurom…",
    contactsAction:  "📍 Emergency Contacts ku pokurom…",
    fakecallAction:  "📱 Fake Call open aaguthu…",
    adviceResponse:  "🛡️ **She Shield AI — Safety Advice:**\n\n• Surroundings la always alert aaga irunga\n• Phone charge la vaikkuunga\n• Trusted contacts ku location share pannunga\n• Gut feeling trust pannunga — always right\n• Emergency numbers heart la vaikkuunga\n• Edhaavadhu aana — SOS button press pannunga",

    // Shown when user switches to this language
    langSwitched: "🌐 Tanglish mode on! Epdi help pannattum, sollunga 😊"
  }
};

/* ----------------------------------------------------------
   CHATBOT ENGINE (v2) — premium, multilingual, interactive
   ---------------------------------------------------------- */
const chatbot = (() => {
  let isOpen      = false;
  let lang        = 'en';
  let typingTimer = null;
  let voiceRec    = null;
  let voiceActive = false;

  // DOM refs
  let panel, trigger, triggerIcon, messagesEl, inputEl, scenariosEl;

  function init() {
    panel       = document.getElementById('chatbot-panel');
    trigger     = document.getElementById('chatbot-trigger');
    triggerIcon = document.getElementById('chatbot-trigger-icon');
    messagesEl  = document.getElementById('chatbot-messages');
    inputEl     = document.getElementById('chatbot-input');
    scenariosEl = document.getElementById('chatbot-scenarios');

    if (!panel || !trigger) return;

    // Open / close
    trigger.addEventListener('click', togglePanel);
    document.getElementById('chatbot-close')?.addEventListener('click', closePanel);

    // Send message
    document.getElementById('chatbot-send')?.addEventListener('click', handleSend);
    inputEl?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
    });

    // Language pill buttons
    document.querySelectorAll('.chatbot-lang-pill').forEach(pill => {
      pill.addEventListener('click', () => switchLang(pill.dataset.lang));
    });

    // Quick action buttons
    document.querySelectorAll('.chatbot-quick-btn').forEach(btn => {
      btn.addEventListener('click', () => handleQuickAction(btn.dataset.action));
    });

    // Scenario chips
    document.querySelectorAll('.chatbot-scenario-chip').forEach(chip => {
      chip.addEventListener('click', () => {
        const msg = chip.dataset.msg;
        if (!msg) return;
        if (inputEl) inputEl.value = msg;
        handleSend();
        // Hide scenarios after first use
        if (scenariosEl) scenariosEl.style.display = 'none';
      });
    });

    // Voice input button
    document.getElementById('chatbot-voice-btn')?.addEventListener('click', toggleVoiceInput);

    panel._welcomed = false;
  }

  /* ── Language switch ── */
  function switchLang(newLang) {
    if (!CHATBOT_CONTENT[newLang]) return;
    lang = newLang;

    // Update pill active state
    document.querySelectorAll('.chatbot-lang-pill').forEach(p => {
      p.classList.toggle('active', p.dataset.lang === lang);
    });

    // Update placeholder
    if (inputEl) inputEl.placeholder = CHATBOT_CONTENT[lang].placeholder;

    // Update quick button labels
    const labels = CHATBOT_CONTENT[lang].quickLabels;
    document.querySelectorAll('.chatbot-quick-label').forEach(el => {
      const key = el.dataset.key;
      if (key && labels[key]) el.textContent = labels[key];
    });

    // Update scenario chips label
    const scenLabel = document.getElementById('chatbot-scenarios-label');
    if (scenLabel) scenLabel.textContent = CHATBOT_CONTENT[lang].scenariosLabel || 'Try asking:';

    // Announce language change in chat
    addBotMessage(CHATBOT_CONTENT[lang].langSwitched || `Language changed.`);
  }

  /* ── Open / Close ── */
  function togglePanel() { isOpen ? closePanel() : openPanel(); }

  function openPanel() {
    isOpen = true;
    panel.classList.add('open');
    panel.setAttribute('aria-hidden', 'false');
    trigger.classList.add('open');
    triggerIcon.className = 'bi bi-x-lg';

    // Clear unread badge
    const badge = document.getElementById('chatbot-unread-badge');
    if (badge) { badge.textContent = 'AI'; badge.classList.remove('pulse'); }

    // Welcome message on first open
    if (!panel._welcomed) {
      panel._welcomed = true;
      setTimeout(() => addBotMessage(CHATBOT_CONTENT[lang].welcome), 350);
    }

    setTimeout(() => inputEl?.focus(), 400);
  }

  function closePanel() {
    isOpen = false;
    panel.classList.remove('open');
    panel.setAttribute('aria-hidden', 'true');
    trigger.classList.remove('open');
    triggerIcon.className = 'bi bi-chat-heart-fill';
    if (voiceActive) stopVoiceInput();
  }

  /* ── Message rendering ── */
  function addUserMessage(text) {
    const msg = document.createElement('div');
    msg.className = 'chatbot-msg user';
    msg.innerHTML = `<div class="chatbot-bubble">${escapeHtml(text)}</div>`;
    messagesEl.appendChild(msg);
    scrollToBottom();
  }

  /**
   * Add a bot message bubble.
   * @param {string} text - Supports **bold** and \n
   * @param {boolean} isEmergency - Red tinted bubble
   * @param {boolean} showSosBtn - Show inline SOS action button
   */
  function addBotMessage(text, isEmergency = false, showSosBtn = false) {
    // Pulse trigger badge if panel is closed
    if (!isOpen) {
      const badge = document.getElementById('chatbot-unread-badge');
      if (badge) { badge.textContent = '!'; badge.classList.add('pulse'); }
    }

    const msg = document.createElement('div');
    msg.className = `chatbot-msg bot${isEmergency ? ' emergency' : ''}`;

    const sosBtnHtml = showSosBtn
      ? `<br><button class="chatbot-sos-inline" onclick="triggerSos()">
           <i class="bi bi-exclamation-octagon-fill"></i> Trigger SOS Now
         </button>`
      : '';

    msg.innerHTML = `
      <div class="chatbot-msg-avatar"><i class="bi bi-shield-fill-check"></i></div>
      <div class="chatbot-bubble">${formatMessage(text)}${sosBtnHtml}</div>`;
    messagesEl.appendChild(msg);
    scrollToBottom();
  }

  function formatMessage(text) {
    return escapeHtml(text)
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\n/g, '<br>');
  }

  function showTyping() {
    const el = document.createElement('div');
    el.className = 'chatbot-msg bot';
    el.id = 'chatbot-typing-indicator';
    el.innerHTML = `
      <div class="chatbot-msg-avatar"><i class="bi bi-shield-fill-check"></i></div>
      <div class="chatbot-typing"><span></span><span></span><span></span></div>`;
    messagesEl.appendChild(el);
    scrollToBottom();
  }

  function hideTyping() {
    document.getElementById('chatbot-typing-indicator')?.remove();
  }

  function scrollToBottom() {
    requestAnimationFrame(() => { messagesEl.scrollTop = messagesEl.scrollHeight; });
  }

  /* ── Input handling ── */
  function handleSend() {
    const text = inputEl?.value.trim();
    if (!text) return;
    inputEl.value = '';
    // Hide scenario chips after first message
    if (scenariosEl) scenariosEl.style.display = 'none';
    addUserMessage(text);
    processInput(text);
  }

  /* ── Intent matching ── */
  function processInput(text) {
    const lower   = text.toLowerCase();
    const content = CHATBOT_CONTENT[lang];

    showTyping();
    clearTimeout(typingTimer);

    // Realistic delay: 700–1100ms
    typingTimer = setTimeout(() => {
      hideTyping();

      let matched = null;
      for (const intent of content.intents) {
        if (intent.keys.some(k => lower.includes(k))) { matched = intent; break; }
      }

      if (matched) {
        // Emergency intents get inline SOS button
        const showSos = matched.emergency && !matched.action;
        addBotMessage(matched.response, matched.emergency || false, showSos);
        if (matched.action) {
          setTimeout(() => executeAction(matched.action), 700);
        }
      } else {
        addBotMessage(content.fallback);
      }
    }, 700 + Math.random() * 400);
  }

  /* ── Quick actions ── */
  function handleQuickAction(action) {
    const c = CHATBOT_CONTENT[lang];
    switch (action) {
      case 'sos':
        addBotMessage(c.sosConfirm, true);
        setTimeout(() => triggerSos(), 500);
        break;
      case 'tips':
        addBotMessage(c.tipsAction);
        setTimeout(() => document.getElementById('tips')?.scrollIntoView({ behavior: 'smooth' }), 400);
        break;
      case 'contacts':
        addBotMessage(c.contactsAction);
        setTimeout(() => document.getElementById('contacts')?.scrollIntoView({ behavior: 'smooth' }), 400);
        break;
      case 'fakecall':
        addBotMessage(c.fakecallAction);
        setTimeout(() => {
          const m = document.getElementById('fakeCallModal');
          if (m) new bootstrap.Modal(m).show();
        }, 400);
        break;
      case 'advice':
        addBotMessage(c.adviceResponse);
        break;
    }
  }

  /* ── Action executor ── */
  function executeAction(action) {
    switch (action) {
      case 'sos':
        addBotMessage(CHATBOT_CONTENT[lang].sosConfirm, true);
        setTimeout(() => triggerSos(), 400);
        break;
      case 'tips':
        setTimeout(() => document.getElementById('tips')?.scrollIntoView({ behavior: 'smooth' }), 400);
        break;
      case 'contacts':
        setTimeout(() => document.getElementById('contacts')?.scrollIntoView({ behavior: 'smooth' }), 400);
        break;
      case 'fakecall': {
        const m = document.getElementById('fakeCallModal');
        if (m) setTimeout(() => new bootstrap.Modal(m).show(), 400);
        break;
      }
    }
  }

  /* ── Voice input (mic button in chatbot) ── */
  function toggleVoiceInput() {
    voiceActive ? stopVoiceInput() : startVoiceInput();
  }

  function startVoiceInput() {
    const SR = getSpeechAPI();
    const voiceBtn = document.getElementById('chatbot-voice-btn');
    if (!SR) {
      addBotMessage('Voice input is not supported in this browser. Please use Chrome or Edge.');
      return;
    }
    voiceRec = new SR();
    voiceRec.continuous     = false;
    voiceRec.interimResults = false;
    voiceRec.lang           = lang === 'hi' ? 'hi-IN' : lang === 'ta' ? 'ta-IN' : 'en-US';

    voiceActive = true;
    if (voiceBtn) voiceBtn.classList.add('listening');

    voiceRec.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      if (inputEl) inputEl.value = transcript;
      stopVoiceInput();
      handleSend();
    };
    voiceRec.onerror = () => stopVoiceInput();
    voiceRec.onend   = () => stopVoiceInput();
    voiceRec.start();
  }

  function stopVoiceInput() {
    voiceActive = false;
    if (voiceRec) { try { voiceRec.stop(); } catch (_) {} voiceRec = null; }
    document.getElementById('chatbot-voice-btn')?.classList.remove('listening');
  }

  return { init };
})();

/* ── Wire up chatbot on DOM ready ── */
document.addEventListener('DOMContentLoaded', () => {
  chatbot.init();
});

