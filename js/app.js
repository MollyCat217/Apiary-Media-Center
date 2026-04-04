'use strict';

let abortController = null;

const PLATFORM_META = {
  fb_page: {
    label: 'Facebook — page post',
    badgeClass: 'badge-fb',
    instructions: `Facebook page post for a professional FQHC-focused organization page. 150-250 words. Engaging opener, key takeaways, 5-7 relevant hashtags at end (e.g. #FQHC #CommunityHealth #HealthEquity #HealthCenter #PrimaryCare). Include a clear call to action. Professional yet warm tone.`
  },
  fb_group: {
    label: 'Facebook — group post',
    badgeClass: 'badge-fb',
    instructions: `Facebook group post for an FQHC professional peer community. 100-180 words. Conversational and peer-to-peer. Open with a question or observation to spark discussion. Maximum 2-3 hashtags. End with a specific discussion question to invite engagement from health center colleagues.`
  },
  reddit: {
    label: 'Reddit — community post',
    badgeClass: 'badge-reddit',
    instructions: `Reddit post for communities like r/healthcare, r/publichealth, or r/medicine. First line must be: "Suggested subreddit: r/[name]" Second line must be: "Title: [compelling title under 200 chars]" Then a blank line, then the post body (150-250 words). No hashtags. Informative, Reddit-native tone — not promotional. Cite facts. Invite genuine discussion.`
  },
  linkedin: {
    label: 'LinkedIn — professional post',
    badgeClass: 'badge-linkedin',
    instructions: `LinkedIn post for health center executives, clinical leaders, and policymakers. 200-300 words. Professional but human. Start with a strong one-sentence hook on its own line. Use short paragraphs and line breaks for readability. End with 3-5 relevant hashtags. Mention strategic implications for health center leadership.`
  }
};

const TONE_DESCRIPTIONS = {
  informative: 'Clear, factual, and educational — share key facts and explain why it matters to FQHCs.',
  thought_leadership: 'Authoritative and insightful — offer strategic perspective on what this means for community health centers.',
  urgent: 'Action-oriented and advocacy-focused — highlight urgency and call FQHCs to pay attention or act.',
  community: 'Warm, conversational, and community-oriented — invite discussion and peer engagement from FQHC professionals.'
};

const SYSTEM_PROMPT = `You are an expert social media strategist specializing in healthcare communications for Federally Qualified Health Centers (FQHCs) and community health centers. You have deep knowledge of the FQHC ecosystem: HRSA funding, NACHC, state PCAs, 340B Drug Pricing Program, UDS reporting, PCMH, value-based care, Medicaid, and the communities these centers serve.

Your job is to transform news, publications, and policy updates into compelling, platform-appropriate social media content that resonates with FQHC executives, clinical leaders, policy staff, board members, and community health advocates. Always lead with what matters most to the reader. Vary sentence structure. Avoid filler phrases like "In today's landscape" or "It's more important than ever."`;

const Storage = {
  get: (key, fallback = null) => {
    try { const v = localStorage.getItem(key); return v !== null ? JSON.parse(v) : fallback; }
    catch { return fallback; }
  },
  set: (key, value) => {
    try { localStorage.setItem(key, JSON.stringify(value)); return true; }
    catch { return false; }
  }
};

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function resetButtons() {
  const btn = document.getElementById('genBtn');
  const stopBtn = document.getElementById('stopBtn');
  if (btn) {
    btn.disabled = false;
    btn.innerHTML = 'Generate posts <svg width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M13 7l5 5m0 0l-5 5m5-5H6"/></svg>';
  }
  if (stopBtn) stopBtn.style.display = 'none';
  abortController = null;
}

function stopGeneration() {
  if (abortController) abortController.abort();
  resetButtons();
  const container = document.getElementById('postsContainer');
  if (container) {
    const note = document.createElement('div');
    note.className = 'stop-note';
    note.textContent = 'Generation was stopped. Any posts already created above have been saved. Paste your content and click Generate to try again.';
    container.appendChild(note);
  }
}

