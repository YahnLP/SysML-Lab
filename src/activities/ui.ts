import { diagramSVG, esc } from '../render';
import type { Activity, BEdge, BuildAct, BuildSeqAct, Diagram, FillValue, GraphDiagram, Resp, SeqMsg, Verdict } from '../types';
import { check } from './checks';

export interface ActCtx {
  exam: boolean;
  /** Déjà réussie ou déjà répondue : l'activité s'affiche verrouillée. */
  locked?: boolean;
  onCheck(v: Verdict): void;
  onHint(): void;
}

let uid = 0;
const dg = (d: Diagram, o: Parameters<typeof diagramSVG>[1] = {}): string => `<div class="dgmwrap">${diagramSVG(d, o)}</div>`;
const fbHtml = (v: Verdict): string => v.fb.map((f) => `<div class="fb ${f.k}">${f.h}</div>`).join('');

/** Clic ou touche Entrée/Espace sur un élément d'un diagramme repérable (data-id). */
function onPick(root: HTMLElement, sel: string, fn: (id: string) => void): void {
  const host = root.querySelector(sel) as HTMLElement | null;
  if (!host) return;
  const pick = (t: EventTarget | null): void => { const n = (t as Element | null)?.closest('[data-id]'); const id = n?.getAttribute('data-id'); if (id) fn(id); };
  host.addEventListener('click', (e) => pick(e.target));
  host.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); pick(e.target); } });
}
const sels = (opts: { v: string; t: string }[], cur = ''): string => `<option value="">— choisir —</option>` + opts.map((o) => `<option value="${esc(o.v)}"${o.v === cur ? ' selected' : ''}>${esc(o.t)}</option>`).join('');

