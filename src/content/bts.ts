import type { Activity, BuildAct, FillAct, GraphDiagram, IdentifyAct, Module, Parcours } from '../types';
import { V0, actDiag, bddAuth, ibdAuth, multi, pkgNova, quiz, seqAuthAlt, stmService, tg, ucAuth, N, Y, hashString, type Vars } from './common';
import { actRead, bddBuild, bddGen, bddRead, ibdBuild, ibdForbid, ibdIdentify, ibdTrace, reqBuild, reqCoverage, reqFill, reqIdentify, seqAlt, seqBuild, seqFill, seqIdentify, seqOrder } from './lib';

type M = { tag?: ReturnType<typeof tg>; crit?: string; weight?: number; hints?: string[]; why?: string };

const ucIdentify = (id: string, m: M): IdentifyAct => ({
  id, type: 'identify', prompt: "Dans ce diagramme de cas d'utilisation, clique l'élément demandé.", diagram: ucAuth(), ...m,
  tasks: [
    { ask: "L'acteur qui ouvre une session", ids: ['user'], why: "L'utilisateur est relié par une association au cas « Ouvrir une session »." },
    { ask: "Un cas qui est toujours exécuté avec « Ouvrir une session »", ids: ['check'], why: "include : « Vérifier le mot de passe » est inclus, il a lieu à chaque ouverture.", wrong: { code: "« Demander un code de secours » est un cas optionnel (extend)." } },
    { ask: "L'acteur qui gère les comptes", ids: ['admin'], why: "L'administrateur est relié au cas « Gérer les comptes ».", wrong: { user: "L'utilisateur n'est relié qu'à l'ouverture de session." } },
  ],
});
const ucFill = (id: string, m: M): FillAct => ({
  id, type: 'fill', prompt: "Complète la nature des deux liens entre cas d'utilisation.", ...m,
  diagram: { ...ucAuth(), edges: ucAuth().edges.map((e) => (e.id === 'inc' ? { ...e, slot: 's1' } : e.id === 'ext' ? { ...e, slot: 's2' } : e)) },
  slots: [
    { id: 's1', label: "« Vérifier le mot de passe » a lieu à chaque ouverture", answer: 'include', options: [
      { v: 'include', t: 'include', set: { k: 'include' }, why: 'Un cas toujours exécuté est inclus : include, flèche du cas de base vers le cas inclus.' },
      { v: 'extend', t: 'extend', set: { k: 'extend' }, why: "extend sert à un comportement optionnel, pas systématique." },
    ] },
    { id: 's2', label: '« Demander un code de secours » n\'a lieu que parfois', answer: 'extend', options: [
      { v: 'include', t: 'include', set: { k: 'include' }, why: "Un cas facultatif n'est pas toujours exécuté : ce n'est pas un include." },
      { v: 'extend', t: 'extend', set: { k: 'extend' }, why: "Cas facultatif : extend, flèche du cas qui étend vers le cas de base." },
    ] },
  ],
});
const ucBuild = (id: string, m: M): BuildAct => ({
  id, type: 'build', kind: 'uc', name: 'Authentification', pkg: 'Package', ...m,
  prompt: "Construis le diagramme : l'utilisateur ouvre une session ; l'ouverture inclut la vérification du mot de passe ; le code de secours est une extension facultative.",
  boundary: ucAuth().boundary,
  palette: [
    { id: 'user', k: 'actor', label: 'Utilisateur', c: 0, r: 0 },
    { id: 'open', k: 'usecase', label: 'Ouvrir une session', c: 1.5, r: 0 },
    { id: 'check', k: 'usecase', label: 'Vérifier le mot de passe', c: 3, r: 0 },
    { id: 'code', k: 'usecase', label: 'Demander un code de secours', c: 1.5, r: 1 },
    { id: 'gest', k: 'usecase', label: 'Sauvegarder le serveur', c: 3, r: 1, distractor: "Ce cas n'appartient pas à l'authentification de la consigne." },
  ],
  kinds: [{ v: 'assoc', t: 'association' }, { v: 'include', t: 'include' }, { v: 'extend', t: 'extend' }],
  target: { nodes: ['user', 'open', 'check', 'code'], edges: [{ from: 'user', to: 'open', k: 'assoc' }, { from: 'open', to: 'check', k: 'include' }, { from: 'code', to: 'open', k: 'extend' }] },
  kindWhy: { 'open>check:extend': "Cette vérification est systématique : c'est un include.", 'code>open:include': "Le code de secours est facultatif : c'est un extend." },
});
const actFill = (id: string, m: M): FillAct => ({
  id, type: 'fill', prompt: "Complète le diagramme d'activité : les conditions des deux branches.", ...m,
  diagram: { ...actDiag(), edges: actDiag().edges.map((e) => (e.id === 'oui' ? { ...e, label: '?', slot: 's1' } : e.id === 'non' ? { ...e, label: '?', slot: 's2' } : e)) },
  slots: [
    { id: 's1', label: "Branche vers « Tester la liaison vers l'annuaire »", answer: 'oui', options: [
      { v: 'oui', t: '[oui]', set: { label: '[oui]' }, why: "Si l'annuaire ne répond pas, on teste la liaison : [oui]." },
      { v: 'non', t: '[non]', set: { label: '[non]' }, why: "Si l'annuaire répond, le problème est ailleurs : ce n'est pas la branche qui teste la liaison." },
    ] },
    { id: 's2', label: "Branche vers « Chercher la cause côté poste »", answer: 'non', options: [
      { v: 'oui', t: '[oui]', set: { label: '[oui]' }, why: "Cette branche s'exécute quand l'annuaire répond." },
      { v: 'non', t: '[non]', set: { label: '[non]' }, why: "L'annuaire répond : on cherche côté poste. Condition [non]." },
    ] },
  ],
});
const actBuild = (id: string, m: M): BuildAct => ({
  id, type: 'build', kind: 'act', name: 'Diagnostic', pkg: 'Activity', ...m,
  prompt: "Construis la séquence d'actions : début, lire le journal, tester la liaison, contrôler le service, fin.",
  palette: [
    { id: 'i', k: 'initial', label: 'début', c: 0, r: 0 },
    { id: 'a1', k: 'action', label: 'Lire le journal', c: 1, r: 0 },
    { id: 'a2', k: 'action', label: 'Tester la liaison', c: 2, r: 0 },
    { id: 'a3', k: 'action', label: 'Contrôler le service', c: 3, r: 0 },
    { id: 'f', k: 'final', label: 'fin', c: 4, r: 0 },
  ],
  kinds: [{ v: 'flow', t: 'flux de contrôle' }, { v: 'trans', t: 'transition' }, { v: 'dep', t: 'dépendance' }],
  target: { nodes: ['i', 'a1', 'a2', 'a3', 'f'], edges: [{ from: 'i', to: 'a1', k: 'flow' }, { from: 'a1', to: 'a2', k: 'flow' }, { from: 'a2', to: 'a3', k: 'flow' }, { from: 'a3', to: 'f', k: 'flow' }] },
  kindWhy: { 'i>a1:trans': "Une transition appartient au diagramme d'états ; ici ce sont des flux de contrôle.", 'a1>a2:trans': "Une transition appartient au diagramme d'états.", 'a2>a3:trans': "Une transition appartient au diagramme d'états.", 'a3>f:trans': "Une transition appartient au diagramme d'états." },
});
const reqDerive = (id: string, m: M): BuildAct => ({
  id, type: 'build', kind: 'req', name: 'Disponibilité', pkg: 'Package', ...m,
  prompt: "EX-04 (annuaire répliqué) est dérivée de EX-02 (disponibilité). Le bloc AnnuaireReplique la satisfait ; le test T-04 la vérifie.",
  palette: [
    { id: 'ex2', k: 'req', label: 'EX-02', sub: "Le service reste disponible si un annuaire tombe.", c: 1, r: 0 },
    { id: 'ex4', k: 'req', label: 'EX-04', sub: "L'annuaire est répliqué sur deux serveurs.", c: 1, r: 1 },
    { id: 'rep', k: 'block', label: 'AnnuaireReplique', c: 0, r: 2 },
    { id: 't4', k: 'test', label: 'T-04', sub: "Arrêt d'un annuaire", c: 2, r: 2 },
  ],
  kinds: [{ v: 'derive', t: 'deriveReqt' }, { v: 'satisfy', t: 'satisfy' }, { v: 'verify', t: 'verify' }, { v: 'contain', t: 'contient (⊕)' }],
  target: { nodes: ['ex2', 'ex4', 'rep', 't4'], edges: [{ from: 'ex4', to: 'ex2', k: 'derive' }, { from: 'rep', to: 'ex4', k: 'satisfy' }, { from: 't4', to: 'ex4', k: 'verify' }] },
  kindWhy: { 'ex4>ex2:contain': "EX-04 découle de EX-02 mais n'en est pas une partie : on utilise deriveReqt.", 'ex2>ex4:derive': 'deriveReqt part de l\'exigence dérivée (EX-04) vers l\'exigence source (EX-02).' },
});
const coherence = (id: string, m: M): Activity => {
  const ibdSans: GraphDiagram = { ...ibdAuth(), nodes: ibdAuth().nodes.filter((n) => n.id !== 'dir'), edges: ibdAuth().edges.filter((e) => e.to !== 'dir') };
  return quiz(id, "Le BDD compose le système d'un annuaire, mais l'IBD n'en montre aucun. Que fais-tu ?", [
    Y("Je corrige l'IBD : ajouter la partie annuaire et son connecteur", "Les diagrammes décrivent le même système : ce qui figure dans la composition doit apparaître dans l'IBD."),
    N("Je retire l'annuaire du BDD", "Le BDD est correct : EX-03 exige un annuaire unique."),
    N('Je laisse tel quel', "Deux diagrammes qui se contredisent trompent le lecteur."),
  ], { diagrams: [bddAuth(), ibdSans], ...m });
};
const notation = (id: string, m: M): Activity => multi(id, "Repère les erreurs de notation (plusieurs réponses).", [
  Y("Un losange plein placé du côté de la partie", "Le losange se place du côté du tout."),
  Y("Une flèche verify qui part d'un bloc", "verify part d'un test."),
  N("Une flèche en pointillés pour un retour de séquence", "C'est la notation correcte."),
  N("Un connecteur entre deux parties d'un IBD", "C'est la notation correcte."),
], m);

