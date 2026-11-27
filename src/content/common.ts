import type { Activity, GraphDiagram, QuizAct, QuizOpt, SeqDiagram, SeqLine, SeqMsg, Tag } from '../types';

/** Variables d'un cas : fixes en apprentissage, tirées du nom de l'élève en évaluation. */
export interface Vars {
  site: string; pc: string; auth: string; dir: string; sw: string;
  ipPc: string; ipAuth: string; ipDir: string;
  /** Nom d'instance du poste dans les diagrammes. */
  inst: string;
  users: number; sites: number;
}
export const V0: Vars = {
  site: 'B', pc: 'PC-B12', auth: 'SRV-AUTH01', dir: 'SRV-DIR01', sw: 'SW-CORE',
  ipPc: '192.168.20.12', ipAuth: '192.168.10.10', ipDir: '192.168.10.11', inst: 'poste', users: 45, sites: 4,
};

export function hashString(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}
/** Générateur pseudo-aléatoire déterministe (mulberry32). */
export function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
export function makeVars(seed: number): Vars {
  const r = rng(seed);
  const site = 'BCDEF'[Math.floor(r() * 5)] as string;
  const n = 10 + Math.floor(r() * 40);
  const a = 1 + Math.floor(r() * 3);
  let d = 1 + Math.floor(r() * 3);
  if (d === a) d = (a % 3) + 1;
  const net = 10 + Math.floor(r() * 5);
  return {
    site, pc: `PC-${site}${n}`, auth: `SRV-AUTH0${a}`, dir: `SRV-DIR0${d}`, sw: `SW-${['CORE', 'SITE', 'DIST'][Math.floor(r() * 3)]}`,
    ipPc: `192.168.${net + 10}.${n}`, ipAuth: `192.168.${net}.${10 + a}`, ipDir: `192.168.${net}.${10 + d}`,
    inst: `poste${n}`, users: [30, 45, 60, 80][Math.floor(r() * 4)] as number, sites: 2 + Math.floor(r() * 4),
  };
}
/** Mélange déterministe : renvoie une permutation des indices 0..n-1. */
export function permutation(n: number, seed: number): number[] {
  const r = rng(seed);
  const p = Array.from({ length: n }, (_, i) => i);
  for (let i = n - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); const t = p[i] as number; p[i] = p[j] as number; p[j] = t; }
  return p;
}

/* ---------- raccourcis ---------- */
export const Y = (t: string, why: string): QuizOpt => ({ t, ok: true, why });
export const N = (t: string, why: string): QuizOpt => ({ t, ok: false, why });
export const tg = (d: Tag['d'], level: Tag['level']): Tag => ({ d, level });
type Extra = Partial<Omit<QuizAct, 'id' | 'type' | 'prompt' | 'options'>>;
export const quiz = (id: string, prompt: string, options: QuizOpt[], extra: Extra = {}): QuizAct => ({ id, type: 'quiz', prompt, options, ...extra });
export const multi = (id: string, prompt: string, options: QuizOpt[], extra: Extra = {}): QuizAct => ({ id, type: 'quiz', multi: true, prompt, options, ...extra });

