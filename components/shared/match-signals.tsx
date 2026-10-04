'use client';

import { cn } from '@/lib/utils';
import { Check, X, AlertCircle } from 'lucide-react';

interface Signal {
  field: string;
  result: string;
  weight: number;
  detail: string;
}

const fieldLabels: Record<string, string> = {
  national_id: 'National ID',
  date_of_birth: 'Date of Birth',
  name: 'Name',
  employer: 'Employer',
  phone: 'Phone Number',
  email: 'Email',
};

const resultIcons: Record<string, React.ReactNode> = {
  exact: <Check className="h-4 w-4 text-green-600" />,
  match: <Check className="h-4 w-4 text-green-600" />,
  strong: <Check className="h-4 w-4 text-green-600" />,
  partial: <AlertCircle className="h-4 w-4 text-amber-600" />,
  no_match: <X className="h-4 w-4 text-red-400" />,
};

export function MatchSignals({ signals, className }: { signals: Signal[]; className?: string }) {
  return (
    <div className={cn('space-y-2', className)}>
      {signals.map((signal, idx) => (
        <div key={idx} className="flex items-center justify-between gap-3 rounded-md border border-border bg-card px-3 py-2.5">
          <div className="flex items-center gap-2.5">
            {resultIcons[signal.result] ?? <AlertCircle className="h-4 w-4 text-muted-foreground" />}
            <div>
              <p className="text-sm font-medium text-foreground">
                {fieldLabels[signal.field] ?? signal.field}
              </p>
              <p className="text-xs text-muted-foreground">{signal.detail}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-muted-foreground capitalize">
              {signal.result.replace(/_/g, ' ')}
            </span>
            <span className="text-xs tabular-nums text-muted-foreground">
              {Math.round(signal.weight * 100)}%
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}

export function ConfidenceIndicator({ score, classification }: { score: number; classification: string }) {
  const percentage = Math.round(score * 100);
  const color =
    classification === 'GREEN' ? 'bg-green-500' :
    classification === 'AMBER' ? 'bg-amber-500' : 'bg-red-400';

  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
        <div className={cn('h-full rounded-full transition-all', color)} style={{ width: `${percentage}%` }} />
      </div>
      <span className="text-sm font-semibold tabular-nums text-foreground">{percentage}%</span>
    </div>
  );
}
