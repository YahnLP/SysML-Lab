import type { Activity, BuildAct, BuildSeqAct, FillAct, IdentifyAct, MatchAct, OrderAct, Tag, TraceAct } from '../types';
import { ITEMS5, LINES3, MSG_ACCES, MSG_COMPTE, MSG_DEMANDE, MSG_RECHERCHE, MSG_VERIF, MSGS5, REASONS5, V0, actDiag, bddAuth, ibdAuth, multi, netSite, permutation, quiz, reqAuth, seqAuth, N, Y, type Vars } from './common';

type Meta = { tag?: Tag; crit?: string; weight?: number; hints?: string[]; why?: string };

/* ---------------- REQ ---------------- */
export function reqIdentify(id: string, m: Meta): IdentifyAct {
  return {
    id, type: 'identify', prompt: "Dans ce diagramme d'exigences, clique l'élément demandé.", diagram: reqAuth(), ...m,
    tasks: [
      { ask: 'Une exigence qui demande une durée maximale', ids: ['ex2'], why: "EX-02 fixe une limite mesurable (moins de 3 secondes) : c'est ce qui permet de la vérifier ensuite.", wrong: { ex1: "EX-01 impose une règle d'architecture, pas une durée.", ex3: "EX-03 parle du stockage des comptes, pas d'un délai." } },
      { ask: "Le bloc qui satisfait l'exigence sur les comptes (EX-03)", ids: ['dir'], why: "Le lien satisfy part du bloc Annuaire vers EX-03 : c'est lui qui conserve les comptes.", wrong: { srv: "Le serveur d'authentification vérifie les mots de passe mais ne conserve pas les comptes." } },
      { ask: 'Le test qui vérifie EX-02', ids: ['t2'], why: "Le lien verify part de T-02 vers EX-02 : 10 ouvertures chronométrées permettent de contrôler la durée.", wrong: { t1: 'T-01 vérifie EX-01 (le poste ne joint pas l\'annuaire).', t3: 'T-03 vérifie EX-03 (comptes).' } },
    ],
  };
}
export function reqFill(id: string, m: Meta): FillAct {
  return {
    id, type: 'fill', prompt: 'Complète les deux liens manquants entre le bloc, le test et l\'exigence EX-01.', ...m,
    diagram: {
      kind: 'req', name: 'Authentification', pkg: 'Package',
      nodes: [
        { id: 'ex1', k: 'req', label: 'EX-01', sub: "Les postes ne s'authentifient qu'auprès du serveur d'authentification.", c: 1, r: 0 },
        { id: 'srv', k: 'block', label: 'ServeurAuthentification', c: 0, r: 1 },
        { id: 't1', k: 'test', label: 'T-01', sub: "Un poste ne joint pas l'annuaire", c: 2, r: 1 },
      ],
      edges: [{ id: 'e1', from: 'srv', to: 'ex1', k: 'satisfy', slot: 's1' }, { id: 'e2', from: 't1', to: 'ex1', k: 'verify', slot: 's2' }],
    },
    slots: [
      { id: 's1', label: 'Lien du bloc vers l\'exigence', answer: 'satisfy', options: [
        { v: 'satisfy', t: 'satisfy', set: { k: 'satisfy' }, why: 'Le bloc répond à l\'exigence : satisfy.' },
        { v: 'verify', t: 'verify', set: { k: 'verify' }, why: 'verify relie un test à une exigence, pas un bloc.' },
        { v: 'refine', t: 'refine', set: { k: 'refine' }, why: 'refine précise une exigence à partir d\'un cas d\'utilisation.' },
      ] },
      { id: 's2', label: 'Lien du test vers l\'exigence', answer: 'verify', options: [
        { v: 'satisfy', t: 'satisfy', set: { k: 'satisfy' }, why: 'Un test ne « satisfait » pas : il contrôle.' },
        { v: 'verify', t: 'verify', set: { k: 'verify' }, why: 'Le test contrôle que l\'exigence est respectée : verify.' },
        { v: 'derive', t: 'deriveReqt', set: { k: 'derive' }, why: 'deriveReqt relie deux exigences entre elles.' },
      ] },
    ],
  };
}
export function reqCoverage(id: string, m: Meta, miss: 't1' | 't2' | 't3' = 't2'): FillAct {
  const names = { t1: 'EX-01', t2: 'EX-02', t3: 'EX-03' } as const;
  return {
    id, type: 'fill', prompt: `Un test a été retiré du diagramme. Quelle exigence n'est plus vérifiée ?`, ...m, diagram: reqAuth(miss),
    slots: [{ id: 's1', label: 'Exigence non vérifiée', answer: miss, options: (['t1', 't2', 't3'] as const).map((k) => ({ v: k, t: names[k], why: k === miss ? `Plus aucun lien verify n'arrive sur ${names[k]} : rien ne prouve qu'elle est respectée.` : `${names[k]} a encore son test.` })) }],
  };
}
export function reqBuild(id: string, m: Meta): BuildAct {
  return {
    id, type: 'build', kind: 'req', name: 'Authentification', pkg: 'Package', ...m,
    prompt: "Relie les éléments : EX-00 contient EX-02, le serveur satisfait EX-02 et le test T-02 la vérifie.",
    palette: [
      { id: 'ex0', k: 'req', label: 'EX-00', sub: 'Ouvrir une session avec un compte unique.', c: 1, r: 0 },
      { id: 'ex2', k: 'req', label: 'EX-02', sub: 'Ouverture en moins de 3 secondes.', c: 1, r: 1 },
      { id: 'srv', k: 'block', label: 'ServeurAuthentification', c: 0, r: 2, distractor: "Ce bloc ne figure pas dans la consigne." },
      { id: 't2', k: 'test', label: 'T-02', sub: '10 ouvertures chronométrées', c: 2, r: 2 },
    ],
    kinds: [{ v: 'contain', t: 'contient (⊕)' }, { v: 'satisfy', t: 'satisfy' }, { v: 'verify', t: 'verify' }, { v: 'derive', t: 'deriveReqt' }],
    target: { nodes: ['ex0', 'ex2', 'srv', 't2'], edges: [{ from: 'ex0', to: 'ex2', k: 'contain' }, { from: 'srv', to: 'ex2', k: 'satisfy' }, { from: 't2', to: 'ex2', k: 'verify' }] },
    kindWhy: {
      'srv>ex2:verify': 'Un bloc ne vérifie pas : seul un test peut vérifier. Le bloc, lui, satisfait.',
      't2>ex2:satisfy': 'Un test ne satisfait pas une exigence, il vérifie qu\'elle est respectée.',
      'ex0>ex2:derive': 'EX-02 est une sous-exigence de EX-00 (contenance), pas une exigence dérivée.',
    },
  };
}

