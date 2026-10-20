'use strict';

let abortController = null;

// One place to change the Claude model used everywhere in the app
const CLAUDE_MODEL = 'claude-sonnet-4-6';

const NO_EMDASH_RULE = ' Never use em dashes or en dashes in any content. Use commas, periods, or rewrite sentences instead. Never use the word delve, crucial, or pivotal.';

// PERSONAS
// Includes original FQHC / RHC / CMHC / Navigator personas PLUS new Veterans

const PERSONAS = {
  fqhc: {
    label: 'FQHCs',
    fullLabel: 'Federally Qualified Health Centers',
    sheetTab: 'Sheet1',
    hooksTab: 'Hooks',
    color: '#4BAAA5',
    systemPrompt: `You are an expert social media strategist specializing in healthcare communications for Federally Qualified Health Centers (FQHCs) and community health centers. You have deep knowledge of the FQHC ecosystem: HRSA funding, NACHC, state PCAs, 340B Drug Pricing Program, UDS reporting, PCMH, value-based care, Medicaid, and the communities these centers serve. Your content resonates with FQHC executives, clinical leaders, policy staff, board members, and community health advocates. Always lead with what matters most to the reader. Vary sentence structure. Avoid filler phrases like "In today's landscape" or "It's more important than ever."${NO_EMDASH_RULE}`
  },
  rhc: {
    label: 'RHCs',
    fullLabel: 'Rural Health Clinics',
    sheetTab: 'RHC_Posts',
    hooksTab: 'RHC_Hooks',
    color: '#529EB5',
    systemPrompt: `You are an expert social media strategist specializing in healthcare communications for Rural Health Clinics (RHCs). You have deep knowledge of the RHC ecosystem: CMS cost-based reimbursement, rural health policy, Critical Access Hospital proximity rules, HRSA rural health grants, State Offices of Rural Health, Medicare and Medicaid rural provisions, workforce shortages in rural areas, and the unique challenges of delivering care in frontier and rural communities. Your content resonates with RHC administrators, rural physicians, clinic managers, and rural health advocates. Always lead with what matters most to rural healthcare providers. Avoid generic healthcare language — speak specifically to rural context.${NO_EMDASH_RULE}`
  },
  cmhc: {
    label: 'CMHCs',
    fullLabel: 'Community Mental Health Centers',
    sheetTab: 'CMHC_Posts',
    hooksTab: 'CMHC_Hooks',
    color: '#7AD0C7',
    systemPrompt: `You are an expert social media strategist specializing in healthcare communications for Community Mental Health Centers (CMHCs) and behavioral health organizations. You have deep knowledge of the behavioral health ecosystem: CCBHC model, mental health parity laws, SAMHSA funding, crisis services, co-occurring disorders, integrated care models, Medicaid behavioral health carve-outs, psychiatric workforce shortages, and stigma reduction. Your content resonates with CMHC executives, clinicians, case managers, peer support specialists, and behavioral health advocates. Lead with the human impact. Use plain language that reduces stigma. Avoid clinical jargon unless speaking to clinical audiences.${NO_EMDASH_RULE}`
  },
  navigator: {
    label: 'Navigators',
    fullLabel: 'Family Health Navigators',
    sheetTab: 'Navigator_Posts',
    hooksTab: 'Navigator_Hooks',
    color: '#A9EACF',
    systemPrompt: `You are an expert social media strategist specializing in communications for Family Health Navigators and community health workers. You understand the navigator role deeply: helping families understand insurance options, connecting patients to community resources, breaking down healthcare barriers, supporting chronic disease management, and advocating for underserved populations. Your content empowers navigators with practical tools, celebrates their impact, and helps them communicate their value to funders, employers, and communities. Use warm, accessible language. Celebrate community. Avoid bureaucratic or clinical tone. Make navigators feel seen and supported.${NO_EMDASH_RULE}`
  },
  veterans: {
    label: 'Veterans',
    fullLabel: 'Veterans & Military Families',
    sheetTab: 'Veterans_Posts',
    hooksTab: 'Veterans_Hooks',
    color: '#6366F1',
    systemPrompt: `You are an expert social media strategist specializing in healthcare communications for veterans, active-duty service members, and military families. You have deep knowledge of the veteran healthcare ecosystem: VA healthcare system, TRICARE, the Mission Act and community care networks, service-connected disability benefits, the gap between VA coverage and community health center access, veteran mental health and suicide prevention, MST (military sexual trauma) services, and the unique healthcare challenges of transitioning service members. Your content resonates with veterans, caregivers of veterans, VSO (veteran service organization) staff, and healthcare providers who serve military-connected patients. Use plain, direct language that honors their service. Reference shared values of mission, service, and community. Avoid bureaucratic or condescending tone. Use inclusive phrases like "those who served" or "our veteran community." Never sensationalize military trauma.${NO_EMDASH_RULE}`
  }
};

// ─── AUDIENCE TARGETING ──────────────────────────────────────────────────────
// Additional audience personas for multi-audience post generation
// (used when generating posts targeting multiple audiences simultaneously)

const AUDIENCE_PERSONAS = {
  fqhc: {
    label: 'FQHC Community',
    searchTerms: ['FQHC', 'federally qualified health center', 'HRSA', 'NACHC', 'community health center'],
    persona: `Writing for health center staff, clinical leaders, and community health advocates at FQHCs.
Reference HRSA Section 330, 340B, UDS metrics, sliding-fee scale access, and the mission of serving underserved communities.'
Use professional healthcare language familiar to FQHC staff.`
  },
  veterans: {
    label: 'Veterans & Military Families',
    searchTerms: ['veterans health', 'VA healthcare', 'military families', 'TRICARE', 'veteran benefits'],
    persona: `Writing for veterans, active-duty service members, and military families.
Use plain, respectful language that honors service. Reference VA healthcare, TRICARE, the Mission Act, community care networks, and service-connected benefits.'
Lead with respect. Use "those who served" or "our veteran community." Avoid bureaucratic tone.`
  },
  navigators: {
    label: 'Family Health Navigators',
    searchTerms: ['health navigator', 'community health worker', 'Medicaid enrollment', 'ACA marketplace navigator', 'CMS navigator program'],
    persona: `Writing for certified health navigators, community health workers, and patient advocates.
Use empowering, educational language. Reference the CMS Navigator Program, Marketplace enrollment, Medicaid/CHIP, CHWs, and supporting multi-generational or immigrant families.'
Keep language accessible. Emphasize practical steps and community-based support.`
  }
};


const TONE_DESCRIPTIONS = {
  informative: 'Clear, factual, and educational — share key facts and explain why it matters.',
  thought_leadership: 'Authoritative and insightful — offer strategic perspective on what this means for the sector.',
  urgent: 'Action-oriented and advocacy-focused — highlight urgency and call the audience to pay attention or act.',
  community: 'Warm, conversational, and community-oriented — invite discussion and peer engagement.',
  veteran_respectful: 'Respectful and mission-oriented — honor service, speak plainly, connect healthcare to the veteran mission.',
  veteran_peer: 'Plain-spoken, peer-level tone that talks with veterans as equals: direct, personal, and grounded. Never claim or imply that the writer or the organization served in the military.',
  navigator_empowering: 'Empowering and educational — give navigators practical tools and celebrate their community impact.',
  navigator_caregiver: 'Warm caregiver/family support tone — accessible, compassionate, focused on families.'
};

let activePersona = 'fqhc';

// Audience checkbox values use 'navigators'; the persona key is 'navigator'
const AUDIENCE_TO_PERSONA = { fqhc: 'fqhc', veterans: 'veterans', navigators: 'navigator' };

function systemPromptForAudience(audienceKey) {
  const p = PERSONAS[AUDIENCE_TO_PERSONA[audienceKey]] || getPersona();
  return p.systemPrompt;
}

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

// Google Apps Script GET requests. Tries Google directly first so the Script URL
// (which works like a password) is not sent to a third-party proxy. The proxy is
// only a fallback; once direct calls work for you, set this to false.
const SHEET_PROXY_FALLBACK = true;

async function sheetGet(fullUrl) {
  try {
    const r = await fetch(fullUrl, { redirect: 'follow' });
    if (r.ok) return r;
    throw new Error('HTTP ' + r.status);
  } catch (e) {
    if (!SHEET_PROXY_FALLBACK) throw e;
    console.warn('Direct Sheet request failed, using proxy fallback:', e.message);
    return fetch(proxyUrl(fullUrl));
  }
}

