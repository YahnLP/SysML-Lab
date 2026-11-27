import type { Module, Parcours } from '../types';
import { V0, actDiag, bddAuth, ibdAuth, netSite, quiz, reqAuth, seqAuth, tg, N, Y, type Vars, hashString } from './common';
import { exploreAct, exploreBdd, exploreIbd, exploreReq, exploreSeq, guided, justifyOrder, netOne, one, pairDoc, predict, st, whyQuiz } from './steps';
import { actRead, bddFill, bddQuiz, bddRead, ibdBuild, ibdFill, ibdForbid, ibdIdentify, ibdTrace, reqCoverage, seqFill, seqIdentify, seqOrder } from './lib';

export function tssr(v: Vars = V0, seed = 0): Parcours {
  const s = seed || 0;
  const locate = (id: string, m: Parameters<typeof quiz>[3]) => quiz(id, `Sur ${v.pc}, l'ouverture de session échoue. ${v.auth} répond bien aux tests réseau, mais le journal indique « annuaire injoignable ». Que contrôles-tu en premier ?`, [
    Y(`La liaison entre ${v.auth} et ${v.dir}, puis le service annuaire`, "Le modèle montre que l'annuaire n'est joignable que par le serveur d'authentification : c'est ce lien qu'il faut tester."),
    N(`La carte réseau de ${v.pc}`, "Le poste atteint le serveur d'authentification ; sa carte réseau n'est pas en cause."),
    N(`Le commutateur ${v.sw}`, "Le poste joint déjà le serveur à travers lui ; il peut être en cause entre serveur et annuaire, mais le test à faire d'abord est la liaison serveur - annuaire."),
  ], { diagrams: [ibdAuth(v), netSite(v)], ...m });
  const modules: Module[] = [
    guided({
      id: 'tssr-t0', n: 'T0', title: 'Mission : un modèle pour dépanner', level: 1,
      objectives: ['Comprendre pourquoi un technicien lit un modèle SysML', "Distinguer le modèle du schéma réseau"],
      prereq: ['Aucun'], success: 'Les trois étapes réussies.',
      pourquoi: "En dépannage, on cherche d'où vient la panne. Le schéma réseau situe les machines ; le modèle dit qui dépend de qui.",
      situation: `Ticket : ${v.pc} n'ouvre plus de session.`,
    }, [
      st(`Premier réflexe : le schéma réseau. <b>Clique le poste en panne, ${v.pc}.</b>`, netOne('tssr-t0-a1', v), { w: 'schéma réseau', def: 'il situe les machines et les liens. Il reste ton document de référence pour les adresses et le câblage : SysML ne le remplace pas.' }),
      st("Les tests réseau passent, mais la panne reste. Qu'est-ce qui manque à ce schéma pour avancer ?", whyQuiz('tssr-t0-a2', v), { w: 'diagramme SysML', def: "il décrit ce que fait chaque élément et qui dépend de qui. C'est cette information qui permet de localiser une panne." }),
      st("Un technicien ouvre le bon document selon la question. Pour chaque question, dis lequel des deux tu ouvrirais, et pourquoi.", pairDoc('tssr-t0-a3', v)),
    ]),
    guided({
      id: 'tssr-t1', n: 'T1', title: 'Mission : lister les constituants du service', level: 2,
      objectives: ['Identifier les constituants', 'Distinguer ce qui fait partie du service de ce qui l\'utilise', 'Compléter un schéma de composants'],
      prereq: ['T0'], success: 'Les cinq étapes réussies.',
      pourquoi: "Pour dépanner, il faut connaître les constituants du service et ce qui en fait partie.",
      situation: "Tu dresses la liste de ce qui peut tomber en panne dans l'ouverture de session.",
    }, [
      st("Voici les constituants du service. <b>Clique le rectangle du serveur d'authentification.</b>", one('tssr-t1-a1', bddAuth(), "Le rectangle du serveur d'authentification", ['srv'], 'ServeurAuthentification décrit ce type de composant.', { dir: "L'annuaire conserve les comptes : ce n'est pas le serveur d'authentification." }, { tag: tg('bdd', 1) }), { w: 'bloc', def: "un rectangle = la fiche d'identité d'un <b>type</b> de composant." }),
      st("Tu viens de voir qu'un rectangle est une <b>fiche</b>. Piège classique : la confondre avec la machine réelle. Lis bien la question.", bddQuiz('tssr-t1-a2', { tag: tg('bdd', 1) })),
      st("Retire un composant et regarde si le service tient encore. Fais les deux essais.", exploreBdd('tssr-t1-a3'), { w: 'composition', def: "le trait terminé par un <b>losange plein</b> : « fait partie de ». Le losange est du côté du tout." }, "Ce qui fait partie du service peut le faire tomber en panne ; ce qui l'utilise, non."),
      st("Tu sais lire un losange. Mets-le en pratique : coche <b>toutes</b> les phrases vraies sur ce schéma.", bddRead('tssr-t1-a4', { tag: tg('bdd', 1), hints: ['Où est le losange ?'] })),
      st("Mets en pratique ce que tu viens d'apprendre : complète la liste des constituants. Pour chaque trou, appuie-toi sur le rôle du composant.", bddFill('tssr-t1-a5', { tag: tg('bdd', 2), hints: ['Quel composant conserve les comptes ?'] })),
    ]),
    guided({
      id: 'tssr-t2', n: 'T2', title: 'Mission : savoir qui parle à qui', level: 2,
      objectives: ['Repérer les parties et leurs liens', 'Prévoir ce qui est bloqué quand un maillon tombe', 'Compléter un schéma de liaisons'],
      prereq: ['T1'], success: 'Les cinq étapes réussies.',
      pourquoi: "Une panne se propage par les liens : ce schéma indique par où chercher.",
      situation: `Tu cherches ce qui est touché quand un élément tombe, à partir de ${v.inst}.`,
    }, [
      st("Ce schéma montre les <b>vrais</b> éléments du site. <b>Clique le poste en panne.</b>", one('tssr-t2-a1', ibdAuth(v), 'Le poste en panne', ['poste'], `« ${v.inst} : PosteDeTravail » est le poste réel.`, {}, { tag: tg('ibd', 1) }), { w: 'partie', def: "un exemplaire concret d'un bloc (ici, le poste réel construit d'après la fiche PosteDeTravail)." }),
      st("Suis la demande de connexion jusqu'à l'annuaire, élément par élément.", ibdTrace('tssr-t2-a2', { tag: tg('ibd', 1), hints: ['Suis les traits.'] }, v), { w: 'connecteur', def: "le trait entre deux parties : elles échangent. Son nom dit ce qui circule." }),
      st("Avant de jouer la scène, <b>prédis</b> ce qui va se passer. Une bonne réponse sans la bonne raison ne compte pas : il faut comprendre.", predict('tssr-t2-a3', v, { tag: tg('ibd', 1) })),
      st("Vérifie ta prédiction : joue les trois situations l'une après l'autre et compare avec ce que tu avais prévu.", exploreIbd('tssr-t2-a4', v), { w: 'dépendance', def: "un élément qui ne peut pas fonctionner sans un autre. En panne de bout de chaîne, tout ce qui précède est touché : c'est le premier réflexe de localisation." }),
      st("Tu sais lire les liaisons. Complète le schéma : pour chaque trou, appuie-toi sur ce que tu viens d'observer.", ibdFill('tssr-t2-a5', { tag: tg('ibd', 2) })),
    ]),
    guided({
      id: 'tssr-t3', n: 'T3', title: "Mission : où l'échange s'arrête-t-il ?", level: 2,
      objectives: ['Lire un échange de haut en bas', 'Ordonner et expliquer les messages', 'Retrouver un message manquant'],
      prereq: ['T2'], success: 'Les cinq étapes réussies.',
      pourquoi: "Savoir où l'échange s'arrête permet de savoir quel élément est en cause.",
      situation: "Le journal indique le dernier message qui est passé. Tu dois savoir lire le déroulé normal pour repérer l'écart.",
    }, [
      st("Voici une ouverture de session qui se passe bien. <b>Lis-la message par message.</b>", exploreSeq('tssr-t3-a1'), { w: 'séquence', def: "le dessin d'un échange dans le temps, lu de haut en bas. Chaque trait vertical est un participant (<b>ligne de vie</b>), chaque flèche un <b>message</b>." }, "Si le journal s'arrête après « recherche du compte », tu sais déjà où regarder : du côté de l'annuaire."),
      st("Tu sais lire le déroulé normal. Entraîne ton œil : sélectionne une consigne, puis clique l'élément correspondant dans le dessin.", seqIdentify('tssr-t3-a2', { tag: tg('seq', 1) })),
      st("Avant de remettre les messages dans l'ordre, une question de bon sens : l'ordre est-il libre ? Réponds, puis explique comment le dessin le montre.", justifyOrder('tssr-t3-a3')),
      st("À toi de reconstituer le déroulé : remets les messages dans l'ordre avec les flèches. Si tu te trompes, l'explication te dira quelle règle tu as enfreinte.", seqOrder('tssr-t3-a4', { tag: tg('seq', 2), hints: ['Qui déclenche ?'] }, s)),
      st("Un message a disparu du dessin. Raisonne sur ce que doit renvoyer l'annuaire pour retrouver ce message.", seqFill('tssr-t3-a5', { tag: tg('seq', 2) })),
    ]),
    guided({
      id: 'tssr-t4', n: 'T4', title: 'Mission : ce que le service doit tenir', level: 1,
      objectives: ["Lire une exigence", "Repérer l'exigence qui n'est plus contrôlée"],
      prereq: ['T1'], success: 'Les quatre étapes réussies.',
      pourquoi: "L'exigence est le critère à retrouver après une intervention : c'est elle qui dit que la panne est réparée.",
      situation: "Après une réparation, comment savoir que le service est vraiment rétabli ?",
    }, [
      st("Voici ce que NovaTech attend du service. <b>Clique la phrase qui impose une durée.</b>", one('tssr-t4-a1', reqAuth(), 'La phrase qui impose une durée', ['ex2'], 'EX-02 : moins de 3 secondes.', { ex1: 'EX-01 parle de qui authentifie.', ex3: 'EX-03 parle des comptes.' }, { tag: tg('req', 1) }), { w: 'exigence', def: "une promesse que le service doit tenir, avec un numéro pour la citer." }),
      st("Après ton intervention, comment prouves-tu que la promesse est tenue ? <b>Clique le test de la durée.</b>", one('tssr-t4-a2', reqAuth(), 'Le test de la durée', ['t2'], 'T-02 chronomètre 10 ouvertures.', {}, { tag: tg('req', 1) }), { w: 'verify', def: "la flèche du test vers l'exigence : « ce test contrôle cette exigence »." }),
      st("Teste une idée : que devient une exigence quand on supprime son test ? Fais les deux essais et lis les conséquences.", exploreReq('tssr-t4-a3')),
      st("Un test a disparu par erreur du dessin. Raisonne : quelle exigence n'a plus de flèche « verify » qui l'atteint ?", reqCoverage('tssr-t4-a4', { tag: tg('req', 1), hints: ['Compte les flèches « verify ».'] }, 't3')),
    ]),
    guided({
      id: 'tssr-t5', n: 'T5', title: 'Mission : suivre une procédure de diagnostic', level: 1,
      objectives: ["Lire un diagramme d'activité", 'Suivre un choix'],
      prereq: ['T3'], success: 'Les trois étapes réussies.',
      pourquoi: "Une procédure de diagnostic est une suite d'actions avec des choix : le dessin la rend lisible par toute l'équipe.",
      situation: "Un collègue a dessiné la procédure de diagnostic de l'annuaire. Tu la suis pas à pas.",
    }, [
      st("Suis la procédure : essaie les deux réponses possibles au losange.", exploreAct('tssr-t5-a1'), { w: 'diagramme d\'activité', def: "un rectangle arrondi est une <b>action</b>, le losange un <b>choix</b> (chaque flèche qui en sort porte une condition entre crochets), le disque plein le début, le disque cerclé la fin." }),
      st("Tu viens de suivre les deux branches. À toi de lire sans aide : que prévoit la procédure quand l'annuaire ne répond pas ?", actRead('tssr-t5-a2', { tag: tg('act', 1) })),
      st("Dernière vérification de lecture : suis la branche [oui] du losange et compte les actions qu'elle contient avant la fin.", quiz('tssr-t5-a3', "Combien d'actions comporte la branche [oui] ?", [Y('Deux : tester la liaison, contrôler le service', 'Après le [oui], deux actions se suivent avant la fin.'), N('Une seule', 'Compte les rectangles arrondis après le losange.'), N('Trois', 'La lecture du journal est avant le choix.')], { diagrams: [actDiag()] })),
    ]),
    guided({
      id: 'tssr-t6', n: 'T6', title: 'Mission : une panne à localiser', level: 2,
      objectives: ['Utiliser les diagrammes ensemble pour localiser un composant en cause'],
      prereq: ['T2', 'T3'], success: 'Les trois étapes réussies.',
      pourquoi: "C'est l'usage réel : partir d'un symptôme et remonter au composant en cause.",
      situation: `Depuis ce matin, aucun poste du site ${v.site} n'ouvre de session. Le journal de ${v.auth} indique : « annuaire injoignable ».`,
    }, [
      st("Le journal dit « annuaire injoignable » et aucune réponse « compte et droits » ne revient. <b>Que te montre le déroulé ?</b>", quiz('tssr-t6-a1', 'Après la recherche du compte, aucun message « compte et droits » ne revient. Que montre la séquence ?', [
        Y("Le problème est en aval de la recherche : annuaire ou liaison vers l'annuaire", "Le dernier message envoyé est la recherche : la réponse attendue vient de l'annuaire."),
        N("Le poste n'a pas envoyé sa demande", "La demande a été reçue : le serveur a déjà lancé la recherche."),
      ], { diagrams: [seqAuth()], tag: tg('seq', 1) })),
      st("Tu sais où l'échange s'arrête. Combine avec le schéma des liaisons et le schéma réseau : quel est ton premier contrôle, et pourquoi ?", locate('tssr-t6-a2', { tag: tg('ibd', 1), hints: ["Qui est le seul à parler à l'annuaire ?"] })),
      st("Vérifie ton raisonnement : rejoue la panne sur le schéma des liaisons et regarde ce qui est touché, élément par élément.", exploreIbd('tssr-t6-a3', v)),
    ]),
    guided({
      id: 'tssr-t7', n: 'T7', title: 'Mission : mettre le modèle à jour', level: 3,
      objectives: ["Ajouter un élément au modèle après une modification de l'infrastructure"],
      prereq: ['T6'], success: 'Les deux étapes réussies.',
      pourquoi: "Un modèle qui ne reflète plus l'installation est trompeur : on le met à jour à chaque intervention.",
      situation: "Tu viens d'installer une sonde de supervision, reliée au serveur d'authentification.",
    }, [
      st("Avant de modifier : <b>à quoi est reliée la sonde ?</b> Réfléchis à ce que le modèle doit montrer, et à ce qu'il ne doit pas montrer.", quiz('tssr-t7-a1', "La sonde est branchée sur le serveur d'authentification. Que doit ajouter le modèle ?", [
        Y("Une partie « sonde » reliée au serveur d'authentification, et rien d'autre", "Le modèle doit refléter l'installation réelle, ni plus ni moins."),
        N("Une partie « sonde » reliée au poste et à l'annuaire", "La sonde n'est pas branchée sur ces éléments : ajouter ces liens fausserait le modèle."),
      ], { diagrams: [ibdAuth(v)] })),
      st("Passe à l'action : mets le modèle à jour. Place la sonde, relie-la à ce qu'elle touche vraiment, et rien d'autre.", ((): ReturnType<typeof ibdBuild> => {
        const b = ibdBuild('tssr-t7-a2', { tag: tg('ibd', 3), hints: ['Quelle partie nouvelle ? À quoi est-elle reliée ?'] });
        const n = b.palette.slice();
        n.push({ id: 'sup', k: 'part', label: 'sonde', sub: 'Supervision', c: 1.5, r: 1 });
        return ibdForbid({ ...b, prompt: "Mets le modèle à jour : ajoute la sonde de supervision, reliée uniquement au serveur d'authentification.", palette: n, initial: { nodes: ['poste', 'auth', 'dir'], edges: [{ from: 'poste', to: 'auth', k: 'conn' }, { from: 'auth', to: 'dir', k: 'conn' }] }, target: { nodes: ['poste', 'auth', 'dir', 'sup'], edges: [{ from: 'poste', to: 'auth', k: 'conn' }, { from: 'auth', to: 'dir', k: 'conn' }, { from: 'auth', to: 'sup', k: 'conn' }] } });
      })()),
    ]),
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
