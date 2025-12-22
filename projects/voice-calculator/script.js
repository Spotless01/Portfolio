// Holographic Orb Calculator — Voice-enabled & upgraded
// Requires math.js (loaded in the page) for safe evaluation.

const expEl = document.getElementById('expression');
const prevEl = document.getElementById('preview');
const buttons = document.querySelectorAll('.k');
const themeSwitch = document.getElementById('themeSwitch');
const soundToggle = document.getElementById('soundToggle');
const speechToggle = document.getElementById('speechToggle');
const sndClick = document.getElementById('snd-click');
const sndEq = document.getElementById('snd-eq');
const voiceBtn = document.getElementById('voiceBtn');
const copyBtn = document.getElementById('copyBtn');
const historyToggle = document.getElementById('historyToggle');
const historyPanel = document.getElementById('historyPanel');
const historyList = document.getElementById('historyList');
const clearHistoryBtn = document.getElementById('clearHistoryBtn');
const exportBtn = document.getElementById('exportBtn');

let expr = '';
let soundOn = false;
let speechOn = false;
let recognizing = false;
let recognition = null;
let history = []; // {exp, result, ts}
const STORAGE_KEY = 'holocalc.v1';

function play(s){ if(soundOn && s) { try { s.cloneNode(true).play(); } catch(e){} } }

// Convert UI math symbols to mathjs-friendly text
function convertDisplayForEval(str){
  if(!str) return '';
  // Replace visual symbols with mathjs equivalents
  return str.replace(/×/g,'*')
            .replace(/÷/g,'/')
            .replace(/√/g,'sqrt')
            .replace(/\^/g,'^')
            .replace(/%/g,'%'); // mathjs supports % as modulo, we'll handle percent special-case below
}

// Use math.js for safe evaluation with percent handling
function safeEval(str){
  if(!window.math) return null;
  try{
    // Preprocess percent: transform occurrences like "50%" or "50 % of 200" into appropriate math
    // Simple rule: replace "<num>%" with "(<num>/100)"
    const pre = str.replace(/([0-9]+(\.[0-9]+)?)\s*%/g, '($1/100)');
    const r = math.evaluate(pre);
    if(Number.isFinite(r)) return r;
    return null;
  } catch(e){
    return null;
  }
}

function refresh(){
  expEl.textContent = expr || '0';
  const v = safeEval(convertDisplayForEval(expr));
  prevEl.textContent = v===null ? '—' : formatNumber(v);
}

function append(v){
  // Smart inserts for advanced tokens
  if(v === '√') {
    expr += '√(';
  } else if(v === '%') {
    // append percent as postfix
    expr += '%';
  } else if(v === '!') {
    expr += '!';
  } else {
    expr += v;
  }
  play(sndClick);
  refresh();
}
function back(){ expr = expr.slice(0,-1); play(sndClick); refresh(); }
function clr(){ expr = ''; play(sndClick); refresh(); }
function eq(){
  const v = safeEval(convertDisplayForEval(expr));
  if(v !== null){
    const formatted = String(v);
    // push to history
    addHistory({exp: expr || '0', result: formatted, ts: Date.now()});
    expr = formatted;
    play(sndEq);
    if(speechOn) speakResult(formatted);
  } else {
    // flash error (simple)
    prevEl.textContent = 'ERR';
  }
  refresh();
}

function formatNumber(n){
  // keep concise display (up to 12 significant digits)
  if(Math.abs(n) > 1e12 || (Math.abs(n) < 1e-6 && n !== 0)){
    return n.toExponential(6);
  }
  // trim trailing zeros
  return Number.isInteger(n) ? String(n) : String(Number.parseFloat(n.toPrecision(12))).replace(/(?:\.0+|(\.\d+?)0+)$/, '$1');
}

// ---------------- keyboard + button wiring ----------------
buttons.forEach(btn=>{
  btn.addEventListener('click', ()=>{
    const a = btn.dataset.action, v = btn.dataset.value;
    if(a === 'clear') return clr();
    if(a === 'back') return back();
    if(a === 'equals') return eq();
    if(v) return append(v);
  });
});

window.addEventListener('keydown', e => {
  if(document.activeElement && ['INPUT','TEXTAREA','SELECT'].includes(document.activeElement.tagName)) return;
  if(/[0-9]/.test(e.key)) return append(e.key);
  if(e.key === '.') return append('.');
  if(e.key === '(' || e.key === ')') return append(e.key);
  if(e.key === '+') return append('+');
  if(e.key === '-') return append('-');
  if(e.key === '*') return append('×');
  if(e.key === '/') return append('÷');
  if(e.key === '^') return append('^');
  if(e.key === '%') return append('%');
  if(e.key === '!' ) return append('!');
  if(e.key === 'Enter') { e.preventDefault(); return eq(); }
  if(e.key === 'Backspace') return back();
  if(e.key === 'Escape') return clr();
});

