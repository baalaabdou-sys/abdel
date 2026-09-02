'use client';
import { Target, TrendingUp, Info } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import type { DailyGoalStatus } from '@/server/services/analytics';
import { cn } from '@/lib/utils';

export function GoalCard({ goal }: { goal: DailyGoalStatus }) {
  const reached = goal.achieved >= goal.minTarget;
  const stretchReached = goal.achieved >= goal.stretchTarget;

  return (
    <div className="rounded-xl border bg-card p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
            <Target className="h-3.5 w-3.5" />
            Objectif du jour
          </p>
          <p className="mt-1 text-[11px] text-muted-foreground">
            Cible : {goal.minTarget} à {goal.stretchTarget} leads qualifiés
          </p>
        </div>
        <Badge variant={stretchReached ? 'success' : reached ? 'success' : 'warning'}>
          {stretchReached ? 'Objectif haut atteint 🎯' : reached ? 'Objectif atteint ✅' : 'En cours'}
        </Badge>
      </div>

      <div className="mt-4 flex items-baseline gap-2">
        <span className={cn('num text-4xl font-bold tracking-tight', reached ? 'text-success' : 'text-foreground')}>
          {goal.achieved}
        </span>
        <span className="text-sm text-muted-foreground">
          / {goal.minTarget} minimum · {goal.stretchTarget} ambitieux
        </span>
      </div>

      <div className="mt-4 space-y-2.5">
        <div>
          <div className="mb-1 flex justify-between text-[11px] text-muted-foreground">
            <span>Objectif minimum</span>
            <span className="num">{Math.min(100, goal.progressMin)} %</span>
          </div>
          <Progress value={Math.min(100, goal.progressMin)} indicatorClassName={reached ? 'bg-success' : undefined} />
        </div>
        <div>
          <div className="mb-1 flex justify-between text-[11px] text-muted-foreground">
            <span>Objectif ambitieux</span>
            <span className="num">{Math.min(100, goal.progressStretch)} %</span>
          </div>
          <Progress value={Math.min(100, goal.progressStretch)} indicatorClassName="bg-primary" />
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 border-t pt-3.5 text-xs">
        <div>
          <p className="text-muted-foreground">Cette semaine</p>
          <p className="num mt-0.5 font-semibold">
            {goal.weekAchieved} <span className="font-normal text-muted-foreground">/ {goal.weekTarget}</span>
          </p>
        </div>
        <div>
          <p className="flex items-center gap-1 text-muted-foreground">
            Prévision du jour
            <Tooltip>
              <TooltipTrigger asChild>
                <Info className="h-3 w-3 cursor-help" />
              </TooltipTrigger>
              <TooltipContent>
                Projection calculée à partir du rythme observé depuis ce matin sur une journée de 12 h.
                Il s’agit d’une estimation, pas d’une garantie.
              </TooltipContent>
            </Tooltip>
          </p>
          <p className="num mt-0.5 flex items-center gap-1 font-semibold">
            <TrendingUp className="h-3.5 w-3.5 text-muted-foreground" />
            ≈ {goal.forecastToday}
            <span className="text-[10px] font-normal uppercase text-muted-foreground">est.</span>
          </p>
        </div>
      </div>
    </div>
  );
}