function appendPost(item, container) {
  const meta = PLATFORM_META[item.platform] || { label: item.platform, badgeClass: '' };
  const card = document.createElement('div');
  card.className = 'post-card';
  card.innerHTML = `
    <div class="post-header">
      <span class="platform-badge ${meta.badgeClass}">${meta.label}</span>
      <div class="post-actions">
        <button class="action-btn" onclick="copyPost(this, ${JSON.stringify(item.post)})">Copy</button>
      </div>
    </div>
    <div class="post-body">${escapeHtml(item.post)}</div>
    <div class="char-count">${item.post.length} characters</div>
  `;
  container.appendChild(card);
}

function copyPost(btn, text) {
  navigator.clipboard.writeText(text).then(() => {
    btn.textContent = 'Copied!';
    btn.classList.add('copied');
    setTimeout(() => { btn.textContent = 'Copy'; btn.classList.remove('copied'); }, 2000);
  }).catch(() => {
    btn.textContent = 'Failed';
    setTimeout(() => { btn.textContent = 'Copy'; }, 2000);
  });
}

function showError(msg) {
  const container = document.getElementById('postsContainer');
  document.getElementById('emptyState').style.display = 'none';
  container.innerHTML = '<div class="error-msg">' + msg + '</div>';
}

function renderSummary(summary, container) {
  const card = document.createElement('div');
  card.className = 'summary-card';
  card.innerHTML = `
    <div class="summary-header">
      <div class="summary-title-row">
        <span class="summary-label">Article intelligence brief</span>
        <button class="action-btn" onclick="copySummary(this)">Copy brief</button>
      </div>
    </div>
    <div class="summary-section">
      <div class="summary-section-label">TL;DR</div>
      <div class="summary-tldr">${escapeHtml(summary.tldr)}</div>
    </div>
    <div class="summary-section">
      <div class="summary-section-label">Key facts</div>
      <ul class="summary-facts">
        ${(summary.facts || []).map(f => `<li>${escapeHtml(f)}</li>`).join('')}
      </ul>
    </div>
    <div class="summary-section">
      <div class="summary-section-label">Why it matters to FQHCs</div>
      <div class="summary-why">${escapeHtml(summary.why)}</div>
    </div>
    <div class="summary-section">
      <div class="summary-section-label">Suggested hashtags</div>
      <div class="summary-hashtags">
        ${(summary.hashtags || []).map(h => `<span class="hashtag-chip">${escapeHtml(h)}</span>`).join('')}
      </div>
    </div>
  `;

  card.dataset.summaryText = [
    'ARTICLE INTELLIGENCE BRIEF',
    '',
    'TL;DR',
    summary.tldr,
    '',
    'KEY FACTS',
    (summary.facts || []).map(f => '• ' + f).join('\n'),
    '',
    'WHY IT MATTERS TO FQHCs',
    summary.why,
    '',
    'SUGGESTED HASHTAGS',
    (summary.hashtags || []).join(' ')
  ].join('\n');

  container.appendChild(card);

  const divider = document.createElement('div');
  divider.className = 'summary-divider';
  divider.textContent = 'Generated posts';
  container.appendChild(divider);
}

function copySummary(btn) {
  const card = btn.closest('.summary-card');
  const text = card.dataset.summaryText || '';
  navigator.clipboard.writeText(text).then(() => {
    btn.textContent = 'Copied!';
    btn.classList.add('copied');
    setTimeout(() => { btn.textContent = 'Copy brief'; btn.classList.remove('copied'); }, 2000);
  });
}

