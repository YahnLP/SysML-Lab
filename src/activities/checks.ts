import type {
  Activity, BEdge, BuildAct, ExploreAct, BuildSeqAct, EdgeKind, Fb, FillAct, IdentifyAct, MatchAct, OrderAct, QuizAct, Resp, TraceAct, Verdict,
} from '../types';

const ok = (h: string): Fb => ({ k: 'ok', h });
const bad = (h: string): Fb => ({ k: 'bad', h });
const li = (items: string[]): string => '<ul>' + items.map((i) => `<li>${i}</li>`).join('') + '</ul>';
const clamp = (x: number): number => Math.max(0, Math.min(1, x));

function checkQuiz(a: QuizAct, sel: number[], because?: number): Verdict {
  const base = checkQuizBase(a, sel);
  if (!a.because || !base.ok) return base;
  if (because === undefined) return { ok: false, score: 0.5, fb: [{ k: 'warn', h: 'Ta réponse est bonne, mais dis aussi <b>pourquoi</b> : choisis la raison.' }] };
  const b = a.because.options[because];
  if (b?.ok) return { ok: true, score: 1, fb: [ok('<b>Exact, et tu sais pourquoi.</b> ' + b.why + (a.explain ? `<p>${a.explain}</p>` : ''))] };
  return { ok: false, score: 0.5, fb: [bad('<b>La réponse est bonne, mais pas la raison.</b> ' + (b ? b.why : ''))] };
}

function checkQuizBase(a: QuizAct, sel: number[]): Verdict {
  const chosen = a.options.filter((_, i) => sel.includes(i));
  const wrong = chosen.filter((o) => !o.ok);
  const good = a.options.filter((o) => o.ok);
  const missed = good.filter((o) => !chosen.includes(o));
  const done = !wrong.length && (!a.multi || !missed.length) && chosen.length > 0;
  const tp = chosen.length - wrong.length;
  if (done) {
    return { ok: true, score: 1, fb: [ok('<b>Exact.</b>' + li(good.map((o) => `<b>${o.t}</b> : ${o.why}`)) + (a.explain ? `<p>${a.explain}</p>` : ''))] };
  }
  const fb: Fb[] = [];
  if (!chosen.length) fb.push({ k: 'warn', h: 'Choisis au moins une réponse.' });
  else {
    fb.push(bad('<b>Pas tout à fait.</b>' + (wrong.length ? li(wrong.map((o) => `<b>${o.t}</b> : ${o.why}`)) : '') + (a.multi && !wrong.length ? '<p>Il manque encore au moins une bonne réponse.</p>' : '')));
  }
  return { ok: false, score: a.multi ? clamp((tp - wrong.length) / good.length) : 0, fb };
}

function checkOrder(a: OrderAct, order: number[]): Verdict {
  const n = a.items.length;
  const pos: number[] = [];
  order.forEach((idx, p) => { pos[idx] = p; });
  const viol: number[] = [];
  for (let i = 0; i < n - 1; i++) if ((pos[i] ?? 0) > (pos[i + 1] ?? 0)) viol.push(i);
  const score = clamp((n - 1 - viol.length) / (n - 1));
  if (!viol.length) return { ok: true, score: 1, fb: [ok('<b>Exact.</b> ' + a.reasons.map((r, i) => `${i + 1}. ${a.items[i]} : ${r}`).join('<br>'))] };
  return {
    ok: false, score,
    fb: [bad('<b>Pas encore.</b>' + li(viol.slice(0, 2).map((i) => `« ${a.items[i + 1]} » ne peut pas venir avant « ${a.items[i]} ». ${a.reasons[i]}`)))],
  };
}

function checkFill(a: FillAct, values: Record<string, string>): Verdict {
  const wrong: string[] = [];
  const miss: string[] = [];
  let right = 0;
  for (const s of a.slots) {
    const v = values[s.id];
    if (!v) { miss.push(s.label); continue; }
    if (v === s.answer) { right++; continue; }
    const o = s.options.find((x) => x.v === v);
    wrong.push(`<b>${s.label}</b> : ${o?.why ?? "ce n'est pas la bonne réponse."}`);
  }
  const score = right / a.slots.length;
  if (right === a.slots.length) {
    return { ok: true, score: 1, fb: [ok('<b>Exact.</b>' + li(a.slots.map((s) => `<b>${s.label}</b> : ${s.options.find((x) => x.v === s.answer)?.why ?? 'bonne réponse.'}`)))] };
  }
  const fb: Fb[] = [];
  if (miss.length) fb.push({ k: 'warn', h: `Il reste à compléter : ${miss.join(', ')}.` });
  if (wrong.length) fb.push(bad('<b>Pas tout à fait.</b>' + li(wrong)));
  return { ok: false, score, fb };
}

