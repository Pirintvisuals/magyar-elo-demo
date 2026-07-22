// ════════════════════════════════════════════════════════════════════════════
//  SHARED ENGINE for the self-playing quote-agent demo.
//  Loaded by every <client>.html AFTER that page has defined the four globals:
//     THEME, CONFIG, MSGS, EST   (see any <client>.html or template.html)
//  You should not need to edit this file to make a new demo — only when you want
//  to change behaviour for ALL demos at once (pacing, layout, the lead card…).
// ════════════════════════════════════════════════════════════════════════════

// Apply the theme to CSS variables.
;(() => {
  const r = document.documentElement.style
  const map = { bg:'--bg', dark:'--dark', mid:'--mid', brand:'--brand', bright:'--bright',
    dot:'--dot', chatBg:'--chat-bg', tint:'--tint', tint2:'--tint2', line:'--line',
    ink:'--ink', inkSoft:'--ink-soft', ring:'--ring', cta:'--cta', cta2:'--cta2' }
  for (const k in map) if (THEME[k]) r.setProperty(map[k], THEME[k])
})()

function money(n) {
  const sign = n < 0 ? '−' : ''
  const num = Math.abs(n).toLocaleString(CONFIG.currency.locale)
  return CONFIG.currency.position === 'suffix' ? `${sign}${num}${CONFIG.currency.symbol}` : `${sign}${CONFIG.currency.symbol}${num}`
}
function esc(s) {
  if (!s && s !== 0) return ''
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;')
}
const firstName   = (EST.customer.Name || '').trim().split(/\s+/)[0] || ''
const leadInitial = (EST.customer.Name || '?').trim().charAt(0).toUpperCase()
const budgetMatch = EST.mid >= EST.budget.low && EST.mid <= EST.budget.high

// ── UI copy — English defaults, override per-client via CONFIG.labels ───────
// (needed the first time a demo isn't in English; every existing client is
// unaffected since none set CONFIG.labels)
const L = Object.assign({
  titleSuffix: 'Instant Quote (sample)',
  sampleBadge: 'Sample · not a live system',
  watchHintPre: 'Tap the chat bubble — it plays itself, ',
  watchHintBold: 'just watch',
  watchHintPost: ' ↘',
  replayTitle: 'Replay',
  closeTitle: 'Close',
  sampleStrip: 'Sample conversation — plays automatically',
  inputPlaceholder: 'Sample — no typing needed',
  estimateIntro: "Here's your estimate",
  estimateIntroSuffix: 'This is how the numbers came out:',
  estimatedTotal: 'Estimated total',
  rangeSuffix: 'range',
  timing: 'Timing',
  estimatedQuote: 'Estimated quote',
  ownerNotifSample: 'Owner notification · sample',
  howReceives: 'How {name} receives it',
  newLeadPrefix: 'New',
  budgetMatchText: "Budget match — the quote sits inside the customer's range",
  budgetAboveText: "Slightly above the customer's stated budget",
  leadLocation: 'Lead location',
  fromYou: 'From you',
  distanceUnit: 'mi',
  fromCity: 'from {city}',
  calculatedQuote: 'Calculated quote',
  theirBudget: 'Their budget',
  jobDetails: 'Job details',
  leadScore: 'Lead score',
  confirmationEmail: 'The customer received an automatic confirmation email',
  bookCallFallback: 'Book a call →',
  logoAlt: '{name} logo',
}, CONFIG.labels || {})

// ── Playback state ──────────────────────────────────────────────────────────
let isOpen    = false
let showModal = false
let revealed  = 0          // how many MSGS entries are fully shown
let typingFor = null       // 'agent' | 'user' | null  (who is mid-typing)
let finished  = false
let playId    = 0          // bumped to cancel any in-flight playback

// Pacing — brisk but still readable, like watching a sped-up video.
// (Bump these numbers up to slow it down, drop them to speed it up.)
function typeMs(t, who) { const len=(t||'').length; const base = who==='user'?240:300; return Math.min(560, base + len*4) }
function readMs(t)      { const len=(t||'').length; return Math.min(820, 340 + len*10) }

function startPlay() {
  revealed = 0; typingFor = null; finished = false; showModal = false
  const myId = ++playId
  isOpen = true
  render(); setTimeout(scrollBottom, 60)
  setTimeout(() => step(myId), 400)
}
function stopPlay() { playId++; typingFor = null }

