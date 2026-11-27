import { mountActivity } from './activities/ui';
import { IDS, LEGEND, getParcours, intro, type PId } from './content';
import { diagramSVG, esc } from './render';
import { buildReport, correction, examScore, reportHTML, verifyReport, type ReportFile } from './report';
import { caseState, levelFourDone, load, moduleStatus, newStore, recordAttempt, recordHint, rec, save, summary, type CaseState, type Store } from './state';
import { DIAG_NAME, LEVEL_NAME, type CaseDef, type DiagKind, type Module, type Parcours, type Step } from './types';

let store: Store = load();
const app = (): HTMLElement => document.getElementById('app') as HTMLElement;
const ST: Record<CaseState, [string, string]> = { todo: ['À faire', 'todo'], acquise: ['Acquise', 'acq'], maitrisee: ['Maîtrisée', 'ok'], consolider: ['À consolider', 'warn'] };
const chip = (s: CaseState): string => `<span class="st ${ST[s][1]}">${ST[s][0]}</span>`;
const isPid = (x: string | undefined): x is PId => !!x && (IDS as readonly string[]).includes(x);

function download(name: string, mime: string, text: string): void {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([text], { type: mime }));
  a.download = name; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}
function twoStep(btn: HTMLButtonElement, label: string, run: () => void): void {
  let armed = false;
  btn.addEventListener('click', () => {
    if (!armed) { armed = true; btn.textContent = 'Confirmer : ' + label; setTimeout(() => { armed = false; btn.textContent = label; }, 4000); return; }
    run();
  });
}
function who(): void { const w = document.getElementById('who'); if (w) w.textContent = store.name ? store.name : ''; }

/* ---------------- éléments d'interface ---------------- */
const ICON = {
  eye: '<svg viewBox="0 0 48 48" aria-hidden="true"><path d="M4 24s8-13 20-13 20 13 20 13-8 13-20 13S4 24 4 24z" fill="none" stroke="currentColor" stroke-width="3"/><circle cx="24" cy="24" r="6" fill="currentColor"/></svg>',
  hand: '<svg viewBox="0 0 48 48" aria-hidden="true"><rect x="5" y="10" width="16" height="12" rx="3" fill="none" stroke="currentColor" stroke-width="3"/><rect x="27" y="26" width="16" height="12" rx="3" fill="none" stroke="currentColor" stroke-width="3"/><path d="M21 16h8v10" fill="none" stroke="currentColor" stroke-width="3"/></svg>',
  bulb: '<svg viewBox="0 0 48 48" aria-hidden="true"><path d="M24 6a12 12 0 0 0-7 21.7V33h14v-5.3A12 12 0 0 0 24 6z" fill="none" stroke="currentColor" stroke-width="3"/><path d="M18 40h12M20 44h8" stroke="currentColor" stroke-width="3" stroke-linecap="round"/></svg>',
  check: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  lock: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="11" width="14" height="9" rx="2" fill="none" stroke="currentColor" stroke-width="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3" fill="none" stroke="currentColor" stroke-width="2"/></svg>',
  medal: '<svg viewBox="0 0 64 64" aria-hidden="true"><path d="M20 4h10l6 18H26zM44 4H34l-6 18h10z" fill="#e8871e"/><circle cx="32" cy="40" r="17" fill="#ffc83d" stroke="#e8871e" stroke-width="3"/><path d="M24 40l6 6 11-12" fill="none" stroke="#7a4a00" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/></svg>',
};
const HERO_ART = `<svg viewBox="0 0 420 250" role="img" aria-label="Exemple de diagramme : un poste, un serveur et un annuaire reliés"><g class="ha">
<rect x="14" y="92" width="104" height="58" rx="10"/><text x="66" y="118" text-anchor="middle" class="t1">poste</text><text x="66" y="136" text-anchor="middle" class="t2">: PosteDeTravail</text>
<rect x="158" y="92" width="104" height="58" rx="10"/><text x="210" y="118" text-anchor="middle" class="t1">serveurAuth</text><text x="210" y="136" text-anchor="middle" class="t2">: Serveur…</text>
<rect x="302" y="92" width="104" height="58" rx="10"/><text x="354" y="118" text-anchor="middle" class="t1">annuaire</text><text x="354" y="136" text-anchor="middle" class="t2">: Annuaire</text>
<path class="flow" d="M118 121H158"/><path class="flow" d="M262 121H302"/>
<rect x="130" y="14" width="160" height="44" rx="10" class="req"/><text x="210" y="33" text-anchor="middle" class="t1">EX-02</text><text x="210" y="49" text-anchor="middle" class="t2">moins de 3 secondes</text>
<path class="dash" d="M210 92V58"/>
<rect x="130" y="190" width="160" height="44" rx="10" class="tst"/><text x="210" y="209" text-anchor="middle" class="t1">T-02</text><text x="210" y="225" text-anchor="middle" class="t2">10 mesures</text>
<path class="dash" d="M210 190V150"/></g></svg>`;
const ring = (pct: number, color: string): string => { const c = 2 * Math.PI * 22; return `<svg class="ring" viewBox="0 0 56 56" aria-label="${pct} %" role="img"><circle cx="28" cy="28" r="22" fill="none" stroke="var(--line2)" stroke-width="6"/><circle cx="28" cy="28" r="22" fill="none" stroke="${color}" stroke-width="6" stroke-linecap="round" stroke-dasharray="${(c * pct) / 100} ${c}" transform="rotate(-90 28 28)"/><text x="28" y="33" text-anchor="middle">${pct}</text></svg>`; };
const PCOL: Record<string, string> = { ciel: '#0e9aa7', tssr: '#e8871e', bts: '#7c4dff' };
const introDone = (): boolean => moduleStatus(intro(), store.acts.intro) === 'done';

