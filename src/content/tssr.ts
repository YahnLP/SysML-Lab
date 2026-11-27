import type { Module, Parcours } from '../types';
import { V0, actDiag, bddAuth, ibdAuth, netSite, quiz, reqAuth, seqAuth, tg, N, Y, type Vars, hashString } from './common';
import { actRead, bddFill, bddQuiz, bddRead, ibdBuild, ibdFill, ibdForbid, ibdIdentify, ibdTrace, netVsIbd, reqCoverage, reqIdentify, seqFill, seqIdentify, seqOrder } from './lib';

export function tssr(v: Vars = V0, seed = 0): Parcours {
  const s = seed || 0;
  const locate = (id: string, m: Parameters<typeof quiz>[3]) => quiz(id, `Sur ${v.pc}, l'ouverture de session échoue. ${v.auth} répond bien aux tests réseau, mais le journal indique « annuaire injoignable ». Que contrôles-tu en premier ?`, [
    Y(`La liaison entre ${v.auth} et ${v.dir}, puis le service annuaire`, "Le modèle montre que l'annuaire n'est joignable que par le serveur d'authentification : c'est ce lien qu'il faut tester."),
    N(`La carte réseau de ${v.pc}`, "Le poste atteint le serveur d'authentification ; sa carte réseau n'est pas en cause."),
    N(`Le commutateur ${v.sw}`, "Le poste joint déjà le serveur à travers lui ; il peut être en cause entre serveur et annuaire, mais le test à faire d'abord est la liaison serveur - annuaire."),
  ], { diagrams: [ibdAuth(v), netSite(v)], ...m });
  const modules: Module[] = [
    {
      id: 'tssr-t0', n: 'T0', title: 'Un modèle pour dépanner', level: 1,
      objectives: ['Comprendre pourquoi un technicien lit un modèle SysML', "Distinguer le modèle du schéma réseau"],
      prereq: ['Aucun'],
      success: 'Les deux activités réussies.',
      pourquoi: "En dépannage, on cherche d'où vient la panne. Le modèle dit qui dépend de qui ; le schéma réseau dit où sont les machines.",
      cours: [
        "Le schéma réseau reste ton document de référence pour les adresses et le câblage. <b>SysML ne le remplace pas.</b>",
        "Le modèle SysML répond à d'autres questions : de quoi est composé le service, qui dépend de qui, dans quel ordre se passent les échanges. C'est ce qui aide à localiser une panne.",
      ],
      exemple: { diagram: netSite(v), notes: [`${v.pc} joint ${v.auth} par ${v.sw}.`, "Le schéma ne dit pas que seul le serveur d'authentification parle à l'annuaire."] },
      situation: `Poste ${v.pc} : ouverture de session impossible.`,
      activities: [
        netVsIbd('tssr-t0-a1', {}, v),
        quiz('tssr-t0-a2', "Pour savoir quels éléments dépendent de l'annuaire, quel document est le plus direct ?", [
          Y('Le modèle SysML (blocs internes)', "Les connecteurs de l'IBD montrent qui parle à l'annuaire."),
          N("Le plan d'adressage", "Il donne les adresses, pas les dépendances entre services."),
        ]),
      ],
    },
    {
      id: 'tssr-t1', n: 'T1', title: 'Les blocs : les constituants du service', level: 2,
      objectives: ['Identifier les constituants', 'Lire une composition', 'Compléter un BDD'],
      prereq: ['T0'], success: 'Lecture exacte et BDD complété.',
      pourquoi: "Pour dépanner, il faut connaître les constituants du service et ce qui en fait partie.",
      cours: [
        "Un <b>bloc</b> décrit un type de composant. La <b>composition</b> (losange plein côté du tout) dit qu'un élément fait partie d'un autre.",
        "Le poste, relié par une simple association, <b>utilise</b> le service sans en faire partie.",
      ],
      exemple: { diagram: bddAuth(), notes: ['Le service est composé du serveur et de l\'annuaire.'] },
      activities: [
        bddQuiz('tssr-t1-a1', { tag: tg('bdd', 1) }),
        bddRead('tssr-t1-a2', { tag: tg('bdd', 1), hints: ['Où est le losange ?'] }),
        bddFill('tssr-t1-a3', { tag: tg('bdd', 2), hints: ['Quel bloc conserve les comptes ?'] }),
      ],
    },
    {
      id: 'tssr-t2', n: 'T2', title: 'Les blocs internes : qui est relié à qui', level: 2,
      objectives: ['Lire parties et connecteurs', 'Suivre une dépendance', 'Compléter un IBD'],
      prereq: ['T1'], success: 'Repérages, chemin et complément réussis.',
      pourquoi: "Une panne se propage par les connecteurs : l'IBD indique par où chercher.",
      cours: [
        "Une <b>partie</b> est un exemplaire d'un bloc. Un <b>connecteur</b> relie deux parties qui échangent.",
        "Sans connecteur direct, deux parties ne communiquent pas directement : le poste n'atteint l'annuaire que par le serveur d'authentification.",
      ],
      exemple: { diagram: ibdAuth(v), notes: ['Le serveur est un passage obligé entre poste et annuaire.'] },
      activities: [
        ibdIdentify('tssr-t2-a1', { tag: tg('ibd', 1) }, v),
        ibdTrace('tssr-t2-a2', { tag: tg('ibd', 1), hints: ['Suis les connecteurs.'] }, v),
        ibdFill('tssr-t2-a3', { tag: tg('ibd', 2) }),
      ],
    },
    {
      id: 'tssr-t3', n: 'T3', title: 'La séquence : ce qui se passe, dans l\'ordre', level: 2,
      objectives: ['Lire une séquence', 'Ordonner et expliquer les messages', 'Compléter un message'],
      prereq: ['T2'], success: 'Ordre correct et message retrouvé.',
      pourquoi: "Savoir où l'échange s'arrête permet de savoir quel élément est en cause.",
      cours: [
        "Le temps passe de haut en bas. Flèche pleine : appel ; pointillés : retour ; flèche qui boucle : traitement interne.",
        "Si le dernier message reçu est « recherche du compte » et que rien ne revient, l'annuaire est le suspect n°1.",
      ],
      exemple: { diagram: seqAuth(), notes: ['Cinq messages dans un ordre imposé par la logique.'] },
      activities: [
        seqIdentify('tssr-t3-a1', { tag: tg('seq', 1) }),
        seqOrder('tssr-t3-a2', { tag: tg('seq', 2), hints: ['Qui déclenche ?'] }, s),
        seqFill('tssr-t3-a3', { tag: tg('seq', 2) }),
      ],
    },
    {
      id: 'tssr-t4', n: 'T4', title: 'Les exigences : ce que le service doit tenir', level: 1,
      objectives: ["Lire une exigence", "Repérer l'exigence qui n'est plus vérifiée"],
      prereq: ['T1'], success: 'Les deux activités réussies.',
      pourquoi: "Une exigence donne le critère de bon fonctionnement : on sait ce qu'il faut rétablir.",
      cours: ["Un bloc <b>satisfait</b> une exigence ; un test la <b>vérifie</b>.", "Pour le dépannage, retiens : l'exigence est le critère à retrouver après intervention."],
      exemple: { diagram: reqAuth(), notes: ['EX-02 : ouverture en moins de 3 secondes, vérifiée par T-02.'] },
      activities: [
        reqIdentify('tssr-t4-a1', { tag: tg('req', 1) }),
        reqCoverage('tssr-t4-a2', { tag: tg('req', 1) }, 't3'),
      ],
    },
    {
      id: 'tssr-t5', n: 'T5', title: 'L\'activité : suivre une procédure de diagnostic', level: 1,
      objectives: ["Lire un diagramme d'activité", 'Suivre un choix (losange)'],
      prereq: ['T3'], success: 'Branche correcte suivie.',
      pourquoi: "Une procédure de diagnostic est une suite d'actions avec des choix : le diagramme d'activité la rend lisible par toute l'équipe.",
      cours: ["Un rectangle arrondi est une <b>action</b>, un losange un <b>choix</b>, le disque plein le début, le disque cerclé la fin.", "Chaque flèche sortant d'un choix porte une condition entre crochets."],
      exemple: { diagram: actDiag(), notes: ["Après lecture du journal, la réponse de l'annuaire décide de la suite."] },
      activities: [
        actRead('tssr-t5-a1', { tag: tg('act', 1) }),
        quiz('tssr-t5-a2', "Combien d'actions comporte la branche [oui] ?", [Y('Deux : tester la liaison, contrôler le service', 'Après le [oui], deux actions se suivent avant la fin.'), N('Une seule', 'Compte les rectangles arrondis après le losange.'), N('Trois', 'La lecture du journal est avant le choix.')], { diagrams: [actDiag()] }),
      ],
    },
    {
      id: 'tssr-t6', n: 'T6', title: 'Mise en situation : une panne à localiser', level: 2,
      objectives: ['Utiliser les diagrammes ensemble pour localiser un composant en cause'],
      prereq: ['T2', 'T3'], success: 'Composant localisé et explication cohérente.',
      pourquoi: "C'est l'usage réel : partir d'un symptôme et remonter au composant fautif.",
      cours: ["Méthode : 1) quel message n'a pas abouti (séquence) ; 2) quels éléments sont impliqués (IBD) ; 3) quel schéma donne les adresses à tester (réseau)."],
      situation: `Depuis ce matin, aucun poste du site ${v.site} n'ouvre de session. Le journal de ${v.auth} indique : « annuaire injoignable ».`,
      activities: [
        locate('tssr-t6-a1', { tag: tg('ibd', 1) }),
        quiz('tssr-t6-a2', 'Après la recherche du compte, aucun message « compte et droits » ne revient. Que montre la séquence ?', [
          Y("Le problème est en aval de la recherche : annuaire ou liaison vers l'annuaire", 'Le dernier message envoyé est la recherche : la réponse attendue vient de l\'annuaire.'),
          N("Le poste n'a pas envoyé sa demande", 'La demande a été reçue : le serveur a déjà lancé la recherche.'),
        ], { diagrams: [seqAuth()], tag: tg('seq', 1) }),
      ],
    },
    {
      id: 'tssr-t7', n: 'T7', title: 'Mettre le modèle à jour après une intervention', level: 3, optional: false,
      objectives: ['Ajouter un élément au modèle après une modification de l\'infrastructure'],
      prereq: ['T6'], success: 'Modèle à jour, sans lien en trop.',
      pourquoi: "Un modèle qui ne reflète plus l'installation est trompeur : on le met à jour à chaque intervention.",
      cours: ["Après l'ajout d'une sonde de supervision reliée au serveur d'authentification, le modèle doit montrer la nouvelle partie et son connecteur — et seulement celui-là."],
      situation: "Tu viens d'installer une sonde de supervision, reliée au serveur d'authentification.",
      activities: [
        ((): ReturnType<typeof ibdBuild> => {
          const b = ibdBuild('tssr-t7-a1', { tag: tg('ibd', 3), hints: ['Quelle partie nouvelle ? À quoi est-elle reliée ?'] });
          const n = b.palette.slice();
          n.push({ id: 'sup', k: 'part', label: 'sonde', sub: 'Supervision', c: 1.5, r: 1 });
          return ibdForbid({ ...b, prompt: "Mets le modèle à jour : ajoute la sonde de supervision, reliée uniquement au serveur d'authentification.", palette: n, initial: { nodes: ['poste', 'auth', 'dir'], edges: [{ from: 'poste', to: 'auth', k: 'conn' }, { from: 'auth', to: 'dir', k: 'conn' }] }, target: { nodes: ['poste', 'auth', 'dir', 'sup'], edges: [{ from: 'poste', to: 'auth', k: 'conn' }, { from: 'auth', to: 'dir', k: 'conn' }, { from: 'auth', to: 'sup', k: 'conn' }] } });
        })(),
      ],
    },
    {
      id: 'tssr-t8', n: 'T8', title: 'Évaluation finale', level: 2, exam: true,
      objectives: ['Mobiliser le parcours sur une situation de dépannage nouvelle'],
      prereq: ['T1 à T6'], success: 'Score sur 20 ; correction détaillée à la fin.',
      pourquoi: "Vérifier que tu sais localiser un composant et expliquer les conséquences, seul.",
      cours: ['Une seule tentative par question, sans indice.'],
      situation: `Site ${v.site} : ${v.pc} (${v.ipPc}) n'ouvre plus de session. ${v.auth} (${v.ipAuth}) répond au ping. Annuaire : ${v.dir} (${v.ipDir}).`,
      activities: [
        ibdIdentify('tssr-t8-a1', { tag: tg('ibd', 1), crit: 't1', weight: 5 }, v),
        ibdTrace('tssr-t8-a2', { tag: tg('ibd', 1), crit: 't2', weight: 5 }, v),
        locate('tssr-t8-a3', { tag: tg('ibd', 1), crit: 't3', weight: 5 }),
        seqOrder('tssr-t8-a4', { tag: tg('seq', 2), crit: 't2', weight: 0 }, s ? s + 1 : 0),
        reqCoverage('tssr-t8-a5', { tag: tg('req', 1), crit: 't4', weight: 5 }, (['t1', 't2', 't3'] as const)[hashString(v.pc) % 3] as 't1' | 't2' | 't3'),
      ],
    },
  ];
  void bddFill;
  return {
    id: 'tssr', name: 'TSSR (titre professionnel)', levelLabel: 'Niveaux 1 à 3 (3 ponctuel)', target: 3,
    orient: 'Utiliser les diagrammes pour comprendre, diagnostiquer et mettre à jour après intervention.',
    situation: "Tu es technicien d'exploitation à NovaTech : tu localises des pannes avec le modèle.",
    statut: 'Niveaux visés : choix pédagogique. SysML ne remplace pas les schémas réseau.',
    cases: [
      { d: 'bdd', level: 1 }, { d: 'bdd', level: 2 }, { d: 'ibd', level: 1 }, { d: 'ibd', level: 2 }, { d: 'ibd', level: 3 },
      { d: 'seq', level: 1 }, { d: 'seq', level: 2 }, { d: 'req', level: 1 }, { d: 'act', level: 1 },
    ],
    grille: [
      { id: 't1', label: 'Identifier composants et dépendances', pts: 5 }, { id: 't2', label: 'Interpréter les flux', pts: 5 },
      { id: 't3', label: 'Localiser le composant en cause', pts: 5 }, { id: 't4', label: 'Expliquer les conséquences et proposer une intervention', pts: 5 },
    ],
    modules,
  };
}