function step(myId) {
  if (myId !== playId) return
  if (revealed >= MSGS.length) {
    finished = true; typingFor = null; render(); setTimeout(scrollBottom, 20)
    setTimeout(() => { if (myId === playId) { showModal = true; render() } }, 700)  // climax: show the owner card
    return
  }
  const msg = MSGS[revealed]
  const who = msg.r === 'user' ? 'user' : 'agent'   // estimate uses the agent typing beat
  typingFor = who
  render(); setTimeout(scrollBottom, 20)
  const tDur = msg.r === 'estimate' ? 850 : typeMs(msg.t, who)
  setTimeout(() => {
    if (myId !== playId) return
    typingFor = null; revealed++
    render(); setTimeout(scrollBottom, 20)
    const rDur = msg.r === 'estimate' ? 900 : readMs(msg.t)
    setTimeout(() => step(myId), rDur)
  }, tDur)
}

// ── Logo markup (file → FB handle → initial) ────────────────────────────────
function logoMarkup(fallbackStyle) {
  const b = CONFIG.brand
  const fb = `<span class="logo-fallback" style="display:none;${fallbackStyle||''}">${esc(b.initial)}</span>`
  const logoAlt = esc(L.logoAlt.replace('{name}', b.name))
  if (b.logoSrc) return `<img src="${esc(b.logoSrc)}" style="width:100%;height:100%;object-fit:contain" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'" alt="${logoAlt}">${fb}`
  if (b.fbHandle) return `<img src="https://graph.facebook.com/${esc(b.fbHandle)}/picture?type=large" style="width:100%;height:100%;object-fit:cover" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'" alt="${logoAlt}">${fb}`
  return `<span class="logo-fallback" style="display:flex;${fallbackStyle||''}">${esc(b.initial)}</span>`
}

// ── Hero (landing page) ─────────────────────────────────────────────────────
function buildHero() {
  const b = CONFIG.brand
  document.title = b.name + ' · ' + L.titleSuffix
  document.getElementById('hero').innerHTML = `
    <div class="sample-badge"><span class="pulse"></span>${esc(L.sampleBadge)}</div>
    <div class="logo-wrap">${logoMarkup()}</div>
    <div class="company-name">${esc(b.name)}</div>
    <div class="company-sub">${esc(b.sub)}</div>
    <div class="tagline">${esc(b.tagline)}</div>
    <div class="watch-hint">${esc(L.watchHintPre)}<b>${esc(L.watchHintBold)}</b>${esc(L.watchHintPost)}</div>`
}

// ── Render ──────────────────────────────────────────────────────────────────
// Incremental: the panel is built ONCE when the chat opens; new messages are
// appended in place (see syncChat). Never tear the whole panel down on a tick —
// that re-triggers the open animation and makes the widget flicker.
function render() {
  // Modal layer (separate from the widget)
  const existing = document.getElementById('ownerModal')
  if (showModal && !existing) { const m = buildModal(); m.id = 'ownerModal'; document.body.appendChild(m) }
  else if (!showModal && existing) existing.remove()

  const root = document.getElementById('widget-root')
  let bubble = root.querySelector('.bubble-btn')
  let panel  = root.querySelector('.chat-panel')
  let tip    = root.querySelector('.tooltip')

  if (isOpen) {
    if (tip) { tip.remove(); tip = null }
    if (!panel) { panel = buildPanel(); root.insertBefore(panel, bubble || null) }
    syncChat()
  } else {
    if (panel) { panel.remove(); panel = null }
    if (!tip) { tip = document.createElement('div'); tip.className = 'tooltip'; tip.textContent = CONFIG.tooltip; root.insertBefore(tip, bubble || null) }
  }

  if (!bubble) { bubble = buildBubble(); root.appendChild(bubble) }
  else updateBubble(bubble)
}