/* ---------------- accueil ---------------- */
function home(): void {
  who();
  const iDone = introDone();
  app().innerHTML = `<section class="hero"><div class="hero-txt"><p class="eyebrow">Bac pro CIEL · TSSR · BTS SIO SISR</p><h1>Comprends les diagrammes <em>en les manipulant</em></h1>
<p class="lead">Une mission concrète, une étape à la fois : tu observes, tu essaies, puis seulement tu nommes. À la fin, tu sais lire un dossier technique, l'expliquer et le compléter.</p>
<div class="row"><a class="btn primary big" href="#/intro">${iDone ? 'Revoir : à quoi sert SysML ?' : 'Commencer : à quoi sert SysML ?'}</a><a class="btn ghost" href="#/legend">Aide-mémoire</a></div></div><div class="hero-art">${HERO_ART}</div></section>
<section class="how"><div class="how-i"><span class="ic c1">${ICON.eye}</span><b>J'observe</b><span>Un cas réel de l'entreprise NovaTech, expliqué simplement.</span></div><div class="how-i"><span class="ic c2">${ICON.hand}</span><b>Je manipule</b><span>Je joue des pannes, je complète, je construis.</span></div><div class="how-i"><span class="ic c3">${ICON.bulb}</span><b>Je comprends</b><span>Le mot technique arrive après, et chaque erreur est expliquée.</span></div></section>
<h2 class="sec">Choisis ton parcours</h2>
<div class="grid parcours">${IDS.map((id) => { const p = getParcours(id); const sm = summary(p, store.acts[id]); const done = sm.connaissances.length + sm.competences.length; const pct = Math.round((100 * done) / sm.total); return `<article class="pcard p-${id}" style="--c:${PCOL[id]}"><div class="pband"><span class="plevel">${esc(p.levelLabel)}</span>${ring(pct, '#fff')}</div><div class="pbody"><h3>${esc(p.name)}</h3><p>${esc(p.orient)}</p><p class="mute">${p.modules.filter((m) => !m.exam).length} missions · carnet de ${sm.total} cases</p><div class="row"><a class="btn primary" href="#/p/${id}">${sm.started ? 'Continuer' : 'Commencer'}</a><a class="btn" href="#/p/${id}/carnet">Mon carnet</a></div></div></article>`; }).join('')}</div>
<div class="card namecard"><label>Ton nom <span class="mute">(rapport et évaluation personnalisée)</span> <input type="text" id="name" value="${esc(store.name)}" autocomplete="name"></label>
<span class="mute">Ta progression reste dans ce navigateur ; rien n'est envoyé sur un serveur.</span></div>
<div class="row"><a class="btn" href="#/teacher">Vue enseignant</a><a class="btn" href="#/about">Méthode</a></div>`;
  (document.getElementById('name') as HTMLInputElement).addEventListener('input', (e) => { store.name = (e.target as HTMLInputElement).value.trim(); save(store); who(); });
}