/* ---------- le modèle NovaTech : authentification centralisée ---------- */
export const LINES3: SeqLine[] = [{ id: 'poste', n: 'poste' }, { id: 'auth', n: 'serveurAuth' }, { id: 'dir', n: 'annuaire' }];
export const MSG_DEMANDE: SeqMsg = { from: 'poste', to: 'auth', label: "demande d'ouverture de session" };
export const MSG_RECHERCHE: SeqMsg = { from: 'auth', to: 'dir', label: 'recherche du compte' };
export const MSG_COMPTE: SeqMsg = { from: 'dir', to: 'auth', label: 'compte et droits', ret: true };
export const MSG_VERIF: SeqMsg = { from: 'auth', to: 'auth', label: 'vérification du mot de passe', self: true };
export const MSG_ACCES: SeqMsg = { from: 'auth', to: 'poste', label: 'accès accordé', ret: true };
export const MSG_REFUS: SeqMsg = { from: 'auth', to: 'poste', label: 'accès refusé', ret: true };
export const MSGS5: SeqMsg[] = [MSG_DEMANDE, MSG_RECHERCHE, MSG_COMPTE, MSG_VERIF, MSG_ACCES];
export const ITEMS5: string[] = ["demande d'ouverture de session", 'recherche du compte', 'compte et droits', 'vérification du mot de passe', 'accès accordé'];
export const REASONS5: string[] = [
  "<b>Système :</b> rien ne se passe tant que le poste n'a pas demandé l'ouverture de session. <b>Notation :</b> le premier message part de la ligne de vie qui déclenche l'échange.",
  "<b>Notation :</b> une réponse (flèche en pointillés) suit toujours la demande à laquelle elle répond. <b>Système :</b> l'annuaire ne renvoie un compte que si on le lui demande.",
  "<b>Système :</b> il faut le compte renvoyé par l'annuaire pour pouvoir comparer le mot de passe. <b>Notation :</b> la flèche qui boucle sur la ligne de vie est un message du serveur à lui-même.",
  "<b>Système :</b> accorder l'accès sans vérifier serait une faille. <b>Notation :</b> une séquence se lit de haut en bas : ce message part du serveur vers le poste et vient en dernier.",
];

export function seqAuth(): SeqDiagram {
  return { kind: 'seq', name: 'OuvertureDeSession', lines: LINES3, msgs: MSGS5 };
}
export function seqAuthAlt(): SeqDiagram {
  return {
    kind: 'seq', name: 'OuvertureDeSession', lines: LINES3,
    msgs: [MSG_DEMANDE, MSG_RECHERCHE, MSG_COMPTE, MSG_VERIF, MSG_ACCES, MSG_REFUS],
    frags: [{ k: 'alt', from: 4, to: 5, guard: 'mot de passe correct', split: 5, guard2: 'mot de passe faux' }],
  };
}

export function ibdAuth(v: Vars = V0): GraphDiagram {
  return {
    kind: 'ibd', name: 'OuvertureDeSession', pkg: 'Block',
    nodes: [
      { id: 'poste', k: 'part', label: v.inst, sub: 'PosteDeTravail', c: 0, r: 0 },
      { id: 'auth', k: 'part', label: 'serveurAuth', sub: 'ServeurAuthentification', c: 1.5, r: 0 },
      { id: 'dir', k: 'part', label: 'annuaire', sub: 'Annuaire', c: 3, r: 0 },
    ],
    edges: [
      { from: 'poste', to: 'auth', k: 'conn', label: 'identifiants' },
      { from: 'auth', to: 'dir', k: 'conn', label: 'recherche' },
    ],
  };
}

export function bddAuth(): GraphDiagram {
  return {
    kind: 'bdd', name: 'Authentification', pkg: 'Package',
    nodes: [
      { id: 'sys', k: 'block', label: 'OuvertureDeSession', c: 1.5, r: 0 },
      { id: 'poste', k: 'block', label: 'PosteDeTravail', sub: 'adresseIP : String', c: 3.2, r: 0 },
      { id: 'srv', k: 'block', label: 'ServeurAuthentification', sub: 'nom : String', c: 0.5, r: 1 },
      { id: 'dir', k: 'block', label: 'Annuaire', sub: 'comptes : Integer', c: 2.5, r: 1 },
    ],
    edges: [
      { from: 'sys', to: 'srv', k: 'comp' },
      { from: 'sys', to: 'dir', k: 'comp' },
      { from: 'sys', to: 'poste', k: 'assoc' },
    ],
  };
}

