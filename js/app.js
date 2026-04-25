
'use strict';

let abortController = null;

const PERSONAS = {
  fqhc: {
    label: 'FQHCs',
    fullLabel: 'Federally Qualified Health Centers',
    sheetTab: 'Sheet1',
    hooksTab: 'Hooks',
    color: '#4BAAA5',
    systemPrompt: `You are an expert social media strategist specializing in healthcare communications for Federally Qualified Health Centers (FQHCs) and community health centers. You have deep knowledge of the FQHC ecosystem: HRSA funding, NACHC, state PCAs, 340B Drug Pricing Program, UDS reporting, PCMH, value-based care, Medicaid, and the communities these centers serve. Your content resonates with FQHC executives, clinical leaders, policy staff, board members, and community health advocates. Always lead with what matters most to the reader. Vary sentence structure. Avoid filler phrases like "In today's landscape" or "It's more important than ever."`
  },
  rhc: {
    label: 'RHCs',
    fullLabel: 'Rural Health Clinics',
    sheetTab: 'RHC_Posts',
    hooksTab: 'RHC_Hooks',
    color: '#529EB5',
    systemPrompt: `You are an expert social media strategist specializing in healthcare communications for Rural Health Clinics (RHCs). You have deep knowledge of the RHC ecosystem: CMS cost-based reimbursement, rural health policy, Critical Access Hospital proximity rules, HRSA rural health grants, State Offices of Rural Health, Medicare and Medicaid rural provisions, workforce shortages in rural areas, and the unique challenges of delivering care in frontier and rural communities. Your content resonates with RHC administrators, rural physicians, clinic managers, and rural health advocates. Always lead with what matters most to rural healthcare providers. Avoid generic healthcare language — speak specifically to rural context.`
  },
  cmhc: {
    label: 'CMHCs',
    fullLabel: 'Community Mental Health Centers',
    sheetTab: 'CMHC_Posts',
    hooksTab: 'CMHC_Hooks',
    color: '#7AD0C7',
    systemPrompt: `You are an expert social media strategist specializing in healthcare communications for Community Mental Health Centers (CMHCs) and behavioral health organizations. You have deep knowledge of the behavioral health ecosystem: CCBHC model, mental health parity laws, SAMHSA funding, crisis services, co-occurring disorders, integrated care models, Medicaid behavioral health carve-outs, psychiatric workforce shortages, and stigma reduction. Your content resonates with CMHC executives, clinicians, case managers, peer support specialists, and behavioral health advocates. Lead with the human impact. Use plain language that reduces stigma. Avoid clinical jargon unless speaking to clinical audiences.`
  },
  navigator: {
    label: 'Navigators',
    fullLabel: 'Family Health Navigators',
    sheetTab: 'Navigator_Posts',
    hooksTab: 'Navigator_Hooks',
    color: '#A9EACF',
    systemPrompt: `You are an expert social media strategist specializing in communications for Family Health Navigators and community health workers. You understand the navigator role deeply: helping families understand insurance options, connecting patients to community resources, breaking down healthcare barriers, supporting chronic disease management, and advocating for underserved populations. Your content empowers navigators with practical tools, celebrates their impact, and helps them communicate their value to funders, employers, and communities. Use warm, accessible language. Celebrate community. Avoid bureaucratic or clinical tone. Make navigators feel seen and supported.`
  }
};

let activePersona = 'fqhc';

function getPersona() {
  return PERSONAS[activePersona];
}

const PLATFORM_META = {
  fb_page: {
    label: 'Facebook — page post',
    badgeClass: 'badge-fb',
    instructions: `Facebook page post for a professional organization page. 150-250 words. Engaging opener, key takeaways, 5-7 relevant hashtags at end. Include a clear call to action. Professional yet warm tone.`
  },
  fb_group: {
    label: 'Facebook — group post',
    badgeClass: 'badge-fb',
    instructions: `Facebook group post for a professional peer community. 100-180 words. Conversational and peer-to-peer. Open with a question or observation to spark discussion. Maximum 2-3 hashtags. End with a specific discussion question.`
  },
  reddit: {
    label: 'Reddit — community post',
    badgeClass: 'badge-reddit',
    instructions: `Reddit post for relevant communities. First line must be: "Suggested subreddit: r/[name]" Second line must be: "Title: [compelling title under 200 chars]" Then a blank line, then the post body (150-250 words). No hashtags. Informative, Reddit-native tone — not promotional. Cite facts. Invite genuine discussion.`
  },
  linkedin: {
    label: 'LinkedIn — professional post',
    badgeClass: 'badge-linkedin',
    instructions: `LinkedIn post for healthcare professionals and leaders. 200-300 words. Professional but human. Start with a strong one-sentence hook on its own line. Use short paragraphs and line breaks for readability. End with 3-5 relevant hashtags. Mention strategic implications for organizational leaders.`
  }
};

const TONE_DESCRIPTIONS = {
  informative: 'Clear, factual, and educational — share key facts and explain why it matters.',
  thought_leadership: 'Authoritative and insightful — offer strategic perspective on what this means for the sector.',
  urgent: 'Action-oriented and advocacy-focused — highlight urgency and call the audience to pay attention or act.',
  community: 'Warm, conversational, and community-oriented — invite discussion and peer engagement.'
};

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

function proxyUrl(url) {
  return 'https://corsproxy.io/?' + encodeURIComponent(url);
}