/* ---------------- parcours : la carte des missions ---------------- */
const MS = { todo: 'À faire', doing: 'En cours', done: 'Terminée' } as const;
function parcoursView(pid: PId): void {
  const p = getParcours(pid);
  const acts = store.acts[pid];
  let current = true;
  const items = p.modules.map((m) => {
    const stt = moduleStatus(m, acts);
    const href = `#/p/${pid}/${m.exam ? 'exam' : 'm/' + m.id}`;
    const isCur = current && stt !== 'done' && !m.optional; if (isCur) current = false;
    const cls = stt === 'done' ? 'done' : isCur ? 'cur' : '';
    return `<li class="mi ${cls}"><a class="mnode" href="${href}" aria-label="${esc(m.title)}">${stt === 'done' ? ICON.check : esc(m.n)}</a><a class="mcard" href="${href}"><span class="mtitle">${esc(m.title)}</span><span class="mmeta"><span class="chip">Niveau ${m.level}</span>${m.optional ? '<span class="chip opt">facultatif</span>' : ''}${m.exam ? '<span class="chip opt">évaluation</span>' : ''}${m.exam ? '' : `<span class="st ${stt === 'done' ? 'ok' : stt === 'doing' ? 'acq' : 'todo'}">${MS[stt]}</span>`}</span></a></li>`;
  }).join('');
  app().innerHTML = `<p class="crumb"><a href="#/">Accueil</a> › ${esc(p.name)}</p>
<section class="phero" style="--c:${PCOL[pid]}"><div><h1>${esc(p.name)}</h1><p>${esc(p.situation)}</p><p class="chipline"><span class="chip inv">${esc(p.levelLabel)}</span></p></div><a class="btn inv" href="#/p/${pid}/carnet">Mon carnet</a></section>
${introDone() ? '' : `<div class="banner"><b>Avant de commencer :</b> prends dix minutes pour comprendre à quoi sert SysML et comment on dessine. <a class="btn primary small" href="#/intro">Y aller</a></div>`}
<p class="mute">${esc(p.statut)}</p>
<ol class="map">${items}</ol>`;
}

interface ModCtx { pid: string; backHref: string; backLabel: string; prev: Module | undefined; next: Module | undefined; modHref(m: Module): string }
function moduleLayout(m: Module, c: ModCtx): void {
  const stepsMode = !!m.steps;
  app().innerHTML = `<p class="crumb"><a href="${c.backHref}">${esc(c.backLabel)}</a> › ${esc(m.n)}</p>
<div class="modwrap"><aside class="side" aria-label="Plan de la mission"><div class="sidecard"><p class="sidek">Mission ${esc(m.n)}</p><p class="sidet">${esc(m.title)}</p><div class="bar"><span id="barfill"></span></div><ol class="stepnav" id="stepnav"></ol></div><div class="sidecard" id="words" hidden><p class="sidek">Mots appris</p><ul id="wordlist"></ul></div><a class="btn small wide" href="#/legend">Aide-mémoire</a></aside>
<div class="modmain"><section class="mhead"><h1>${esc(m.title)}</h1><p><span class="chip">Niveau ${m.level} : ${LEVEL_NAME[m.level]}</span>${m.optional ? '<span class="chip opt">facultatif</span>' : ''}</p>
${m.situation ? `<div class="scene"><b>La situation.</b> ${esc(m.situation)}</div>` : ''}
<p class="why"><b>Pourquoi ?</b> ${m.pourquoi}</p>
<details class="more"><summary>Objectifs, prérequis et critère de réussite</summary><ul>${m.objectives.map((o) => `<li>${esc(o)}</li>`).join('')}</ul><p><b>Prérequis :</b> ${m.prereq.map(esc).join(', ')}</p><p><b>Tu as réussi si :</b> ${esc(m.success)}</p></details></section>
${m.cours.length ? `<h2>Cours</h2>${m.cours.map((x) => `<p>${x}</p>`).join('')}` : ''}
${m.exemple ? `<h2>Exemple commenté</h2><div class="dgmwrap">${diagramSVG(m.exemple.diagram, { numbered: true })}</div><ul>${m.exemple.notes.map((n) => `<li>${n}</li>`).join('')}</ul>` : ''}
<div id="acts"></div></div></div>`;
  const prog = (): void => {
    const n = m.activities.filter((a) => rec(store, c.pid, a.id).ok).length;
    const f = document.getElementById('barfill'); if (f) f.style.width = `${Math.round((100 * n) / m.activities.length)}%`;
  };
  prog();
  const host = document.getElementById('acts') as HTMLElement;
  if (stepsMode) { guidedSteps(host, c, m, prog); return; }
  m.activities.forEach((a, i) => {
    const card = document.createElement('section');
    card.className = 'card act'; host.appendChild(card);
    mountActivity(card, a, { exam: false, onCheck: (v) => { recordAttempt(store, c.pid, a.id, v); save(store); prog(); }, onHint: () => { recordHint(store, c.pid, a.id); save(store); } });
    card.insertAdjacentHTML('afterbegin', `<h3>Activité ${i + 1}</h3>`);
  });
}