/* ---------------- BDD ---------------- */
export function bddQuiz(id: string, m: Meta): Activity {
  return quiz(id, 'Dans ce BDD, que représente « ServeurAuthentification » ?', [
    Y('Un type de composant du système (un bloc)', 'Un bloc décrit une famille d\'éléments : tous les serveurs d\'authentification ont la même structure.'),
    N('Le serveur physique SRV-AUTH01', 'SRV-AUTH01 est un exemplaire précis. Le BDD décrit le type, pas l\'exemplaire.'),
    N('Un lien réseau', 'Un lien se représente par un connecteur, pas par un bloc.'),
  ], { diagrams: [bddAuth()], ...m });
}
export function bddRead(id: string, m: Meta): Activity {
  return multi(id, 'Que dit ce BDD de OuvertureDeSession ? (plusieurs réponses)', [
    Y('Il est composé d\'un serveur d\'authentification', 'Le losange plein côté OuvertureDeSession indique que le serveur en est une partie.'),
    Y('Il est composé d\'un annuaire', 'Même losange plein vers Annuaire.'),
    N('Le serveur d\'authentification est composé de OuvertureDeSession', 'Le losange est du côté du tout : c\'est OuvertureDeSession qui est composé du serveur, pas l\'inverse.'),
    N('Le poste de travail fait partie de OuvertureDeSession', 'Le poste est relié par une simple association : il intervient, mais n\'est pas une partie du système.'),
  ], { diagrams: [bddAuth()], ...m });
}
export function bddFill(id: string, m: Meta): FillAct {
  return {
    id, type: 'fill', prompt: 'Complète le BDD : nom du bloc manquant et nature de la relation.', ...m,
    diagram: {
      kind: 'bdd', name: 'Authentification', pkg: 'Package',
      nodes: [
        { id: 'sys', k: 'block', label: 'OuvertureDeSession', c: 1, r: 0 },
        { id: 'srv', k: 'block', label: 'ServeurAuthentification', c: 0, r: 1 },
        { id: 'dir', k: 'block', label: '?', c: 2, r: 1, slot: 's1', sub: 'comptes : Integer' },
      ],
      edges: [{ id: 'e1', from: 'sys', to: 'srv', k: 'comp' }, { id: 'e2', from: 'sys', to: 'dir', k: 'comp', slot: 's2' }],
    },
    slots: [
      { id: 's1', label: 'Nom du bloc qui conserve les comptes', answer: 'Annuaire', options: [
        { v: 'Annuaire', t: 'Annuaire', set: { label: 'Annuaire' }, why: 'Un annuaire conserve les comptes : le nom correspond à la valeur « comptes ».' },
        { v: 'PosteDeTravail', t: 'PosteDeTravail', set: { label: 'PosteDeTravail' }, why: 'Le poste ne conserve pas les comptes de toute l\'entreprise.' },
        { v: 'Switch', t: 'Switch', set: { label: 'Switch' }, why: 'Un commutateur transporte les trames, il ne stocke pas de comptes.' },
      ] },
      { id: 's2', label: 'Relation entre OuvertureDeSession et ce bloc', answer: 'comp', options: [
        { v: 'comp', t: 'composition (losange plein)', set: { k: 'comp' }, why: 'Le bloc est une partie du système : composition, losange du côté du tout.' },
        { v: 'gen', t: 'généralisation (triangle vide)', set: { k: 'gen' }, why: 'La généralisation exprime « est une sorte de », pas « fait partie de ».' },
        { v: 'assoc', t: 'association simple', set: { k: 'assoc' }, why: 'Une association ne dit pas que le bloc fait partie du système.' },
      ] },
    ],
  };
}
export function bddBuild(id: string, m: Meta): BuildAct {
  return {
    id, type: 'build', kind: 'bdd', name: 'Authentification', pkg: 'Package', ...m,
    prompt: "Construis le BDD : le système OuvertureDeSession est composé d'un serveur d'authentification et d'un annuaire.",
    palette: [
      { id: 'sys', k: 'block', label: 'OuvertureDeSession', c: 1, r: 0 },
      { id: 'srv', k: 'block', label: 'ServeurAuthentification', c: 0, r: 1 },
      { id: 'dir', k: 'block', label: 'Annuaire', c: 2, r: 1 },
      { id: 'sw', k: 'block', label: 'Switch', c: 3, r: 0, distractor: "Le commutateur n'est pas cité dans la consigne : il appartient au réseau, pas à ce système." },
    ],
    kinds: [{ v: 'comp', t: 'composition' }, { v: 'gen', t: 'généralisation' }, { v: 'assoc', t: 'association' }],
    target: { nodes: ['sys', 'srv', 'dir'], edges: [{ from: 'sys', to: 'srv', k: 'comp' }, { from: 'sys', to: 'dir', k: 'comp' }] },
    kindWhy: { 'sys>srv:gen': 'Le serveur n\'est pas « une sorte de » système : il en est une partie.', 'sys>dir:gen': 'L\'annuaire n\'est pas « une sorte de » système : il en est une partie.', 'sys>srv:assoc': 'Une association simple ne dit pas « fait partie de ».', 'sys>dir:assoc': 'Une association simple ne dit pas « fait partie de ».' },
  };
}
export function bddGen(id: string, m: Meta): BuildAct {
  return {
    id, type: 'build', kind: 'bdd', name: 'Equipements', pkg: 'Package', ...m,
    prompt: 'Un serveur d\'authentification et un serveur d\'annuaire sont deux sortes de Serveur. Construis la généralisation.',
    palette: [
      { id: 'srv', k: 'block', label: 'Serveur', c: 1, r: 0 },
      { id: 'a', k: 'block', label: 'ServeurAuthentification', c: 0, r: 1 },
      { id: 'd', k: 'block', label: 'ServeurAnnuaire', c: 2, r: 1 },
    ],
    kinds: [{ v: 'gen', t: 'généralisation' }, { v: 'comp', t: 'composition' }, { v: 'assoc', t: 'association' }],
    target: { nodes: ['srv', 'a', 'd'], edges: [{ from: 'a', to: 'srv', k: 'gen' }, { from: 'd', to: 'srv', k: 'gen' }] },
    kindWhy: { 'a>srv:comp': 'Un serveur d\'authentification n\'est pas une partie d\'un Serveur : c\'est une sorte de Serveur.', 'd>srv:comp': 'Un serveur d\'annuaire n\'est pas une partie d\'un Serveur : c\'est une sorte de Serveur.' },
  };
}