export function mountActivity(host: HTMLElement, a: Activity, ctx: ActCtx): void {
  let attempts = 0;
  let hint = 0;
  let locked = !!ctx.locked;
  host.innerHTML = `<p class="prompt">${a.prompt}</p><div class="abody"></div><div class="row actions"></div><div class="fbs" role="status" aria-live="polite"></div>`;
  const body = host.querySelector('.abody') as HTMLElement;
  const actions = host.querySelector('.actions') as HTMLElement;
  const fbs = host.querySelector('.fbs') as HTMLElement;
  let getResp: () => Resp | null = () => null;
  let after: (v: Verdict) => void = () => undefined;

  /* ---------- par type ---------- */
  if (a.type === 'quiz') {
    const name = `q${++uid}`;
    body.innerHTML = (a.diagrams ?? []).map((d) => dg(d)).join('') + `<fieldset><legend class="sr">Réponses</legend>${a.options.map((o, i) => `<label><input type="${a.multi ? 'checkbox' : 'radio'}" name="${name}" value="${i}"> ${esc(o.t)}</label>`).join('')}</fieldset>` + (a.multi ? '<p class="mute">Plusieurs réponses possibles.</p>' : '');
    getResp = () => ({ type: 'quiz', sel: Array.from(body.querySelectorAll<HTMLInputElement>('input:checked')).map((i) => Number(i.value)) });
  } else if (a.type === 'order') {
    const arr = a.start.slice();
    const draw = (): void => {
      body.innerHTML = `<ol class="order">${arr.map((idx, p) => `<li><span class="t">${esc(a.items[idx] as string)}</span><button class="btn small" data-m="${p}:-1" aria-label="Monter : ${esc(a.items[idx] as string)}"${p === 0 ? ' disabled' : ''}>↑</button><button class="btn small" data-m="${p}:1" aria-label="Descendre : ${esc(a.items[idx] as string)}"${p === arr.length - 1 ? ' disabled' : ''}>↓</button></li>`).join('')}</ol>`;
      body.querySelectorAll<HTMLButtonElement>('[data-m]').forEach((b) => b.addEventListener('click', () => {
        const [p, d] = (b.dataset.m as string).split(':').map(Number) as [number, number];
        const t = arr[p] as number; arr[p] = arr[p + d] as number; arr[p + d] = t; draw();
        (body.querySelector(`[data-m="${p + d}:${d}"]`) as HTMLElement | null)?.focus();
      }));
    };
    draw();
    getResp = () => ({ type: 'order', order: arr.slice() });
    after = (v) => {
      if (v.ok && a.seq) fbs.insertAdjacentHTML('beforeend', dg({ kind: 'seq', ...a.seq }, { numbered: true }));
    };
  } else if (a.type === 'fill') {
    const values: Record<string, string> = {};
    const fill = (): Record<string, FillValue> => Object.fromEntries(a.slots.filter((s) => values[s.id]).map((s) => { const o = s.options.find((x) => x.v === values[s.id]); return [s.id, { t: o?.t ?? '', ...(o?.set ? { set: o.set } : {}) }]; }));
    const hasSlot = (): boolean => a.diagram.kind === 'seq' ? a.diagram.msgs.some((m) => m.slot) : a.diagram.nodes.some((n) => n.slot) || a.diagram.edges.some((e) => e.slot);
    const redraw = (): void => { (body.querySelector('.dg') as HTMLElement).innerHTML = hasSlot() ? dg(a.diagram, { fill: fill() }) : dg(a.diagram); };
    body.innerHTML = `<div class="dg"></div>` + a.slots.map((s) => `<p><label>${esc(s.label)} <select data-s="${s.id}">${sels(s.options.map((o) => ({ v: o.v, t: o.t })))}</select></label></p>`).join('');
    redraw();
    body.querySelectorAll<HTMLSelectElement>('select').forEach((el) => el.addEventListener('change', () => { values[el.dataset.s as string] = el.value; redraw(); }));
    getResp = () => ({ type: 'fill', values: { ...values } });
  } else if (a.type === 'match') {
    const ans: string[] = a.pairs.map(() => '');
    body.innerHTML = (a.diagram ? dg(a.diagram) : '') + a.pairs.map((p, i) => `<p><label>${esc(p.l)} <select data-i="${i}">${sels(a.choices.map((c) => ({ v: c, t: c })))}</select></label></p>`).join('');
    body.querySelectorAll<HTMLSelectElement>('select').forEach((el) => el.addEventListener('change', () => { ans[Number(el.dataset.i)] = el.value; }));
    getResp = () => ({ type: 'match', answers: ans.slice() });
  } else if (a.type === 'identify') {
    const picks: string[] = a.tasks.map(() => '');
    let active = 0;
    const draw = (): void => {
      body.innerHTML = `<ol class="tasks">${a.tasks.map((t, i) => `<li><label><input type="radio" name="tk${uid}" value="${i}"${i === active ? ' checked' : ''}> ${esc(t.ask)}</label> <span class="chip">${picks[i] ? 'choisi' : 'à choisir'}</span></li>`).join('')}</ol><div class="pick">${dg(a.diagram, { sel: true, hl: picks.filter(Boolean) })}</div><p class="mute">Clique (ou Entrée) sur l'élément du diagramme qui répond à la consigne sélectionnée.</p>`;
      body.querySelectorAll<HTMLInputElement>('input[type=radio]').forEach((r) => r.addEventListener('change', () => { active = Number(r.value); }));
      onPick(body, '.pick', (id) => { picks[active] = id; const nx = picks.findIndex((p) => !p); if (nx >= 0) active = nx; draw(); });
    };
    uid++; draw();
    getResp = () => ({ type: 'identify', picks: picks.slice() });
  } else if (a.type === 'trace') {
    const path: string[] = [];
    const label = (id: string): string => (a.diagram as GraphDiagram).nodes.find((n) => n.id === id)?.label ?? id;
    const draw = (): void => {
      body.innerHTML = `<div class="pick">${dg(a.diagram, { sel: true, hl: path })}</div><p>Chemin : ${path.length ? path.map((p) => `<span class="chip">${esc(label(p))}</span>`).join(' → ') : '<span class="mute">aucun élément cliqué</span>'}</p><p><button class="btn small" data-r="1">Effacer le dernier</button></p>`;
      onPick(body, '.pick', (id) => { if ((a.diagram as GraphDiagram).nodes.some((n) => n.id === id)) { path.push(id); draw(); } });
      body.querySelector('[data-r]')?.addEventListener('click', () => { path.pop(); draw(); });
    };
    draw();
    getResp = () => ({ type: 'trace', path: path.slice() });
  } else if (a.type === 'build') {
    mountBuild(body, a, (g) => { getResp = g; });
  } else if (a.type === 'buildseq') {
    mountBuildSeq(body, a, (g) => { getResp = g; });
  }

  /* ---------- commandes communes ---------- */
  const lock = (): void => { locked = true; body.setAttribute('inert', ''); body.classList.add('locked'); (actions.querySelector('[data-ok]') as HTMLButtonElement | null)?.setAttribute('disabled', ''); };
  actions.innerHTML = `<button class="btn primary" data-ok="1">Valider</button>` + (!ctx.exam && a.hints?.length ? '<button class="btn" data-h="1">Un indice</button>' : '') + (!ctx.exam && a.why ? '<button class="btn" data-w="1">Pourquoi ?</button>' : '');
  actions.querySelector('[data-ok]')?.addEventListener('click', () => {
    if (locked) return;
    const r = getResp();
    if (!r) { fbs.innerHTML = '<div class="fb warn">Réponds d\'abord à la question.</div>'; return; }
    const v = check(a, r);
    if (v.fb.every((f) => f.k === 'warn') && !v.ok && v.score === 0 && r.type === 'quiz' && r.sel.length === 0) { fbs.innerHTML = '<div class="fb warn">Choisis au moins une réponse.</div>'; return; }
    attempts++;
    ctx.onCheck(v);
    if (ctx.exam) { fbs.innerHTML = '<div class="fb ok">Réponse enregistrée. La correction sera donnée à la fin de l\'évaluation.</div>'; lock(); return; }
    fbs.innerHTML = fbHtml(v);
    after(v);
    if (v.ok) { if (a.why) fbs.insertAdjacentHTML('beforeend', `<div class="note"><b>À retenir :</b> ${a.why}</div>`); lock(); host.classList.add('done'); }
  });
  actions.querySelector('[data-h]')?.addEventListener('click', () => {
    const hs = a.hints ?? [];
    if (hint === 0) ctx.onHint();
    const box = host.querySelector('.hintbox') ?? fbs.insertAdjacentElement('beforebegin', Object.assign(document.createElement('div'), { className: 'hintbox note' }));
    hint = Math.min(hint + 1, hs.length);
    (box as HTMLElement).innerHTML = `<b>Indice ${hint}/${hs.length} :</b> ${hs[hint - 1]}`;
  });
  actions.querySelector('[data-w]')?.addEventListener('click', () => {
    fbs.insertAdjacentHTML('afterbegin', `<div class="note"><b>Pourquoi ce geste ?</b> ${a.why}</div>`);
    ctx.onHint();
  });
  if (locked) { lock(); if (!ctx.exam) host.classList.add('done'); }
  void attempts;
}