// Append any newly-revealed messages + the typing indicator, without rebuilding.
function syncChat() {
  const msgs = document.getElementById('msgsScroll')
  if (!msgs) return
  let shown = +(msgs.dataset.shown || 0)
  if (revealed < shown) { msgs.innerHTML = ''; shown = 0 }   // replay reset
  const typer = msgs.querySelector('.typing-indicator')
  if (typer) typer.remove()
  for (let i = shown; i < revealed; i++) msgs.appendChild(buildMessageNode(MSGS[i], i))
  msgs.dataset.shown = revealed
  if (typingFor === 'agent' || typingFor === 'user') msgs.appendChild(buildTypingNode(typingFor))

  const panel = document.querySelector('.chat-panel')
  if (panel) {
    const bar = panel.querySelector('.send-bar')
    if (finished && !bar) panel.appendChild(buildSendBar())
    else if (!finished && bar) bar.remove()
  }
  scrollBottom()
}

function buildMessageNode(msg, i) {
  if (msg.r === 'agent') {
    const showAvatar = i === 0 || MSGS[i-1].r !== 'agent'
    const wrap = document.createElement('div'); wrap.className = 'msg-agent'
    wrap.innerHTML = `<div class="avatar-dot" style="visibility:${showAvatar?'visible':'hidden'}">${agentGlyph()}</div><div class="msg-agent-bubble">${esc(msg.t)}</div>`
    return wrap
  }
  if (msg.r === 'user') {
    const wrap = document.createElement('div'); wrap.className = 'msg-user'
    wrap.innerHTML = `<div class="msg-user-bubble">${esc(msg.t)}</div>`
    return wrap
  }
  return buildCostMessage()   // estimate
}

function buildTypingNode(who) {
  const wrap = document.createElement('div')
  wrap.className = 'typing-indicator ' + (who === 'user' ? 'msg-user' : 'msg-agent')
  wrap.innerHTML = who === 'agent'
    ? `<div class="avatar-dot">${agentGlyph()}</div><div class="typing-bubble"><span></span><span></span><span></span></div>`
    : `<div class="typing-bubble user"><span></span><span></span><span></span></div>`
  return wrap
}

function buildBubble() {
  const btn = document.createElement('button')
  btn.onclick = () => { if (isOpen) { isOpen = false; stopPlay(); render() } else { startPlay() } }
  updateBubble(btn)
  return btn
}
function updateBubble(btn) {
  btn.className = 'bubble-btn ' + (isOpen ? 'bubble-open' : 'bubble-closed')
  btn.innerHTML = isOpen
    ? `<svg viewBox="0 0 14 14" fill="none" style="width:16px;height:16px"><path d="M1 1l12 12M13 1L1 13" stroke="white" stroke-width="2" stroke-linecap="round"/></svg>`
    : `<svg viewBox="0 0 24 24" fill="none" style="width:28px;height:28px"><path d="M20 2H4C2.9 2 2 2.9 2 4V22L6 18H20C21.1 18 22 17.1 22 16V4C22 2.9 21.1 2 20 2Z" fill="#fff"/></svg>`
}

function buildPanel() {
  const panel = document.createElement('div')
  panel.className = 'chat-panel'
  const b = CONFIG.brand

  // Header
  const hdr = document.createElement('header')
  hdr.className = 'chat-header'
  hdr.innerHTML = `
    <div style="display:flex;align-items:center;gap:12px">
      <div style="width:42px;height:42px;border-radius:10px;background:#fff;overflow:hidden;flex-shrink:0;display:flex;align-items:center;justify-content:center">
        ${logoMarkup('font-size:12px;font-weight:900;color:var(--mid)')}
      </div>
      <div>
        <div style="color:#fff;font-weight:700;font-size:13.5px;letter-spacing:-0.3px;line-height:1.2">${esc(b.name)}</div>
        <div style="display:flex;align-items:center;gap:5px;margin-top:3px">
          <div style="width:6px;height:6px;border-radius:50%;background:var(--dot);box-shadow:0 0 0 2px rgba(255,255,255,0.18)"></div>
          <span style="color:#cfe7d8;font-size:11px;font-weight:500">${esc(b.online)}</span>
        </div>
      </div>
    </div>
    <div class="header-actions">
      <button class="icon-btn" id="replayBtn" title="${esc(L.replayTitle)}">
        <svg viewBox="0 0 16 16" fill="none" style="width:14px;height:14px"><path d="M13.5 8a5.5 5.5 0 1 1-1.6-3.9M13.5 2v3h-3" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>
      </button>
      <button class="icon-btn" id="closeBtn" title="${esc(L.closeTitle)}">
        <svg viewBox="0 0 14 14" fill="none" style="width:12px;height:12px"><path d="M1 1l12 12M13 1L1 13" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
      </button>
    </div>`
  hdr.querySelector('#closeBtn').onclick = () => { isOpen = false; stopPlay(); render() }
  hdr.querySelector('#replayBtn').onclick = () => startPlay()
  panel.appendChild(hdr)

  // "Sample" strip
  const strip = document.createElement('div')
  strip.className = 'sample-strip'
  strip.innerHTML = `<span class="pulse"></span>${esc(L.sampleStrip)}`
  panel.appendChild(strip)

  // Messages (populated incrementally by syncChat — built empty here)
  const msgs = document.createElement('div')
  msgs.className = 'msgs-scroll'; msgs.id = 'msgsScroll'
  panel.appendChild(msgs)

  // Disabled input (it's a sample — nobody types)
  const inp = document.createElement('div')
  inp.className = 'input-area'
  inp.innerHTML = `
    <div class="input-row">
      <input class="input-field" type="text" placeholder="${esc(L.inputPlaceholder)}" disabled>
      <button class="send-btn" disabled>
        <svg viewBox="0 0 20 20" fill="none" style="width:18px;height:18px;transform:translateX(1px)"><path d="M3 10L17 3l-4 7 4 7L3 10Z" fill="white"/></svg>
      </button>
    </div>`
  panel.appendChild(inp)
  return panel   // send bar is added by syncChat once the quote is revealed
}