function hooksStorageKey() {
  return 'messagingHooks_' + activePersona;
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

function switchPersona(personaKey) {
  if (!PERSONAS[personaKey]) return;
  activePersona = personaKey;
  Storage.set('activePersona', personaKey);

  document.querySelectorAll('.persona-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.persona === personaKey);
  });

  const persona = getPersona();
  const label = document.getElementById('personaLabel');
  const sublabel = document.getElementById('personaSublabel');
  if (label) label.textContent = 'New post batch';
  if (sublabel) sublabel.textContent = 'Generating for: ' + persona.fullLabel;

  const dot = document.getElementById('activePersonaDot');
  if (dot) dot.style.background = persona.color;

  document.getElementById('postsContainer').innerHTML = '';
  document.getElementById('emptyState').style.display = 'flex';

  renderHooks();
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
        ${(summary.facts || []).map(f => '<li>' + escapeHtml(f) + '</li>').join('')}
      </ul>
    </div>
    <div class="summary-section">
      <div class="summary-section-label">Why it matters</div>
      <div class="summary-why">${escapeHtml(summary.why)}</div>
    </div>
    <div class="summary-section">
      <div class="summary-section-label">Suggested hashtags</div>
      <div class="summary-hashtags">
        ${(summary.hashtags || []).map(h => '<span class="hashtag-chip">' + escapeHtml(h) + '</span>').join('')}
      </div>
    </div>
  `;
  card.dataset.summaryText = [
    'ARTICLE INTELLIGENCE BRIEF', '',
    'TL;DR', summary.tldr, '',
    'KEY FACTS', (summary.facts || []).map(f => '• ' + f).join('\n'), '',
    'WHY IT MATTERS', summary.why, '',
    'SUGGESTED HASHTAGS', (summary.hashtags || []).join(' ')
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
  const persona = getPersona();
  const summaryPrompt = `Analyze this article or alert and return a structured intelligence brief tailored for ${persona.fullLabel}.

CONTENT:
${content}
${source ? '\nSOURCE: ' + source : ''}

Respond with ONLY a valid JSON object — no markdown, no explanation, no code fences:
{
  "tldr": "1-2 sentence plain-language summary of what happened and why it matters",
  "facts": ["key fact 1", "key fact 2", "key fact 3", "key fact 4"],
  "why": "2-3 sentences explaining the specific implications for ${persona.fullLabel} — operations, funding, policy, patients, or workforce",
  "hashtags": ["3 to 7 relevant specific hashtags for ${persona.fullLabel}"]
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
      body: JSON.stringify({ ...batch, persona: activePersona, personaLabel: getPersona().fullLabel, sheetTab: getPersona().sheetTab })
    });
  } catch (err) {
    console.warn('Could not save to Google Sheet:', err.message);
  }
}