async function generateSummary(content, source, apiKey) {
  const summaryPrompt = `Analyze this FQHC-related article or alert and return a structured intelligence brief.

CONTENT:
${content}
${source ? '\nSOURCE: ' + source : ''}

Respond with ONLY a valid JSON object — no markdown, no explanation, no code fences:
{
  "tldr": "1-2 sentence plain-language summary of what happened and why it matters",
  "facts": ["key fact 1", "key fact 2", "key fact 3", "key fact 4"],
  "why": "2-3 sentences explaining the specific implications for Federally Qualified Health Centers — operations, funding, policy, patients, or workforce",
  "hashtags": ["#FQHC", "#CommunityHealth", "3 to 5 more relevant specific hashtags"]
}`;

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true'
    },
    signal: abortController ? abortController.signal : undefined,
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1000,
      messages: [{ role: 'user', content: summaryPrompt }]
    })
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error?.message || 'API error ' + response.status);
  }

  const data = await response.json();
  const raw = (data.content || []).map(b => b.text || '').join('').trim();
  const clean = raw.replace(/```json|```/g, '').trim();
  return JSON.parse(clean);
}

async function saveToGoogleSheet(batch) {
  const scriptUrl = Storage.get('scriptUrl', '');
  if (!scriptUrl) return;
  try {
    await fetch(scriptUrl, {
      method: 'POST',
      mode: 'no-cors',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(batch)
    });
  } catch (err) {
    console.warn('Could not save to Google Sheet:', err.message);
  }
}

async function loadFromGoogleSheet() {
  const scriptUrl = Storage.get('scriptUrl', '');
  if (!scriptUrl) return null;
  try {
    const response = await fetch(scriptUrl + '?action=get');
    const data = await response.json();
    if (data.success) return data.batches;
    return null;
  } catch (err) {
    console.warn('Could not load from Google Sheet:', err.message);
    return null;
  }
}