// Only allow http(s) links in generated markup (blocks javascript: and data: URLs)
function safeUrl(url) {
  try {
    const u = new URL(String(url || '').trim());
    return (u.protocol === 'http:' || u.protocol === 'https:') ? u.href : '';
  } catch { return ''; }
}

// ─── FULL ARTICLE TEXT RETRIEVAL ─────────────────────────────────────────────
// Pulls the readable text of an article so content and the grounding check are
// based on the real source, not just a search summary.

const MAX_SOURCE_CHARS = 15000;
const MIN_ARTICLE_CHARS = 400;

async function fetchWithTimeout(url, options = {}, ms = 20000) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), ms);
  try { return await fetch(url, { ...options, signal: ctrl.signal }); }
  finally { clearTimeout(timer); }
}

function extractReadableText(html) {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  doc.querySelectorAll('script,style,noscript,nav,header,footer,aside,form,iframe,svg,button,[role="navigation"],[aria-hidden="true"]').forEach(el => el.remove());
  const root = doc.querySelector('article') || doc.querySelector('main') || doc.body;
  if (!root) return '';
  const blocks = Array.from(root.querySelectorAll('h1,h2,h3,h4,p,li,blockquote'))
    .map(el => el.textContent.replace(/\s+/g, ' ').trim())
    .filter(t => t.length > 30);
  return Array.from(new Set(blocks)).join('\n\n');
}

function cleanReaderText(text) {
  // r.jina.ai returns "Title: ... URL Source: ... Markdown Content:" — keep the body
  const marker = text.indexOf('Markdown Content:');
  let body = marker >= 0 ? text.slice(marker + 'Markdown Content:'.length) : text;
  return body
    .replace(/!\[[^\]]*\]\([^)]*\)/g, '')          // images
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')        // links -> text
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function looksBlocked(text) {
  return /(access denied|enable javascript|verify you are human|captcha|subscribe to continue|403 forbidden|404 not found)/i.test(text.slice(0, 600));
}

async function fetchArticleText(url) {
  const target = safeUrl(url);
  if (!target) throw new Error('That URL does not look valid.');

  // 1) Reader service (CORS-enabled, returns clean text)
  try {
    const r = await fetchWithTimeout('https://r.jina.ai/' + target, {}, 25000);
    if (r.ok) {
      const t = cleanReaderText(await r.text());
      if (t.length >= MIN_ARTICLE_CHARS && !looksBlocked(t)) return { text: t, method: 'reader' };
    }
  } catch (e) { console.warn('Reader fetch failed:', e.message); }

  // 2) CORS proxy + in-browser text extraction
  try {
    const r = await fetchWithTimeout(proxyUrl(target), {}, 20000);
    if (r.ok) {
      const t = extractReadableText(await r.text());
      if (t.length >= MIN_ARTICLE_CHARS && !looksBlocked(t)) return { text: t, method: 'proxy' };
    }
  } catch (e) { console.warn('Proxy fetch failed:', e.message); }

  return null;
}

function setFetchStatus(el, type, msg) {
  if (!el) return;
  el.className = el.className.replace(/\bis-(loading|ok|warn)\b/g, '').trim() + (type ? ' is-' + type : '');
  el.textContent = msg || '';
}

// Fills a textarea with the full article text. Falls back to `fallbackText` if retrieval fails.
async function fillWithArticleText(url, textarea, statusEl, title, fallbackText) {
  if (!textarea) return false;
  setFetchStatus(statusEl, 'loading', 'Fetching the full article text…');
  textarea.disabled = true;
  let result = null;
  try { result = await fetchArticleText(url); } catch (e) { result = null; }
  textarea.disabled = false;

  if (result) {
    let text = result.text;
    let truncated = false;
    if (text.length > MAX_SOURCE_CHARS) { text = text.slice(0, MAX_SOURCE_CHARS); truncated = true; }
    textarea.value = (title ? title + '\n\n' : '') + text;
    textarea.dataset.sourceType = 'full';
    const words = text.split(/\s+/).length.toLocaleString();
    setFetchStatus(statusEl, 'ok', 'Full article text loaded (about ' + words + ' words' + (truncated ? ', trimmed to fit' : '') + '). Review it and delete any leftover menus or ads before generating.');
    return true;
  }
  if (fallbackText != null) textarea.value = fallbackText;
  textarea.dataset.sourceType = 'summary';
  setFetchStatus(statusEl, 'warn', 'Could not retrieve the full article (the site may block automated access or require a subscription). ' +
    (fallbackText ? 'Using the search summary only — ' : '') + 'For accurate content, open the article and paste its text here.');
  return false;
}

async function fetchComposeFromUrl() {
  const url = document.getElementById('articleUrl').value.trim();
  const statusEl = document.getElementById('alertFetchStatus');
  if (!safeUrl(url)) { setFetchStatus(statusEl, 'warn', 'Enter a full article URL starting with https:// first.'); return; }
  await fillWithArticleText(url, document.getElementById('alertContent'), statusEl, '', null);
}

async function fetchSourceFromUrl(btn) {
  const block = btn.closest('.source-block');
  if (!block) return;
  const url = block.querySelector('.source-url').value.trim();
  const statusEl = block.querySelector('.source-fetch-status');
  if (!safeUrl(url)) { setFetchStatus(statusEl, 'warn', 'Enter a full article URL starting with https:// first.'); return; }
  btn.disabled = true;
  await fillWithArticleText(url, block.querySelector('.source-content'), statusEl, '', null);
  btn.disabled = false;
}

// Copy buttons: any element with data-copy="text" copies that text on click.
document.addEventListener('click', e => {
  const btn = e.target.closest('[data-copy]');
  if (!btn) return;
  const text = btn.dataset.copy || '';
  const orig = btn.innerHTML;
  navigator.clipboard.writeText(text).then(() => {
    btn.textContent = 'Copied!';
    btn.classList.add('copied');
    setTimeout(() => { btn.innerHTML = orig; btn.classList.remove('copied'); }, 2000);
  }).catch(() => {
    btn.textContent = 'Copy failed';
    setTimeout(() => { btn.innerHTML = orig; }, 2000);
  });
});