// ---------------- theme, sound, speech ----------------
function saveSettings(){
  const s = loadStorage();
  s.settings = { soundOn, speechOn, theme: themeSwitch.value };
  saveStorage(s);
}
soundToggle.addEventListener('change', ()=>{ soundOn = soundToggle.checked; saveSettings(); });
speechToggle.addEventListener('change', ()=>{ speechOn = speechToggle.checked; saveSettings(); });

themeSwitch.addEventListener('change', ()=>{ document.body.className = 'theme-' + themeSwitch.value; saveSettings(); });

// ---------------- history ----------------
function loadStorage(){
  try{
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {history: [], settings:{soundOn:false,speechOn:false,theme:'nebula'}};
  } catch(e){ return {history: [], settings:{soundOn:false,speechOn:false,theme:'nebula'}}; }
}
function saveStorage(obj){
  try{ localStorage.setItem(STORAGE_KEY, JSON.stringify(obj)); } catch(e){}
}
function loadAll(){
  const obj = loadStorage();
  history = obj.history || [];
  const settings = obj.settings || {};
  soundOn = settings.soundOn || false;
  speechOn = settings.speechOn || false;
  const theme = settings.theme || 'nebula';
  soundToggle.checked = soundOn;
  speechToggle.checked = speechOn;
  themeSwitch.value = theme;
  document.body.className = 'theme-' + theme;
  renderHistory();
}
function addHistory(item){
  history.unshift(item);
  if(history.length > 200) history.length = 200;
  saveStorage({history, settings:{soundOn, speechOn, theme: themeSwitch.value}});
  renderHistory();
}
function renderHistory(){
  historyList.innerHTML = '';
  if(history.length === 0){
    const li = document.createElement('li');
    li.textContent = 'No history yet — try a calculation';
    li.style.opacity = '0.6';
    historyList.appendChild(li);
    return;
  }
  history.forEach((h, idx) => {
    const li = document.createElement('li');
    li.tabIndex = 0;
    const left = document.createElement('div');
    left.className = 'history-item-exp';
    left.textContent = h.exp;
    const right = document.createElement('div');
    right.className = 'history-item-val';
    right.textContent = h.result;
    li.appendChild(left);
    li.appendChild(right);
    li.addEventListener('click', ()=>{ expr = h.exp; refresh(); });
    li.addEventListener('keydown', e=>{ if(e.key==='Enter') expr = h.exp, refresh(); });
    historyList.appendChild(li);
  });
}

historyToggle.addEventListener('click', ()=>{
  historyPanel.classList.toggle('hidden');
});

clearHistoryBtn.addEventListener('click', ()=>{
  if(!confirm('Clear all history?')) return;
  history = [];
  saveStorage({history, settings:{soundOn, speechOn, theme: themeSwitch.value}});
  renderHistory();
});