async function generatePosts() {
  const apiKey = Storage.get('apiKey', '');
  if (!apiKey) { showError('Please add your Anthropic API key in Settings first.'); return; }

  const content = document.getElementById('alertContent').value.trim();
  const source = document.getElementById('sourceOrg').value.trim();
  const url = document.getElementById('articleUrl').value.trim();
  if (!content) { showError('Please paste your alert content before generating.'); return; }

  const platforms = Array.from(
    document.querySelectorAll('.plat-toggle input:checked')
  ).map(cb => cb.value);
  if (!platforms.length) { showError('Please select at least one platform.'); return; }

  const tone = document.getElementById('toneSelect').value;
  const orgName = 'Afya';

  const hooks = Storage.get('messagingHooks', []);
  const selectedHookId = parseInt(document.getElementById('hookSelect')?.value);
  const activeHook = hooks.find(h => h.id === selectedHookId) || null;

  abortController = new AbortController();
  const btn = document.getElementById('genBtn');
  const stopBtn = document.getElementById('stopBtn');
  btn.disabled = true;
  btn.innerHTML = '<span>Generating...</span>';
  if (stopBtn) stopBtn.style.display = 'inline-flex';

  const container = document.getElementById('postsContainer');
  document.getElementById('emptyState').style.display = 'none';
  container.innerHTML = '';

  const timestamp = new Date().toISOString();
  const posts = [];

  // Step 1: Generate summary
  const summaryLoading = document.createElement('div');
  summaryLoading.className = 'loading-msg';
  summaryLoading.textContent = 'Analyzing article...';
  container.appendChild(summaryLoading);

  let summary = null;
  try {
    summary = await generateSummary(content, source, apiKey);
    summaryLoading.remove();
    renderSummary(summary, container);
  } catch (err) {
    summaryLoading.remove();
    if (err.name === 'AbortError') {
      const note = document.createElement('div');
      note.className = 'stop-note';
      note.textContent = 'Generation was stopped. No posts were created. Paste your content and click Generate to try again.';
      container.appendChild(note);
      resetButtons();
      return;
    }
    const errDiv = document.createElement('div');
    errDiv.className = 'error-msg';
    errDiv.textContent = 'Could not generate summary: ' + err.message;
    container.appendChild(errDiv);
  }

  // Step 2: Generate platform posts
  for (const platform of platforms) {
    if (!abortController) break;

    const meta = PLATFORM_META[platform];
    const loadingDiv = document.createElement('div');
    loadingDiv.className = 'loading-msg';
    loadingDiv.id = 'loading-' + platform;
    loadingDiv.textContent = 'Generating ' + meta.label + '...';
    container.appendChild(loadingDiv);

    const userPrompt = `Generate a single social media post based on this FQHC-related alert:

CONTENT:
${content}
${source ? '\nSOURCE: ' + source : ''}
${url ? '\nURL: ' + url : ''}
POSTING ON BEHALF OF: ${orgName}

TONE: ${TONE_DESCRIPTIONS[tone]}
${activeHook ? '\nMESSAGING HOOK — weave this angle into the post: ' + activeHook.text : ''}

PLATFORM INSTRUCTIONS:
${meta.instructions}

Respond with ONLY a valid JSON object — no markdown, no explanation, no code fences:
{"platform": "${platform}", "post": "your post text here"}

Use \\n for line breaks inside the post text.`;

    try {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
          'anthropic-dangerous-direct-browser-access': 'true'
        },
        signal: abortController ? abortController.signal : undefined,
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 2000,
          system: SYSTEM_PROMPT,
          messages: [{ role: 'user', content: userPrompt }]
        })
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.error?.message || 'API error ' + response.status);
      }

      const data = await response.json();
      const raw = (data.content || []).map(b => b.text || '').join('').trim();
      const clean = raw.replace(/```json|```/g, '').trim();
      const item = JSON.parse(clean);
      posts.push(item);

      const loadingEl = document.getElementById('loading-' + platform);
      if (loadingEl) loadingEl.remove();
      appendPost(item, container);

    } catch (err) {
      const loadingEl = document.getElementById('loading-' + platform);
      if (loadingEl) loadingEl.remove();
      if (err.name === 'AbortError') {
        const note = document.createElement('div');
        note.className = 'stop-note';
        note.textContent = 'Generation was stopped. Any posts already created above have been saved.';
        container.appendChild(note);
        break;
      }
      const errDiv = document.createElement('div');
      errDiv.className = 'error-msg';
      errDiv.textContent = 'Error generating ' + meta.label + ': ' + err.message;
      container.appendChild(errDiv);
    }
  }

  if (posts.length) {
    const batch = {
      timestamp,
      source: source || '',
      url: url || '',
      content,
      hook: activeHook ? activeHook.name : '',
      summary: summary || null,
      platforms,
      posts
    };
    await saveToGoogleSheet(batch);
    const history = Storage.get('postHistory', []);
    history.unshift(batch);
    Storage.set('postHistory', history.slice(0, 50));

    const saveStatus = document.createElement('div');
    saveStatus.className = 'save-status';
    saveStatus.textContent = Storage.get('scriptUrl', '')
      ? 'Saved to Google Sheet'
      : 'Saved to browser history';
    container.insertBefore(saveStatus, container.firstChild);
    setTimeout(() => saveStatus.remove(), 3000);
  }

  resetButtons();
}