// Shared view switching (sidebar, mobile nav, and Discover hand-offs)
function showView(view) {
  const target = document.getElementById('view-' + view);
  if (!target) return;
  document.querySelectorAll('.nav-item').forEach(b => b.classList.toggle('active', b.dataset.view === view));
  document.querySelectorAll('.view').forEach(v => v.classList.add('hidden'));
  target.classList.remove('hidden');
  window.scrollTo({ top: 0, behavior: 'smooth' });
  if (view === 'history') renderHistory();
  if (view === 'settings') loadSettings();
  if (view === 'hooks') renderHooks();
  if (view === 'afya') loadAfyaContext();
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

function appendPost(item, container, audienceLabel) {
  const meta = PLATFORM_META[item.platform] || { label: item.platform, badgeClass: '' };
  const card = document.createElement('div');
  card.className = 'post-card';

  // Show audience badge if this post was generated for a specific audience
  const audienceBadgeHtml = audienceLabel
    ? '<span class="audience-inline-badge">' + escapeHtml(audienceLabel) + '</span>'
    : '';

  card.innerHTML = `
    <div class="post-header">
      <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
        <span class="platform-badge ${meta.badgeClass}">${meta.label}</span>
        ${audienceBadgeHtml}
      </div>
      <div class="post-actions">
       <button class="action-btn" onclick="copyPost(this, this.dataset.post)" data-post="${escapeHtml(item.post)}">Copy</button>
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
  container.innerHTML = '<div class="error-msg">' + escapeHtml(msg) + '</div>';
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
      model: CLAUDE_MODEL,
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
    const response = await sheetGet(scriptUrl + '?action=get&persona=' + activePersona);
    const data = await response.json();
    if (data.success) return data.batches;
    return null;
  } catch (err) {
    console.warn('Could not load from Google Sheet:', err.message);
    return null;
  }
}

// ─── GENERATE POSTS (AUDIENCE-AWARE) ─────────────────────────────────────────

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

  // Read selected target audiences from the UI
  const selectedAudienceEls = document.querySelectorAll('input[name="audience"]:checked');
  const selectedAudiences = Array.from(selectedAudienceEls).map(el => el.value);
  if (!selectedAudiences.length) {
    showError('Please select at least one target audience.');
    return;
  }

  const tone = document.getElementById('toneSelect').value;
  const orgName = 'Afya';
  const includeAfya = document.getElementById('includeAfyaCompose')?.checked && Storage.get('afyaContext', null);
  const hooks = Storage.get(hooksStorageKey(), []);
  const selectedHookId = document.getElementById('hookSelect')?.value || '';
  const activeHook = selectedHookId ? (hooks.find(h => String(h.id) === selectedHookId) || null) : null;
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

  // Summary generation
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

  // Generate posts per platform, per audience
  for (const platform of platforms) {
    for (const audienceKey of selectedAudiences) {
      if (!abortController) break;

      const audienceMeta = AUDIENCE_PERSONAS[audienceKey] || {
        label: persona.fullLabel,
        persona: persona.systemPrompt
      };
      const platformMeta = PLATFORM_META[platform];

      const loadingDiv = document.createElement('div');
      loadingDiv.className = 'loading-msg';
      loadingDiv.id = 'loading-' + platform + '-' + audienceKey;
      loadingDiv.textContent = 'Generating ' + platformMeta.label + ' for ' + audienceMeta.label + '...';
      container.appendChild(loadingDiv);

      const toneDescription = TONE_DESCRIPTIONS[tone] || tone;
      // Reddit communities usually remove company self-promotion, so Afya context is left out there
      const useAfya = includeAfya && platform !== 'reddit';

      const userPrompt = `Generate a single social media post based on this article or alert.

TARGET AUDIENCE: ${audienceMeta.label}
AUDIENCE CONTEXT: ${audienceMeta.persona}

CONTENT:
${content}
${source ? '\nSOURCE: ' + source : ''}
${url ? '\nURL: ' + url : ''}
POSTING ON BEHALF OF: ${orgName}

TONE: ${toneDescription}
${activeHook ? '\nMESSAGING HOOK — weave this angle into the post: ' + activeHook.text : ''}

PLATFORM INSTRUCTIONS:
${platformMeta.instructions}

Tailor the language, framing, and calls to action specifically to the TARGET AUDIENCE above — their concerns, context, terminology, and what matters to them. Do not use generic healthcare language; speak directly to this audience.

Respond with ONLY a valid JSON object — no markdown, no explanation, no code fences:
{"platform": "${platform}", "audience": "${audienceKey}", "audienceLabel": "${audienceMeta.label}", "post": "your post text here"}

Use \\n for line breaks inside the post text.
${useAfya ? getAfyaContextBlock('post') : ''}`;

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
            model: CLAUDE_MODEL,
            max_tokens: 2000,
            system: systemPromptForAudience(audienceKey),
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

        const loadingEl = document.getElementById('loading-' + platform + '-' + audienceKey);
        if (loadingEl) loadingEl.remove();
        appendPost(item, container, selectedAudiences.length > 1 ? audienceMeta.label : null);

      } catch (err) {
        const loadingEl = document.getElementById('loading-' + platform + '-' + audienceKey);
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
        errDiv.textContent = 'Error generating ' + platformMeta.label + ' (' + audienceMeta.label + '): ' + err.message;
        container.appendChild(errDiv);
      }
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
      audiences: selectedAudiences,         // ← audience tags saved to history
      posts
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


  // Refresh the auto image prompt from the latest content; leave the image section as the user set it
  if (posts.length) {
    const imagePromptEl = document.getElementById('imagePromptCompose');
    if (imagePromptEl) {
      imagePromptEl.value = 'Professional healthcare photograph related to: ' + content.slice(0, 150) + (source ? ' Source: ' + source : '') + '. Diverse community members and healthcare workers. Warm and authentic. No text in image.';
    }
  }

  resetButtons();
}


// ─── HISTORY ─────────────────────────────────────────────────────────────────

async function renderHistory() {
  const list = document.getElementById('historyList');
  const loading = document.getElementById('historyLoading');
  if (loading) loading.style.display = 'block';
  if (list) list.innerHTML = '';
  let batches = null;
  const scriptUrl = Storage.get('scriptUrl', '');
  if (scriptUrl) batches = await loadFromGoogleSheet();
  if (!batches) batches = Storage.get('postHistory_' + activePersona, []);
  if (loading) loading.style.display = 'none';

  if (list) list._allBatches = batches || [];
  filterHistory();
}

function _historyDate(ts) {
  return new Date(ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function _renderArticleHistory(items) {
  const list = document.getElementById('articleHistoryList');
  const empty = document.getElementById('articleHistoryEmpty');
  if (!list) return;
  if (empty) empty.style.display = items.length ? 'none' : 'flex';
  list.innerHTML = items.map(a => {
    const full = (a.title || '') + '\n\n' + (a.body || '') + (a.cta ? '\n\n' + a.cta : '');
    return '<div class="history-card">' +
      '<div class="history-meta"><div class="history-title">' + escapeHtml(a.title || 'Untitled article') + '</div>' +
      '<div class="history-date">' + _historyDate(a.timestamp) + '</div></div>' +
      '<div class="history-platforms"><span class="hist-badge">' + escapeHtml(a.type || 'Article') + '</span>' +
      (a.source ? '<span class="hist-badge">' + escapeHtml(a.source) + '</span>' : '') + '</div>' +
      '<div style="display:flex;gap:8px;flex-wrap:wrap;">' +
      '<button class="history-expand-btn" onclick="this.parentElement.nextElementSibling.classList.toggle(\'open\'); this.textContent = this.parentElement.nextElementSibling.classList.contains(\'open\') ? \'Hide article\' : \'View article\'">View article</button>' +
      '<button class="action-btn" data-copy="' + escapeHtml(full) + '">Copy</button></div>' +
      '<div class="history-posts"><div class="post-body">' + escapeHtml(a.body || '') + '</div></div></div>';
  }).join('');
}

function _renderImageHistory(items) {
  const list = document.getElementById('imageHistoryList');
  const empty = document.getElementById('imageHistoryEmpty');
  if (!list) return;
  if (empty) empty.style.display = items.length ? 'none' : 'flex';
  list.innerHTML = items.map(i =>
    '<div class="history-card">' +
    '<div class="history-meta"><div class="history-title">' + escapeHtml((i.prompt || '').slice(0, 140)) + '</div>' +
    '<div class="history-date">' + _historyDate(i.timestamp) + '</div></div>' +
    '<div class="history-platforms"><span class="hist-badge">' + escapeHtml(i.ratio || '') + '</span><span class="hist-badge">' + escapeHtml(i.mode || 'auto') + '</span></div>' +
    '<button class="action-btn" data-copy="' + escapeHtml(i.prompt || '') + '">Copy prompt</button></div>'
  ).join('');
}

// Applies keyword, type, date range (and optional audience) filters across all History sections
function filterHistory(audience) {
  const list = document.getElementById('historyList');
  if (audience !== undefined) filterHistory._audience = audience;
  const aud = filterHistory._audience || 'all';
  const q = (document.getElementById('historySearch')?.value || '').trim().toLowerCase();
  const type = document.getElementById('historyTypeFilter')?.value || 'all';
  const fromV = document.getElementById('historyDateFrom')?.value;
  const toV = document.getElementById('historyDateTo')?.value;
  const from = fromV ? new Date(fromV + 'T00:00:00') : null;
  const to = toV ? new Date(toV + 'T23:59:59') : null;
  const inRange = ts => { const d = new Date(ts); return (!from || d >= from) && (!to || d <= to); };
  const matches = obj => !q || JSON.stringify(obj).toLowerCase().includes(q);

  const batches = ((list && list._allBatches) || []).filter(b =>
    inRange(b.timestamp) && matches(b) && (aud === 'all' || (b.audiences || []).includes(aud)));
  const articles = Storage.get('articleHistory_' + activePersona, []).filter(a => inRange(a.timestamp) && matches(a));
  const images = Storage.get('imageHistory', []).filter(i => inRange(i.timestamp) && matches(i));

  if (list) _renderHistoryBatches(list, batches);
  const empty = document.getElementById('historyEmpty');
  if (empty) empty.style.display = batches.length ? 'none' : 'flex';
  _renderArticleHistory(articles);
  _renderImageHistory(images);

  const setCount = (id, n) => { const el = document.getElementById(id); if (el) el.textContent = n; };
  setCount('postsCount', batches.length);
  setCount('articlesCount', articles.length);
  setCount('imagesCount', images.length);

  const show = (id, on) => { const el = document.getElementById(id); if (el) el.style.display = on ? '' : 'none'; };
  show('historyPostsSection', type === 'all' || type === 'posts');
  show('historyArticlesSection', type === 'all' || type === 'articles');
  show('historyImagesSection', type === 'all' || type === 'images');
}

function clearHistoryFilters() {
  ['historySearch', 'historyDateFrom', 'historyDateTo'].forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });
  const t = document.getElementById('historyTypeFilter'); if (t) t.value = 'all';
  filterHistory._audience = 'all';
  filterHistory();
}

function toggleHistorySection(name) {
  const body = document.getElementById(name + 'Body');
  const chev = document.getElementById(name + 'Chevron');
  if (!body) return;
  const collapsed = body.style.display === 'none';
  body.style.display = collapsed ? '' : 'none';
  if (chev) chev.style.transform = collapsed ? '' : 'rotate(-90deg)';
}

function _renderHistoryBatches(list, batches) {
  const AUDIENCE_EMOJIS = { fqhc: '🏥', veterans: '🎖️', navigators: '🧭' };

  list.innerHTML = batches.map(function(batch) {
    const date = new Date(batch.timestamp).toLocaleDateString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit'
    });
    const platforms = batch.platforms || [];
    const batchAudiences = batch.audiences || [];

    const platformBadges = platforms
      .map(p => '<span class="hist-badge">' + (PLATFORM_META[p] ? PLATFORM_META[p].label : p) + '</span>')
      .join('');

    const audienceBadges = batchAudiences
      .map(a => {
        const meta = AUDIENCE_PERSONAS[a];
        if (!meta) return '';
        const emoji = AUDIENCE_EMOJIS[a] || '';
        return '<span class="hist-badge hist-badge-audience">' + emoji + ' ' + meta.label + '</span>';
      }).join('');

    const hookBadge = batch.hook
      ? '<span class="hist-badge" style="background:var(--green-50);color:var(--green-800);">Hook: ' + escapeHtml(batch.hook) + '</span>'
      : '';

    const summaryHtml = batch.summary
      ? '<div class="hist-summary"><div class="hist-summary-label">TL;DR</div><div class="hist-summary-tldr">' + escapeHtml(batch.summary.tldr || '') + '</div><div class="hist-summary-why">' + escapeHtml(batch.summary.why || '') + '</div></div>'
      : '';

    const postsHtml = (batch.posts || []).map(function(item) {
      const meta = PLATFORM_META[item.platform] || { label: item.platform, badgeClass: '' };
      const audienceMeta = item.audienceLabel ? AUDIENCE_PERSONAS[item.audience] : null;
      const audienceBadge = audienceMeta
        ? '<span class="hist-badge hist-badge-audience">' + escapeHtml(item.audienceLabel) + '</span>'
        : '';
      return '<div class="post-card" style="margin-bottom:10px;">' +
        '<div class="post-header">' +
        '<div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;">' +
        '<span class="platform-badge ' + meta.badgeClass + '">' + meta.label + '</span>' +
        audienceBadge +
        '</div>' +
        '<button class="action-btn" data-copy="' + escapeHtml(item.post) + '">Copy</button></div>' +
        '<div class="post-body">' + escapeHtml(item.post) + '</div></div>';
    }).join('');

    const snippet = batch.contentSnippet || (batch.content ? batch.content.slice(0, 120) : '');
    const dataAudiences = batchAudiences.join(',');

    return '<div class="history-card" data-audiences="' + escapeHtml(dataAudiences) + '">' +
      '<div class="history-meta"><div class="history-title">' + escapeHtml(batch.source || 'Untitled') + (snippet ? ' — ' + escapeHtml(snippet) + '...' : '') + '</div>' +
      '<div class="history-date">' + date + '</div></div>' +
      (safeUrl(batch.url) ? '<div class="history-url"><a href="' + escapeHtml(safeUrl(batch.url)) + '" target="_blank" rel="noopener">' + escapeHtml(batch.url) + '</a></div>' : '') +
      '<div class="history-platforms">' + platformBadges + audienceBadges + hookBadge + '</div>' +
      summaryHtml +
      '<button class="history-expand-btn" onclick="this.nextElementSibling.classList.toggle(\'open\'); this.textContent = this.nextElementSibling.classList.contains(\'open\') ? \'Hide posts\' : \'View posts\'">View posts</button>' +
      '<div class="history-posts">' + postsHtml + '</div></div>';
  }).join('');
}

// ─── HOOKS ───────────────────────────────────────────────────────────────────

async function saveHook() {
  const name = document.getElementById('hookName').value.trim();
  const text = document.getElementById('hookText').value.trim();
  const audienceTag = document.getElementById('hookAudience')?.value || '';
  if (!name || !text) {
    document.getElementById('hookStatus').innerHTML = '<span class="status-err">Please fill in both fields.</span>';
    return;
  }
  const hook = { id: Date.now(), name, text, persona: activePersona, audienceTag };
  const hooks = Storage.get(hooksStorageKey(), []);
  hooks.push(hook);
  Storage.set(hooksStorageKey(), hooks);

  const scriptUrl = Storage.get('scriptUrl', '');
  if (scriptUrl) {
    try {
      const params = new URLSearchParams({ action: 'saveHook', id: hook.id, name: hook.name, text: hook.text, persona: activePersona, audienceTag, hooksTab: getPersona().hooksTab });
      await sheetGet(scriptUrl + '?' + params.toString());
    } catch (err) {
      console.warn('Could not save hook to Sheet:', err.message);
    }
  }

  document.getElementById('hookName').value = '';
  document.getElementById('hookText').value = '';
  if (document.getElementById('hookAudience')) document.getElementById('hookAudience').value = '';
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
      await sheetGet(scriptUrl + '?' + params.toString());
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
      await sheetGet(scriptUrl + '?' + params.toString());
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

// Filter hooks by audience tag — called from the filter chips in index.html
function filterHooksList(audience) {
  const items = document.querySelectorAll('.hook-card[data-hook-audience]');
  items.forEach(item => {
    if (audience === 'all') {
      item.style.display = '';
    } else {
      const tag = item.dataset.hookAudience || '';
      item.style.display = (tag === audience || tag === '') ? '' : 'none';
    }
  });
}

async function renderHooks() {
  const list = document.getElementById('hooksList');
  const empty = document.getElementById('hooksEmpty');
  if (!list) return;

  const scriptUrl = Storage.get('scriptUrl', '');
  if (scriptUrl) {
    try {
      const response = await sheetGet(scriptUrl + '?action=getHooks&hooksTab=' + getPersona().hooksTab);
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

  const AUDIENCE_LABELS = { fqhc: '🏥 FQHC', veterans: '🎖️ Veterans', navigators: '🧭 Navigators' };

  list.innerHTML = hooks.map(hook => {
    const audienceTag = hook.audienceTag || '';
    const audienceBadge = audienceTag && AUDIENCE_LABELS[audienceTag]
      ? '<span class="hook-audience-badge">' + AUDIENCE_LABELS[audienceTag] + '</span>'
      : '';
    return '<div class="hook-card" id="hook-card-' + hook.id + '" data-hook-audience="' + escapeHtml(audienceTag) + '">' +
      '<div class="hook-card-top">' +
      '<div style="display:flex;align-items:center;gap:8px;">' +
      '<div class="hook-name">' + escapeHtml(hook.name) + '</div>' +
      audienceBadge +
      '</div>' +
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
      '</div></div></div>';
  }).join('');
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

// ─── SETTINGS ────────────────────────────────────────────────────────────────

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

  // Save audience defaults
  const audiencePrefs = {
    fqhc: document.getElementById('defaultAudienceFqhc')?.checked ?? true,
    veterans: document.getElementById('defaultAudienceVeterans')?.checked ?? false,
    navigators: document.getElementById('defaultAudienceNavigators')?.checked ?? false
  };
  Storage.set('userDefaults', { tone, audiencePrefs });

  // Apply tone immediately
  const composeTone = document.getElementById('toneSelect');
  if (composeTone && tone) composeTone.value = tone;

  // Apply audience defaults to compose checkboxes
  applyDefaultAudiences(audiencePrefs);

  document.getElementById('prefsStatus').innerHTML = '<span class="status-ok">Preferences saved.</span>';
  setTimeout(() => { const el = document.getElementById('prefsStatus'); if (el) el.innerHTML = ''; }, 3000);
}

function applyDefaultAudiences(prefs) {
  if (!prefs) return;
  ['fqhc', 'veterans', 'navigators'].forEach(a => {
    document.querySelectorAll('input[name="audience"][value="' + a + '"]').forEach(el => {
      el.checked = prefs[a] || false;
    });
  });
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

  // Load saved audience defaults into settings checkboxes
  if (defaults.audiencePrefs) {
    const ap = defaults.audiencePrefs;
    if (document.getElementById('defaultAudienceFqhc')) document.getElementById('defaultAudienceFqhc').checked = ap.fqhc !== undefined ? ap.fqhc : true;
    if (document.getElementById('defaultAudienceVeterans')) document.getElementById('defaultAudienceVeterans').checked = ap.veterans || false;
    if (document.getElementById('defaultAudienceNavigators')) document.getElementById('defaultAudienceNavigators').checked = ap.navigators || false;
  }

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
  const openAiKey = Storage.get('openAiKey', '');
  const openAiEl = document.getElementById('openAiKeyStatus');
  if (openAiEl) {
    openAiEl.innerHTML = openAiKey
      ? '<span class="status-ok">OpenAI key is set.</span>'
      : '<span class="status-err">No OpenAI key set.</span>';
  }
  updatePerplexityBadge();
}

function clearAllKeys() {
  if (!confirm('Remove your Anthropic, OpenAI and Perplexity keys from this browser? You can add them again any time.')) return;
  ['apiKey', 'openAiKey', 'perplexityKey'].forEach(k => localStorage.removeItem(k));
  ['apiKeyInput', 'openAiKeyInput', 'perplexityKeyInput'].forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });
  loadSettings();
  const el = document.getElementById('clearKeysStatus');
  if (el) el.innerHTML = '<span class="status-ok">All keys removed from this browser.</span>';
}

// ─── NAV ─────────────────────────────────────────────────────────────────────

function initNav() {
  document.querySelectorAll('.nav-item').forEach(btn => {
    btn.addEventListener('click', () => showView(btn.dataset.view));
  });

  document.querySelectorAll('.persona-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      switchPersona(btn.dataset.persona);
      showView('compose');
    });
  });

  // History audience filter chips
  document.querySelectorAll('[data-audience-filter]').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('[data-audience-filter]').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      filterHistory(btn.dataset.audienceFilter);
    });
  });

  // Hook audience filter chips
  document.querySelectorAll('[data-hook-filter]').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('[data-hook-filter]').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      filterHooksList(btn.dataset.hookFilter);
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
  // Migrate audience defaults saved by the old inline patch script
  if (!defaults.audiencePrefs) {
    const legacy = Storage.get('apiary_audience_defaults', null);
    if (legacy && Object.keys(legacy).length) { defaults.audiencePrefs = legacy; Storage.set('userDefaults', defaults); }
  }
  if (defaults.tone) {
    const el = document.getElementById('toneSelect');
    if (el) el.value = defaults.tone;
  }

  // Apply saved audience defaults to compose checkboxes
  if (defaults.audiencePrefs) {
    applyDefaultAudiences(defaults.audiencePrefs);
  }

  populateHookDropdown();
  await renderHooks();
  updateAfyaContextDates();
}

// ─── ARTICLE WRITER HELPERS ──────────────────────────────────────────────────

function clearArticleFields() {
  document.querySelectorAll('.source-content').forEach(el => el.value = '');
  document.querySelectorAll('.source-org').forEach(el => el.value = '');
  document.querySelectorAll('.source-url').forEach(el => el.value = '');
  document.querySelectorAll('.source-content').forEach(el => delete el.dataset.sourceType);
  document.querySelectorAll('.source-fetch-status').forEach(el => setFetchStatus(el, '', ''));

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
  const userTopics = Array.from(topicInputs).map(i => i.value.trim()).filter(Boolean);
  if (!userTopics.length) {
    document.getElementById('discoverError').textContent = 'Please enter at least one search topic.';
    return;
  }

  // Read selected discover audiences and enrich topic queries
  const discoverAudienceEls = document.querySelectorAll('input[name="discoverAudience"]:checked');
  const discoverAudiences = Array.from(discoverAudienceEls).map(el => el.value);
  const audienceTerms = discoverAudiences.flatMap(a => (AUDIENCE_PERSONAS[a] || {}).searchTerms || []);

  // Enrich each topic with audience-specific keywords
  const enrichedTopics = userTopics.map(topic =>
    audienceTerms.length > 0
      ? topic + ' (' + audienceTerms.slice(0, 2).join(', ') + ')'
      : topic
  );

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
  const topicList = enrichedTopics.map((t, i) => (i + 1) + '. ' + t).join('\n');

  const audienceContext = discoverAudiences.length
    ? 'Prioritize articles relevant to: ' + discoverAudiences.map(a => (AUDIENCE_PERSONAS[a] || {}).label || a).join(', ') + '.'
    : '';

  const prompt = `You are a research assistant for a healthcare content team that creates content for ${persona.fullLabel}.

Search for and return ${count} recently published articles or news items from ${recencyLabel} relevant to these topics:
${topicList}

${audienceContext}

For each article, return structured data. Focus on articles from authoritative sources: government agencies (HRSA, CMS, HHS, VA), major healthcare associations (NACHC, AAFP, AHA, DAV), academic journals, and reputable healthcare news outlets (Health Affairs, Modern Healthcare, Kaiser Health News, Stat News, etc.).

Respond with ONLY a valid JSON array — no markdown, no explanation, no code fences:
[
  {
    "title": "Full article title",
    "source": "Publisher or organization name",
    "url": "Full URL if available, or empty string",
    "date": "Publication date or 'Recent' if unknown",
    "summary": "2-3 sentence summary of what the article covers and why it matters",
    "relevance": "One sentence explaining specifically why this is relevant to the selected audiences",
    "topic": "Which of the search topics this relates to"
  }
]

Return exactly ${count} articles. Order by most relevant first.`;

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
    } else {
      // Prefer the real cited URLs Perplexity returns when the model left a URL blank
      verifyDiscoverUrls(articles, data);
      renderDiscoverResults(articles, resultsEl);
    }

  } catch (err) {
    resultsEl.innerHTML = '<div class="error-msg">Search failed: ' + escapeHtml(err.message) + '</div>';
  }

  btn.disabled = false;
  btn.innerHTML = 'Search for articles <svg width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>';
}

// Perplexity returns the pages it actually searched (citations / search_results).
// URLs the model writes into its JSON can be invented, so each one is checked
// against that list. If it is missing, a cited page with a matching title is used;
// otherwise the link is kept but marked as unverified.
function normalizeUrl(u) {
  try { const x = new URL(u); return (x.hostname.replace(/^www\./, '') + x.pathname.replace(/\/$/, '')).toLowerCase(); }
  catch { return ''; }
}

function titleWords(t) {
  return new Set(String(t || '').toLowerCase().replace(/[^a-z0-9 ]/g, ' ').split(/\s+/).filter(w => w.length > 3));
}

function verifyDiscoverUrls(articles, data) {
  const results = (data.search_results || []).map(r => ({ url: safeUrl(r.url), title: r.title || '' })).filter(r => r.url);
  (data.citations || []).forEach(u => { const su = safeUrl(u); if (su && !results.some(r => r.url === su)) results.push({ url: su, title: '' }); });
  const known = new Set(results.map(r => normalizeUrl(r.url)));

  articles.forEach(a => {
    a.url = safeUrl(a.url);
    if (a.url && known.has(normalizeUrl(a.url))) { a.urlVerified = true; return; }
    const want = titleWords(a.title);
    let best = null, bestScore = 0;
    results.forEach(r => {
      const have = titleWords(r.title);
      let hits = 0; want.forEach(w => { if (have.has(w)) hits++; });
      const score = want.size ? hits / want.size : 0;
      if (score > bestScore) { bestScore = score; best = r; }
    });
    if (best && bestScore >= 0.6) { a.url = best.url; a.urlVerified = true; return; }
    a.urlVerified = false;
  });
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
          ${article.url ? '<button class="discover-copy-url-btn" data-copy="' + escapeHtml(article.url) + '">Copy URL</button>' : ''}
          <a class="discover-search-link" href="https://www.google.com/search?q=${encodeURIComponent((article.title || '') + ' ' + (article.source || ''))}" target="_blank" rel="noopener">🔍 Search Google</a>
        </div>
      </div>
      <div class="discover-card-title">${escapeHtml(article.title || 'Untitled')}</div>
      <div class="discover-card-summary">${escapeHtml(article.summary || '')}</div>
      ${article.url && !article.urlVerified ? '<div class="discover-card-unverified">This link was not among the pages Perplexity actually searched, so it may be wrong. Open it to confirm it is the right article before using it.</div>' : ''}
      ${!article.url ? '<div class="discover-card-nourl">No direct link was returned, so full text cannot be fetched. Use Search Google to find it, then paste the URL in Compose or Article Writer.</div>' : ''}
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

async function sendToCompose(idx) {
  const article = getDiscoverArticleByIndex(idx);
  if (!article) return;

  const summaryText = [article.title, article.summary].filter(Boolean).join('\n\n');
  const alertContentEl = document.getElementById('alertContent');
  const statusEl = document.getElementById('alertFetchStatus');
  const sourceOrgEl = document.getElementById('sourceOrg');
  const articleUrlEl = document.getElementById('articleUrl');
  if (alertContentEl) alertContentEl.value = summaryText;
  if (sourceOrgEl) sourceOrgEl.value = article.source || '';
  if (articleUrlEl) articleUrlEl.value = article.url || '';

  showView('compose');
  if (alertContentEl) {
    alertContentEl.style.borderColor = 'var(--teal-500)';
    setTimeout(() => { alertContentEl.style.borderColor = ''; }, 1500);
  }

  if (article.url) {
    await fillWithArticleText(article.url, alertContentEl, statusEl, article.title, summaryText);
  } else {
    alertContentEl.dataset.sourceType = 'summary';
    setFetchStatus(statusEl, 'warn', 'This result had no direct link, so only the search summary was added. Paste the article text for accurate posts.');
  }
}

async function sendToWriter(idx) {
  const article = getDiscoverArticleByIndex(idx);
  if (!article) return;

  const summaryText = [article.title, article.summary].filter(Boolean).join('\n\n');

  // Use the first empty source block, or add a new one, so earlier sources are not overwritten
  let block = Array.from(document.querySelectorAll('.source-block'))
    .find(b => !b.querySelector('.source-content').value.trim());
  if (!block) { addSource(); const all = document.querySelectorAll('.source-block'); block = all[all.length - 1]; }

  const contentEl = block.querySelector('.source-content');
  const statusEl = block.querySelector('.source-fetch-status');
  block.querySelector('.source-org').value = article.source || '';
  block.querySelector('.source-url').value = article.url || '';
  contentEl.value = summaryText;

  showView('write');
  contentEl.style.borderColor = 'var(--teal-500)';
  setTimeout(() => { contentEl.style.borderColor = ''; }, 1500);
  block.scrollIntoView({ behavior: 'smooth', block: 'center' });

  if (article.url) {
    await fillWithArticleText(article.url, contentEl, statusEl, article.title, summaryText);
  } else {
    contentEl.dataset.sourceType = 'summary';
    setFetchStatus(statusEl, 'warn', 'This result had no direct link, so only the search summary was added. Paste the article text for an accurate article and grounding check.');
  }
}

// ─── ARTICLE WRITER ───────────────────────────────────────────────────────────

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
    '<textarea class="content-area source-content" placeholder="Paste article content, headline, or snippet — or enter a URL below and click Fetch text" style="min-height:90px;margin-bottom:6px;"></textarea>' +
    '<div class="fetch-status source-fetch-status" aria-live="polite"></div>' +
    '<div class="field-row" style="margin-bottom:0;">' +
    '<input type="text" class="field-input source-org" placeholder="Organization (e.g. NACHC, HRSA)" />' +
    '<div class="url-fetch-row">' +
    '<input type="text" class="field-input source-url" placeholder="URL (optional)" />' +
    '<button type="button" class="fetch-btn" onclick="fetchSourceFromUrl(this)" title="Pull the full article text from this URL">Fetch text</button>' +
    '</div>' +
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

async function runHallucinationCheck(article, sourcesBlock, apiKey, afyaText) {
  const takeawayLines = (article.takeaways || []).map((t, i) => {
    const claim = typeof t === 'object' ? t.claim : t;
    const source = typeof t === 'object' && t.source ? ' [Source: ' + t.source + ']' : '';
    return (i + 1) + '. ' + claim + source;
  }).join('\n');

  const checkPrompt = `You are a fact-checking assistant. Your job is to review a generated article and verify that every factual claim is directly supported by the provided source material.

SOURCES:
${sourcesBlock}
${afyaText ? '\nCOMPANY REFERENCE (Afya product information supplied by the author). Claims about Afya are supported if they appear here. Flag any Afya claim that goes beyond this text:\n' + afyaText + '\n' : ''}
ARTICLE TO CHECK:
Title: ${article.title}

Key Takeaways:
${takeawayLines}

Article Body:
${article.body}

INSTRUCTIONS:
Review each factual claim, statistic, and specific assertion in the article. Flag anything that cannot be found in the sources, contradicts the sources, or appears to be invented.

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
  "summary": "1-2 sentence overall assessment"
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
      model: CLAUDE_MODEL,
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

function renderHallucinationCheck(check, container, excerptSources) {
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
    ((excerptSources && excerptSources.length)
      ? '<div class="check-excerpt-note">Note: ' + escapeHtml(excerptSources.join(', ')) + (excerptSources.length > 1 ? ' are' : ' is') + ' only a short summary or excerpt, not the full article. This check can only confirm claims against the text you provided.</div>'
      : '') +
    '</div>' +
    issuesHtml;

  container.appendChild(card);
}

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
    const sourceType = block.querySelector('.source-content').dataset.sourceType || '';
    if (content) sources.push({ content, org, url, index: i + 1, excerptOnly: sourceType === 'summary' || content.length < 600 });
  });

  if (!sources.length) {
    document.getElementById('articleError').textContent = 'Please add at least one source.';
    return;
  }

  const angle = document.getElementById('articleAngle').value.trim();
  const includeAfyaArticle = document.getElementById('includeAfyaArticle')?.checked && Storage.get('afyaContext', null);
  const articleHooks = Storage.get(hooksStorageKey(), []);
  const articleHookId = document.getElementById('articleHookSelect')?.value || '';
  const articleHook = articleHookId ? (articleHooks.find(h => String(h.id) === articleHookId) || null) : null;
  const type = document.getElementById('articleType').value;
  const meta = ARTICLE_TYPES[type];

  // Read article writer audience selection
  const articleAudienceEls = document.querySelectorAll('input[name="articleAudience"]:checked');
  const articleAudiences = Array.from(articleAudienceEls).map(el => el.value);
  const audienceContext = articleAudiences.length
    ? 'Write this article for the following audiences: ' + articleAudiences.map(a => (AUDIENCE_PERSONAS[a] || {}).label || a).join(', ') + '. ' +
      articleAudiences.map(a => (AUDIENCE_PERSONAS[a] || {}).persona || '').filter(Boolean).join(' ')
    : '';

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

  const prompt = `You are an expert healthcare content writer. You write for Afya, a company that helps health centers capture revenue through automated care coordination documentation.

${audienceContext ? 'AUDIENCE CONTEXT:\n' + audienceContext + '\n' : ''}
Write content that synthesizes ALL of the sources below into a single cohesive piece. Every source must contribute meaningfully. Draw connections between sources only where clearly supported by the source material. Write content based STRICTLY AND ONLY on the sources provided. Do not invent examples, fabricate statistics, or add outside knowledge.
${articleHook ? '\nMESSAGING HOOK — weave this angle throughout the article: ' + articleHook.text : ''}
${angle ? '\nMESSAGING ANGLE: ' + angle : ''}
${includeAfyaArticle ? getAfyaContextBlock() : ''}
CONTENT TYPE: ${meta.label} (${meta.wordCount})

INSTRUCTIONS:
${meta.instructions}

CRITICAL WRITING RULES:
- Never use em dashes (—). Use a comma, period, or rewrite the sentence instead.
- Never use "delve", "dive into", "it is worth noting", "in today's landscape", "crucial", or "pivotal".
- Never start a sentence with "Additionally" or "Furthermore" as a lazy connector.
- Write like a skilled human journalist.
- If sources don't contain enough for the full word count, write shorter rather than padding with outside knowledge.

SOURCES:
${sourcesBlock}

Respond with ONLY a valid JSON object — no markdown, no explanation, no code fences:
{
  "title": "Compelling article title",
  "takeaways": [
    {"claim": "key takeaway text here", "source": "Source 1"}
  ],
  "body": "Full article text. Use \\n\\n for paragraph breaks. Use ## for subheadings.",
  "cta": "A specific, actionable call to action."
}`;

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
        model: CLAUDE_MODEL,
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

    renderArticle(article, meta, resultsEl);
    showImageGenSection(article);

    const checkLoadingEl = document.createElement('div');
    checkLoadingEl.className = 'loading-msg';
    checkLoadingEl.textContent = 'Running source grounding check...';
    resultsEl.appendChild(checkLoadingEl);

    try {
      const hallucinationCheck = await runHallucinationCheck(article, sourcesBlock, apiKey, includeAfyaArticle ? includeAfyaArticle.text : '');
      checkLoadingEl.remove();
      const excerptSources = sources.filter(s => s.excerptOnly).map(s => 'Source ' + s.index);
      renderHallucinationCheck(hallucinationCheck, resultsEl, excerptSources);
    } catch (checkErr) {
      checkLoadingEl.remove();
      console.warn('Hallucination check failed:', checkErr.message);
      const warn = document.createElement('div');
      warn.className = 'error-msg';
      warn.textContent = 'The source grounding check could not run (' + checkErr.message + '). Review the article against your sources before publishing.';
      resultsEl.appendChild(warn);
    }

    const articleHistoryKey = 'articleHistory_' + activePersona;
    const articleHistory = Storage.get(articleHistoryKey, []);
    articleHistory.unshift({
      timestamp: new Date().toISOString(),
      type: meta.label,
      source: sources.map(s => s.org).filter(Boolean).join(', '),
      url: sources.map(s => s.url).filter(Boolean).join(', '),
      title: article.title, body: article.body, cta: article.cta
    });
    Storage.set(articleHistoryKey, articleHistory.slice(0, 30));

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
            audiences: articleAudiences.join(', '),
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
      resultsEl.innerHTML = '<div class="error-msg">Error: ' + escapeHtml(err.message) + '</div>';
    }
  }

  btn.disabled = false;
  btn.innerHTML = 'Generate article <svg width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M13 7l5 5m0 0l-5 5m5-5H6"/></svg>';
  if (stopBtn) stopBtn.style.display = 'none';
  abortController = null;
  const clearBtn = document.getElementById('articleClearBtn');
  if (clearBtn) clearBtn.style.display = 'inline-flex';
}

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
          <button class="action-btn" data-copy="${escapeHtml(article.title || '')}">Copy</button>
        </div>
        <div class="article-title-text">${escapeHtml(article.title)}</div>
      </div>
      <div class="article-section">
        <div class="article-section-header">
          <span class="article-section-label">Key takeaways</span>
          <button class="action-btn" data-copy="${escapeHtml(takeawaysText)}">Copy</button>
        </div>
        <ul class="article-takeaways">${takeawaysHtml}</ul>
      </div>
      <div class="article-section">
        <div class="article-section-header">
          <span class="article-section-label">${escapeHtml(meta.label)} — ${escapeHtml(meta.wordCount)}</span>
          <button class="action-btn" data-copy="${escapeHtml(article.body || '')}">Copy</button>
        </div>
        <div class="article-body">${bodyHtml}</div>
      </div>
      <div class="article-section">
        <div class="article-section-header">
          <span class="article-section-label">Call to action</span>
          <button class="action-btn" data-copy="${escapeHtml(article.cta || '')}">Copy</button>
        </div>
        <div class="article-cta">${escapeHtml(article.cta || '')}</div>
      </div>
      <div class="article-copy-all">
        <button class="generate-btn" style="margin-top:0;" data-copy="${escapeHtml((article.title || '') + '\n\nKEY TAKEAWAYS\n' + takeawaysText + '\n\n' + (article.body || '') + '\n\n' + (article.cta || ''))}">
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