function agentGlyph() {
  return `<svg viewBox="0 0 14 14" fill="none" style="width:12px;height:12px"><path d="M7 1C4.24 1 2 3.24 2 6c0 1.73.89 3.25 2.23 4.15L3.5 13 7 11.5l3.5 1.5-.73-2.85A5 5 0 0 0 12 6c0-2.76-2.24-5-5-5Z" fill="#c9f0d6"/></svg>`
}

function scrollBottom() { const el = document.getElementById('msgsScroll'); if (el) el.scrollTop = el.scrollHeight }

// ── Cost breakdown — chat message ───────────────────────────────────────────
function buildCostMessage() {
  const wrap = document.createElement('div')
  wrap.className = 'msg-agent'; wrap.style.cssText = 'align-items:flex-start;'

  const avatar = document.createElement('div')
  avatar.className = 'avatar-dot'; avatar.style.marginTop = '2px'
  avatar.innerHTML = agentGlyph()

  const rows = EST.items.map((item, i) => `
    <div style="display:flex;justify-content:space-between;gap:10px;font-size:12px;color:#374151;padding:4px 0;${i<EST.items.length-1?'border-bottom:1px solid var(--line)':''}">
      <span>${esc(item.label)}</span>
      <span style="font-weight:700;color:var(--ink-soft);white-space:nowrap">${money(item.amt)}</span>
    </div>`).join('')

  const bubble = document.createElement('div')
  bubble.className = 'msg-agent-bubble'; bubble.style.cssText = 'max-width:92%;padding:12px 14px;'
  bubble.innerHTML = `
    <div style="font-size:12.5px;color:#374151;font-weight:600;margin-bottom:10px">${esc(L.estimateIntro)}${firstName?', '+esc(firstName):''}. ${esc(L.estimateIntroSuffix)}</div>
    <div style="display:flex;flex-direction:column;gap:0;margin-bottom:10px;">${rows}</div>
    <div style="background:linear-gradient(135deg,var(--tint),var(--tint2));border-radius:10px;padding:10px 12px;display:flex;justify-content:space-between;align-items:center;gap:10px;">
      <div>
        <div style="font-size:9px;text-transform:uppercase;letter-spacing:.12em;color:var(--ink);font-weight:700;margin-bottom:2px">${esc(L.estimatedTotal)}</div>
        <div style="font-size:24px;font-weight:900;color:var(--dark);letter-spacing:-1px;line-height:1">${money(EST.mid)}</div>
        <div style="font-size:10px;color:#6b7280;margin-top:2px">${money(EST.lower)} – ${money(EST.upper)} ${esc(L.rangeSuffix)}</div>
      </div>
      <div style="background:rgba(0,0,0,0.04);border:1px solid var(--line);border-radius:8px;padding:4px 10px;flex-shrink:0;text-align:center">
        <div style="font-size:9px;color:var(--ink);font-weight:700;text-transform:uppercase;letter-spacing:.08em">${esc(L.timing)}</div>
        <div style="font-size:11px;color:var(--ink);font-weight:600">${esc(EST.timingShort)}</div>
      </div>
    </div>`

  wrap.appendChild(avatar); wrap.appendChild(bubble)
  return wrap
}