function moduleView(pid: PId, mid: string): void {
  const p = getParcours(pid);
  const idx = p.modules.findIndex((m) => m.id === mid);
  const m = p.modules[idx];
  if (!m) { location.hash = `#/p/${pid}`; return; }
  moduleLayout(m, { pid, backHref: `#/p/${pid}`, backLabel: p.name, prev: p.modules[idx - 1], next: p.modules[idx + 1], modHref: (x) => `#/p/${pid}/${x.exam ? 'exam' : 'm/' + x.id}` });
}
function introView(): void {
  moduleLayout(intro(), { pid: 'intro', backHref: '#/', backLabel: 'Accueil', prev: undefined, next: undefined, modHref: () => '#/' });
}

/** TP guidé : une étape à la fois ; la suivante se débloque quand l'actuelle est réussie ; le mot technique vient après l'action. */
function guidedSteps(host: HTMLElement, c: ModCtx, m: Module, prog: () => void): void {
  const steps = m.steps as Step[];
  const cards: HTMLElement[] = [];
  const ok = (i: number): boolean => rec(store, c.pid, (steps[i] as Step).act.id).ok;
  const reveal = (i: number): void => { const k = cards[i]; if (k) k.hidden = false; };
  const side = (): void => {
    const cur = steps.findIndex((_, i) => !ok(i));
    (document.getElementById('stepnav') as HTMLElement).innerHTML = steps.map((_, i) => { const done = ok(i); const open = !cards[i]?.hidden; const label = `Étape ${i + 1}`; return `<li class="${done ? 'done' : i === cur ? 'cur' : open ? '' : 'lock'}"><a href="#" data-go="${i}" ${open ? '' : 'aria-disabled="true" tabindex="-1"'}><span class="dot">${done ? ICON.check : open ? i + 1 : ICON.lock}</span>${label}</a></li>`; }).join('');
    document.querySelectorAll<HTMLElement>('[data-go]').forEach((a) => a.addEventListener('click', (e) => { e.preventDefault(); const k = cards[Number(a.dataset.go)]; if (k && !k.hidden) k.scrollIntoView({ behavior: 'smooth', block: 'start' }); }));
    const words = steps.filter((s, i) => s.name && ok(i));
    (document.getElementById('words') as HTMLElement).hidden = !words.length;
    (document.getElementById('wordlist') as HTMLElement).innerHTML = words.map((s) => `<li><b>${s.name?.w}</b></li>`).join('');
  };
  const after = (i: number, card: HTMLElement): void => {
    const s = steps[i] as Step;
    card.classList.add('okcard');
    card.querySelector('.after')?.remove();
    const box = document.createElement('div');
    box.className = 'after';
    box.innerHTML = (s.debrief ? `<div class="note">${s.debrief}</div>` : '') + (s.name ? `<div class="word"><span class="chip">Nouveau mot</span> <b>${s.name.w}</b> : ${s.name.def}</div>` : '');
    const last = i === steps.length - 1;
    if (last) {
      const nx = c.next;
      box.insertAdjacentHTML('beforeend', `<div class="done-banner"><span class="medal">${ICON.medal}</span><div><b>Mission terminée.</b> Bien joué.${nx ? `<br><a class="btn primary" href="${c.modHref(nx)}">Mission suivante : ${esc(nx.title)}</a>` : c.pid === 'intro' ? `<br><a class="btn primary" href="#/">Choisir mon parcours</a>` : `<br><a class="btn primary" href="#/p/${c.pid}">Retour à la carte des missions</a>`}</div></div>`);
    } else box.insertAdjacentHTML('beforeend', '<p><button class="btn primary" data-next="1">Étape suivante</button></p>');
    card.appendChild(box);
    box.querySelector('[data-next]')?.addEventListener('click', () => { reveal(i + 1); side(); cards[i + 1]?.scrollIntoView({ behavior: 'smooth', block: 'start' }); });
  };
  steps.forEach((s, i) => {
    const card = document.createElement('section');
    card.className = 'card act step'; card.hidden = true; card.setAttribute('aria-label', `Étape ${i + 1}`);
    card.innerHTML = `<h3><span class="num">${i + 1}</span> Étape ${i + 1} sur ${steps.length}</h3><div class="guide"><span class="av" aria-hidden="true">?</span><div>${s.say}</div></div><div class="stepact"></div>`;
    host.appendChild(card); cards.push(card);
    const slot = card.querySelector('.stepact') as HTMLElement;
    mountActivity(slot, s.act, { exam: false, onCheck: (v) => { recordAttempt(store, c.pid, s.act.id, v); save(store); prog(); if (v.ok) { after(i, card); side(); } }, onHint: () => { recordHint(store, c.pid, s.act.id); save(store); } });
  });
  // reprise : on rouvre jusqu'à la première étape non réussie
  let first = steps.findIndex((_, i) => !ok(i)); if (first < 0) first = steps.length - 1;
  for (let i = 0; i <= first; i++) { reveal(i); if (ok(i)) after(i, cards[i] as HTMLElement); }
  side();
}