// ─── GLOBAL EXPORTS ───────────────────────────────────────────────────────────


function saveAfyaContext() {
  const text = document.getElementById('afyaContextInput').value.trim();
  if (!text) {
    document.getElementById('afyaContextStatus').innerHTML = '<span class="status-err">Please paste your product info first.</span>';
    return;
  }
  const timestamp = new Date().toISOString();
  Storage.set('afyaContext', { text, timestamp });
  document.getElementById('afyaContextStatus').innerHTML = '<span class="status-ok">Afya context saved!</span>';
  setTimeout(() => {
    const el = document.getElementById('afyaContextStatus');
    if (el) el.innerHTML = '';
  }, 2000);
  updateAfyaContextDates();
}

function clearAfyaContext() {
  Storage.set('afyaContext', null);
  const input = document.getElementById('afyaContextInput');
  if (input) input.value = '';
  updateAfyaContextDates();
  document.getElementById('afyaContextStatus').innerHTML = '<span class="status-ok">Context cleared.</span>';
  setTimeout(() => {
    const el = document.getElementById('afyaContextStatus');
    if (el) el.innerHTML = '';
  }, 2000);
}

function loadAfyaContext() {
  const ctx = Storage.get('afyaContext', null);
  const input = document.getElementById('afyaContextInput');
  if (input && ctx) input.value = ctx.text;
  updateAfyaContextDates();
}