function checkMatch(a: MatchAct, answers: string[]): Verdict {
  const wrong: string[] = [];
  let right = 0;
  a.pairs.forEach((p, i) => {
    if (answers[i] === p.a) right++;
    else wrong.push(`<b>${p.l}</b> : ${answers[i] ? p.why : 'à compléter.'}`);
  });
  if (right === a.pairs.length) return { ok: true, score: 1, fb: [ok('<b>Exact.</b>' + li(a.pairs.map((p) => `<b>${p.l}</b> : ${p.why}`)))] };
  return { ok: false, score: right / a.pairs.length, fb: [bad('<b>Pas tout à fait.</b>' + li(wrong))] };
}

function checkIdentify(a: IdentifyAct, picks: string[]): Verdict {
  const wrong: string[] = [];
  let right = 0;
  a.tasks.forEach((t, i) => {
    const p = picks[i];
    if (p && t.ids.includes(p)) right++;
    else wrong.push(`<b>${t.ask}</b> : ${p ? (t.wrong?.[p] ?? "ce n'est pas cet élément.") : 'pas de réponse.'}`);
  });
  if (right === a.tasks.length) return { ok: true, score: 1, fb: [ok('<b>Exact.</b>' + li(a.tasks.map((t) => `<b>${t.ask}</b> : ${t.why}`)))] };
  return { ok: false, score: right / a.tasks.length, fb: [bad('<b>Pas tout à fait.</b>' + li(wrong))] };
}

function checkTrace(a: TraceAct, path: string[]): Verdict {
  let i = 0;
  while (i < a.path.length && path[i] === a.path[i]) i++;
  if (i === a.path.length && path.length === a.path.length) {
    return { ok: true, score: 1, fb: [ok('<b>Exact.</b> ' + (a.why2 ?? ''))] };
  }
  const score = i / a.path.length;
  let msg: string;
  if (path.length === 0) msg = 'Clique les composants dans l\'ordre où le flux les traverse.';
  else if (i >= path.length) msg = 'Le chemin s\'arrête trop tôt : le flux continue.';
  else {
    const prev = i === 0 ? 'le point de départ' : (path[i - 1] ?? '');
    msg = (a.wrong?.[path[i] ?? ''] ?? `Après ${prev}, le flux ne passe pas par cet élément : regarde les connecteurs qui partent de là.`);
  }
  return { ok: false, score, fb: [bad('<b>Pas tout à fait.</b> ' + msg)] };
}

const UNDIRECTED: EdgeKind[] = ['assoc', 'conn', 'link'];
const DIR_HINT: Partial<Record<EdgeKind, string>> = {
  comp: 'Le losange plein se place du côté du tout (le système), pas de la partie.',
  gen: 'Le triangle vide pointe vers le bloc le plus général.',
  satisfy: 'satisfy part de l\'élément qui satisfait (un bloc) vers l\'exigence.',
  verify: 'verify part du test vers l\'exigence.',
  refine: 'refine part de l\'élément qui précise (un cas d\'utilisation) vers l\'exigence.',
  derive: 'deriveReqt part de l\'exigence dérivée vers l\'exigence source.',
  include: 'include part du cas de base vers le cas inclus.',
  extend: 'extend part du cas qui étend vers le cas de base.',
  contain: 'Le signe ⊕ se place du côté de l\'exigence qui contient les autres.',
  flow: 'La flèche va de l\'étape précédente vers la suivante.',
  trans: 'La transition va de l\'état de départ vers l\'état d\'arrivée.',
  dep: 'La dépendance pointe vers l\'élément dont on dépend.',
};
const ekey = (e: BEdge): string => (UNDIRECTED.includes(e.k) ? [e.from, e.to].sort().join('~') : `${e.from}>${e.to}`);
const pair = (e: { from: string; to: string }): string => [e.from, e.to].sort().join('~');

