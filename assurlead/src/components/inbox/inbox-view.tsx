'use client';
import * as React from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { Inbox, Sparkles, Send, Archive, Plus, MailOpen } from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { EmptyState } from '@/components/ui/empty-state';
import { ingestReplyAction, sendReplyAction, updateThreadAction } from '@/server/actions/inbox';
import { replyCategoryLabel } from '@/lib/domain';
import { cn } from '@/lib/utils';
import type { ReplyCategory } from '@prisma/client';

type Message = {
  id: string; direction: string; fromEmail: string; toEmail: string; subject: string;
  bodyText: string; aiSuggestion: string | null; aiReasoning: string | null; createdAt: string;
};

type Thread = {
  id: string; subject: string; category: ReplyCategory; unread: boolean; archived: boolean;
  lastMessageAt: string; participants: string[];
  leadId: string | null; leadScore: number | null; campaignName: string | null;
  messages: Message[];
};

const CATEGORY_TONE: Partial<Record<ReplyCategory, 'success' | 'default' | 'warning' | 'destructive' | 'muted' | 'secondary'>> = {
  INTERESTED: 'success', CALLBACK_REQUEST: 'success', QUOTE_REQUEST: 'success',
  QUESTION: 'default', NOT_INTERESTED: 'destructive', NOT_NOW: 'warning',
  UNSUBSCRIBE: 'destructive', OUT_OF_OFFICE: 'muted', OTHER: 'muted', UNCLASSIFIED: 'muted',
};