async function loadFromGoogleSheet() {
  const scriptUrl = Storage.get('scriptUrl', '');
  if (!scriptUrl) return null;
  try {
    const response = await fetch(proxyUrl(scriptUrl + '?action=get&persona=' + activePersona));
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
  const hooks = Storage.get(hooksStorageKey(), []);
  const selectedHookId = parseInt(document.getElementById('hookSelect')?.value);
  const activeHook = hooks.find(h => h.id === selectedHookId) || null;
  const persona = getPersona();

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
      note.textContent = 'Generation was stopped. No posts were created.';
      container.appendChild(note);
      resetButtons();
      return;
    }
    const errDiv = document.createElement('div');
    errDiv.className = 'error-msg';
    errDiv.textContent = 'Could not generate summary: ' + err.message;
    container.appendChild(errDiv);
  }

  for (const platform of platforms) {
    if (!abortController) break;
    const meta = PLATFORM_META[platform];
    const loadingDiv = document.createElement('div');
    loadingDiv.className = 'loading-msg';
    loadingDiv.id = 'loading-' + platform;
    loadingDiv.textContent = 'Generating ' + meta.label + '...';
    container.appendChild(loadingDiv);

    const userPrompt = `Generate a single social media post based on this article or alert, targeted specifically at ${persona.fullLabel}:

CONTENT:
${content}
${source ? '\nSOURCE: ' + source : ''}
${url ? '\nURL: ' + url : ''}
POSTING ON BEHALF OF: ${orgName}

AUDIENCE: ${persona.fullLabel}
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
          system: persona.systemPrompt,
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
      timestamp, source: source || '', url: url || '', content,
      hook: activeHook ? activeHook.name : '',
      summary: summary || null, platforms, posts
    };
    await saveToGoogleSheet(batch);
    const historyKey = 'postHistory_' + activePersona;
    const history = Storage.get(historyKey, []);
    history.unshift(batch);
    Storage.set(historyKey, history.slice(0, 50));
    const saveStatus = document.createElement('div');
    saveStatus.className = 'save-status';
    saveStatus.textContent = Storage.get('scriptUrl', '') ? 'Saved to Google Sheet' : 'Saved to browser history';
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
  if (!batches) batches = Storage.get('postHistory_' + activePersona, []);
  if (loading) loading.style.display = 'none';
  if (!batches || !batches.length) {
    if (empty) empty.style.display = 'flex';
    return;
  }
  if (empty) empty.style.display = 'none';
  list.innerHTML = batches.map(function(batch) {
    const date = new Date(batch.timestamp).toLocaleDateString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit'
    });
    const platforms = batch.platforms || [];
    const platformBadges = platforms
      .map(p => '<span class="hist-badge">' + (PLATFORM_META[p] ? PLATFORM_META[p].label : p) + '</span>')
      .join('');
    const hookBadge = batch.hook
      ? '<span class="hist-badge" style="background:var(--green-50);color:var(--green-800);">Hook: ' + escapeHtml(batch.hook) + '</span>'
      : '';
    const summaryHtml = batch.summary
      ? '<div class="hist-summary"><div class="hist-summary-label">TL;DR</div><div class="hist-summary-tldr">' + escapeHtml(batch.summary.tldr || '') + '</div><div class="hist-summary-why">' + escapeHtml(batch.summary.why || '') + '</div></div>'
      : '';
    const postsHtml = (batch.posts || []).map(function(item) {
      const meta = PLATFORM_META[item.platform] || { label: item.platform, badgeClass: '' };
      return '<div class="post-card" style="margin-bottom:10px;">' +
        '<div class="post-header"><span class="platform-badge ' + meta.badgeClass + '">' + meta.label + '</span>' +
        '<button class="action-btn" onclick="copyPost(this, ' + JSON.stringify(item.post) + ')">Copy</button></div>' +
        '<div class="post-body">' + escapeHtml(item.post) + '</div></div>';
    }).join('');
    const snippet = batch.contentSnippet || (batch.content ? batch.content.slice(0, 120) : '');
    return '<div class="history-card">' +
      '<div class="history-meta"><div class="history-title">' + escapeHtml(batch.source || 'Untitled') + (snippet ? ' — ' + escapeHtml(snippet) + '...' : '') + '</div>' +
      '<div class="history-date">' + date + '</div></div>' +
      (batch.url ? '<div class="history-url"><a href="' + escapeHtml(batch.url) + '" target="_blank">' + escapeHtml(batch.url) + '</a></div>' : '') +
      '<div class="history-platforms">' + platformBadges + hookBadge + '</div>' +
      summaryHtml +
      '<button class="history-expand-btn" onclick="this.nextElementSibling.classList.toggle(\'open\'); this.textContent = this.nextElementSibling.classList.contains(\'open\') ? \'Hide posts\' : \'View posts\'">View posts</button>' +
      '<div class="history-posts">' + postsHtml + '</div></div>';
  }).join('');
}

async function saveHook() {
  const name = document.getElementById('hookName').value.trim();
  const text = document.getElementById('hookText').value.trim();
  if (!name || !text) {
    document.getElementById('hookStatus').innerHTML = '<span class="status-err">Please fill in both fields.</span>';
    return;
  }
  const hook = { id: Date.now(), name, text, persona: activePersona };
  const hooks = Storage.get(hooksStorageKey(), []);
  hooks.push(hook);
  Storage.set(hooksStorageKey(), hooks);

  const scriptUrl = Storage.get('scriptUrl', '');
  if (scriptUrl) {
    try {
      const params = new URLSearchParams({ action: 'saveHook', id: hook.id, name: hook.name, text: hook.text, persona: activePersona, hooksTab: getPersona().hooksTab });
      await fetch(proxyUrl(scriptUrl + '?' + params.toString()));
    } catch (err) {
      console.warn('Could not save hook to Sheet:', err.message);
    }
  }

  document.getElementById('hookName').value = '';
  document.getElementById('hookText').value = '';
  document.getElementById('hookStatus').innerHTML = '<span class="status-ok">Hook saved!</span>';
  setTimeout(() => { const el = document.getElementById('hookStatus'); if (el) el.innerHTML = ''; }, 2000);
  await renderHooks();
}

async function deleteHook(id) {
  const hooks = Storage.get(hooksStorageKey(), []).filter(h => String(h.id) !== String(id));
  Storage.set(hooksStorageKey(), hooks);

  const scriptUrl = Storage.get('scriptUrl', '');
  if (scriptUrl) {
    try {
      const params = new URLSearchParams({ action: 'deleteHook', id, hooksTab: getPersona().hooksTab });
      await fetch(proxyUrl(scriptUrl + '?' + params.toString()));
    } catch (err) {
      console.warn('Could not delete hook from Sheet:', err.message);
    }
  }

  await renderHooks();
}

function startEditHook(id) {
  document.getElementById('hook-text-' + id).style.display = 'none';
  document.getElementById('hook-edit-' + id).style.display = 'block';
  const card = document.getElementById('hook-card-' + id);
  if (card) card.querySelector('.hook-card-actions').style.display = 'none';
}

function cancelEditHook(id) {
  document.getElementById('hook-text-' + id).style.display = 'block';
  document.getElementById('hook-edit-' + id).style.display = 'none';
  const card = document.getElementById('hook-card-' + id);
  if (card) card.querySelector('.hook-card-actions').style.display = 'flex';
}

async function saveEditHook(id) {
  const nameInput = document.getElementById('hook-edit-name-' + id);
  const textInput = document.getElementById('hook-edit-text-' + id);
  if (!nameInput || !textInput) return;
  const name = nameInput.value.trim();
  const text = textInput.value.trim();
  if (!name || !text) return;

  const hooks = Storage.get(hooksStorageKey(), []);
  const hook = hooks.find(h => String(h.id) === String(id));
  if (hook) { hook.name = name; hook.text = text; Storage.set(hooksStorageKey(), hooks); }

  const scriptUrl = Storage.get('scriptUrl', '');
  if (scriptUrl) {
    try {
      const params = new URLSearchParams({ action: 'updateHook', id, name, text, hooksTab: getPersona().hooksTab });
      await fetch(proxyUrl(scriptUrl + '?' + params.toString()));
    } catch (err) {
      console.warn('Could not update hook in Sheet:', err.message);
    }
  }

  const card = document.getElementById('hook-card-' + id);
  if (card) {
    const nameEl = card.querySelector('.hook-name');
    const textEl = document.getElementById('hook-text-' + id);
    if (nameEl) nameEl.textContent = name;
    if (textEl) textEl.textContent = text;
  }

  cancelEditHook(id);
  populateHookDropdown();
}

async function renderHooks() {
  const list = document.getElementById('hooksList');
  const empty = document.getElementById('hooksEmpty');
  if (!list) return;

  const scriptUrl = Storage.get('scriptUrl', '');
  if (scriptUrl) {
    try {
      const response = await fetch(proxyUrl(scriptUrl + '?action=getHooks&hooksTab=' + getPersona().hooksTab));
      const data = await response.json();
      if (data.success && data.hooks && data.hooks.length) {
        Storage.set(hooksStorageKey(), data.hooks);
        populateHookDropdown();
      }
    } catch (err) {
      console.warn('Could not load hooks from Sheet:', err.message);
    }
  }

  const hooks = Storage.get(hooksStorageKey(), []);
  if (!hooks.length) {
    list.innerHTML = '';
    if (empty) empty.style.display = 'flex';
    return;
  }
  if (empty) empty.style.display = 'none';
  list.innerHTML = hooks.map(hook =>
    '<div class="hook-card" id="hook-card-' + hook.id + '">' +
    '<div class="hook-card-top">' +
    '<div class="hook-name">' + escapeHtml(hook.name) + '</div>' +
    '<div class="hook-card-actions">' +
    '<button class="edit-btn" onclick="startEditHook(\'' + hook.id + '\')">Edit</button>' +
    '<button class="delete-btn" onclick="deleteHook(\'' + hook.id + '\')">Remove</button>' +
    '</div></div>' +
    '<div class="hook-text" id="hook-text-' + hook.id + '">' + escapeHtml(hook.text) + '</div>' +
    '<div class="hook-edit-form" id="hook-edit-' + hook.id + '" style="display:none;">' +
    '<input type="text" class="field-input" id="hook-edit-name-' + hook.id + '" value="' + escapeHtml(hook.name) + '" style="margin-bottom:8px;" />' +
    '<textarea class="content-area" id="hook-edit-text-' + hook.id + '" style="min-height:60px;margin-bottom:8px;">' + escapeHtml(hook.text) + '</textarea>' +
    '<div style="display:flex;gap:8px;">' +
    '<button class="save-btn" onclick="saveEditHook(\'' + hook.id + '\')" style="padding:6px 14px;font-size:12px;">Save</button>' +
    '<button class="delete-btn" onclick="cancelEditHook(\'' + hook.id + '\')" style="padding:6px 14px;">Cancel</button>' +
    '</div></div></div>'
  ).join('');
  populateHookDropdown();
}

function populateHookDropdown() {
  const hooks = Storage.get(hooksStorageKey(), []);

  const select = document.getElementById('hookSelect');
  if (select) {
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

  const articleSelect = document.getElementById('articleHookSelect');
  if (articleSelect) {
    const articleCurrent = articleSelect.value;
    articleSelect.innerHTML = '<option value="">No hook — use angle only</option>';
    hooks.forEach(hook => {
      const opt = document.createElement('option');
      opt.value = hook.id;
      opt.textContent = hook.name;
      articleSelect.appendChild(opt);
    });
    articleSelect.value = articleCurrent;
  }
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

function savePerplexityKey() {
  const key = document.getElementById('perplexityKeyInput').value.trim();
  if (!key.startsWith('pplx-')) {
    document.getElementById('perplexityKeyStatus').innerHTML = '<span class="status-err">Invalid key — should start with pplx-</span>';
    return;
  }
  Storage.set('perplexityKey', key);
  document.getElementById('perplexityKeyStatus').innerHTML = '<span class="status-ok">Perplexity key saved.</span>';
  updatePerplexityBadge();
}

function updatePerplexityBadge() {
  const badge = document.getElementById('perplexityIntegrationBadge');
  if (!badge) return;
  const key = Storage.get('perplexityKey', '');
  if (key) {
    badge.textContent = 'Active';
    badge.className = 'badge-active';
  } else {
    badge.textContent = 'No key set';
    badge.className = 'badge-soon';
  }
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

  const perplexityKey = Storage.get('perplexityKey', '');
  const perplexityInput = document.getElementById('perplexityKeyInput');
  if (perplexityInput && perplexityKey) perplexityInput.value = perplexityKey;

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
  const perplexityEl = document.getElementById('perplexityKeyStatus');
  if (perplexityEl) {
    perplexityEl.innerHTML = perplexityKey
      ? '<span class="status-ok">Perplexity key is set.</span>'
      : '<span class="status-err">No Perplexity key set.</span>';
  }
  const sheetEl = document.getElementById('scriptUrlStatus');
  if (sheetEl) {
    sheetEl.innerHTML = scriptUrl
      ? '<span class="status-ok">Google Sheet connected.</span>'
      : '<span class="status-err">No Google Sheet connected yet.</span>';
  }
  updatePerplexityBadge();
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

  document.querySelectorAll('.persona-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      switchPersona(btn.dataset.persona);
      document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('active'));
      document.querySelector('.nav-item[data-view="compose"]').classList.add('active');
      document.querySelectorAll('.view').forEach(v => v.classList.add('hidden'));
      document.getElementById('view-compose').classList.remove('hidden');
    });
  });
}

async function init() {
  const saved = Storage.get('activePersona', 'fqhc');
  if (PERSONAS[saved]) activePersona = saved;

  initNav();

  document.querySelectorAll('.persona-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.persona === activePersona);
  });

  const persona = getPersona();
  const sublabel = document.getElementById('personaSublabel');
  if (sublabel) sublabel.textContent = 'Generating for: ' + persona.fullLabel;
  const dot = document.getElementById('activePersonaDot');
  if (dot) dot.style.background = persona.color;

  const defaults = Storage.get('userDefaults', {});
  if (defaults.tone) {
    const el = document.getElementById('toneSelect');
    if (el) el.value = defaults.tone;
  }
  populateHookDropdown();
  await renderHooks();
}

function clearArticleFields() {
  document.querySelectorAll('.source-content').forEach(el => el.value = '');
  document.querySelectorAll('.source-org').forEach(el => el.value = '');
  document.querySelectorAll('.source-url').forEach(el => el.value = '');

  const extraBlocks = document.querySelectorAll('.source-block:not(:first-child)');
  extraBlocks.forEach(el => el.remove());
  renumberSources();

  document.getElementById('articleAngle').value = '';
  document.getElementById('articleHookSelect').value = '';
  document.getElementById('articleType').value = 'blog';
  document.getElementById('articleResults').innerHTML = '';
  document.getElementById('articleEmpty').style.display = 'flex';
  document.getElementById('articleClearBtn').style.display = 'none';
}

// ─── DISCOVER / PERPLEXITY ────────────────────────────────────────────────────

const DISCOVER_DEFAULT_TOPICS = [
  'FQHC federal funding policy',
  'HRSA health center program',
  'community health center Medicaid',
  'NACHC primary care policy'
];

function addDiscoverTopic() {
  const container = document.getElementById('discoverTopicsContainer');
  const row = document.createElement('div');
  row.className = 'discover-topic-row';
  row.style.display = 'flex';
  row.style.gap = '8px';
  row.style.marginTop = '8px';
  row.innerHTML =
    '<input type="text" class="field-input discover-topic-input" placeholder="e.g. HRSA community health grants" style="flex:1;" />' +
    '<button class="delete-btn" style="padding:6px 12px;flex-shrink:0;" onclick="this.parentElement.remove()">Remove</button>';
  container.appendChild(row);
}

async function discoverArticles() {
  const pplxKey = Storage.get('perplexityKey', '');
  if (!pplxKey) {
    document.getElementById('discoverError').textContent = 'Please add your Perplexity API key in Settings first.';
    return;
  }

  const topicInputs = document.querySelectorAll('.discover-topic-input');
  const topics = Array.from(topicInputs).map(i => i.value.trim()).filter(Boolean);
  if (!topics.length) {
    document.getElementById('discoverError').textContent = 'Please enter at least one search topic.';
    return;
  }

  const recency = document.getElementById('discoverRecency').value;
  const count = parseInt(document.getElementById('discoverCount').value) || 5;
  const persona = getPersona();

  document.getElementById('discoverError').textContent = '';
  document.getElementById('discoverEmpty').style.display = 'none';

  const btn = document.getElementById('discoverBtn');
  btn.disabled = true;
  btn.innerHTML = '<span>Searching...</span>';

  const resultsEl = document.getElementById('discoverResults');
  resultsEl.innerHTML = '<div class="loading-msg">Searching for recent articles via Perplexity...</div>';

  const recencyLabel = { day: 'the past 24 hours', week: 'the past week', month: 'the past month' }[recency];
  const topicList = topics.map((t, i) => `${i + 1}. ${t}`).join('\n');

  const prompt = `You are a research assistant for a healthcare content team that creates content for ${persona.fullLabel}.

Search for and return ${count} recently published articles or news items from ${recencyLabel} relevant to these topics:
${topicList}

For each article, return structured data. Focus on articles from authoritative sources: government agencies (HRSA, CMS, HHS), major healthcare associations (NACHC, AAFP, AHA), academic journals, and reputable healthcare news outlets (Health Affairs, Modern Healthcare, Kaiser Health News, Stat News, etc.).

Respond with ONLY a valid JSON array — no markdown, no explanation, no code fences:
[
  {
    "title": "Full article title",
    "source": "Publisher or organization name",
    "url": "Full URL if available, or empty string",
    "date": "Publication date or 'Recent' if unknown",
    "summary": "2-3 sentence summary of what the article covers and why it matters to ${persona.fullLabel}",
    "relevance": "One sentence explaining specifically why this is relevant to ${persona.fullLabel}",
    "topic": "Which of the search topics this relates to"
  }
]

Return exactly ${count} articles. If you cannot find ${count} distinct articles, return as many as you can find. Order by most relevant to ${persona.fullLabel} first.`;

  try {
    const response = await fetch('https://api.perplexity.ai/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + pplxKey
      },
      body: JSON.stringify({
        model: 'sonar',
        messages: [
          {
            role: 'system',
            content: 'You are a research assistant that finds recent, authoritative articles relevant to healthcare organizations. Always respond with valid JSON only — no markdown formatting, no explanation, no code fences.'
          },
          { role: 'user', content: prompt }
        ],
        search_recency_filter: recency,
        return_citations: true
      })
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.error?.message || 'Perplexity API error ' + response.status);
    }

    const data = await response.json();
    const raw = (data.choices || []).map(c => c.message?.content || '').join('').trim();
    const clean = raw.replace(/```json|```/g, '').trim();

    let articles;
    try {
      articles = JSON.parse(clean);
    } catch {
      throw new Error('Could not parse Perplexity response. The API may have returned an unexpected format.');
    }

    if (!Array.isArray(articles) || !articles.length) {
      resultsEl.innerHTML = '<div class="error-msg">No articles found. Try broadening your search topics or changing the recency filter.</div>';
      return;
    }

    renderDiscoverResults(articles, resultsEl);

  } catch (err) {
    resultsEl.innerHTML = '<div class="error-msg">Search failed: ' + escapeHtml(err.message) + '</div>';
  }

  btn.disabled = false;
  btn.innerHTML = 'Search for articles <svg width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>';
}

function renderDiscoverResults(articles, container) {
  const header = document.createElement('div');
  header.className = 'discover-results-header';
  header.innerHTML = '<span class="discover-count">' + articles.length + ' article' + (articles.length !== 1 ? 's' : '') + ' found</span>';
  container.innerHTML = '';
  container.appendChild(header);

  articles.forEach((article, idx) => {
    const card = document.createElement('div');
    card.className = 'discover-card';
    card.innerHTML = `
      <div class="discover-card-top">
        <div class="discover-card-meta">
          <span class="discover-source">${escapeHtml(article.source || 'Unknown source')}</span>
          <span class="discover-date">${escapeHtml(article.date || 'Recent')}</span>
          ${article.topic ? '<span class="discover-topic-tag">' + escapeHtml(article.topic) + '</span>' : ''}
        </div>
        <div class="discover-link-row">
          ${article.url ? '<a class="discover-ext-link" href="' + escapeHtml(article.url) + '" target="_blank" rel="noopener">↗ Open article</a>' : ''}
          ${article.url ? '<button class="discover-copy-url-btn" onclick="copyDiscoverUrl(this, \'' + escapeHtml(article.url) + '\')">Copy URL</button>' : ''}
          <a class="discover-search-link" href="https://www.google.com/search?q=${encodeURIComponent((article.title || '') + ' ' + (article.source || ''))}" target="_blank" rel="noopener">🔍 Search Google</a>
        </div>
      </div>
      <div class="discover-card-title">${escapeHtml(article.title || 'Untitled')}</div>
      <div class="discover-card-summary">${escapeHtml(article.summary || '')}</div>
      ${article.relevance ? '<div class="discover-card-relevance"><span class="discover-relevance-label">Why it matters:</span> ' + escapeHtml(article.relevance) + '</div>' : ''}
      <div class="discover-card-actions">
        <button class="action-btn discover-send-compose" onclick="sendToCompose(${idx})">
          <svg width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M12 20h9M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
          Send to Compose
        </button>
        <button class="action-btn discover-send-write" onclick="sendToWriter(${idx})">
          <svg width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>
          Send to Article Writer
        </button>
      </div>
    `;
    card.dataset.article = JSON.stringify(article);
    container.appendChild(card);
  });
}

function copyDiscoverUrl(btn, url) {
  navigator.clipboard.writeText(url).then(() => {
    btn.textContent = 'Copied!';
    btn.classList.add('copied');
    setTimeout(() => { btn.textContent = 'Copy URL'; btn.classList.remove('copied'); }, 2000);
  }).catch(() => {
    btn.textContent = 'Failed';
    setTimeout(() => { btn.textContent = 'Copy URL'; }, 2000);
  });
}

function getDiscoverArticleByIndex(idx) {
  const cards = document.querySelectorAll('.discover-card');
  if (!cards[idx]) return null;
  try { return JSON.parse(cards[idx].dataset.article); } catch { return null; }
}

function sendToCompose(idx) {
  const article = getDiscoverArticleByIndex(idx);
  if (!article) return;

  const content = [article.title, article.summary, article.relevance].filter(Boolean).join('\n\n');
  const alertContentEl = document.getElementById('alertContent');
  const sourceOrgEl = document.getElementById('sourceOrg');
  const articleUrlEl = document.getElementById('articleUrl');
  if (alertContentEl) alertContentEl.value = content;
  if (sourceOrgEl) sourceOrgEl.value = article.source || '';
  if (articleUrlEl) articleUrlEl.value = article.url || '';

  document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('active'));
  document.querySelector('.nav-item[data-view="compose"]').classList.add('active');
  document.querySelectorAll('.view').forEach(v => v.classList.add('hidden'));
  document.getElementById('view-compose').classList.remove('hidden');

  if (alertContentEl) {
    alertContentEl.style.borderColor = 'var(--teal-500)';
    setTimeout(() => { alertContentEl.style.borderColor = ''; }, 1500);
  }
}

function sendToWriter(idx) {
  const article = getDiscoverArticleByIndex(idx);
  if (!article) return;

  const content = [article.title, article.summary, article.relevance].filter(Boolean).join('\n\n');

  const firstContent = document.querySelector('.source-content');
  const firstOrg = document.querySelector('.source-org');
  const firstUrl = document.querySelector('.source-url');
  if (firstContent) firstContent.value = content;
  if (firstOrg) firstOrg.value = article.source || '';
  if (firstUrl) firstUrl.value = article.url || '';

  document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('active'));
  document.querySelector('.nav-item[data-view="write"]').classList.add('active');
  document.querySelectorAll('.view').forEach(v => v.classList.add('hidden'));
  document.getElementById('view-write').classList.remove('hidden');

  if (firstContent) {
    firstContent.style.borderColor = 'var(--teal-500)';
    setTimeout(() => { firstContent.style.borderColor = ''; }, 1500);
  }
}

// ─── ARTICLE WRITER ───────────────────────────────────────────────────────────

window.generatePosts = generatePosts;
window.copyPost = copyPost;
window.copySummary = copySummary;
window.stopGeneration = stopGeneration;
window.saveApiKey = saveApiKey;
window.savePerplexityKey = savePerplexityKey;
window.saveScriptUrl = saveScriptUrl;
window.saveDefaults = saveDefaults;
window.saveHook = saveHook;
window.deleteHook = deleteHook;
window.startEditHook = startEditHook;
window.cancelEditHook = cancelEditHook;
window.saveEditHook = saveEditHook;
window.switchPersona = switchPersona;
window.generateArticle = generateArticle;
window.copyArticleSection = copyArticleSection;
window.addSource = addSource;
window.removeSource = removeSource;
window.clearArticleFields = clearArticleFields;
window.discoverArticles = discoverArticles;
window.addDiscoverTopic = addDiscoverTopic;
window.sendToCompose = sendToCompose;
window.sendToWriter = sendToWriter;
window.copyDiscoverUrl = copyDiscoverUrl;

function addSource() {
  const container = document.getElementById('sourcesContainer');
  const count = container.querySelectorAll('.source-block').length + 1;
  const div = document.createElement('div');
  div.className = 'source-block';
  div.dataset.index = count - 1;
  div.innerHTML =
    '<div class="source-block-header">' +
    '<span class="source-block-label">Source ' + count + '</span>' +
    '<button class="remove-source-btn" onclick="removeSource(this)">Remove</button>' +
    '</div>' +
    '<textarea class="content-area source-content" placeholder="Paste article content, headline, or snippet..." style="min-height:90px;margin-bottom:6px;"></textarea>' +
    '<div class="field-row" style="margin-bottom:0;">' +
    '<input type="text" class="field-input source-org" placeholder="Organization (e.g. NACHC, HRSA)" />' +
    '<input type="text" class="field-input source-url" placeholder="URL (optional)" />' +
    '</div>';
  container.appendChild(div);
  renumberSources();
}

function removeSource(btn) {
  const block = btn.closest('.source-block');
  if (block) block.remove();
  renumberSources();
}

function renumberSources() {
  document.querySelectorAll('.source-block').forEach((block, i) => {
    const label = block.querySelector('.source-block-label');
    if (label) label.textContent = 'Source ' + (i + 1);
  });
}

const ARTICLE_TYPES = {
  blog: {
    label: 'Blog post',
    wordCount: '500-800 words',
    instructions: `Write a blog post of 500-800 words. Use a conversational but authoritative tone. Structure: engaging opening paragraph, 3-4 body sections with subheadings, concluding paragraph. No bullet points in the main body — write in prose. Subheadings should be compelling and specific.`
  },
  longform: {
    label: 'Long-form article',
    wordCount: '1000-1500 words',
    instructions: `Write a long-form article of 1000-1500 words. Use an authoritative, journalistic tone. Structure: strong lede paragraph, background/context section, 4-5 substantive body sections with subheadings, expert perspective or implication section, conclusion. Write in prose throughout. Subheadings should be informative and specific.`
  },
  newsletter: {
    label: 'Newsletter content',
    wordCount: '300-500 words',
    instructions: `Write newsletter content of 300-500 words. Use a warm, direct tone suited for email. Structure: brief opening that acknowledges the reader, the core news explained clearly, 2-3 key implications, and a forward-looking close. No subheadings — flowing paragraphs. Feels personal, not corporate.`
  },
  linkedin_article: {
    label: 'LinkedIn article',
    wordCount: '700-1000 words',
    instructions: `Write a LinkedIn article of 700-1000 words. Professional but human tone. Structure: powerful opening hook (1-2 sentences standing alone), context paragraph, 3-4 insight sections with bold subheadings, personal or strategic perspective, strong closing with a question or call to reflection. Use short paragraphs. Written for senior healthcare leaders and executives.`
  }
};

// ─── CHANGE 1: HALLUCINATION CHECK (second API call) ─────────────────────────

async function runHallucinationCheck(article, sourcesBlock, apiKey) {
  const takeawayLines = (article.takeaways || []).map((t, i) => {
    const claim = typeof t === 'object' ? t.claim : t;
    const source = typeof t === 'object' && t.source ? ' [Source: ' + t.source + ']' : '';
    return (i + 1) + '. ' + claim + source;
  }).join('\n');

  const checkPrompt = `You are a fact-checking assistant. Your job is to review a generated article and verify that every factual claim is directly supported by the provided source material. You are not checking writing quality — only whether claims are grounded in the sources.

SOURCES:
${sourcesBlock}

ARTICLE TO CHECK:
Title: ${article.title}

Key Takeaways:
${takeawayLines}

Article Body:
${article.body}

INSTRUCTIONS:
Review each factual claim, statistic, and specific assertion in the article. Flag anything that:
- Cannot be found in the sources
- Contradicts or misrepresents the sources
- Appears to be invented or drawn from outside knowledge

Do NOT flag reasonable editorial framing or synthesis that accurately reflects the sources. Only flag concrete claims that cannot be traced back to the source material.

Respond with ONLY a valid JSON object — no markdown, no explanation, no code fences:
{
  "passed": true or false,
  "confidence": "high", "medium", or "low",
  "issues": [
    {
      "claim": "the specific claim or phrase from the article",
      "issue": "brief description — not found in sources / contradicts sources / appears fabricated"
    }
  ],
  "summary": "1-2 sentence overall assessment of how well the article stays grounded in the source material"
}

If no issues are found, return an empty issues array and set passed to true.`;

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
      max_tokens: 1500,
      messages: [{ role: 'user', content: checkPrompt }]
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

function renderHallucinationCheck(check, container) {
  const passed = check.passed && (!check.issues || check.issues.length === 0);
  const issueCount = (check.issues || []).length;

  const card = document.createElement('div');
  card.className = 'hallucination-check-card ' + (passed ? 'check-passed' : 'check-failed');

  const issuesHtml = issueCount > 0
    ? '<div class="check-issues">' +
      (check.issues || []).map(issue =>
        '<div class="check-issue-item">' +
        '<div class="check-issue-claim">"' + escapeHtml(issue.claim) + '"</div>' +
        '<div class="check-issue-reason">' + escapeHtml(issue.issue) + '</div>' +
        '</div>'
      ).join('') +
      '</div>'
    : '';

  card.innerHTML =
    '<div class="check-header">' +
    '<div class="check-status-row">' +
    '<span class="check-icon">' + (passed ? '✓' : '⚠') + '</span>' +
    '<span class="check-label">Source grounding check</span>' +
    '<span class="check-badge check-badge-' + (passed ? 'pass' : 'fail') + '">' +
    (passed ? 'All claims verified' : issueCount + ' issue' + (issueCount !== 1 ? 's' : '') + ' flagged') +
    '</span>' +
    '<span class="check-confidence">Confidence: ' + escapeHtml(check.confidence || 'medium') + '</span>' +
    '</div>' +
    '<div class="check-summary">' + escapeHtml(check.summary || '') + '</div>' +
    '</div>' +
    issuesHtml;

  container.appendChild(card);
}

// ─── GENERATE ARTICLE ─────────────────────────────────────────────────────────

async function generateArticle() {
  const apiKey = Storage.get('apiKey', '');
  if (!apiKey) {
    document.getElementById('articleError').textContent = 'Please add your Anthropic API key in Settings first.';
    return;
  }

  const sourceBlocks = document.querySelectorAll('.source-block');
  const sources = [];
  sourceBlocks.forEach((block, i) => {
    const content = block.querySelector('.source-content').value.trim();
    const org = block.querySelector('.source-org').value.trim();
    const url = block.querySelector('.source-url').value.trim();
    if (content) sources.push({ content, org, url, index: i + 1 });
  });

  if (!sources.length) {
    document.getElementById('articleError').textContent = 'Please add at least one source.';
    return;
  }

  const angle = document.getElementById('articleAngle').value.trim();
  const articleHooks = Storage.get(hooksStorageKey(), []);
  const articleHookId = parseInt(document.getElementById('articleHookSelect')?.value);
  const articleHook = articleHooks.find(h => h.id === articleHookId) || null;
  const type = document.getElementById('articleType').value;
  const meta = ARTICLE_TYPES[type];

  document.getElementById('articleError').textContent = '';
  const btn = document.getElementById('articleGenBtn');
  const stopBtn = document.getElementById('articleStopBtn');
  btn.disabled = true;
  btn.innerHTML = '<span>Generating...</span>';
  if (stopBtn) stopBtn.style.display = 'inline-flex';

  abortController = new AbortController();

  const resultsEl = document.getElementById('articleResults');
  const emptyEl = document.getElementById('articleEmpty');
  emptyEl.style.display = 'none';
  resultsEl.innerHTML = '<div class="loading-msg">Writing your ' + meta.label.toLowerCase() + ' from ' + sources.length + ' source' + (sources.length > 1 ? 's' : '') + '...</div>';

  const sourcesBlock = sources.map(s =>
    '--- SOURCE ' + s.index + (s.org ? ' (' + s.org + ')' : '') + (s.url ? ' | ' + s.url : '') + ' ---\n' + s.content
  ).join('\n\n');

  // CHANGE 2: Stronger prompt — refusal instructions + sourced takeaways schema
  const prompt = `You are an expert healthcare content writer with deep knowledge of the FQHC ecosystem: HRSA funding, NACHC, state PCAs, 340B Drug Pricing Program, Medicaid, value-based care, workforce, and health equity. You write for Afya, a company that helps FQHCs capture revenue through automated care coordination documentation.

Write content that synthesizes ALL of the sources below into a single cohesive piece for an FQHC audience. Every source must contribute meaningfully to the article — do not focus on just one source and ignore the others. Draw connections between sources only where those connections are clearly supported by the source material itself. Do not invent connections or introduce topics not present in the sources. Write content based STRICTLY AND ONLY on the sources provided below. Every claim, fact, statistic, and assertion in the article must come directly from the source material. Do not invent examples, fabricate statistics, add outside knowledge, or make connections that are not explicitly supported by the sources. If a source does not contain enough information to support a claim, do not make that claim. Stay grounded in what the sources actually say.
${articleHook ? '\nMESSAGING HOOK — weave this angle throughout the article: ' + articleHook.text : ''}
${angle ? '\nMESSAGING ANGLE: Use this to guide the editorial direction and emphasis of the article only. Do not introduce any topics, examples, or claims from this angle that are not already supported by the source material above: ' + angle : ''}
CONTENT TYPE: ${meta.label} (${meta.wordCount})

INSTRUCTIONS:
${meta.instructions}

CRITICAL WRITING RULES — never violate these under any circumstances:
- Never use em dashes (the — character). Use a comma, period, or rewrite the sentence instead.
- Never use en dashes (the - character used as a dash).
- Never use the word "delve" or "dive into".
- Never use phrases like "it is worth noting", "it is important to note", "needless to say".
- Never use "in today's landscape", "in today's world", or similar filler openers.
- Never start a sentence with "Additionally" or "Furthermore" as a lazy connector.
- Never use the word "crucial" or "pivotal".
- Write like a skilled human journalist. Use commas, periods, and sentence structure to create flow and emphasis.
- If the sources do not contain enough information to write a full ${meta.wordCount} article, write a shorter piece using only what the sources support. Never pad with outside knowledge to meet the word count.
- If a section cannot be written from the sources alone, omit it entirely rather than filling it with assumptions.

SOURCES:
${sourcesBlock}

Respond with ONLY a valid JSON object — no markdown, no explanation, no code fences:
{
  "title": "Compelling article title",
  "takeaways": [
    {"claim": "key takeaway text here", "source": "Source 1"},
    {"claim": "key takeaway text here", "source": "Source 2"},
    {"claim": "key takeaway text here", "source": "Source 1"},
    {"claim": "key takeaway text here", "source": "Source 3"}
  ],
  "body": "Full article text here. Use \\n\\n for paragraph breaks. Use ## for subheadings.",
  "cta": "A specific, actionable call to action sentence or two — what should the reader do next?"
}

For each takeaway, the "source" field must reference which source number (e.g. "Source 1", "Source 2") the claim comes from. If a takeaway draws from multiple sources, list them (e.g. "Source 1, Source 2").`;

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
        max_tokens: 4000,
        messages: [{ role: 'user', content: prompt }]
      })
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.error?.message || 'API error ' + response.status);
    }

    const data = await response.json();
    const raw = (data.content || []).map(b => b.text || '').join('').trim();
    const clean = raw.replace(/```json|```/g, '').trim();
    const article = JSON.parse(clean);

    // Render article first so user sees it immediately
    renderArticle(article, meta, resultsEl);

    // Then run the hallucination check as a second pass
    const checkLoadingEl = document.createElement('div');
    checkLoadingEl.className = 'loading-msg';
    checkLoadingEl.textContent = 'Running source grounding check...';
    resultsEl.appendChild(checkLoadingEl);

    try {
      const hallucinationCheck = await runHallucinationCheck(article, sourcesBlock, apiKey);
      checkLoadingEl.remove();
      renderHallucinationCheck(hallucinationCheck, resultsEl);
    } catch (checkErr) {
      checkLoadingEl.remove();
      console.warn('Hallucination check failed:', checkErr.message);
      const checkErrDiv = document.createElement('div');
      checkErrDiv.className = 'error-msg';
      checkErrDiv.style.marginTop = '12px';
      checkErrDiv.textContent = 'Source grounding check could not be completed: ' + checkErr.message;
      resultsEl.appendChild(checkErrDiv);
    }

    // Save to Google Sheet
    const scriptUrl = Storage.get('scriptUrl', '');
    if (scriptUrl) {
      try {
        await fetch(scriptUrl, {
          method: 'POST',
          mode: 'no-cors',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'saveArticle',
            timestamp: new Date().toISOString(),
            type: meta.label,
            source: sources.map(s => s.org).filter(Boolean).join(', '),
            url: sources.map(s => s.url).filter(Boolean).join(', '),
            angle: angle || '',
            title: article.title,
            takeaways: (article.takeaways || []).map((t, i) => {
              const claim = typeof t === 'object' ? t.claim : t;
              const src = typeof t === 'object' && t.source ? ' [' + t.source + ']' : '';
              return (i + 1) + '. ' + claim + src;
            }).join(' | '),
            body: article.body,
            cta: article.cta
          })
        });
      } catch (err) {
        console.warn('Could not save article to Sheet:', err.message);
      }
    }

  } catch (err) {
    if (err.name === 'AbortError') {
      resultsEl.innerHTML = '<div class="stop-note">Generation was stopped.</div>';
    } else {
      resultsEl.innerHTML = '<div class="error-msg">Error: ' + err.message + '</div>';
    }
  }

  btn.disabled = false;
  btn.innerHTML = 'Generate article <svg width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M13 7l5 5m0 0l-5 5m5-5H6"/></svg>';
  if (stopBtn) stopBtn.style.display = 'none';
  abortController = null;
  const clearBtn = document.getElementById('articleClearBtn');
  if (clearBtn) clearBtn.style.display = 'inline-flex';
}

// CHANGE 3: renderArticle updated to show source attribution badges on takeaways
function renderArticle(article, meta, container) {
  const bodyHtml = (article.body || '')
    .split('\n\n')
    .map(para => {
      if (para.startsWith('## ')) {
        return '<h3 class="article-subheading">' + escapeHtml(para.slice(3)) + '</h3>';
      }
      return '<p class="article-para">' + escapeHtml(para) + '</p>';
    })
    .join('');

  // Handle both old string format and new {claim, source} object format
  const takeawaysHtml = (article.takeaways || []).map(t => {
    if (typeof t === 'object' && t.claim) {
      return '<li>' + escapeHtml(t.claim) +
        (t.source ? ' <span class="takeaway-source-badge">' + escapeHtml(t.source) + '</span>' : '') +
        '</li>';
    }
    return '<li>' + escapeHtml(t) + '</li>';
  }).join('');

  const takeawaysText = (article.takeaways || []).map((t, i) => {
    const claim = typeof t === 'object' ? t.claim : t;
    const src = typeof t === 'object' && t.source ? ' [' + t.source + ']' : '';
    return (i + 1) + '. ' + claim + src;
  }).join('\n');

  container.innerHTML = `
    <div class="article-card">

      <div class="article-section">
        <div class="article-section-header">
          <span class="article-section-label">Title</span>
          <button class="action-btn" onclick="copyArticleSection(this, ${JSON.stringify(article.title)})">Copy</button>
        </div>
        <div class="article-title-text">${escapeHtml(article.title)}</div>
      </div>

      <div class="article-section">
        <div class="article-section-header">
          <span class="article-section-label">Key takeaways</span>
          <button class="action-btn" onclick="copyArticleSection(this, ${JSON.stringify(takeawaysText)})">Copy</button>
        </div>
        <ul class="article-takeaways">${takeawaysHtml}</ul>
      </div>

      <div class="article-section">
        <div class="article-section-header">
          <span class="article-section-label">${escapeHtml(meta.label)} — ${escapeHtml(meta.wordCount)}</span>
          <button class="action-btn" onclick="copyArticleSection(this, ${JSON.stringify(article.body)})">Copy</button>
        </div>
        <div class="article-body">${bodyHtml}</div>
      </div>

      <div class="article-section">
        <div class="article-section-header">
          <span class="article-section-label">Call to action</span>
          <button class="action-btn" onclick="copyArticleSection(this, ${JSON.stringify(article.cta)})">Copy</button>
        </div>
        <div class="article-cta">${escapeHtml(article.cta)}</div>
      </div>

      <div class="article-copy-all">
        <button class="generate-btn" style="margin-top:0;" onclick="copyArticleSection(this, ${JSON.stringify(article.title + '\n\nKEY TAKEAWAYS\n' + takeawaysText + '\n\n' + article.body + '\n\n' + article.cta)})">
          Copy full article
          <svg width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"/></svg>
        </button>
      </div>

    </div>
  `;
}

function copyArticleSection(btn, text) {
  navigator.clipboard.writeText(text).then(() => {
    const orig = btn.innerHTML;
    btn.textContent = 'Copied!';
    btn.classList.add('copied');
    setTimeout(() => { btn.innerHTML = orig; btn.classList.remove('copied'); }, 2000);
  });
}

document.addEventListener('DOMContentLoaded', init);