/* ---------------- aide-mémoire ---------------- */
function legendView(): void {
  app().innerHTML = `<p class="crumb"><a href="#/">Accueil</a> › Aide-mémoire</p><h1>Aide-mémoire de notation</h1><p class="lead">Les formes, les traits et leur sens. À garder ouvert pendant les missions.</p>
<div class="grid legend">${LEGEND.map((l) => `<article class="card"><h2>${esc(l.title)}</h2><div class="dgmwrap">${diagramSVG(l.diagram)}</div><ul>${l.points.map((x) => `<li>${x}</li>`).join('')}</ul></article>`).join('')}</div>`;
}

/* ---------------- carnet ---------------- */
function carnetTable(p: Parcours, acts: Store['acts'][string] | undefined): string {
  const kinds: DiagKind[] = [];
  p.cases.forEach((c) => { if (!kinds.includes(c.d)) kinds.push(c.d); });
  const find = (d: DiagKind, l: number): CaseDef | undefined => p.cases.find((c) => c.d === d && c.level === l);
  const rows = kinds.map((d) => `<tr><th scope="row">${esc(DIAG_NAME[d])}</th>${[1, 2, 3].map((l) => { const c = find(d, l); return `<td>${c ? chip(caseState(p, acts, c)) + (c.optional ? ' <span class="mute">fac.</span>' : '') : '<span class="mute">—</span>'}</td>`; }).join('')}</tr>`).join('');
  const n4 = p.modules.some((m) => m.activities.some((a) => a.tag?.level === 4)) ? `<p>Démarche d'étude de cas (niveau 4, hors grille) : ${levelFourDone(p, acts) ? '<span class="st ok">Réalisée</span>' : '<span class="st todo">À faire</span>'}</p>` : '';
  return `<table class="t"><thead><tr><th>Diagramme</th><th>Niveau 1<br><span class="mute">Information</span></th><th>Niveau 2<br><span class="mute">Expression</span></th><th>Niveau 3<br><span class="mute">Outils</span></th></tr></thead><tbody>${rows}</tbody></table>${n4}`;
}
const caseName = (c: CaseDef): string => `${DIAG_NAME[c.d]} niveau ${c.level}`;
function carnetView(pid: PId): void {
  const p = getParcours(pid);
  const acts = store.acts[pid];
  const sm = summary(p, acts);
  const list = (a: CaseDef[], empty: string): string => (a.length ? `<ul>${a.map((c) => `<li>${esc(caseName(c))}</li>`).join('')}</ul>` : `<p class="mute">${empty}</p>`);
  app().innerHTML = `<p><a href="#/p/${pid}">← ${esc(p.name)}</a></p><h1>Carnet — ${esc(p.name)}</h1>
<p class="lead">Chaque case est un diagramme travaillé à un niveau. « Maîtrisée » : réussie du premier coup et sans indice. « Acquise » : réussie, avec aide. « À consolider » : commencée mais pas réussie, ou réussie après trois essais ou plus.</p>
<div class="card">${carnetTable(p, acts)}</div>
<div class="grid"><div class="card"><h3>Connaissances acquises</h3>${list(sm.connaissances, 'Rien pour le moment.')}</div><div class="card"><h3>Compétences travaillées</h3>${list(sm.competences, 'Rien pour le moment.')}</div><div class="card"><h3>Notions à consolider</h3>${list(sm.consolider, 'Rien à consolider.')}</div></div>
<p class="mute">Ce carnet décrit un travail réalisé en autonomie. Il peut servir d'élément de preuve parmi d'autres ; il ne valide pas une compétence à lui seul.</p>
<div class="row"><button class="btn" id="exp">Exporter mon rapport (JSON)</button><button class="btn" id="expH">Rapport imprimable (HTML)</button><button class="btn" id="reset">Effacer ma progression</button></div>`;
  (document.getElementById('exp') as HTMLElement).addEventListener('click', async () => { const r = await buildReport(store, p); download(`sysml-lab-${pid}.json`, 'application/json', JSON.stringify(r, null, 1)); });
  (document.getElementById('expH') as HTMLElement).addEventListener('click', async () => { const r = await buildReport(store, p); download(`sysml-lab-${pid}.html`, 'text/html', reportHTML(r, p)); });
  twoStep(document.getElementById('reset') as HTMLButtonElement, 'Effacer ma progression', () => { delete store.acts[pid]; delete store.exam[pid]; save(store); carnetView(pid); });
}