function updateAfyaContextDates() {
  const ctx = Storage.get('afyaContext', null);
  const dateStr = ctx
    ? 'Last updated: ' + new Date(ctx.timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    : 'No context saved yet';
  ['afyaLastUpdated', 'afyaContextDateCompose', 'afyaContextDateArticle'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.textContent = dateStr;
  });
}

function getAfyaContextBlock(mode) {
  const ctx = Storage.get('afyaContext', null);
  if (!ctx || !ctx.text) return '';
  if (mode === 'post') {
    return `\n\nAFYA PRODUCT CONTEXT: you may add at most one short sentence connecting the news to the problem Afya solves. Stay within the platform word limit. Do not add a separate section or a hard sell, and do not make any product claim that is not stated here:\n${ctx.text}`;
  }
  return `\n\nAFYA PRODUCT CONTEXT — use this to add an opening paragraph connecting the news to the problem Afya solves, and a closing "How Afya Can Help" section. Do not fabricate any product claims beyond what is stated here. Weave naturally — not as a hard sell:\n${ctx.text}`;
}
function switchImageMode(mode, btn) {
  document.querySelectorAll('.image-mode-tab').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  document.getElementById('imageModeAuto').style.display = mode === 'auto' ? 'block' : 'none';
  document.getElementById('imageModePrompt').style.display = mode === 'prompt' ? 'block' : 'none';
  document.getElementById('imageModeUpload').style.display = mode === 'upload' ? 'block' : 'none';
}