/* ---------------- construction d'un diagramme ---------------- */
function mountBuild(body: HTMLElement, a: BuildAct, set: (g: () => Resp | null) => void): void {
  const on = new Set<string>(a.initial?.nodes ?? []);
  const edges: BEdge[] = (a.initial?.edges ?? []).map((e) => ({ ...e }));
  const nodeLabel = (id: string): string => a.palette.find((p) => p.id === id)?.label ?? id;
  const diagram = (): GraphDiagram => ({
    kind: a.kind, name: a.name, ...(a.pkg ? { pkg: a.pkg } : {}), ...(a.boundary ? { boundary: a.boundary } : {}),
    nodes: a.palette.filter((p) => on.has(p.id)).map((p) => ({ id: p.id, k: p.k, label: p.label, ...(p.sub ? { sub: p.sub } : {}), c: p.c, r: p.r })),
    edges: edges.map((e, i) => ({ id: `b${i}`, from: e.from, to: e.to, k: e.k })),
  });
  const draw = (): void => {
    const onList = a.palette.filter((p) => on.has(p.id));
    body.innerHTML = `${dg(diagram())}
<fieldset><legend>Éléments à placer</legend>${a.palette.map((p) => `<label><input type="checkbox" data-n="${esc(p.id)}"${on.has(p.id) ? ' checked' : ''}> ${esc(p.label)}${p.sub ? ` <span class="mute">${esc(p.sub)}</span>` : ''}</label>`).join('')}</fieldset>
<fieldset><legend>Ajouter une relation</legend><div class="row">
<label>de <select data-f>${sels(onList.map((p) => ({ v: p.id, t: p.label })))}</select></label>
<label>nature <select data-k>${sels(a.kinds)}</select></label>
<label>vers <select data-t>${sels(onList.map((p) => ({ v: p.id, t: p.label })))}</select></label>
<button class="btn small" data-add="1">Ajouter</button></div></fieldset>
<ul class="elist">${edges.map((e, i) => `<li>${esc(nodeLabel(e.from))} — ${esc(a.kinds.find((k) => k.v === e.k)?.t ?? e.k)} → ${esc(nodeLabel(e.to))} <button class="btn small" data-d="${i}" aria-label="Retirer cette relation">Retirer</button></li>`).join('')}</ul>`;
    body.querySelectorAll<HTMLInputElement>('input[data-n]').forEach((c) => c.addEventListener('change', () => {
      const id = c.dataset.n as string;
      if (c.checked) on.add(id); else { on.delete(id); for (let i = edges.length - 1; i >= 0; i--) { const e = edges[i] as BEdge; if (e.from === id || e.to === id) edges.splice(i, 1); } }
      draw();
    }));
    body.querySelectorAll<HTMLButtonElement>('[data-d]').forEach((b) => b.addEventListener('click', () => { edges.splice(Number(b.dataset.d), 1); draw(); }));
    body.querySelector('[data-add]')?.addEventListener('click', () => {
      const f = (body.querySelector('[data-f]') as HTMLSelectElement).value, k = (body.querySelector('[data-k]') as HTMLSelectElement).value, t = (body.querySelector('[data-t]') as HTMLSelectElement).value;
      if (!f || !k || !t || f === t || edges.some((e) => e.from === f && e.to === t && e.k === k)) return;
      edges.push({ from: f, to: t, k: k as BEdge['k'] }); draw();
    });
  };
  draw();
  set(() => ({ type: 'build', nodes: Array.from(on), edges: edges.map((e) => ({ ...e })) }));
}