/* ---------------- évaluation finale ---------------- */
function examView(pid: PId): void {
  const base = getParcours(pid);
  const ex = store.exam[pid];
  if (!ex) {
    app().innerHTML = `<p><a href="#/p/${pid}">← ${esc(base.name)}</a></p><h1>Évaluation finale — ${esc(base.name)}</h1>
<div class="card"><ul><li>Une seule tentative par question, sans indice ni explication.</li><li>La correction détaillée et ta note sur 20 apparaissent à la fin.</li><li>Les valeurs du cas (noms de machines, adresses) dépendent de ton nom.</li><li>Tu peux quitter et reprendre : tes réponses sont conservées dans ce navigateur.</li></ul>
<label>Ton nom <input type="text" id="en" value="${esc(store.name)}"></label>
<p class="mute">Grille : ${base.grille.map((c) => `${esc(c.label)} ${c.pts} pts`).join(' ; ')}.</p>
<button class="btn primary" id="go">Commencer l'évaluation</button> <span id="err" class="mute"></span></div>`;
    (document.getElementById('go') as HTMLElement).addEventListener('click', () => {
      const n = (document.getElementById('en') as HTMLInputElement).value.trim();
      if (!n) { (document.getElementById('err') as HTMLElement).textContent = 'Indique ton nom.'; return; }
      store.name = n; store.exam[pid] = { name: n, items: {}, finished: false }; save(store); examView(pid);
    });
    return;
  }
  const p = getParcours(pid, ex.name);
  const m = p.modules.find((x) => x.exam);
  if (!m) return;
  if (!ex.finished) {
    app().innerHTML = `<p><a href="#/p/${pid}">← ${esc(p.name)}</a></p><h1>Évaluation finale</h1><div class="note"><b>Situation :</b> ${esc(m.situation ?? '')}</div><div id="acts"></div><div class="row"><span class="mute" id="left"></span><button class="btn primary" id="fin">Terminer et voir la correction</button></div>`;
    const left = (): void => { const n = m.activities.filter((a) => !ex.items[a.id]).length; (document.getElementById('left') as HTMLElement).textContent = n ? `${n} question(s) sans réponse` : 'Toutes les questions ont une réponse.'; };
    left();
    const host = document.getElementById('acts') as HTMLElement;
    m.activities.forEach((a, i) => {
      const card = document.createElement('section'); card.className = 'card act'; host.appendChild(card);
      mountActivity(card, a, { exam: true, locked: !!ex.items[a.id], onCheck: (v) => { ex.items[a.id] = { score: v.score }; save(store); left(); }, onHint: () => undefined });
      card.insertAdjacentHTML('afterbegin', `<h3>Question ${i + 1}</h3>`);
      if (ex.items[a.id]) card.insertAdjacentHTML('beforeend', '<div class="fb ok">Réponse enregistrée.</div>');
    });
    (document.getElementById('fin') as HTMLElement).addEventListener('click', () => { ex.finished = true; ex.at = new Date().toISOString(); save(store); examView(pid); });
    return;
  }
  const sc = examScore(p, ex);
  const cor = correction(p, ex);
  app().innerHTML = `<p><a href="#/p/${pid}">← ${esc(p.name)}</a></p><h1>Résultat : ${sc.total} / 20</h1>
<table class="t"><thead><tr><th>Critère</th><th>Points</th></tr></thead><tbody>${sc.crit.map((c) => `<tr><td>${esc(c.label)}</td><td>${c.got} / ${c.pts}</td></tr>`).join('')}</tbody></table>
<p class="mute">Cette note décrit un exercice d'entraînement.</p>
<h2>Correction</h2>${cor.map((c, i) => `<div class="card"><h3>Question ${i + 1} ${c.score >= 1 ? '<span class="st ok">Juste</span>' : c.score > 0 ? '<span class="st acq">En partie</span>' : '<span class="st warn">À revoir</span>'}</h3><p>${c.prompt}</p><div class="fb ok"><b>Réponse attendue et raison :</b> ${c.html}</div></div>`).join('')}
<div class="row noprint"><button class="btn" id="pr">Imprimer</button><button class="btn" id="dj">Rapport (JSON)</button><button class="btn" id="dh">Rapport (HTML)</button><button class="btn" id="rs">Refaire l'évaluation</button></div>`;
  (document.getElementById('pr') as HTMLElement).addEventListener('click', () => window.print());
  (document.getElementById('dj') as HTMLElement).addEventListener('click', async () => { const r = await buildReport(store, p); download(`sysml-lab-${pid}.json`, 'application/json', JSON.stringify(r, null, 1)); });
  (document.getElementById('dh') as HTMLElement).addEventListener('click', async () => { const r = await buildReport(store, p); download(`sysml-lab-${pid}.html`, 'text/html', reportHTML(r, p)); });
  twoStep(document.getElementById('rs') as HTMLButtonElement, "Refaire l'évaluation", () => { delete store.exam[pid]; save(store); examView(pid); });
}