export function InboxView({
  threads, categories, canWrite,
}: {
  threads: Thread[];
  categories: { value: ReplyCategory; label: string; count: number }[];
  canWrite: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [selected, setSelected] = React.useState<Thread | null>(threads[0] ?? null);
  const [reply, setReply] = React.useState('');
  const [sending, setSending] = React.useState(false);
  const [ingestOpen, setIngestOpen] = React.useState(false);
  const [ingestDraft, setIngestDraft] = React.useState({ fromEmail: '', subject: '', body: '' });
  const [ingesting, setIngesting] = React.useState(false);

  React.useEffect(() => {
    setSelected((current) => threads.find((t) => t.id === current?.id) ?? threads[0] ?? null);
  }, [threads]);

  React.useEffect(() => {
    const suggestion = selected?.messages.filter((m) => m.direction === 'INBOUND').at(-1)?.aiSuggestion;
    setReply(suggestion ?? '');
  }, [selected]);

  const setParam = (key: string, value: string) => {
    const next = new URLSearchParams(params.toString());
    if (value === 'all' || value === '0') next.delete(key); else next.set(key, value);
    router.push(`${pathname}?${next.toString()}`);
  };

  const openThread = async (thread: Thread) => {
    setSelected(thread);
    if (thread.unread && canWrite) {
      await updateThreadAction(thread.id, { unread: false });
      router.refresh();
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <Select value={params.get('category') ?? 'all'} onValueChange={(v) => setParam('category', v)}>
          <SelectTrigger className="h-8 w-56 text-xs"><SelectValue placeholder="Catégorie" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Toutes les catégories</SelectItem>
            {categories.map((c) => (
              <SelectItem key={c.value} value={c.value}>{c.label}{c.count > 0 ? ` (${c.count})` : ''}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button variant={params.get('unread') === '1' ? 'secondary' : 'outline'} size="sm"
          onClick={() => setParam('unread', params.get('unread') === '1' ? '0' : '1')}>
          <MailOpen /> Non lues
        </Button>
        <Button variant={params.get('archived') === '1' ? 'secondary' : 'outline'} size="sm"
          onClick={() => setParam('archived', params.get('archived') === '1' ? '0' : '1')}>
          <Archive /> Archivées
        </Button>
        {canWrite ? (
          <Button size="sm" className="ml-auto" onClick={() => setIngestOpen(true)}>
            <Plus /> Enregistrer une réponse
          </Button>
        ) : null}
      </div>

      {threads.length === 0 ? (
        <EmptyState
          icon={Inbox}
          title="Aucune conversation"
          description="Les réponses à vos campagnes apparaissent ici. Vous pouvez aussi enregistrer manuellement une réponse reçue dans votre messagerie pour la classer et y répondre depuis ASSURLEAD AI."
        />
      ) : (
        <div className="grid gap-3 lg:grid-cols-[320px_1fr]">
          <Card className="max-h-[70vh] overflow-y-auto">
            <CardContent className="divide-y p-0">
              {threads.map((thread) => {
                const last = thread.messages.at(-1);
                return (
                  <button
                    key={thread.id}
                    type="button"
                    onClick={() => void openThread(thread)}
                    className={cn(
                      'w-full px-3 py-2.5 text-left transition-colors hover:bg-accent/50',
                      selected?.id === thread.id && 'bg-accent',
                      thread.unread && 'font-medium',
                    )}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-xs">{thread.participants[0] ?? '—'}</span>
                        <span className="block truncate text-[11px] text-muted-foreground">{thread.subject}</span>
                      </span>
                      {thread.unread ? <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" /> : null}
                    </div>
                    <div className="mt-1.5 flex flex-wrap items-center gap-1">
                      <Badge variant={CATEGORY_TONE[thread.category] ?? 'muted'}>{replyCategoryLabel(thread.category)}</Badge>
                      {thread.leadScore !== null ? <Badge variant="secondary">{thread.leadScore}/100</Badge> : null}
                    </div>
                    <p className="mt-1 line-clamp-1 text-[10px] text-muted-foreground">{last?.bodyText}</p>
                  </button>
                );
              })}
            </CardContent>
          </Card>

          {selected ? (
            <Card className="flex max-h-[70vh] flex-col">
              <CardHeader className="pb-3">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <CardTitle className="truncate">{selected.subject}</CardTitle>
                    <CardDescription className="truncate">
                      {selected.participants.join(' · ')}
                      {selected.campaignName ? ` · Campagne : ${selected.campaignName}` : ''}
                    </CardDescription>
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5">
                    {selected.leadId ? (
                      <Button size="sm" variant="outline" asChild>
                        <Link href={`/leads/${selected.leadId}`}>Voir le lead</Link>
                      </Button>
                    ) : null}
                    {canWrite ? (
                      <>
                        <Select
                          value={selected.category}
                          onValueChange={async (v) => {
                            const r = await updateThreadAction(selected.id, { category: v });
                            if (r.ok) { toast.success('Catégorie mise à jour'); router.refresh(); } else toast.error(r.error);
                          }}
                        >
                          <SelectTrigger className="h-8 w-44 text-xs"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {categories.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                          </SelectContent>
                        </Select>
                        <Button
                          size="icon-sm" variant="ghost" aria-label="Archiver"
                          onClick={async () => {
                            const r = await updateThreadAction(selected.id, { archived: !selected.archived });
                            if (r.ok) { toast.success(selected.archived ? 'Désarchivée' : 'Archivée'); router.refresh(); } else toast.error(r.error);
                          }}
                        >
                          <Archive />
                        </Button>
                      </>
                    ) : null}
                  </div>
                </div>
              </CardHeader>

              <CardContent className="flex-1 space-y-3 overflow-y-auto">
                {selected.messages.map((message) => (
                  <div
                    key={message.id}
                    className={cn(
                      'rounded-lg border p-3',
                      message.direction === 'OUTBOUND' ? 'ml-6 border-primary/30 bg-primary/5' : 'mr-6',
                    )}
                  >
                    <p className="text-[11px] text-muted-foreground">
                      {message.direction === 'OUTBOUND' ? 'Envoyé' : 'Reçu'} · {message.fromEmail} ·{' '}
                      {new Date(message.createdAt).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' })}
                    </p>
                    <p className="mt-1.5 whitespace-pre-wrap text-xs leading-relaxed">{message.bodyText}</p>
                    {message.aiReasoning ? (
                      <p className="mt-2 flex items-start gap-1.5 rounded-md bg-muted/60 p-2 text-[10px] text-muted-foreground">
                        <Sparkles className="mt-0.5 h-3 w-3 shrink-0" />
                        Classification IA : {message.aiReasoning}
                      </p>
                    ) : null}
                  </div>
                ))}
              </CardContent>

              {canWrite ? (
                <div className="space-y-2 border-t p-3">
                  <div className="flex items-center gap-1.5">
                    <Sparkles className="h-3.5 w-3.5 text-primary" />
                    <p className="text-[11px] text-muted-foreground">
                      Brouillon suggéré par l’IA — relisez-le avant envoi. L’envoi automatique est désactivé.
                    </p>
                  </div>
                  <Textarea rows={5} value={reply} onChange={(e) => setReply(e.target.value)} placeholder="Votre réponse…" />
                  <Button
                    size="sm" loading={sending} disabled={reply.trim().length < 2}
                    onClick={async () => {
                      setSending(true);
                      const r = await sendReplyAction(selected.id, reply);
                      setSending(false);
                      if (r.ok) {
                        toast[r.data.simulated ? 'warning' : 'success'](
                          r.data.simulated ? 'Réponse enregistrée (fournisseur DEMO — aucun envoi réel).' : 'Réponse envoyée.',
                        );
                        router.refresh();
                      } else toast.error(r.error);
                    }}
                  >
                    <Send /> Envoyer la réponse
                  </Button>
                </div>
              ) : null}
            </Card>
          ) : null}
        </div>
      )}

      <Dialog open={ingestOpen} onOpenChange={setIngestOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Enregistrer une réponse reçue</DialogTitle>
            <DialogDescription>
              Collez une réponse reçue dans votre messagerie : elle sera rattachée au contact, classée
              automatiquement, et un brouillon de réponse vous sera proposé.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>Adresse de l’expéditeur *</Label>
              <Input type="email" value={ingestDraft.fromEmail}
                onChange={(e) => setIngestDraft((d) => ({ ...d, fromEmail: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Objet</Label>
              <Input value={ingestDraft.subject} onChange={(e) => setIngestDraft((d) => ({ ...d, subject: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Message *</Label>
              <Textarea rows={6} value={ingestDraft.body} onChange={(e) => setIngestDraft((d) => ({ ...d, body: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIngestOpen(false)}>Annuler</Button>
            <Button
              loading={ingesting}
              onClick={async () => {
                setIngesting(true);
                const r = await ingestReplyAction(ingestDraft);
                setIngesting(false);
                if (r.ok) {
                  toast.success(`Réponse enregistrée — classée « ${replyCategoryLabel(r.data.category as ReplyCategory)} »`);
                  setIngestOpen(false);
                  setIngestDraft({ fromEmail: '', subject: '', body: '' });
                  router.refresh();
                } else toast.error(r.error);
              }}
            >
              Enregistrer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <p className="rounded-lg border bg-muted/40 p-3 text-[11px] leading-relaxed text-muted-foreground">
        La synchronisation automatique des réponses dépend du fournisseur : lorsque le webhook « reply »
        est disponible, les réponses arrivent ici directement. Sinon, enregistrez-les manuellement — le
        rattachement au contact, au lead et à la campagne est fait automatiquement.
      </p>
    </div>
  );
}