/** Exigences de la base commune (CIEL, TSSR). `sansTest2` retire le test de EX-02, pour l'évaluation. */
export function reqAuth(sansTest: 't1' | 't2' | 't3' | null = null): GraphDiagram {
  const d: GraphDiagram = {
    kind: 'req', name: 'Authentification', pkg: 'Package',
    nodes: [
      { id: 'ex0', k: 'req', label: 'EX-00', sub: 'Ouvrir une session avec un compte unique.', c: 1.5, r: 0 },
      { id: 'ex1', k: 'req', label: 'EX-01', sub: "Les postes ne s'authentifient qu'auprès du serveur d'authentification.", c: 0, r: 1 },
      { id: 'ex2', k: 'req', label: 'EX-02', sub: 'Une ouverture de session aboutit en moins de 3 secondes.', c: 1.5, r: 1 },
      { id: 'ex3', k: 'req', label: 'EX-03', sub: 'Les comptes et les droits sont conservés dans un annuaire unique.', c: 3, r: 1 },
      { id: 'srv', k: 'block', label: 'ServeurAuthentification', c: 0.75, r: 2 },
      { id: 'dir', k: 'block', label: 'Annuaire', c: 2.25, r: 2 },
      { id: 't1', k: 'test', label: 'T-01', sub: 'Un poste ne joint pas l\'annuaire', c: 0, r: 3 },
      { id: 't2', k: 'test', label: 'T-02', sub: '10 ouvertures chronométrées', c: 1.5, r: 3 },
      { id: 't3', k: 'test', label: 'T-03', sub: 'Création de compte contrôlée', c: 3, r: 3 },
    ],
    edges: [
      { id: 'con1', from: 'ex0', to: 'ex1', k: 'contain' }, { id: 'con2', from: 'ex0', to: 'ex2', k: 'contain' }, { id: 'con3', from: 'ex0', to: 'ex3', k: 'contain' },
      { id: 'sat1', from: 'srv', to: 'ex1', k: 'satisfy' }, { id: 'sat2', from: 'srv', to: 'ex2', k: 'satisfy' }, { id: 'sat3', from: 'dir', to: 'ex3', k: 'satisfy' },
      { id: 'ver1', from: 't1', to: 'ex1', k: 'verify' }, { id: 'ver2', from: 't2', to: 'ex2', k: 'verify' }, { id: 'ver3', from: 't3', to: 'ex3', k: 'verify' },
    ],
  };
  if (sansTest) {
    const n = sansTest.slice(1);
    d.nodes = d.nodes.filter((x) => x.id !== sansTest);
    d.edges = d.edges.filter((x) => x.id !== `ver${n}`);
  }
  return d;
}

export function netSite(v: Vars = V0): GraphDiagram {
  return {
    kind: 'net', name: `site ${v.site}`,
    nodes: [
      { id: 'pc', k: 'device', label: v.pc, sub: v.ipPc, c: 0, r: 0.5 },
      { id: 'sw', k: 'device', label: v.sw, sub: 'commutateur', c: 1.4, r: 0.5 },
      { id: 'srvauth', k: 'device', label: v.auth, sub: v.ipAuth, c: 2.8, r: 0 },
      { id: 'srvdir', k: 'device', label: v.dir, sub: v.ipDir, c: 2.8, r: 1 },
    ],
    edges: [
      { from: 'pc', to: 'sw', k: 'link' }, { from: 'sw', to: 'srvauth', k: 'link' }, { from: 'sw', to: 'srvdir', k: 'link' },
    ],
  };
}