/* ---------------- vue enseignant ---------------- */
function teacherView(): void {
  app().innerHTML = `<p><a href="#/">← Accueil</a></p><h1>Vue enseignant</h1>
<p class="lead">Importe les rapports JSON des élèves (plusieurs fichiers à la fois). Rien n'est envoyé : les fichiers sont lus dans ce navigateur. L'empreinte permet de détecter un fichier modifié à la main ; elle ne constitue pas une preuve d'authenticité.</p>
<div class="card"><label>Rapports JSON <input type="file" id="files" accept="application/json,.json" multiple></label></div><div id="out"></div>`;
  (document.getElementById('files') as HTMLInputElement).addEventListener('change', async (e) => {
    const files = Array.from((e.target as HTMLInputElement).files ?? []);
    const reps: { f: ReportFile; ok: boolean; file: string }[] = [];
    const bad: string[] = [];
    for (const file of files) {
      try {
        const f = JSON.parse(await file.text()) as ReportFile;
        if (f?.data?.app !== 'sysml-lab' || !isPid(f.data.parcours)) throw new Error('format');
        reps.push({ f, ok: await verifyReport(f), file: file.name });
      } catch { bad.push(file.name); }
    }
    const out = document.getElementById('out') as HTMLElement;
    let html = bad.length ? `<div class="fb bad">Fichier(s) illisible(s) : ${bad.map(esc).join(', ')}</div>` : '';
    for (const pid of IDS) {
      const list = reps.filter((r) => r.f.data.parcours === pid);
      if (!list.length) continue;
      const p = getParcours(pid);
      const errs = new Map<string, { n: number; students: number }>();
      for (const r of list) for (const [id, a] of Object.entries(r.f.data.acts)) if (a.fails > 0) { const e = errs.get(id) ?? { n: 0, students: 0 }; e.n += a.fails; e.students++; errs.set(id, e); }
      const prompts = new Map(p.modules.flatMap((m) => m.activities.map((a) => [a.id, `${m.n} : ${a.prompt}`] as const)));
      const top = Array.from(errs.entries()).sort((a, b) => b[1].students - a[1].students || b[1].n - a[1].n).slice(0, 10);
      html += `<h2>${esc(p.name)} — ${list.length} élève(s)</h2><div class="card"><table class="t"><thead><tr><th>Élève</th>${p.cases.map((c) => `<th title="${esc(caseName(c))}">${esc(c.d.toUpperCase())}${c.level}</th>`).join('')}<th>Éval.</th></tr></thead><tbody>${list.map((r) => `<tr><th scope="row">${esc(r.f.data.name)}${r.ok ? '' : ' <span class="st warn">modifié ?</span>'}</th>${p.cases.map((c) => `<td>${chip(caseState(p, r.f.data.acts, c))}</td>`).join('')}<td>${r.f.data.score ? r.f.data.score.total + '/20' : '—'}</td></tr>`).join('')}</tbody></table></div>
<h3>Erreurs fréquentes</h3>${top.length ? `<table class="t"><thead><tr><th>Activité</th><th>Élèves concernés</th><th>Échecs</th></tr></thead><tbody>${top.map(([id, e]) => `<tr><td>${prompts.get(id) ?? esc(id)}</td><td>${e.students}</td><td>${e.n}</td></tr>`).join('')}</tbody></table>` : '<p class="mute">Aucune erreur enregistrée.</p>'}`;
    }
    out.innerHTML = html || '<p class="mute">Aucun rapport chargé.</p>';
  });
}

