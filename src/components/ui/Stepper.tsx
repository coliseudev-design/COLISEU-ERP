import React from 'react';
import { Check } from 'lucide-react';

export interface StepItem {
  id: string;
  label: string;
  description?: string;
}

export interface StepperProps {
  steps: StepItem[];
  currentStepIndex: number;
  isError?: boolean;
}

export const Stepper: React.FC<StepperProps> = ({ steps, currentStepIndex, isError = false }) => {
  return (
    <div role="list" style={{ display: 'flex', alignItems: 'center', width: '100%', padding: '12px 0', gap: 'var(--spacing-2)' }}>
      {steps.map((step, idx) => {
        const isCompleted = idx < currentStepIndex;
        const isCurrent = idx === currentStepIndex;
        
        let circleClass = 'coliseu-stepper__circle coliseu-stepper__circle--pending';
        let lineClass = 'coliseu-stepper__line coliseu-stepper__line--pending';

        if (isCompleted) {
          circleClass = 'coliseu-stepper__circle coliseu-stepper__circle--completed';
          lineClass = 'coliseu-stepper__line coliseu-stepper__line--completed';
        } else if (isCurrent) {
          circleClass = isError ? 'coliseu-stepper__circle coliseu-stepper__circle--error' : 'coliseu-stepper__circle coliseu-stepper__circle--current';
        }

        return (
          <React.Fragment key={step.id}>
            <div role="listitem" aria-current={isCurrent ? "step" : undefined} style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-2)', flex: 1 }}>
              <div className={circleClass} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {isCompleted ? <Check size={14} color="#fff" /> : idx + 1}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontSize: 'var(--font-size-xs)', fontWeight: isCurrent ? 700 : 500, color: isCurrent ? 'var(--text-primary)' : 'var(--text-secondary)' }}>
                  {step.label}
                </span>
                {step.description && <span style={{ fontSize: 'var(--font-size-2xs)', color: 'var(--text-muted)' }}>{step.description}</span>}
              </div>
            </div>
            {idx < steps.length - 1 && (
              <div className={lineClass} style={{ flex: 1, minWidth: '16px' }} />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
};
