'use client';
import * as React from 'react';
import { Button } from './button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from './dialog';
import { Input } from './input';

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = 'Confirmer',
  cancelLabel = 'Annuler',
  destructive = false,
  requireTyping,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  /** When set, the user must type this exact string to enable confirmation. */
  requireTyping?: string;
  onConfirm: () => void | Promise<void>;
}) {
  const [loading, setLoading] = React.useState(false);
  const [typed, setTyped] = React.useState('');

  React.useEffect(() => {
    if (!open) setTyped('');
  }, [open]);

  const blocked = !!requireTyping && typed.trim() !== requireTyping;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description ? <DialogDescription>{description}</DialogDescription> : null}
        </DialogHeader>
        {requireTyping ? (
          <div className="space-y-1.5">
            <p className="text-xs text-muted-foreground">
              Tapez <span className="font-mono font-semibold text-foreground">{requireTyping}</span> pour confirmer.
            </p>
            <Input value={typed} onChange={(e) => setTyped(e.target.value)} autoFocus />
          </div>
        ) : null}
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            {cancelLabel}
          </Button>
          <Button
            variant={destructive ? 'destructive' : 'default'}
            loading={loading}
            disabled={blocked}
            onClick={async () => {
              setLoading(true);
              try {
                await onConfirm();
                onOpenChange(false);
              } finally {
                setLoading(false);
              }
            }}
          >
            {confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