/* ---------------- IBD ---------------- */
export function ibdIdentify(id: string, m: Meta, v: Vars = V0): IdentifyAct {
  return {
    id, type: 'identify', prompt: 'Dans cet IBD, clique l\'élément demandé.', diagram: ibdAuth(v), ...m,
    tasks: [
      { ask: 'La partie qui représente le poste de travail', ids: ['poste'], why: `« ${v.inst} : PosteDeTravail » est une partie : un exemplaire du bloc PosteDeTravail dans ce système.` },
      { ask: 'Le connecteur par lequel passent les identifiants', ids: ['poste>auth'], why: 'Le connecteur nommé « identifiants » relie le poste au serveur d\'authentification.', wrong: { 'auth>dir': 'Ce connecteur porte la recherche de compte, pas les identifiants.' } },
      { ask: 'La partie qui n\'est reliée qu\'au serveur d\'authentification', ids: ['dir'], why: 'L\'annuaire n\'a qu\'un connecteur : celui vers le serveur d\'authentification.', wrong: { poste: 'Le poste n\'est relié qu\'au serveur, mais le serveur est aussi relié à l\'annuaire : cherche la partie en bout de chaîne.' } },
    ],
  };
}
export function ibdTrace(id: string, m: Meta, v: Vars = V0): TraceAct {
  return {
    id, type: 'trace', prompt: `Un utilisateur ouvre une session sur ${v.inst}. Clique, dans l'ordre, les parties que sa demande traverse jusqu'à l'annuaire.`, diagram: ibdAuth(v), path: ['poste', 'auth', 'dir'], ...m,
    wrong: { dir: "Pas encore : le poste n'a aucun connecteur direct vers l'annuaire. La demande passe d'abord par le serveur d'authentification." },
    why2: "La demande suit les connecteurs : poste, serveur d'authentification, annuaire. Il n'existe pas de raccourci.",
  };
}
export function ibdFill(id: string, m: Meta): FillAct {
  return {
    id, type: 'fill', prompt: 'Complète l\'IBD : le nom de la partie et ce que transporte le connecteur.', ...m,
    diagram: {
      kind: 'ibd', name: 'OuvertureDeSession', pkg: 'Block',
      nodes: [
        { id: 'poste', k: 'part', label: 'poste', sub: 'PosteDeTravail', c: 0, r: 0 },
        { id: 'auth', k: 'part', label: 'serveurAuth', sub: 'ServeurAuthentification', c: 1.5, r: 0 },
        { id: 'dir', k: 'part', label: '?', sub: 'Annuaire', c: 3, r: 0, slot: 's1' },
      ],
      edges: [{ from: 'poste', to: 'auth', k: 'conn', label: 'identifiants' }, { from: 'auth', to: 'dir', k: 'conn', label: '?', slot: 's2' }],
    },
    slots: [
      { id: 's1', label: 'Nom de la partie de type Annuaire', answer: 'annuaire', options: [
        { v: 'annuaire', t: 'annuaire', set: { label: 'annuaire' }, why: 'Par convention le nom de la partie reprend son rôle : annuaire.' },
        { v: 'Annuaire', t: 'Annuaire', set: { label: 'Annuaire' }, why: 'Une majuscule désigne un type (bloc). Une partie porte un nom d\'usage en minuscule.' },
      ] },
      { id: 's2', label: 'Ce que le connecteur transporte', answer: 'recherche', options: [
        { v: 'recherche', t: 'recherche', set: { label: 'recherche' }, why: 'Le serveur interroge l\'annuaire : le connecteur porte la recherche.' },
        { v: 'identifiants', t: 'identifiants', set: { label: 'identifiants' }, why: 'Les identifiants circulent entre le poste et le serveur, pas vers l\'annuaire.' },
      ] },
    ],
  };
}
export function ibdBuild(id: string, m: Meta): BuildAct {
  return {
    id, type: 'build', kind: 'ibd', name: 'OuvertureDeSession', pkg: 'Block', ...m,
    prompt: "Construis l'IBD : le poste est relié au serveur d'authentification, lui-même relié à l'annuaire.",
    palette: [
      { id: 'poste', k: 'part', label: 'poste', sub: 'PosteDeTravail', c: 0, r: 0 },
      { id: 'auth', k: 'part', label: 'serveurAuth', sub: 'ServeurAuthentification', c: 1.5, r: 0 },
      { id: 'dir', k: 'part', label: 'annuaire', sub: 'Annuaire', c: 3, r: 0 },
    ],
    kinds: [{ v: 'conn', t: 'connecteur' }, { v: 'comp', t: 'composition' }, { v: 'gen', t: 'généralisation' }],
    target: { nodes: ['poste', 'auth', 'dir'], edges: [{ from: 'poste', to: 'auth', k: 'conn' }, { from: 'auth', to: 'dir', k: 'conn' }] },
    kindWhy: { 'poste>auth:comp': 'Dans un IBD on relie des parties par des connecteurs ; la composition se lit dans le BDD.', 'auth>dir:comp': 'Dans un IBD on relie des parties par des connecteurs ; la composition se lit dans le BDD.' },
    // pas d'arête interdite explicite : un lien direct poste-annuaire est détecté comme « en trop ».
  };
}
export function ibdForbid(b: BuildAct): BuildAct {
  return { ...b, target: { ...b.target, forbid: [{ from: 'poste', to: 'dir', why: "Le poste ne parle pas directement à l'annuaire : tout passe par le serveur d'authentification." }] } };
}

