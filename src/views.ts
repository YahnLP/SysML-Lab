import { mountActivity } from './activities/ui';
import { IDS, getParcours, type PId } from './content';
import { diagramSVG, esc } from './render';
import { buildReport, correction, examScore, reportHTML, verifyReport, type ReportFile } from './report';
import { caseState, levelFourDone, load, moduleStatus, newStore, recordAttempt, recordHint, rec, save, summary, type CaseState, type Store } from './state';
import { DIAG_NAME, LEVEL_NAME, type CaseDef, type DiagKind, type Parcours } from './types';

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

/* ---------------- accueil ---------------- */
function home(): void {
  who();
  app().innerHTML = `<h1>SysML-Lab</h1>
<p class="lead">Apprendre à lire, expliquer et compléter des diagrammes SysML en agissant, sur un cas d'entreprise fictif : NovaTech. Trois parcours indépendants, un carnet de progression chacun.</p>
<div class="card"><label>Ton nom (utilisé pour le rapport et pour personnaliser l'évaluation finale) <input type="text" id="name" value="${esc(store.name)}" autocomplete="name"></label>
<p class="mute">Ta progression reste dans ce navigateur ; rien n'est envoyé sur un serveur. Pense à exporter ton rapport.</p></div>
<div class="grid">${IDS.map((id) => { const p = getParcours(id); const sm = summary(p, store.acts[id]); return `<div class="card"><h2>${esc(p.name)}</h2><p><span class="chip">${esc(p.levelLabel)}</span></p><p>${esc(p.orient)}</p><p class="mute">${sm.started} case(s) du carnet commencée(s) sur ${sm.total}</p><div class="row"><a class="btn primary" href="#/p/${id}">${sm.started ? 'Continuer' : 'Commencer'}</a><a class="btn" href="#/p/${id}/carnet">Carnet</a></div></div>`; }).join('')}</div>
<div class="row"><a class="btn" href="#/teacher">Vue enseignant</a><a class="btn" href="#/about">Méthode et statut du contenu</a></div>`;
  (document.getElementById('name') as HTMLInputElement).addEventListener('input', (e) => { store.name = (e.target as HTMLInputElement).value.trim(); save(store); who(); });
}

/* ---------------- parcours ---------------- */
const MS = { todo: 'À faire', doing: 'En cours', done: 'Terminé' } as const;
function parcoursView(pid: PId): void {
  const p = getParcours(pid);
  const acts = store.acts[pid];
  app().innerHTML = `<p><a href="#/">← Accueil</a></p><h1>${esc(p.name)}</h1>
<p class="lead">${esc(p.situation)}</p><div class="note">${esc(p.statut)}</div>
<h2>Modules</h2><ul class="mods">${p.modules.map((m) => { const st = m.exam ? '' : `<span class="st ${m.activities.length && moduleStatus(m, acts) === 'done' ? 'ok' : 'todo'}">${MS[moduleStatus(m, acts)]}</span>`; return `<li><a href="#/p/${pid}/${m.exam ? 'exam' : 'm/' + m.id}"><b>${esc(m.n)}</b> ${esc(m.title)}</a> <span class="chip">Niveau ${m.level}</span>${m.optional ? ' <span class="chip opt">facultatif</span>' : ''}${m.exam ? ' <span class="chip opt">évaluation</span>' : ''} ${st}</li>`; }).join('')}</ul>
<div class="row"><a class="btn" href="#/p/${pid}/carnet">Mon carnet</a></div>`;
}

function moduleView(pid: PId, mid: string): void {
  const p = getParcours(pid);
  const idx = p.modules.findIndex((m) => m.id === mid);
  const m = p.modules[idx];
  if (!m) { location.hash = `#/p/${pid}`; return; }
  const prev = p.modules[idx - 1], next = p.modules[idx + 1];
  const nav = (x: typeof prev): string => (x ? `<a href="#/p/${pid}/${x.exam ? 'exam' : 'm/' + x.id}">${esc(x.n)} ${esc(x.title)}</a>` : '');
  app().innerHTML = `<p><a href="#/p/${pid}">← ${esc(p.name)}</a></p><h1>${esc(m.n)} — ${esc(m.title)}</h1>
<div class="card"><p><span class="chip">Niveau ${m.level} : ${LEVEL_NAME[m.level]}</span>${m.optional ? ' <span class="chip opt">facultatif</span>' : ''}</p>
<h3>Objectifs</h3><ul>${m.objectives.map((o) => `<li>${esc(o)}</li>`).join('')}</ul>
<p><b>Prérequis :</b> ${m.prereq.map(esc).join(', ')}</p><p><b>Tu as réussi si :</b> ${esc(m.success)}</p></div>
<div class="note"><b>Pourquoi ce diagramme ?</b> ${m.pourquoi}</div>
<h2>Cours</h2>${m.cours.map((c) => `<p>${c}</p>`).join('')}
${m.exemple ? `<h2>Exemple commenté</h2>${diagramSVG(m.exemple.diagram, { numbered: true })}<ul>${m.exemple.notes.map((n) => `<li>${n}</li>`).join('')}</ul>` : ''}
${m.situation ? `<div class="note"><b>Situation :</b> ${esc(m.situation)}</div>` : ''}
<h2>Activités <span class="mute" id="prog"></span></h2><div id="acts"></div>
<div class="row nav"><span>${prev ? '← ' + nav(prev) : ''}</span><span>${next ? nav(next) + ' →' : ''}</span></div>`;
  const prog = (): void => { const n = m.activities.filter((a) => rec(store, pid, a.id).ok).length; (document.getElementById('prog') as HTMLElement).textContent = `(${n}/${m.activities.length} réussies)`; };
  prog();
  const host = document.getElementById('acts') as HTMLElement;
  m.activities.forEach((a, i) => {
    const card = document.createElement('section');
    card.className = 'card act'; card.setAttribute('aria-label', `Activité ${i + 1}`);
    host.appendChild(card);
    mountActivity(card, a, { exam: false, onCheck: (v) => { recordAttempt(store, pid, a.id, v); save(store); prog(); }, onHint: () => { recordHint(store, pid, a.id); save(store); } });
    card.insertAdjacentHTML('afterbegin', `<h3>Activité ${i + 1}</h3>`);
  });
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
  if (a === 'p' && isPid(b)) {
    if (c === 'carnet') return carnetView(b);
    if (c === 'exam') return examView(b);
    if (c === 'm' && d) return moduleView(b, d);
    return parcoursView(b);
  }
  location.hash = '#/';
}
void newStore;