// ── Send bar — fixed footer ─────────────────────────────────────────────────
function buildSendBar() {
  const bar = document.createElement('div')
  bar.className = 'send-bar'
  bar.style.cssText = 'background:#fff;border-top:1.5px solid var(--line);flex-shrink:0;padding:10px 14px 14px;display:flex;align-items:center;justify-content:space-between;gap:10px;'
  const left = document.createElement('div')
  left.innerHTML = `
    <div style="font-size:9px;text-transform:uppercase;letter-spacing:.12em;color:#6b7280;font-weight:700;margin-bottom:1px">${esc(L.estimatedQuote)}</div>
    <div style="font-size:20px;font-weight:900;color:var(--ink-soft);letter-spacing:-1px;line-height:1">${money(EST.mid)}</div>`
  const btn = document.createElement('button')
  btn.textContent = CONFIG.sendToOwnerLabel
  btn.style.cssText = 'background:linear-gradient(135deg,var(--brand),var(--mid));color:#fff;border:none;border-radius:10px;padding:10px 15px;font-size:11.5px;font-weight:800;cursor:pointer;font-family:inherit;white-space:nowrap;box-shadow:0 3px 10px rgba(0,0,0,0.2);flex-shrink:0;'
  btn.onclick = () => { showModal = true; render() }
  bar.appendChild(left); bar.appendChild(btn)
  return bar
}