exportBtn.addEventListener('click', ()=>{
  const data = JSON.stringify(history, null, 2);
  const blob = new Blob([data], {type:'application/json'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = 'holo-orb-history.json';
  a.click();
  URL.revokeObjectURL(url);
});

// copy preview
copyBtn.addEventListener('click', async ()=>{
  const text = prevEl.textContent;
  try{
    await navigator.clipboard.writeText(text);
    copyBtn.textContent = '✓';
    setTimeout(()=> copyBtn.textContent = '📋', 900);
  } catch(e){
    console.warn('Copy failed', e);
  }
});

// ----------------- VOICE: Web Speech API -----------------
function setupVoice(){
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if(!SpeechRecognition){
    voiceBtn.style.display = 'none';
    console.warn('SpeechRecognition not supported in this browser. Use Chrome or Edge.');
    return;
  }

  recognition = new SpeechRecognition();
  recognition.continuous = false;
  recognition.interimResults = true;
  recognition.lang = 'en-US';

  recognition.onstart = () => {
    recognizing = true;
    voiceBtn.classList.add('listening');
    voiceBtn.title = 'Listening... Click to stop.';
    voiceBtn.setAttribute('aria-pressed','true');
  };
  recognition.onend = () => {
    recognizing = false;
    voiceBtn.classList.remove('listening');
    voiceBtn.title = 'Start voice input';
    voiceBtn.setAttribute('aria-pressed','false');
  };

  recognition.onerror = (e) => {
    console.error('Speech error', e);
    recognizing = false;
    voiceBtn.classList.remove('listening');
  };

  recognition.onresult = (event) => {
    let interim = '';
    let finalTranscript = '';
    for (let i = 0; i < event.results.length; i++) {
      const res = event.results[i];
      if (res.isFinal) finalTranscript += res[0].transcript;
      else interim += res[0].transcript;
    }
    // show interim in preview
    prevEl.textContent = interim ? interim.trim() : (finalTranscript ? finalTranscript.trim() : prevEl.textContent);
    if(finalTranscript){
      handleSpoken(finalTranscript.trim());
    }
  };
}

function toggleVoice(){
  if(!recognition) return;
  if(recognizing){ recognition.stop(); }
  else { recognition.start(); }
}

voiceBtn.addEventListener('click', toggleVoice);

// speak result (TTS)
function speakResult(text){
  if(!('speechSynthesis' in window)) return;
  try{
    const msg = new SpeechSynthesisUtterance(String(text));
    msg.lang = 'en-US';
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(msg);
  } catch(e){}
}

// Parse spoken English into calculator input (improved)
function handleSpoken(text){
  const t = text.toLowerCase();
  // quick commands
  if(/\b(clear|reset)\b/.test(t)) { clr(); return; }
  if(/\b(backspace|delete)\b/.test(t)) { back(); return; }
  if(/\b(equal|equals|calculate|compute|answer|what is)\b/.test(t)) { eq(); return; }

  // Convert words to mathematical expression
  const exprFromText = spokenToExpression(t);
  if(exprFromText){
    // if expression contains '=' or 'calculate' we evaluate, else we append
    if(/\b(calculate|equals|=)\b/.test(t) || /[=]$/.test(exprFromText)) { expr = exprFromText.replace(/=+$/,''); eq(); return; }
    // if user said a full expression, replace current
    expr = exprFromText;
    refresh();
  }
}

// Convert common spoken forms to math expression string
function spokenToExpression(t){
  let s = t;
  // common replacements
  s = s.replace(/what is /g,'');
  s = s.replace(/please /g,'');
  s = s.replace(/(\d+)\s+percent of\s+(\d+)/g, '($1/100)*$2'); // 20 percent of 300 -> (20/100)*300
  s = s.replace(/\bpercent\b/g, '%');
  s = s.replace(/\bplus\b/g, '+');
  s = s.replace(/\bminus\b/g, '-');
  s = s.replace(/\btimes\b/g, '×');
  s = s.replace(/\bmultiplied by\b/g, '×');
  s = s.replace(/\bdivided by\b/g, '÷');
  s = s.replace(/\bover\b/g, '÷');
  s = s.replace(/\bover\b/g, '÷');
  s = s.replace(/\binto\b/g, '×');
  // powers and shortcuts
  s = s.replace(/\bsquared\b/g, '^2');
  s = s.replace(/\bcubed\b/g, '^3');
  s = s.replace(/\bto the power of\b/g, '^');
  s = s.replace(/\bpower of\b/g, '^');
  s = s.replace(/\b(square root of|sqrt of|sqrt)\b/g, '√');
  s = s.replace(/\bsquare root\b/g, '√');
  // factorial
  s = s.replace(/\bfactorial of (\d+)\b/g, '$1!');
  s = s.replace(/\bfactorial\b/g, '!');
  // decimals
  s = s.replace(/\bpoint\b/g, '.');
  // convert words numbers up to 999 (simple)
  s = wordsToNumbers(s);
  // remove filler words
  s = s.replace(/\b(of|the|a|an|and|by)\b/g,' ');
  // normalize spacing and allowed chars
  s = s.replace(/[^0-9\.\+\-\*×÷\^\%\(\)\!\s\/]/g,'').replace(/\s+/g,' ').trim();
  if(!s) return '';
  return s;
}

// Convert simple English number words to digits (supporting 0-9999-ish)
function wordsToNumbers(input){
  const ones = {zero:0, one:1, two:2, three:3, four:4, five:5, six:6, seven:7, eight:8, nine:9,
                ten:10, eleven:11, twelve:12, thirteen:13, fourteen:14, fifteen:15, sixteen:16, seventeen:17, eighteen:18, nineteen:19};
  const tens = {twenty:20, thirty:30, forty:40, fifty:50, sixty:60, seventy:70, eighty:80, ninety:90};

  const parts = input.split(/\b/);
  let out = '';
  let acc = null;

  function flushAcc(){
    if(acc !== null){ out += acc; acc = null; }
  }

  for(let token of parts){
    const w = token.trim().toLowerCase();
    if(!w){ out += token; continue; }
    if(ones[w] !== undefined){
      acc = (acc || 0) + ones[w];
      continue;
    }
    if(tens[w] !== undefined){
      acc = (acc || 0) + tens[w];
      continue;
    }
    if(w === 'hundred'){
      if(acc===null) acc = 100;
      else acc = acc * 100;
      continue;
    }
    // if token contains digits already
    if(/\d/.test(w)){
      acc = (acc===null) ? w : (String(acc) + w);
      continue;
    }
    // not a number word -> flush accumulator and pass text through
    flushAcc();
    out += token;
  }
  flushAcc();
  return out;
}

// Initialize voice
setupVoice();
loadAll();
refresh();

// small convenience: auto-hide startup overlay after boot animation
setTimeout(()=>{ const s = document.getElementById('startup'); if(s) s.style.display='none'; }, 3000);

// On page unload, persist settings/history
window.addEventListener('beforeunload', ()=> saveStorage({history, settings:{soundOn, speechOn, theme: themeSwitch.value}}));