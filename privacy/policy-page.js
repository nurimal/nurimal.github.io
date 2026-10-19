/* Text-only rendering: never evaluate policy content as HTML. */
(async () => {
  const root = document.getElementById('policy-content');
  const select = document.getElementById('policy-select');
  const note = document.getElementById('policy-version-note');
  const compare = (a, b) => {
    const aa = a.split('.').map(Number), bb = b.split('.').map(Number);
    for (let i = 0; i < 3; i++) if (aa[i] !== bb[i]) return aa[i] - bb[i];
    return 0;
  };
  const el = (tag, text) => { const e = document.createElement(tag); e.textContent = text; return e; };
  try {
    const response = await fetch('policies.json', {cache: 'no-cache'});
    if (!response.ok) throw Error('Policy unavailable');
    const catalog = await response.json();
    if (catalog.schemaVersion !== 1) throw Error('Unsupported schema');
    const today = new Date();
    const day = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}`;
    const policies = catalog.policies.filter(p => p.effectiveDate <= day).sort((a,b) => b.revision-a.revision);
    const params = new URLSearchParams(location.hash.slice(1));
    const version = params.get('appVersion');
    const scope = params.get('scope');
    const match = version && /^\d+\.\d+\.\d+$/.test(version)
      ? policies.find(p => (!scope || p.scope === scope) && compare(version,p.minVersion)>=0 && compare(version,p.maxVersionExclusive)<0)
      : policies[0];
    for (const p of policies) {
      const option = el('option', `${p.effectiveDate} · 앱 ${p.minVersion} 이상 ${p.maxVersionExclusive} 미만`);
      option.value = p.id; select.append(option);
    }
    function render(p) {
      root.replaceChildren(el('h1','개인정보 처리방침'));
      const date = p.effectiveDate.split('-').map(Number);
      root.append(el('p',`시행일 ${date[0]}년 ${date[1]}월 ${date[2]}일`),el('p',p.intro));
      p.sections.forEach((s,i) => {
        root.append(el('h2',`${i+1}. ${s.title}`));
        const ul = el('ul',''); s.items.forEach(t => ul.append(el('li',t))); root.append(ul);
      });
      root.append(el('h2','관련 정책'));
      const ul=el('ul','');
      p.links.forEach(l => {
        if (new URL(l.url).protocol !== 'https:') return;
        const li=el('li',''), a=el('a',l.label); a.href=l.url; li.append(a); ul.append(li);
      });
      root.append(ul);
      note.textContent = `적용 앱 버전: ${p.minVersion} 이상 ${p.maxVersionExclusive} 미만`;
      select.value=p.id;
    }
    if (match) render(match);
    else {
      root.replaceChildren(el('h1','개인정보 처리방침'),el('p','이 앱 버전에 적용되는 정책을 찾지 못했으니 앱에 표시된 정책을 확인해 주세요'));
      note.textContent='현재 홈페이지에 게시된 정책의 적용 범위 밖입니다.';
    }
    select.addEventListener('change',() => render(policies.find(p=>p.id===select.value)));
  } catch (_) {
    if (new URLSearchParams(location.hash.slice(1)).has('appVersion')) {
      root.replaceChildren(el('h1','개인정보 처리방침'),el('p','이 앱 버전의 정책을 불러오지 못했으니 앱에 저장된 정책을 확인해 주세요'));
    }
    note.textContent='최신 정책을 불러오지 못해 저장된 정책을 표시합니다.';
    select.hidden=true;
  }
})();