async function renderHistory() {
  const list = document.getElementById('historyList');
  const empty = document.getElementById('historyEmpty');
  const loading = document.getElementById('historyLoading');

  if (loading) loading.style.display = 'block';
  if (list) list.innerHTML = '';

  let batches = null;
  const scriptUrl = Storage.get('scriptUrl', '');
  if (scriptUrl) batches = await loadFromGoogleSheet();
  if (!batches) batches = Storage.get('postHistory', []);

  if (loading) loading.style.display = 'none';

  if (!batches || !batches.length) {
    if (empty) empty.style.display = 'flex';
    return;
  }
  if (empty) empty.style.display = 'none';

  list.innerHTML = batches.map(function(batch) {
    const date = new Date(batch.timestamp).toLocaleDateString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
    const platforms = batch.platforms || [...new Set((batch.posts || []).map(p => p.platform))];
    const platformBadges = platforms
      .map(p => '<span class="hist-badge">' + (PLATFORM_META[p] ? PLATFORM_META[p].label : p) + '</span>')
      .join('');
    const hookBadge = batch.hook
      ? '<span class="hist-badge" style="background:var(--green-50);color:var(--green-800);">Hook: ' + escapeHtml(batch.hook) + '</span>'
      : '';
    const summaryHtml = batch.summary ? `
      <div class="hist-summary">
        <div class="hist-summary-label">TL;DR</div>
        <div class="hist-summary-tldr">${escapeHtml(batch.summary.tldr || '')}</div>
        <div class="hist-summary-why">${escapeHtml(batch.summary.why || '')}</div>
      </div>` : '';
    const postsHtml = (batch.posts || []).map(function(item) {
      const meta = PLATFORM_META[item.platform] || { label: item.platform, badgeClass: '' };
      return '<div class="post-card" style="margin-bottom:10px;">' +
        '<div class="post-header">' +
        '<span class="platform-badge ' + meta.badgeClass + '">' + meta.label + '</span>' +
        '<button class="action-btn" onclick="copyPost(this, ' + JSON.stringify(item.post) + ')">Copy</button>' +
        '</div>' +
        '<div class="post-body">' + escapeHtml(item.post) + '</div>' +
        '</div>';
    }).join('');
    const snippet = batch.contentSnippet || (batch.content ? batch.content.slice(0, 120) : '');
    return '<div class="history-card">' +
      '<div class="history-meta">' +
      '<div class="history-title">' + escapeHtml(batch.source || 'Untitled') + (snippet ? ' — ' + escapeHtml(snippet) + '...' : '') + '</div>' +
      '<div class="history-date">' + date + '</div>' +
      '</div>' +
      (batch.url ? '<div class="history-url"><a href="' + escapeHtml(batch.url) + '" target="_blank">' + escapeHtml(batch.url) + '</a></div>' : '') +
      '<div class="history-platforms">' + platformBadges + hookBadge + '</div>' +
      summaryHtml +
      '<button class="history-expand-btn" onclick="this.nextElementSibling.classList.toggle(\'open\'); this.textContent = this.nextElementSibling.classList.contains(\'open\') ? \'Hide posts\' : \'View posts\'">View posts</button>' +
      '<div class="history-posts">' + postsHtml + '</div>' +
      '</div>';
  }).join('');
}

function saveHook() {
  const name = document.getElementById('hookName').value.trim();
  const text = document.getElementById('hookText').value.trim();
  if (!name || !text) {
    document.getElementById('hookStatus').innerHTML = '<span class="status-err">Please fill in both fields.</span>';
    return;
  }
  const hooks = Storage.get('messagingHooks', []);
  hooks.push({ id: Date.now(), name, text });
  Storage.set('messagingHooks', hooks);
  document.getElementById('hookName').value = '';
  document.getElementById('hookText').value = '';
  document.getElementById('hookStatus').innerHTML = '<span class="status-ok">Hook saved!</span>';
  setTimeout(() => { const el = document.getElementById('hookStatus'); if (el) el.innerHTML = ''; }, 2000);
  renderHooks();
  populateHookDropdown();
}

function deleteHook(id) {
  const hooks = Storage.get('messagingHooks', []).filter(h => h.id !== id);
  Storage.set('messagingHooks', hooks);
  renderHooks();
  populateHookDropdown();
}

function renderHooks() {
  const hooks = Storage.get('messagingHooks', []);
  const list = document.getElementById('hooksList');
  const empty = document.getElementById('hooksEmpty');
  if (!list) return;
  if (!hooks.length) {
    list.innerHTML = '';
    if (empty) empty.style.display = 'flex';
    return;
  }
  if (empty) empty.style.display = 'none';
  list.innerHTML = hooks.map(hook => `
    <div class="hook-card">
      <div class="hook-card-top">
        <div class="hook-name">${escapeHtml(hook.name)}</div>
        <button class="delete-btn" onclick="deleteHook(${hook.id})">Remove</button>
      </div>
      <div class="hook-text">${escapeHtml(hook.text)}</div>
    </div>
  `).join('');
}