function switchImageModeCompose(mode, btn) {
  document.querySelectorAll('.image-mode-tab-compose').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  document.getElementById('imageModeAutoCompose').style.display = mode === 'auto' ? 'block' : 'none';
  document.getElementById('imageModePromptCompose').style.display = mode === 'prompt' ? 'block' : 'none';
  document.getElementById('imageModeUploadCompose').style.display = mode === 'upload' ? 'block' : 'none';
}

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
window.filterHistory = filterHistory;
window.filterHooksList = filterHooksList;
window.saveAfyaContext = saveAfyaContext;
window.clearAfyaContext = clearAfyaContext;
window.switchImageMode = switchImageMode;
window.switchImageModeCompose = switchImageModeCompose;

document.addEventListener('DOMContentLoaded', init);
function saveOpenAiKey() {
  const key = document.getElementById('openAiKeyInput').value.trim();
  if (!key.startsWith('sk-')) {
    document.getElementById('openAiKeyStatus').innerHTML = '<span class="status-err">Invalid key — should start with sk-</span>';
    return;
  }
  Storage.set('openAiKey', key);
  document.getElementById('openAiKeyStatus').innerHTML = '<span class="status-ok">OpenAI key saved.</span>';
}

function buildImagePrompt(article) {
  const title = article.title || '';
  const tldr = (article.takeaways && article.takeaways[0])
    ? (typeof article.takeaways[0] === 'object' ? article.takeaways[0].claim : article.takeaways[0])
    : '';
  return `Professional healthcare photograph for an article titled "${title}". ${tldr ? 'The article covers: ' + tldr + '.' : ''} Show diverse community members and healthcare workers. Warm, welcoming, and authentic. No text or signs in the image. Photorealistic, high quality.`;
}

