(() => {
  const expressionEl = document.getElementById('expression');
  const resultEl = document.getElementById('result');
  const keypad = document.getElementById('keypad');
  const historyList = document.getElementById('historyList');
  const historyKey = 'smartcalc-history-v1';
  let current = '0';
  let expression = '';
  let justEvaluated = false;
  let history = loadHistory();

  function loadHistory() {
    try { const saved = JSON.parse(localStorage.getItem(historyKey) || '[]'); return Array.isArray(saved) ? saved.slice(0,20) : []; }
    catch { return []; }
  }
  function saveHistory() { try { localStorage.setItem(historyKey, JSON.stringify(history)); } catch {} }
  function pretty(value) { return value.replace(/\*/g, '×').replace(/\//g, '÷').replace(/-/g, '−'); }
  function update() {
    expressionEl.textContent = expression || 'Ready when you are';
    resultEl.textContent = current;
  }
  function append(value) {
    if (justEvaluated && /[0-9.]/.test(value)) { current = '0'; expression = ''; }
    justEvaluated = false;
    if (['+','−','×','÷'].includes(value)) {
      if (current === 'Error') current = '0';
      if (/[+−×÷]$/.test(current)) current = current.slice(0,-1);
      current += value;
    } else if (value === '.') {
      const segment = current.split(/[+−×÷]/).pop();
      if (!segment.includes('.')) current += segment ? '.' : '0.';
    } else {
      if (current === '0' || current === 'Error') current = value;
      else if (current.length < 22) current += value;
    }
    update();
  }
  function calculate(source) {
    let normalized = source.replace(/×/g,'*').replace(/÷/g,'/').replace(/−/g,'-');
    if (!/^[0-9+*/.() -]+$/.test(normalized) || !normalized.trim()) throw new Error('Invalid input');
    if (/[+*/.-]$/.test(normalized.trim())) throw new Error('Incomplete expression');
    const value = Function('"use strict"; return (' + normalized + ')')();
    if (typeof value !== 'number' || !Number.isFinite(value)) throw new Error('Cannot divide by zero');
    return Number.parseFloat(value.toPrecision(12)).toString();
  }
  function equals() {
    if (current === 'Error') return;
    const source = current;
    try {
      const answer = calculate(source);
      expression = pretty(source) + ' =';
      current = answer;
      history.unshift({ expression: pretty(source), answer, time: Date.now() });
      history = history.slice(0,20);
      saveHistory(); renderHistory(); justEvaluated = true; update();
    } catch (error) {
      expression = error.message === 'Cannot divide by zero' ? 'Cannot divide by zero' : 'Check your expression';
      current = 'Error'; justEvaluated = true; update();
    }
  }
  function clear() { current = '0'; expression = ''; justEvaluated = false; update(); }
  function removeLast() {
    if (justEvaluated || current === 'Error') { clear(); return; }
    current = current.length > 1 ? current.slice(0,-1) : '0';
    if (current === '−') current = '0';
    update();
  }
  function percent() {
    try {
      const parts = current.split(/([+−×÷])/);
      const last = parts.pop();
      const number = Number(last);
      if (!Number.isFinite(number)) return;
      parts.push(String(number / 100)); current = parts.join(''); update();
    } catch {}
  }
  function sign() {
    if (current === '0' || current === 'Error') return;
    const parts = current.split(/([+−×÷])/);
    const last = parts.pop();
    parts.push(String(Number(last) * -1));
    current = parts.join(''); update();
  }
  function renderHistory() {
    historyList.innerHTML = '';
    if (!history.length) {
      const empty = document.createElement('div'); empty.className = 'empty-history';
      const icon = document.createElement('span'); icon.className = 'empty-icon'; icon.textContent = '↗';
      const title = document.createElement('p'); title.textContent = 'No calculations yet';
      const hint = document.createElement('span'); hint.textContent = 'Your results will appear here.';
      empty.append(icon,title,hint); historyList.append(empty); return;
    }
    history.forEach(item => {
      const row = document.createElement('button'); row.type = 'button'; row.className = 'history-item'; row.setAttribute('aria-label', 'Use result ' + item.answer);
      const details = document.createElement('span');
      const formula = document.createElement('span'); formula.className = 'history-expression'; formula.textContent = item.expression;
      const answer = document.createElement('span'); answer.className = 'history-answer'; answer.textContent = '= ' + item.answer;
      details.append(formula,answer);
      const use = document.createElement('span'); use.className = 'history-use'; use.textContent = '↙';
      row.append(details,use); row.addEventListener('click', () => { current = item.answer; expression = item.expression + ' ='; justEvaluated = true; update(); });
      historyList.append(row);
    });
  }
  keypad.addEventListener('click', event => {
    const key = event.target.closest('button'); if (!key) return;
    if (key.dataset.value !== undefined) append(key.dataset.value);
    else ({clear, delete:removeLast, percent, sign, equals}[key.dataset.action] || (()=>{}))();
  });
  document.addEventListener('keydown', event => {
    if (event.ctrlKey || event.metaKey || event.altKey) return;
    if (/^[0-9]$/.test(event.key)) append(event.key);
    else if (event.key === '.') append('.');
    else if (event.key === '+') append('+');
    else if (event.key === '-') append('−');
    else if (event.key === '*') append('×');
    else if (event.key === '/') { event.preventDefault(); append('÷'); }
    else if (event.key === 'Enter' || event.key === '=') { event.preventDefault(); equals(); }
    else if (event.key === 'Backspace') removeLast();
    else if (event.key === 'Escape') clear();
    else if (event.key === '%') percent();
  });
  document.getElementById('clearHistory').addEventListener('click', () => { history = []; saveHistory(); renderHistory(); });
  document.getElementById('themeToggle').addEventListener('click', () => {
    document.documentElement.classList.toggle('light');
    try { localStorage.setItem('smartcalc-theme', document.documentElement.classList.contains('light') ? 'light' : 'dark'); } catch {}
  });
  try { if (localStorage.getItem('smartcalc-theme') === 'light') document.documentElement.classList.add('light'); } catch {}
  renderHistory(); update();
})();