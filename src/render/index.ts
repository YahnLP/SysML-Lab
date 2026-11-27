import type { Diagram } from '../types';
import { graphSVG, type GraphOpts } from './graph';
import { seqSVG, type SeqOpts } from './seq';

export type DiagOpts = GraphOpts & SeqOpts;

export function diagramSVG(d: Diagram, o: DiagOpts = {}): string {
  return d.kind === 'seq' ? seqSVG(d, o) : graphSVG(d, o);
}
export { esc, wrap, edgeId } from './graph';