function mountBuildSeq(body: HTMLElement, a: BuildSeqAct, set: (g: () => Resp | null) => void): void {
  const msgs: { from: string; to: string; label: string; ret?: boolean }[] = [];
  const lineName = (id: string): string => a.lines.find((l) => l.id === id)?.n ?? id;
  const draw = (): void => {
    const sm: SeqMsg[] = msgs.map((m) => ({ from: m.from, to: m.to, label: m.label, ...(m.ret ? { ret: true } : {}), ...(m.from === m.to ? { self: true } : {}) }));
    body.innerHTML = `${dg({ kind: 'seq', name: a.name, lines: a.lines, msgs: sm }, { numbered: true })}
<fieldset><legend>Ajouter le message suivant</legend><div class="row">
<label>de <select data-f>${sels(a.lines.map((l) => ({ v: l.id, t: l.n })))}</select></label>
<label>vers <select data-t>${sels(a.lines.map((l) => ({ v: l.id, t: l.n })))}</select></label>
<label>message <select data-l>${sels(a.labels.map((l) => ({ v: l, t: l })))}</select></label>
<label><input type="checkbox" data-r> retour (pointillés)</label>
<button class="btn small" data-add="1">Ajouter</button></div></fieldset>
<ol class="elist">${msgs.map((m, i) => `<li>${esc(lineName(m.from))} → ${esc(lineName(m.to))} : ${esc(m.label)}${m.ret ? ' (retour)' : ''} <button class="btn small" data-d="${i}" aria-label="Retirer le message ${i + 1}">Retirer</button></li>`).join('')}</ol>`;
    body.querySelectorAll<HTMLButtonElement>('[data-d]').forEach((b) => b.addEventListener('click', () => { msgs.splice(Number(b.dataset.d), 1); draw(); }));
    body.querySelector('[data-add]')?.addEventListener('click', () => {
      const f = (body.querySelector('[data-f]') as HTMLSelectElement).value, t = (body.querySelector('[data-t]') as HTMLSelectElement).value, l = (body.querySelector('[data-l]') as HTMLSelectElement).value;
      if (!f || !t || !l) return;
      msgs.push({ from: f, to: t, label: l, ...((body.querySelector('[data-r]') as HTMLInputElement).checked ? { ret: true } : {}) }); draw();
    });
  };
  draw();
  set(() => ({ type: 'buildseq', msgs: msgs.map((m) => ({ ...m })) }));
}
