import type { AlignmentOp } from '../engine';

/** Reference vs typed comparison built from the engine's alignment ops. */
export default function DiffView({ ops }: { ops: AlignmentOp[] }) {
  return (
    <div className="ref-text font-deva text-lg" aria-label="तुलना · Comparison">
      {ops.map((op, i) => {
        switch (op.type) {
          case 'correct':
            return <span key={i} className="el-correct">{op.ref}</span>;
          case 'substitute':
            return <span key={i} className="diff-sub" title="चुकीचे · Substituted"><s>{op.ref}</s><b>{op.typed}</b></span>;
          case 'missing':
            return <span key={i} className="diff-missing" title="गाळलेले · Missing">{op.ref === ' ' ? '␣' : op.ref === '\n' ? '↵' : op.ref}</span>;
          case 'extra':
            return <span key={i} className="diff-extra" title="जास्तीचे · Extra">{op.typed === ' ' ? '␣' : op.typed === '\n' ? '↵' : op.typed}</span>;
        }
      })}
    </div>
  );
}

export function DiffLegend() {
  return (
    <ul className="flex flex-wrap gap-3 text-xs text-ink-700" aria-label="खुणा">
      <li><span className="el-correct font-semibold font-deva">बरोबर</span> · correct</li>
      <li><span className="diff-sub font-deva"><s>क</s><b>ख</b></span> चुकीचे · substituted</li>
      <li><span className="diff-missing font-deva">क</span> गाळलेले · missing</li>
      <li><span className="diff-extra font-deva">क</span> जास्तीचे · extra</li>
    </ul>
  );
}
