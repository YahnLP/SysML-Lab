import type { Parcours } from '../types';
import { bts } from './bts';
import { ciel } from './ciel';
import { hashString, makeVars } from './common';
import { tssr } from './tssr';

export const IDS = ['ciel', 'tssr', 'bts'] as const;
export type PId = (typeof IDS)[number];

/** Parcours d'apprentissage (cas fixe) ou version d'évaluation personnalisée par le nom. */
export function getParcours(id: PId, examName?: string): Parcours {
  const f = id === 'ciel' ? ciel : id === 'tssr' ? tssr : bts;
  if (!examName) return f();
  const seed = hashString(`${id}|${examName.trim().toLowerCase()}`);
  return f(makeVars(seed), seed);
}