function populateHookDropdown() {
  const select = document.getElementById('hookSelect');
  if (!select) return;
  const hooks = Storage.get('messagingHooks', []);
  const current = select.value;
  select.innerHTML = '<option value="">No hook — use tone only</option>';
  hooks.forEach(hook => {
    const opt = document.createElement('option');
    opt.value = hook.id;
    opt.textContent = hook.name;
    select.appendChild(opt);
  });
  select.value = current;
}

function saveApiKey() {
  const key = document.getElementById('apiKeyInput').value.trim();
  if (!key.startsWith('sk-ant-')) {
    document.getElementById('apiKeyStatus').innerHTML = '<span class="status-err">Invalid key — should start with sk-ant-</span>';
    return;
  }
  Storage.set('apiKey', key);
  document.getElementById('apiKeyStatus').innerHTML = '<span class="status-ok">API key saved.</span>';
}

function saveScriptUrl() {
  const url = document.getElementById('scriptUrlInput').value.trim();
  if (!url.includes('script.google.com')) {
    document.getElementById('scriptUrlStatus').innerHTML = '<span class="status-err">That doesn\'t look like a Google Apps Script URL.</span>';
    return;
  }
  Storage.set('scriptUrl', url);
  document.getElementById('scriptUrlStatus').innerHTML = '<span class="status-ok">Google Sheet connected!</span>';
}

function saveDefaults() {
  const tone = document.getElementById('defaultTone').value;
  Storage.set('userDefaults', { tone });
  const composeTone = document.getElementById('toneSelect');
  if (composeTone && tone) composeTone.value = tone;
  document.getElementById('prefsStatus').innerHTML = '<span class="status-ok">Preferences saved.</span>';
  setTimeout(() => { const el = document.getElementById('prefsStatus'); if (el) el.innerHTML = ''; }, 3000);
}

function loadSettings() {
  const apiKey = Storage.get('apiKey', '');
  const input = document.getElementById('apiKeyInput');
  if (input && apiKey) input.value = apiKey;

  const scriptUrl = Storage.get('scriptUrl', '');
  const scriptInput = document.getElementById('scriptUrlInput');
  if (scriptInput && scriptUrl) scriptInput.value = scriptUrl;

  const defaults = Storage.get('userDefaults', {});
  const toneEl = document.getElementById('defaultTone');
  if (toneEl && defaults.tone) toneEl.value = defaults.tone;

  const apiEl = document.getElementById('apiKeyStatus');
  if (apiEl) {
    apiEl.innerHTML = apiKey
      ? '<span class="status-ok">API key is set.</span>'
      : '<span class="status-err">No API key set.</span>';
  }

  const sheetEl = document.getElementById('scriptUrlStatus');
  if (sheetEl) {
    sheetEl.innerHTML = scriptUrl
      ? '<span class="status-ok">Google Sheet connected.</span>'
      : '<span class="status-err">No Google Sheet connected yet.</span>';
  }
}

function initNav() {
  document.querySelectorAll('.nav-item').forEach(btn => {
    btn.addEventListener('click', () => {
      const view = btn.dataset.view;
      document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      document.querySelectorAll('.view').forEach(v => v.classList.add('hidden'));
      document.getElementById('view-' + view).classList.remove('hidden');
      if (view === 'history') renderHistory();
      if (view === 'settings') loadSettings();
      if (view === 'hooks') renderHooks();
    });
  });
}

function init() {
  initNav();
  const defaults = Storage.get('userDefaults', {});
  if (defaults.tone) {
    const el = document.getElementById('toneSelect');
    if (el) el.value = defaults.tone;
  }
  populateHookDropdown();
}

window.generatePosts = generatePosts;
window.copyPost = copyPost;
window.copySummary = copySummary;
window.stopGeneration = stopGeneration;
window.saveApiKey = saveApiKey;
window.saveScriptUrl = saveScriptUrl;
window.saveDefaults = saveDefaults;
window.saveHook = saveHook;
window.deleteHook = deleteHook;

document.addEventListener('DOMContentLoaded', init);
