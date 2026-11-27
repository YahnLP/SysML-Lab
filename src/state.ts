import type { CaseDef, Module, Parcours, Tag, Verdict } from './types';

export interface ActRec { ok: boolean; attempts: number; fails: number; hinted: boolean; clean: boolean; best: number }
export interface ExamItem { score: number }
export interface ExamRec { name: string; items: Record<string, ExamItem>; finished: boolean; at?: string }
export interface Store { v: 1; name: string; acts: Record<string, Record<string, ActRec>>; exam: Record<string, ExamRec> }
export type CaseState = 'todo' | 'acquise' | 'maitrisee' | 'consolider';

export const newStore = (): Store => ({ v: 1, name: '', acts: {}, exam: {} });
const KEY = 'sysmllab.v1';

export function load(): Store {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return newStore();
    const s = JSON.parse(raw) as Store;
    return s && s.v === 1 ? s : newStore();
  } catch { return newStore(); }
}
export function save(s: Store): void {
  try { localStorage.setItem(KEY, JSON.stringify(s)); } catch { /* stockage indisponible : la progression reste en mémoire */ }
}

const blank = (): ActRec => ({ ok: false, attempts: 0, fails: 0, hinted: false, clean: false, best: 0 });
export function rec(s: Store, pid: string, id: string): ActRec { return s.acts[pid]?.[id] ?? blank(); }
function put(s: Store, pid: string, id: string, r: ActRec): void { (s.acts[pid] ??= {})[id] = r; }

export function recordHint(s: Store, pid: string, id: string): void { const r = rec(s, pid, id); r.hinted = true; put(s, pid, id, r); }
export function recordAttempt(s: Store, pid: string, id: string, v: Verdict): ActRec {
  const r = { ...rec(s, pid, id) };
  const firstSuccess = v.ok && !r.ok;
  r.attempts++;
  if (!v.ok) r.fails++;
  r.best = Math.max(r.best, v.score);
  if (firstSuccess) { r.ok = true; r.clean = r.attempts === 1 && !r.hinted; }
  put(s, pid, id, r);
  return r;
}

export function caseState(p: Parcours, acts: Record<string, ActRec> | undefined, c: CaseDef): CaseState {
  const list = p.modules.filter((m) => !m.exam).flatMap((m) => m.activities).filter((a) => a.tag?.d === c.d && a.tag.level === c.level);
  const recs = list.map((a) => acts?.[a.id]);
  if (!recs.some((r) => r && r.attempts > 0)) return 'todo';
  const all = recs.every((r) => r?.ok);
  if (!all) return 'consolider';
  if (recs.some((r) => (r?.attempts ?? 0) >= 3)) return 'consolider';
  return recs.every((r) => r?.clean) ? 'maitrisee' : 'acquise';
}
export function levelFourDone(p: Parcours, acts: Record<string, ActRec> | undefined): boolean {
  const list = p.modules.flatMap((m) => m.activities).filter((a: { tag?: Tag }) => a.tag?.level === 4);
  return list.length > 0 && list.every((a) => acts?.[a.id]?.ok);
}
export interface Summary { connaissances: CaseDef[]; competences: CaseDef[]; consolider: CaseDef[]; total: number; started: number }
export function summary(p: Parcours, acts: Record<string, ActRec> | undefined): Summary {
  const out: Summary = { connaissances: [], competences: [], consolider: [], total: p.cases.filter((c) => !c.optional).length, started: 0 };
  for (const c of p.cases) {
    const st = caseState(p, acts, c);
    if (st !== 'todo' && !c.optional) out.started++;
    if (st === 'consolider') out.consolider.push(c);
    else if (st === 'acquise' || st === 'maitrisee') {
      if (c.level <= 2 && st === 'acquise') out.connaissances.push(c);
      else out.competences.push(c);
    }
  }
  return out;
}
export type ModStatus = 'todo' | 'doing' | 'done';
export function moduleStatus(m: Module, acts: Record<string, ActRec> | undefined): ModStatus {
  const n = m.activities.filter((a) => acts?.[a.id]?.ok).length;
  if (n === m.activities.length && n > 0) return 'done';
  return m.activities.some((a) => (acts?.[a.id]?.attempts ?? 0) > 0) ? 'doing' : 'todo';
}