/* ---------------- SEQ ---------------- */
export function seqOrder(id: string, m: Meta, seed = 0): OrderAct {
  const start = seed ? permutation(5, seed) : [3, 0, 4, 1, 2];
  return {
    id, type: 'order', prompt: "Remets dans l'ordre les messages d'une ouverture de session réussie.", items: ITEMS5, reasons: REASONS5, start: start.join() === '0,1,2,3,4' ? [3, 0, 4, 1, 2] : start,
    seq: { name: 'OuvertureDeSession', lines: LINES3, msgs: MSGS5 }, ...m,
  };
}
export function seqIdentify(id: string, m: Meta): IdentifyAct {
  return {
    id, type: 'identify', prompt: 'Dans cette séquence, clique l\'élément demandé.', diagram: seqAuth(), ...m,
    tasks: [
      { ask: 'Le message qui ouvre l\'échange', ids: ['m0'], why: 'Le premier message, en haut, part du poste : rien ne se passe avant sa demande.' },
      { ask: "Un message que le serveur s'envoie à lui-même", ids: ['m3'], why: 'La flèche qui revient sur la ligne de vie du serveur est un traitement interne : la vérification du mot de passe.' },
      { ask: 'La ligne de vie qui reçoit le message « recherche du compte »', ids: ['dir'], why: 'La flèche arrive sur annuaire : c\'est lui qui reçoit la recherche.', wrong: { auth: 'serveurAuth envoie cette recherche, il ne la reçoit pas.' } },
    ],
  };
}
export function seqFill(id: string, m: Meta): FillAct {
  return {
    id, type: 'fill', prompt: "Complète la séquence : quel message manque entre la recherche du compte et la vérification ?", ...m,
    diagram: { kind: 'seq', name: 'OuvertureDeSession', lines: LINES3, msgs: [MSG_DEMANDE, MSG_RECHERCHE, { ...MSG_COMPTE, label: '?', slot: 's1' }, MSG_VERIF, MSG_ACCES] },
    slots: [{ id: 's1', label: 'Message manquant (retour de l\'annuaire)', answer: 'compte', options: [
      { v: 'compte', t: 'compte et droits', set: { label: 'compte et droits' }, why: 'L\'annuaire répond en renvoyant le compte : sans lui le serveur n\'a rien à vérifier.' },
      { v: 'acces', t: 'accès accordé', set: { label: 'accès accordé' }, why: 'Accorder l\'accès avant la vérification serait une faille ; ce message va d\'ailleurs au poste.' },
      { v: 'demande', t: "demande d'ouverture de session", set: { label: "demande d'ouverture de session" }, why: 'La demande ouvre l\'échange : elle est déjà en première position.' },
    ] }],
  };
}
export function seqBuild(id: string, m: Meta): BuildSeqAct {
  return {
    id, type: 'buildseq', prompt: 'Construis la séquence, dans l\'ordre, en choisissant pour chaque message qui l\'envoie, qui le reçoit et son nom.', name: 'OuvertureDeSession', lines: LINES3,
    labels: ITEMS5, expected: MSGS5.map((x) => ({ from: x.from, to: x.to, label: x.label, ret: x.ret })), reasons: REASONS5, ...m,
  };
}
export function seqAlt(id: string, m: Meta): MatchAct {
  return {
    id, type: 'match', prompt: 'Dans cette séquence avec choix (alt), associe chaque branche à son résultat.', ...m, diagram: undefined,
    choices: ['accès accordé', 'accès refusé'],
    pairs: [
      { l: 'Si le mot de passe est correct', a: 'accès accordé', why: 'La première branche du alt est garde « mot de passe correct » : le serveur répond favorablement.' },
      { l: 'Si le mot de passe est faux', a: 'accès refusé', why: 'La seconde branche est garde « mot de passe faux » : le serveur refuse.' },
    ],
  };
}