export function actDiag(): GraphDiagram {
  return {
    kind: 'act', name: 'DiagnosticOuvertureDeSession', pkg: 'Activity',
    nodes: [
      { id: 'i', k: 'initial', label: 'début', c: 0, r: 0 },
      { id: 'a1', k: 'action', label: "Lire le journal du serveur d'authentification", c: 1, r: 0 },
      { id: 'd1', k: 'decision', label: "Absence de réponse de l'annuaire ?", c: 2, r: 0 },
      { id: 'a4', k: 'action', label: 'Chercher la cause côté poste', c: 3.1, r: 0 },
      { id: 'f2', k: 'final', label: 'fin', c: 3.1, r: 1 },
      { id: 'a2', k: 'action', label: "Tester la liaison vers l'annuaire", c: 2, r: 1 },
      { id: 'a3', k: 'action', label: "Contrôler le service annuaire", c: 2, r: 2 },
      { id: 'f1', k: 'final', label: 'fin', c: 2, r: 3 },
    ],
    edges: [
      { from: 'i', to: 'a1', k: 'flow' }, { from: 'a1', to: 'd1', k: 'flow' },
      { id: 'oui', from: 'd1', to: 'a2', k: 'flow', label: '[oui]' }, { id: 'non', from: 'd1', to: 'a4', k: 'flow', label: '[non]' },
      { from: 'a2', to: 'a3', k: 'flow' }, { from: 'a3', to: 'f1', k: 'flow' }, { from: 'a4', to: 'f2', k: 'flow' },
    ],
  };
}

export function ucAuth(): GraphDiagram {
  return {
    kind: 'uc', name: 'Authentification', pkg: 'Package',
    boundary: { label: 'Authentification NovaTech', c: 1, r: 0, c2: 3, r2: 2 },
    nodes: [
      { id: 'user', k: 'actor', label: 'Utilisateur', c: 0, r: 0 },
      { id: 'admin', k: 'actor', label: 'Administrateur', c: 0, r: 2 },
      { id: 'open', k: 'usecase', label: 'Ouvrir une session', c: 1.5, r: 0 },
      { id: 'check', k: 'usecase', label: 'Vérifier le mot de passe', c: 3, r: 0 },
      { id: 'code', k: 'usecase', label: 'Demander un code de secours', c: 1.5, r: 1 },
      { id: 'manage', k: 'usecase', label: 'Gérer les comptes', c: 1.5, r: 2 },
    ],
    edges: [
      { from: 'user', to: 'open', k: 'assoc' }, { from: 'admin', to: 'manage', k: 'assoc' },
      { id: 'inc', from: 'open', to: 'check', k: 'include' }, { id: 'ext', from: 'code', to: 'open', k: 'extend' },
    ],
  };
}

export function stmService(): GraphDiagram {
  return {
    kind: 'stm', name: 'ServiceAuthentification', pkg: 'State Machine',
    nodes: [
      { id: 'i', k: 'initial', label: 'début', c: 0, r: 0 },
      { id: 'arret', k: 'state', label: 'Arrêté', c: 1, r: 0 },
      { id: 'demarre', k: 'state', label: 'Démarrage', c: 2, r: 0 },
      { id: 'service', k: 'state', label: 'En service', c: 3, r: 0 },
      { id: 'degrade', k: 'state', label: 'Dégradé', c: 3, r: 1 },
    ],
    edges: [
      { from: 'i', to: 'arret', k: 'trans' },
      { id: 'tdem', from: 'arret', to: 'demarre', k: 'trans', label: 'démarrer' },
      { id: 'tok', from: 'demarre', to: 'service', k: 'trans', label: 'annuaire joignable' },
      { id: 'tko', from: 'service', to: 'degrade', k: 'trans', label: 'annuaire injoignable' },
    ],
  };
}

export function pkgNova(): GraphDiagram {
  return {
    kind: 'pkg', name: 'NovaTech', pkg: 'Model',
    nodes: [
      { id: 'sup', k: 'package', label: 'Supervision', c: 3, r: 0 },
      { id: 'auth', k: 'package', label: 'Authentification', c: 1.5, r: 0 },
      { id: 'dir', k: 'package', label: 'Annuaire', c: 0.5, r: 1 },
      { id: 'net', k: 'package', label: 'Réseau', c: 2.5, r: 1 },
    ],
    edges: [
      { id: 'd1', from: 'sup', to: 'auth', k: 'dep' }, { id: 'd2', from: 'auth', to: 'dir', k: 'dep' }, { id: 'd3', from: 'auth', to: 'net', k: 'dep' },
    ],
  };
}

export const ALL_ACTS = (mods: { activities: Activity[] }[]): Activity[] => mods.flatMap((m) => m.activities);