function checkBuild(a: BuildAct, r: { nodes: string[]; edges: BEdge[] }): Verdict {
  const lab = (id: string): string => a.palette.find((p) => p.id === id)?.label ?? id;
  const fb: string[] = [];
  const total = a.target.nodes.length + a.target.edges.length;
  let found = 0;
  const missingNodes = a.target.nodes.filter((n) => !r.nodes.includes(n));
  const extraNodes = r.nodes.filter((n) => !a.target.nodes.includes(n));
  found += a.target.nodes.length - missingNodes.length;
  if (missingNodes.length) fb.push(`Il manque ${missingNodes.length} élément(s) dans le diagramme.`);
  for (const n of extraNodes) fb.push(`<b>${lab(n)}</b> : ${a.palette.find((p) => p.id === n)?.distractor ?? "cet élément n'a pas sa place ici."}`);
  const used = new Set<number>();
  let wrongEdges = 0;
  for (const t of a.target.edges) {
    const idx = r.edges.findIndex((e, i) => !used.has(i) && e.k === t.k && ekey(e) === ekey(t));
    if (idx >= 0) { used.add(idx); found++; continue; }
    const sameKindReversed = r.edges.findIndex((e, i) => !used.has(i) && e.k === t.k && e.from === t.to && e.to === t.from);
    if (sameKindReversed >= 0) {
      used.add(sameKindReversed); wrongEdges++;
      fb.push(`<b>${lab(t.from)} / ${lab(t.to)}</b> : la relation est dans le mauvais sens. ${DIR_HINT[t.k] ?? ''}`);
      continue;
    }
    const otherKind = r.edges.findIndex((e, i) => !used.has(i) && pair(e) === pair(t));
    if (otherKind >= 0) {
      const e = r.edges[otherKind] as BEdge;
      used.add(otherKind); wrongEdges++;
      fb.push(`<b>${lab(t.from)} / ${lab(t.to)}</b> : ${a.kindWhy?.[`${t.from}>${t.to}:${e.k}`] ?? a.kindWhy?.[`${t.to}>${t.from}:${e.k}`] ?? "ce n'est pas la bonne nature de relation."}`);
    }
  }
  r.edges.forEach((e, i) => {
    if (used.has(i)) return;
    const f = a.target.forbid?.find((x) => x.from === e.from && x.to === e.to && (!x.k || x.k === e.k));
    fb.push(f ? `<b>${lab(e.from)} / ${lab(e.to)}</b> : ${f.why}` : `<b>${lab(e.from)} / ${lab(e.to)}</b> : cette relation est en trop.`);
    wrongEdges++;
  });
  const extras = extraNodes.length + wrongEdges;
  const complete = found === total && extras === 0;
  const score = clamp((found - 0.5 * extras) / total);
  if (complete) return { ok: true, score: 1, fb: [ok('<b>Exact.</b> Le diagramme est complet et cohérent.')] };
  if (!fb.length) fb.push('Le diagramme n\'est pas encore complet.');
  return { ok: false, score, fb: [bad('<b>Pas encore.</b>' + li(fb))] };
}

function checkBuildSeq(a: BuildSeqAct, msgs: { from: string; to: string; label: string; ret?: boolean }[]): Verdict {
  const exp = a.expected;
  const same = (i: number): boolean => {
    const m = msgs[i], e = exp[i];
    return !!m && !!e && m.from === e.from && m.to === e.to && m.label === e.label && !!m.ret === !!e.ret;
  };
  const diff: number[] = [];
  for (let i = 0; i < exp.length; i++) if (!same(i)) diff.push(i);
  if (!diff.length && msgs.length === exp.length) return { ok: true, score: 1, fb: [ok('<b>Exact.</b>' + li(a.reasons.map((r, i) => `${i + 1}. ${r}`)))] };
  const score = clamp((exp.length - diff.length) / exp.length);
  const items = diff.slice(0, 2).map((i) => `Position ${i + 1} : ${msgs[i] ? "ce n'est pas le bon message à cet endroit." : 'il manque un message.'} ${a.reasons[i] ?? ''}`);
  if (msgs.length > exp.length) items.push('Il y a un message en trop à la fin.');
  return { ok: false, score, fb: [bad('<b>Pas encore.</b>' + li(items))] };
}