function applyImagePreset(preset) {
  const prompt = document.getElementById('imagePrompt');
  if (prompt) prompt.value = preset;
}

function applyImagePresetCompose(preset) {
  const prompt = document.getElementById('imagePromptCompose');
  if (prompt) prompt.value = preset;
}

function toggleImageSection() {
  const checkbox = document.getElementById('includeImage');
  const section = document.getElementById('imageGenSection');
  if (!section) return;
  section.style.display = checkbox.checked ? 'block' : 'none';
}

function toggleImageSectionCompose() {
  const checkbox = document.getElementById('includeImageCompose');
  const section = document.getElementById('imageGenSectionCompose');
  if (!section) return;
  if (checkbox.checked) {
    section.style.display = 'block';
    const content = document.getElementById('alertContent').value.trim();
    const source = document.getElementById('sourceOrg').value.trim();
    const prompt = document.getElementById('imagePromptCompose');
    if (prompt && content) {
      prompt.value = 'Professional healthcare photograph related to: ' + content.slice(0, 150) + (source ? ' Source: ' + source : '') + '. Diverse community members and healthcare workers. Warm and authentic. No text in image.';
    }
  } else {
    section.style.display = 'none';
  }
}

function showImageGenSection(article) {
  const section = document.getElementById('imageGenSection');
  if (!section) return;
  const checkbox = document.getElementById('includeImage');
  if (checkbox && checkbox.checked) {
    section.style.display = 'block';
  } else {
    section.style.display = 'none';
  }
  const prompt = document.getElementById('imagePrompt');
  if (prompt) prompt.value = buildImagePrompt(article);
  document.getElementById('imageResult').innerHTML = '';
  document.getElementById('imageError').textContent = '';
}