// ── Owner notification modal ────────────────────────────────────────────────
function buildModal() {
  const overlay = document.createElement('div')
  overlay.className = 'modal-overlay'
  overlay.onclick = e => { if (e.target === overlay) { showModal = false; render() } }
  // Out-of-hours framing — the big selling point for trades: the bot captured a
  // qualified lead while the owner couldn't answer. Override per demo with
  // CONFIG.leadTime / CONFIG.ownerBenefit if you want different wording.
  const leadTime = CONFIG.leadTime || '9:48pm'
  const ownerBenefit = CONFIG.ownerBenefit ||
    `Captured and qualified at ${esc(leadTime)}, while you were on a job. You just wake up to a lead that's ready to quote.`

  const jobTags = EST.jobTags.map(t =>
    `<span style="font-size:12px;font-weight:600;color:var(--ink);background:var(--tint);padding:4px 12px;border-radius:20px">${esc(t)}</span>`
  ).join('') +
    `<span style="font-size:12px;font-weight:600;color:var(--ink);background:var(--tint2);border:1px solid var(--line);padding:4px 12px;border-radius:20px">${esc(EST.timingShort)}</span>`

  const budgetBox = budgetMatch
    ? `<div style="display:flex;align-items:center;gap:8px;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:10px;padding:8px 12px">
         <div style="width:20px;height:20px;border-radius:50%;background:#16a34a;display:flex;align-items:center;justify-content:center;flex-shrink:0">
           <svg viewBox="0 0 12 12" fill="none" style="width:10px;height:10px"><path d="M2 6l3 3 5-5" stroke="#fff" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>
         </div>
         <span style="font-size:12.5px;font-weight:700;color:#15803d">${esc(L.budgetMatchText)}</span>
       </div>`
    : `<div style="display:flex;align-items:center;gap:8px;background:#fffbeb;border:1px solid #fde68a;border-radius:10px;padding:8px 12px">
         <span style="font-size:14px">⚠️</span>
         <span style="font-size:12.5px;font-weight:700;color:#92400e">${esc(L.budgetAboveText)}</span>
       </div>`

  const ctaBlock = CONFIG.calendly ? `
    <div style="padding:6px 18px 20px">
      <div style="background:linear-gradient(135deg,var(--dark),var(--mid));border-radius:14px;padding:16px 18px;text-align:center">
        <div style="font-size:13px;font-weight:800;color:#fff;letter-spacing:-0.2px">${esc(CONFIG.ctaTitle || '')}</div>
        <div style="font-size:12px;color:#cfe7d8;margin:4px 0 12px;line-height:1.45">${esc(CONFIG.ctaText || '')}</div>
        <a href="${esc(CONFIG.calendly)}" target="_blank" rel="noopener"
           style="display:inline-block;background:linear-gradient(135deg,var(--cta),var(--cta2));color:#fff;text-decoration:none;font-weight:700;font-size:13px;padding:11px 22px;border-radius:10px;box-shadow:0 4px 14px rgba(0,0,0,0.25)">${esc(CONFIG.ctaButton || L.bookCallFallback)}</a>
      </div>
    </div>` : ''

  const card = document.createElement('div')
  card.className = 'modal-card'
  card.innerHTML = `
    <div style="background:linear-gradient(135deg,var(--dark),var(--mid),var(--brand));padding:16px 20px;display:flex;align-items:center;justify-content:space-between;border-radius:22px 22px 0 0">
      <div>
        <div style="font-size:10px;color:#cfe7d8;text-transform:uppercase;letter-spacing:.14em;font-weight:600;margin-bottom:3px">${esc(L.ownerNotifSample)}</div>
        <div style="color:#fff;font-weight:800;font-size:15px;letter-spacing:-0.3px">${esc(L.howReceives.replace('{name}', CONFIG.brand.name))}</div>
      </div>
      <button id="modalClose" style="background:rgba(255,255,255,0.12);border:none;color:#fff;width:34px;height:34px;border-radius:10px;cursor:pointer;display:flex;align-items:center;justify-content:center;flex-shrink:0;font-size:16px;line-height:1">✕</button>
    </div>

    <div style="padding:18px 18px 6px">
      <div style="background:var(--chat-bg);border:1.5px solid var(--line);border-radius:16px;overflow:hidden">

        <div style="background:linear-gradient(90deg,var(--mid),var(--dark));padding:9px 16px;display:flex;align-items:center;justify-content:space-between">
          <div style="display:flex;align-items:center;gap:8px">
            <div style="width:8px;height:8px;border-radius:50%;background:var(--dot);box-shadow:0 0 0 3px rgba(255,255,255,0.18)"></div>
            <span style="color:#fff;font-weight:700;font-size:11.5px;text-transform:uppercase;letter-spacing:.1em">${esc(L.newLeadPrefix)} ${esc(EST.scoreLabel)}</span>
          </div>
          <span style="color:#cfe7d8;font-size:11px;font-weight:500">${esc(leadTime)}</span>
        </div>

        <!-- Out-of-hours benefit — the line that lands with the owner -->
        <div style="padding:11px 16px;background:linear-gradient(135deg,var(--tint),var(--tint2));border-bottom:1px solid var(--line);display:flex;align-items:center;gap:10px">
          <span style="font-size:17px;line-height:1">🌙</span>
          <span style="font-size:12px;color:var(--ink);font-weight:600;line-height:1.4">${ownerBenefit}</span>
        </div>

        <div style="padding:16px 16px 12px;border-bottom:1px solid var(--line)">
          <div style="display:flex;align-items:flex-start;gap:12px">
            <div style="width:44px;height:44px;border-radius:12px;background:var(--tint);display:flex;align-items:center;justify-content:center;flex-shrink:0;font-size:18px;font-weight:900;color:var(--ink)">${esc(leadInitial)}</div>
            <div style="flex:1">
              <div style="font-size:16px;font-weight:800;color:#111827;letter-spacing:-0.3px">${esc(EST.customer.Name)}</div>
              <div style="font-size:12.5px;color:#6b7280;margin-top:2px">${esc(EST.customer.Email)}</div>
              <div style="display:flex;align-items:center;gap:6px;margin-top:6px">
                <span style="font-size:12px;font-weight:700;color:var(--ink);background:var(--tint);padding:3px 10px;border-radius:20px">📞 ${esc(EST.customer.Phone)}</span>
              </div>
            </div>
          </div>
        </div>

        <div style="padding:12px 16px;border-bottom:1px solid var(--line);background:#fff">
          <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px">
            <div style="display:flex;align-items:center;gap:8px">
              <div style="width:32px;height:32px;border-radius:8px;background:var(--tint);display:flex;align-items:center;justify-content:center;font-size:15px;flex-shrink:0">📍</div>
              <div>
                <div style="font-size:9.5px;color:#9ca3af;text-transform:uppercase;letter-spacing:.1em;font-weight:600">${esc(L.leadLocation)}</div>
                <div style="font-size:13.5px;font-weight:700;color:#111827">${esc(EST.clientCity)} · ${esc(EST.clientZip)}</div>
              </div>
            </div>
            <div style="text-align:right">
              <div style="font-size:9.5px;color:#9ca3af;text-transform:uppercase;letter-spacing:.1em;font-weight:600">${esc(L.fromYou)}</div>
              <div style="font-size:20px;font-weight:900;color:var(--ink-soft);letter-spacing:-1px;line-height:1">~${EST.distanceMi} ${esc(L.distanceUnit)}</div>
              <div style="font-size:10px;color:#9ca3af">${esc(L.fromCity.replace('{city}', EST.companyCity))}</div>
            </div>
          </div>
          <div style="margin-top:10px;height:5px;background:var(--line);border-radius:3px;overflow:hidden">
            <div style="width:26%;height:100%;background:linear-gradient(90deg,var(--dot),var(--mid));border-radius:3px"></div>
          </div>
        </div>

        <div style="padding:14px 16px;border-bottom:1px solid var(--line)">
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;gap:10px">
            <div>
              <div style="font-size:9.5px;color:#9ca3af;text-transform:uppercase;letter-spacing:.1em;font-weight:600;margin-bottom:3px">${esc(L.calculatedQuote)}</div>
              <div style="font-size:30px;font-weight:900;color:var(--dark);letter-spacing:-1.5px;line-height:1">${money(EST.mid)}</div>
              <div style="font-size:11px;color:#9ca3af;margin-top:3px">${money(EST.lower)} – ${money(EST.upper)}</div>
            </div>
            <div style="text-align:right">
              <div style="font-size:9.5px;color:#9ca3af;text-transform:uppercase;letter-spacing:.1em;font-weight:600;margin-bottom:3px">${esc(L.theirBudget)}</div>
              <div style="font-size:14px;font-weight:700;color:#111827">${money(EST.budget.low)} –</div>
              <div style="font-size:14px;font-weight:700;color:#111827">${money(EST.budget.high)}</div>
            </div>
          </div>
          ${budgetBox}
        </div>

        <div style="padding:12px 16px;border-bottom:1px solid var(--line);background:#fff">
          <div style="font-size:9.5px;color:#9ca3af;text-transform:uppercase;letter-spacing:.1em;font-weight:600;margin-bottom:8px">${esc(L.jobDetails)}</div>
          <div style="display:flex;flex-wrap:wrap;gap:6px">${jobTags}</div>
        </div>

        <div style="padding:12px 16px;background:var(--chat-bg)">
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px">
            <span style="font-size:10px;color:#6b7280;text-transform:uppercase;letter-spacing:.12em;font-weight:600">${esc(L.leadScore)}</span>
            <div style="display:flex;align-items:center;gap:7px">
              <span style="font-size:22px;font-weight:900;color:var(--ink-soft);letter-spacing:-0.5px">${EST.score}<span style="font-size:12px;font-weight:600;color:#9ca3af">/100</span></span>
              <span style="font-size:10.5px;font-weight:700;color:#fff;background:var(--brand);padding:3px 10px;border-radius:20px">${esc(EST.scoreLabel)}</span>
            </div>
          </div>
          <div style="height:6px;border-radius:3px;background:var(--line);overflow:hidden">
            <div style="height:100%;width:${EST.score}%;background:linear-gradient(90deg,var(--dot),var(--mid));border-radius:3px"></div>
          </div>
        </div>

      </div>
    </div>

    <div style="padding:14px 18px 8px;text-align:center">
      <div style="display:flex;align-items:center;justify-content:center;gap:7px;background:var(--tint2);border:1px solid var(--line);border-radius:12px;padding:10px 16px">
        <span style="font-size:14px">✉️</span>
        <span style="font-size:12px;color:var(--ink);font-weight:600">${esc(L.confirmationEmail)}</span>
      </div>
    </div>
    ${ctaBlock}`

  card.querySelector('#modalClose').onclick = () => { showModal = false; render() }
  overlay.appendChild(card)
  return overlay
}

buildHero()
render()