/* ---------------- à propos ---------------- */
function about(): void {
  app().innerHTML = `<p><a href="#/">← Accueil</a></p><h1>Méthode et statut du contenu</h1>
<div class="card"><h3>Principe</h3><p>Chaque notion passe par le même geste : observer un exemple commenté, repérer, compléter, puis construire. Chaque réponse fausse est expliquée par la règle de notation ou la logique du système qu'elle enfreint ; chaque réponse juste dit pourquoi.</p>
<h3>Niveaux</h3><ul>${([1, 2, 3, 4] as const).map((l) => `<li><b>Niveau ${l}</b> : ${LEVEL_NAME[l]}</li>`).join('')}</ul>
<h3>Statut</h3><p>Les niveaux visés par formation, les barèmes sur 20, les seuils du carnet et le cas NovaTech sont des choix pédagogiques, pas des prescriptions des référentiels. SysML ne remplace pas les schémas réseau.</p>
<h3>Données</h3><p>Aucune donnée n'est envoyée : la progression reste dans ton navigateur. Exporte ton rapport pour le transmettre.</p></div>`;
}

/* ---------------- routage ---------------- */
export function route(): void {
  const parts = location.hash.replace(/^#\/?/, '').split('/').filter(Boolean);
  store = load();
  window.scrollTo(0, 0);
  const [a, b, c, d] = parts;
  if (!a) return home();
  if (a === 'teacher') return teacherView();
  if (a === 'about') return about();
  if (a === 'intro') return introView();
  if (a === 'legend') return legendView();
  if (a === 'p' && isPid(b)) {
    if (c === 'carnet') return carnetView(b);
    if (c === 'exam') return examView(b);
    if (c === 'm' && d) return moduleView(b, d);
    return parcoursView(b);
  }
  location.hash = '#/';
}
void newStore;