export function bts(v: Vars = V0, seed = 0): Parcours {
  const s = seed || 0;
  const missing = (['t1', 't2', 't3'] as const)[hashString(v.pc) % 3] as 't1' | 't2' | 't3';
  const modules: Module[] = [
    {
      id: 'bts-b0', n: 'B0', title: 'Pourquoi un modèle SysML', level: 1,
      objectives: ["Situer SysML dans la démarche d'ingénierie", 'Savoir quel diagramme répond à quelle question'],
      prereq: ['Aucun'], success: 'Les deux activités réussies.',
      pourquoi: "Un modèle est la source commune de plusieurs vues : chaque diagramme répond à une question précise sur le même système.",
      cours: ["SysML modélise un système avec des diagrammes cohérents entre eux : exigences, structure, comportement.", "Tu dois savoir lire, produire et vérifier la cohérence de ces diagrammes dans le cadre d'une infrastructure."],
      exemple: { diagram: pkgNova(), notes: ["Le paquetage organise le modèle : Supervision dépend d'Authentification."] },
      activities: [
        quiz('bts-b0-a1', "Quelle question appelle un diagramme de séquence ?", [Y("Dans quel ordre les éléments échangent-ils ?", 'La séquence montre le temps.'), N("De quoi le système est-il composé ?", 'Question du BDD.')]),
        quiz('bts-b0-a2', "Pourquoi garder les diagrammes cohérents entre eux ?", [Y("Ils décrivent le même système vu sous plusieurs angles", "Une contradiction entre deux diagrammes signale une erreur."), N("Pour en réduire le nombre", "Ce n'est pas l'objectif.")]),
      ],
    },
    {
      id: 'bts-b1', n: 'B1', title: "Cas d'utilisation et activité", level: 2,
      objectives: ["Lire et compléter un diagramme de cas d'utilisation", "Lire et compléter un diagramme d'activité"],
      prereq: ['B0'], success: 'Liens include/extend et conditions complétés.',
      pourquoi: "Avant de concevoir, on dit qui fait quoi avec le système (UC) et dans quel enchaînement (ACT).",
      cours: ["<b>Acteur</b> (hors système) relié à un <b>cas d'utilisation</b> (dans la frontière).", "<b>include</b> : toujours exécuté. <b>extend</b> : facultatif, la flèche va du cas qui étend vers le cas de base.", "Un diagramme d'activité enchaîne des actions ; un losange crée une alternative."],
      exemple: { diagram: ucAuth(), notes: ["La vérification du mot de passe est incluse.", "Le code de secours étend l'ouverture."] },
      activities: [
        ucIdentify('bts-b1-a1', { tag: tg('uc', 1), hints: ['Les acteurs sont hors de la frontière.'] }),
        ucFill('bts-b1-a2', { tag: tg('uc', 2) }),
        actRead('bts-b1-a3', { tag: tg('act', 1) }),
        actFill('bts-b1-a4', { tag: tg('act', 2) }),
        ucBuild('bts-b1-a5', { tag: tg('uc', 2), hints: ['Quel cas a lieu à chaque fois ? Lequel est facultatif ?'] }),
        actBuild('bts-b1-a6', { tag: tg('act', 2) }),
      ],
    },
    {
      id: 'bts-b2', n: 'B2', title: 'Exigences : construire et dériver', level: 3,
      objectives: ['Construire un diagramme d\'exigences', 'Dériver une exigence', 'Repérer une exigence non vérifiée'],
      prereq: ['B1'], success: 'Diagrammes construits sans lien erroné.',
      pourquoi: "Les exigences relient le besoin du client à l'architecture et aux tests : la traçabilité est la raison d'être du diagramme.",
      cours: ["<b>satisfy</b> : bloc vers exigence. <b>verify</b> : test vers exigence. <b>deriveReqt</b> : exigence dérivée vers exigence source. <b>refine</b> : cas d'utilisation vers exigence.", "Une exigence sans satisfy ou sans verify est un trou de traçabilité."],
      activities: [
        reqIdentify('bts-b2-a1', { tag: tg('req', 1) }),
        reqFill('bts-b2-a2', { tag: tg('req', 2) }),
        reqBuild('bts-b2-a3', { tag: tg('req', 3), hints: ['Relie chaque élément à EX-02.'] }),
        reqDerive('bts-b2-a4', { tag: tg('req', 3) }),
      ],
    },
    {
      id: 'bts-b3', n: 'B3', title: 'Blocs : composer et généraliser', level: 3,
      objectives: ['Construire un BDD avec composition et généralisation'],
      prereq: ['B2'], success: 'BDD construits sans relation fausse.',
      pourquoi: "Le BDD fixe le vocabulaire de l'architecture : de quoi est fait le système et quelles familles de composants existent.",
      cours: ["Composition : « fait partie de ». Généralisation : « est une sorte de » (triangle vide vers le bloc général).", "Ne confonds pas : un serveur d'annuaire est une sorte de serveur, mais l'annuaire est une partie du service."],
      exemple: { diagram: bddAuth(), notes: ['Composition du système.'] },
      activities: [
        bddRead('bts-b3-a1', { tag: tg('bdd', 1) }),
        bddBuild('bts-b3-a2', { tag: tg('bdd', 2) }),
        bddGen('bts-b3-a3', { tag: tg('bdd', 3), hints: ['Le triangle pointe vers le général.'] }),
      ],
    },
    {
      id: 'bts-b4', n: 'B4', title: 'Blocs internes : architecture et interfaces', level: 3,
      objectives: ['Lire et construire un IBD', 'Identifier ce qui ne doit pas être relié'],
      prereq: ['B3'], success: 'IBD construit sans lien interdit.',
      pourquoi: "L'IBD dit comment l'architecture est réellement câblée : c'est la vue qui sert à installer et à dépanner.",
      cours: ["Une partie est un exemplaire de bloc ; un connecteur relie deux parties ; son nom dit ce qui circule.", "Un <b>port SysML</b> est un point d'interaction d'un bloc : à ne pas confondre avec un port TCP."],
      exemple: { diagram: ibdAuth(v), notes: ['Chaîne poste, serveur, annuaire.'] },
      activities: [
        ibdIdentify('bts-b4-a1', { tag: tg('ibd', 1) }, v),
        ibdTrace('bts-b4-a2', { tag: tg('ibd', 2) }, v),
        ibdForbid(ibdBuild('bts-b4-a3', { tag: tg('ibd', 3), hints: ['Aucun lien direct poste - annuaire.'] })),
      ],
    },
    {
      id: 'bts-b5', n: 'B5', title: 'Séquence : construire un échange', level: 3,
      objectives: ['Construire une séquence', 'Lire un choix (alt)'],
      prereq: ['B4'], success: 'Séquence exacte, branches associées.',
      pourquoi: "La séquence prouve que l'architecture permet réellement l'échange attendu, y compris dans les cas d'échec.",
      cours: ["Un fragment <b>alt</b> encadre des branches exclusives, chacune avec sa condition de garde.", "Un message de retour est en pointillés."],
      exemple: { diagram: seqAuthAlt(), notes: ['Deux issues : accès accordé ou refusé.'] },
      activities: [
        seqIdentify('bts-b5-a1', { tag: tg('seq', 1) }),
        seqFill('bts-b5-a2', { tag: tg('seq', 2) }),
        seqBuild('bts-b5-a3', { tag: tg('seq', 3), hints: ['Qui déclenche ?', 'Une réponse suit sa demande.'] }),
        seqAlt('bts-b5-a4', { tag: tg('seq', 3) }),
      ],
    },
    {
      id: 'bts-b6', n: 'B6', title: 'Cohérence et évolution', level: 3,
      objectives: ['Vérifier la cohérence entre diagrammes', "Mettre à jour le modèle après une évolution"],
      prereq: ['B5'], success: 'Incohérences repérées et corrigées.',
      pourquoi: "Un modèle utile reste cohérent et à jour : c'est la compétence qui fait la différence en entreprise.",
      cours: ["Contrôle croisé : tout bloc cité dans le BDD apparaît dans l'IBD ; tout message de la séquence passe par un connecteur existant ; toute exigence a son bloc et son test."],
      activities: [
        coherence('bts-b6-a1', { tag: tg('ibd', 3) }),
        reqCoverage('bts-b6-a2', { tag: tg('req', 3) }, 't3'),
        quiz('bts-b6-a3', "Un message « recherche du compte » part du poste vers l'annuaire. Que contrôles-tu ?", [Y("L'IBD : il n'existe pas de connecteur poste - annuaire", "Un message suppose un connecteur entre les deux parties."), N("Rien : la séquence fait foi", "La séquence doit rester compatible avec l'IBD.")], { diagrams: [ibdAuth(v)], tag: tg('seq', 3) }),
      ],
    },
    {
      id: 'bts-b7', n: 'B7', title: 'Ouverture : états et paquetages', level: 1, optional: true,
      objectives: ["Lire un diagramme d'états et un diagramme de paquetages"],
      prereq: ['B0'], success: 'Les deux activités réussies.',
      pourquoi: "Ces diagrammes complètent la vue : le cycle de vie d'un service et l'organisation du modèle.",
      cours: ["Un état est une situation durable ; une transition la fait changer, déclenchée par un événement.", "Un paquetage regroupe des éléments ; une dépendance indique qui s'appuie sur qui."],
      exemple: { diagram: stmService(), notes: ['Le service passe en mode dégradé si l\'annuaire est injoignable.'] },
      activities: [
        quiz('bts-b7-a1', "Quel événement fait passer le service de « En service » à « Dégradé » ?", [Y("annuaire injoignable", 'La transition porte cet événement.'), N("démarrer", "démarrer fait passer de Arrêté à Démarrage.")], { diagrams: [stmService()], tag: tg('stm', 1) }),
        quiz('bts-b7-a2', "D'après ce diagramme de paquetages, de quoi dépend Authentification ?", [Y("Annuaire et Réseau", 'Deux flèches de dépendance partent de Authentification.'), N("Supervision", "C'est Supervision qui dépend d'Authentification.")], { diagrams: [pkgNova()], tag: tg('pkg', 1) }),
      ],
    },
    {
      id: 'bts-b8', n: 'B8', title: 'Étude de cas : démarche complète', level: 4, optional: true,
      objectives: ['Conduire une démarche de modélisation du besoin à la vérification'],
      prereq: ['B6'], success: 'Démarche ordonnée et justifiée.',
      pourquoi: "Savoir pourquoi on modélise dans cet ordre est la maîtrise méthodologique.",
      cours: ["Démarche type : exigences, architecture (BDD), liaisons (IBD), échanges (SEQ), vérification de cohérence."],
      situation: "NovaTech veut ajouter une seconde annuaire pour tenir la disponibilité.",
      activities: [
        {
          id: 'bts-b8-a1', type: 'order', prompt: "Ordonne la démarche de modélisation.", tag: tg('req', 4),
          items: ["Formuler l'exigence de disponibilité", "Décrire les blocs du service", "Relier les parties dans l'IBD", "Décrire l'échange en cas de panne", "Contrôler la cohérence et la couverture par des tests"],
          reasons: ["Sans exigence, on ne sait pas ce que l'architecture doit garantir.", "Il faut connaître les blocs avant de les relier.", "Les liens doivent exister avant de décrire les échanges.", "La cohérence se contrôle une fois tous les diagrammes écrits."],
          start: [3, 0, 4, 2, 1],
        },
      ],
    },
    {
      id: 'bts-b9', n: 'B9', title: 'Évaluation finale', level: 3, exam: true,
      objectives: ['Mobiliser le parcours sur un cas nouveau'],
      prereq: ['B1 à B6 travaillés'], success: 'Score sur 20 ; correction détaillée à la fin.',
      pourquoi: "Vérifier que tu sais lire, construire et contrôler un modèle cohérent, seul.",
      cours: ['Une seule tentative par question, sans indice.'],
      situation: `Site ${v.site} : ${v.pc} (${v.ipPc}), ${v.auth} (${v.ipAuth}), ${v.dir} (${v.ipDir}).`,
      activities: [
        reqCoverage('bts-b9-a1', { tag: tg('req', 3), crit: 'b1', weight: 2 }, missing),
        reqBuild('bts-b9-a2', { tag: tg('req', 3), crit: 'b1', weight: 2 }),
        ibdForbid(ibdBuild('bts-b9-a3', { tag: tg('ibd', 3), crit: 'b2', weight: 5 })),
        seqBuild('bts-b9-a4', { tag: tg('seq', 3), crit: 'b3', weight: 4 }),
        coherence('bts-b9-a5', { tag: tg('ibd', 3), crit: 'b4', weight: 4 }),
        notation('bts-b9-a6', { crit: 'b5', weight: 3 }),
      ],
    },
  ];
  void s; void seqOrder;
  return {
    id: 'bts', name: 'BTS SIO SISR', levelLabel: 'Niveaux 1 à 3 (4 optionnel)', target: 3,
    orient: 'Lire, produire et vérifier la cohérence des diagrammes d\'une infrastructure.',
    situation: "Tu es technicien supérieur chez NovaTech : tu documentes et fais évoluer le modèle de l'infrastructure.",
    statut: 'Niveaux visés : choix pédagogique proposé (à valider avec le référentiel).',
    cases: [
      { d: 'uc', level: 1 }, { d: 'uc', level: 2 }, { d: 'act', level: 1 }, { d: 'act', level: 2 },
      { d: 'req', level: 1 }, { d: 'req', level: 2 }, { d: 'req', level: 3 },
      { d: 'bdd', level: 1 }, { d: 'bdd', level: 2 }, { d: 'bdd', level: 3 },
      { d: 'ibd', level: 1 }, { d: 'ibd', level: 2 }, { d: 'ibd', level: 3 },
      { d: 'seq', level: 1 }, { d: 'seq', level: 2 }, { d: 'seq', level: 3 },
      { d: 'stm', level: 1, optional: true }, { d: 'pkg', level: 1, optional: true },
    ],
    grille: [
      { id: 'b1', label: 'Exigences', pts: 4 }, { id: 'b2', label: 'Architecture et interfaces', pts: 5 },
      { id: 'b3', label: 'Échanges', pts: 4 }, { id: 'b4', label: 'Cohérence entre diagrammes', pts: 4 }, { id: 'b5', label: 'Notation', pts: 3 },
    ],
    modules,
  };
}
