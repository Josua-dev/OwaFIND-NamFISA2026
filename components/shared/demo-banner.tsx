'use client';

import { AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';

export function DemoBanner({ className }: { className?: string }) {
  return (
    <div className={cn('bg-amber-50 border-b border-amber-200', className)}>
      <div className="container-owafind py-2">
        <div className="flex items-center justify-center gap-2 text-xs font-medium text-amber-800">
          <AlertTriangle className="h-3.5 w-3.5 flex-shrink-0" />
          <span>DEMO ENVIRONMENT — Synthetic Data — NOT Real Financial Information</span>
        </div>
      </div>
    </div>
  );
}