// Shared image generation used by both Article Writer and Compose.
// ids: { tabSelector, autoPrompt, customPrompt, uploadFile, uploadPrompt, style, ratio, btn, error, result, filename }
async function runImageGeneration(ids) {
  const errorEl = document.getElementById(ids.error);
  const resultEl = document.getElementById(ids.result);
  const btn = document.getElementById(ids.btn);
  const apiKey = Storage.get('openAiKey', '');
  if (!apiKey) { errorEl.textContent = 'Please add your OpenAI API key in Settings first.'; return; }

  const activeTab = document.querySelector(ids.tabSelector + '.active');
  const mode = activeTab ? (activeTab.dataset.mode || 'auto') : 'auto';
  const isUpload = mode === 'upload';
  const isCustom = mode === 'prompt';

  const promptId = isUpload ? ids.uploadPrompt : isCustom ? ids.customPrompt : ids.autoPrompt;
  const prompt = (document.getElementById(promptId)?.value || '').trim();
  if (!prompt) { errorEl.textContent = isUpload ? 'Please describe how to modify the image.' : 'Please enter an image prompt.'; return; }

  let file = null;
  if (isUpload) {
    file = document.getElementById(ids.uploadFile)?.files[0];
    if (!file) { errorEl.textContent = 'Please choose an image file to modify.'; return; }
  }

  const style = document.getElementById(ids.style)?.value || '';
  const ratio = document.getElementById(ids.ratio)?.value || '1024x1024';
  const btnHtml = btn.innerHTML;
  btn.disabled = true;
  btn.innerHTML = '<span>Generating image…</span>';
  errorEl.textContent = '';
  resultEl.innerHTML = '<div class="loading-msg">Generating your image. This usually takes 10 to 30 seconds…</div>';

  try {
    let response;
    const fullPrompt = prompt + (style ? '. Style: ' + style : '') + '. No text overlays. No watermarks.';
    if (isUpload) {
      const formData = new FormData();
      formData.append('image', file);
      formData.append('prompt', fullPrompt);
      formData.append('model', 'gpt-image-1');
      formData.append('size', ratio);
      formData.append('quality', 'medium');
      response = await fetch('https://api.openai.com/v1/images/edits', {
        method: 'POST',
        headers: { 'Authorization': 'Bearer ' + apiKey },
        body: formData
      });
    } else {
      response = await fetch('https://api.openai.com/v1/images/generations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + apiKey },
        body: JSON.stringify({ model: 'gpt-image-1', prompt: fullPrompt, n: 1, size: ratio, quality: 'medium', output_format: 'png' })
      });
    }

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.error?.message || 'OpenAI API error ' + response.status);
    }

    const data = await response.json();
    const b64 = data.data && data.data[0] && data.data[0].b64_json;
    if (!b64) throw new Error('OpenAI did not return an image. Try again or adjust the prompt.');
    const imageUrl = 'data:image/png;base64,' + b64;

    resultEl.innerHTML = `
      <div class="image-result">
        <img src="${imageUrl}" alt="Generated image" class="generated-image" />
        <div class="image-result-actions">
          <a href="${imageUrl}" download="${ids.filename}" class="save-btn" style="text-decoration:none;display:inline-flex;align-items:center;gap:6px;">
            Download image
            <svg width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3"/></svg>
          </a>
        </div>
        <div class="field-hint" style="margin-top:6px;">Download the image now. Images are not kept in History because they are too large for browser storage.</div>
      </div>`;

    saveImageToHistory({ timestamp: new Date().toISOString(), prompt, style, ratio, mode });
  } catch (err) {
    resultEl.innerHTML = '';
    errorEl.textContent = 'Error: ' + err.message;
  } finally {
    btn.disabled = false;
    btn.innerHTML = btnHtml;
  }
}

function generateImage() {
  return runImageGeneration({
    tabSelector: '.image-mode-tab', autoPrompt: 'imagePrompt', customPrompt: 'imagePromptCustom',
    uploadFile: 'imageUploadFile', uploadPrompt: 'imageUploadPrompt', style: 'imageStyle', ratio: 'imageRatio',
    btn: 'imageGenBtn', error: 'imageError', result: 'imageResult', filename: 'afya-article-image.png'
  });
}

function generateImageCompose() {
  return runImageGeneration({
    tabSelector: '.image-mode-tab-compose', autoPrompt: 'imagePromptCompose', customPrompt: 'imagePromptCustomCompose',
    uploadFile: 'imageUploadFileCompose', uploadPrompt: 'imageUploadPromptCompose', style: 'imageStyleCompose', ratio: 'imageRatioCompose',
    btn: 'imageGenBtnCompose', error: 'imageErrorCompose', result: 'imageResultCompose', filename: 'afya-social-image.png'
  });
}

function copyImageUrl(url) {
  navigator.clipboard.writeText(url).then(() => {
    alert('Image URL copied to clipboard.');
  });
}

function saveImageToHistory(image) {
  const { url, ...meta } = image; // never store base64 image data — it fills browser storage
  const history = Storage.get('imageHistory', []).map(({ url, ...m }) => m);
  history.unshift(meta);
  Storage.set('imageHistory', history.slice(0, 50));
}




window.saveOpenAiKey = saveOpenAiKey;
window.generateImageCompose = generateImageCompose;
window.fetchComposeFromUrl = fetchComposeFromUrl;
window.fetchSourceFromUrl = fetchSourceFromUrl;
window.clearAllKeys = clearAllKeys;
window.showView = showView;
window.clearHistoryFilters = clearHistoryFilters;
window.toggleHistorySection = toggleHistorySection;
window.generateImage = generateImage;

window.generateImageCompose=generateImageCompose;
window.applyImagePreset = applyImagePreset;
window.applyImagePresetCompose = applyImagePresetCompose;
window.toggleImageSection = toggleImageSection;
window.toggleImageSectionCompose = toggleImageSectionCompose;
window.showImageGenSection = showImageGenSection;
window.copyImageUrl = copyImageUrl;