function checkExplore(a: ExploreAct, tried: string[]): Verdict {
  const left = a.required.filter((x) => !tried.includes(x));
  if (!left.length) return { ok: true, score: 1, fb: [ok('<b>Observation terminée.</b>')] };
  const names = left.map((x) => a.actions.find((y) => y.id === x)?.label ?? x);
  return { ok: false, score: (a.required.length - left.length) / a.required.length, fb: [{ k: 'warn', h: `Il te reste à essayer : ${names.join(' ; ')}.` }] };
}

export function check(a: Activity, r: Resp): Verdict {
  if (a.type !== r.type) throw new Error(`réponse de type ${r.type} pour une activité ${a.type}`);
  switch (a.type) {
    case 'quiz': { const q = r as Extract<Resp, { type: 'quiz' }>; return checkQuiz(a, q.sel, q.because); }
    case 'explore': return checkExplore(a, (r as Extract<Resp, { type: 'explore' }>).tried);
    case 'order': return checkOrder(a, (r as Extract<Resp, { type: 'order' }>).order);
    case 'fill': return checkFill(a, (r as Extract<Resp, { type: 'fill' }>).values);
    case 'match': return checkMatch(a, (r as Extract<Resp, { type: 'match' }>).answers);
    case 'identify': return checkIdentify(a, (r as Extract<Resp, { type: 'identify' }>).picks);
    case 'trace': return checkTrace(a, (r as Extract<Resp, { type: 'trace' }>).path);
    case 'build': return checkBuild(a, r as Extract<Resp, { type: 'build' }>);
    case 'buildseq': return checkBuildSeq(a, (r as Extract<Resp, { type: 'buildseq' }>).msgs);
  }
}

/** Réponse correcte, pour les tests de contenu et pour la correction en fin d'évaluation. */
export function solve(a: Activity): Resp {
  switch (a.type) {
    case 'quiz': return { type: 'quiz', sel: a.options.map((o, i) => (o.ok ? i : -1)).filter((i) => i >= 0), ...(a.because ? { because: a.because.options.findIndex((o) => o.ok) } : {}) };
    case 'explore': return { type: 'explore', tried: [...a.required] };
    case 'order': return { type: 'order', order: a.items.map((_, i) => i) };
    case 'fill': return { type: 'fill', values: Object.fromEntries(a.slots.map((s) => [s.id, s.answer])) };
    case 'match': return { type: 'match', answers: a.pairs.map((p) => p.a) };
    case 'identify': return { type: 'identify', picks: a.tasks.map((t) => t.ids[0] as string) };
    case 'trace': return { type: 'trace', path: [...a.path] };
    case 'build': return { type: 'build', nodes: [...a.target.nodes], edges: a.target.edges.map((e) => ({ ...e })) };
    case 'buildseq': return { type: 'buildseq', msgs: a.expected.map((e) => ({ ...e })) };
  }
}

/** Une réponse volontairement fausse, pour vérifier que le vérificateur refuse. */
export function blunder(a: Activity): Resp {
  switch (a.type) {
    case 'quiz': return { type: 'quiz', sel: a.options.map((o, i) => (o.ok ? -1 : i)).filter((i) => i >= 0).slice(0, 1) };
    case 'explore': return { type: 'explore', tried: [] };
    case 'order': return { type: 'order', order: a.items.map((_, i) => a.items.length - 1 - i) };
    case 'fill': return { type: 'fill', values: Object.fromEntries(a.slots.map((s) => [s.id, (s.options.find((o) => o.v !== s.answer) ?? s.options[0])?.v ?? ''])) };
    case 'match': return { type: 'match', answers: a.pairs.map((p) => a.choices.find((c) => c !== p.a) ?? '') };
    case 'identify': return { type: 'identify', picks: a.tasks.map(() => '__none__') };
    case 'trace': return { type: 'trace', path: [...a.path].reverse() };
    case 'build': return { type: 'build', nodes: [], edges: [] };
    case 'buildseq': return { type: 'buildseq', msgs: [] };
  }
}

/** Score d'une activité tel que compté en carnet : 1 seulement si juste du premier coup et sans indice. */
export function isClean(attempts: number, hinted: boolean, score: number): boolean {
  return score >= 1 && attempts === 1 && !hinted;
}