/* ---------------- Réseau (TSSR / CIEL) ---------------- */
export function netVsIbd(id: string, m: Meta, v: Vars = V0): Activity {
  return quiz(id, `Le schéma réseau montre ${v.pc} (${v.ipPc}) et ${v.auth} (${v.ipAuth}). Que montre en plus le modèle SysML ?`, [
    Y("Les rôles : qui demande, qui vérifie, qui conserve les comptes", "Le schéma réseau dit où sont les machines ; le modèle dit ce que chacune fait dans l'échange."),
    N("Les adresses IP et les masques", "Les adresses restent dans le schéma réseau : SysML ne remplace pas ce document."),
    N('Le câblage entre les ports du commutateur', 'Le câblage appartient au schéma réseau, pas au modèle.'),
  ], { diagrams: [netSite(v)], ...m });
}

/* ---------------- ACT ---------------- */
export function actRead(id: string, m: Meta): Activity {
  return quiz(id, "D'après ce diagramme d'activité, que fait-on si l'annuaire ne répond pas ?", [
    Y("On teste la liaison vers l'annuaire, puis on contrôle le service annuaire", 'Le losange est un choix : la branche [oui] mène au test de liaison puis au contrôle du service.'),
    N('On cherche la cause côté poste', 'C\'est la branche [non] : l\'annuaire répond, donc le problème est ailleurs.'),
    N('On termine immédiatement', 'Aucune branche ne mène directement à la fin sans action.'),
  ], { diagrams: [actDiag()], ...m });
}
