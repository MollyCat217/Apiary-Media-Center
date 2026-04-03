'use strict';

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
  const orgName = document.getElementById('orgName').value.trim();
  const btn = document.getElementById('genBtn');
  btn.disabled = true;
  btn.innerHTML = '<span>Generating...</span>';

  const container = document.getElementById('postsContainer');
  document.getElementById('emptyState').style.display = 'none';
  container.innerHTML = '';

  const posts = [];

  for (const platform of platforms) {
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
${orgName ? '\nPOSTING ON BEHALF OF: ' + orgName : ''}

TONE: ${TONE_DESCRIPTIONS[tone]}

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
      const errDiv = document.createElement('div');
      errDiv.className = 'error-msg';
      errDiv.textContent = 'Error generating ' + meta.label + ': ' + err.message;
      container.appendChild(errDiv);
    }
  }

  if (posts.length) {
    const history = Storage.get('postHistory', []);
    history.unshift({
      id: Date.now(),
      timestamp: new Date().toISOString(),
      source: source || 'Unknown source',
      contentSnippet: content.slice(0, 120),
      platforms: platforms,
      posts: posts
    });
    Storage.set('postHistory', history.slice(0, 50));
  }

  btn.disabled = false;
  btn.innerHTML = 'Generate posts <svg width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M13 7l5 5m0 0l-5 5m5-5H6"/></svg>';
}

function renderHistory() {
  const history = Storage.get('postHistory', []);
  const list = document.getElementById('historyList');
  const empty = document.getElementById('historyEmpty');

  if (!history.length) {
    list.innerHTML = '';
    empty.style.display = 'flex';
    return;
  }
  empty.style.display = 'none';

  list.innerHTML = history.map(function(batch) {
    const date = new Date(batch.timestamp).toLocaleDateString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit'
    });
    const platformBadges = (batch.platforms || [])
      .map(p => '<span class="hist-badge">' + (PLATFORM_META[p] ? PLATFORM_META[p].label : p) + '</span>')
      .join('');
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

    return '<div class="history-card">' +
      '<div class="history-meta">' +
      '<div class="history-title">' + escapeHtml(batch.source || 'Untitled') + ' — ' + escapeHtml(batch.contentSnippet || '') + '...</div>' +
      '<div class="history-date">' + date + '</div>' +
      '</div>' +
      '<div class="history-platforms">' + platformBadges + '</div>' +
      '<button class="history-expand-btn" onclick="this.nextElementSibling.classList.toggle(\'open\'); this.textContent = this.nextElementSibling.classList.contains(\'open\') ? \'Hide posts\' : \'View posts\'">View posts</button>' +
      '<div class="history-posts">' + postsHtml + '</div>' +
      '</div>';
  }).join('');
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

function saveDefaults() {
  const orgName = document.getElementById('defaultOrgName').value.trim();
  const tone = document.getElementById('defaultTone').value;
  Storage.set('userDefaults', { orgName, tone });
  const composeOrg = document.getElementById('orgName');
  const composeTone = document.getElementById('toneSelect');
  if (composeOrg && orgName) composeOrg.value = orgName;
  if (composeTone && tone) composeTone.value = tone;
  document.getElementById('prefsStatus').innerHTML = '<span class="status-ok">Preferences saved.</span>';
  setTimeout(() => {
    const el = document.getElementById('prefsStatus');
    if (el) el.innerHTML = '';
  }, 3000);
}

function loadSettings() {
  const apiKey = Storage.get('apiKey', '');
  const input = document.getElementById('apiKeyInput');
  if (input && apiKey) input.value = apiKey;
  const defaults = Storage.get('userDefaults', {});
  const orgEl = document.getElementById('defaultOrgName');
  const toneEl = document.getElementById('defaultTone');
  if (orgEl && defaults.orgName) orgEl.value = defaults.orgName;
  if (toneEl && defaults.tone) toneEl.value = defaults.tone;
  const el = document.getElementById('apiKeyStatus');
  if (el) {
    el.innerHTML = apiKey
      ? '<span class="status-ok">API key is set.</span>'
      : '<span class="status-err">No API key set.</span>';
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
    });
  });
}

function init() {
  initNav();
  const defaults = Storage.get('userDefaults', {});
  if (defaults.orgName) {
    const el = document.getElementById('orgName');
    if (el) el.value = defaults.orgName;
  }
  if (defaults.tone) {
    const el = document.getElementById('toneSelect');
    if (el) el.value = defaults.tone;
  }
}

window.generatePosts = generatePosts;
window.copyPost = copyPost;
window.saveApiKey = saveApiKey;
window.saveDefaults = saveDefaults;
window.studio = { generatePosts, saveApiKey, saveDefaults };

document.addEventListener('DOMContentLoaded', init);
