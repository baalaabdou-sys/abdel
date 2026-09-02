'use client';
import { Calculator, TriangleAlert } from 'lucide-react';
import type { Forecast } from '@/server/services/analytics';
import { formatNumber } from '@/lib/utils';

export function ForecastCard({ forecast }: { forecast: Forecast }) {
  return (
    <div className="rounded-xl border bg-card p-5 shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
            <Calculator className="h-3.5 w-3.5" />
            Volume nécessaire — estimation
          </p>
          <p className="mt-1 text-[11px] text-muted-foreground">
            Calcul basé sur vos taux de conversion mesurés sur 30 jours.
          </p>
        </div>
      </div>

      <div className="mt-4 rounded-lg bg-muted/50 p-3 text-xs">
        <p className="text-muted-foreground">Pour générer</p>
        <p className="num text-lg font-semibold">{forecast.targetLeads} leads qualifiés / jour</p>
      </div>

      {forecast.requiredVisits === null ? (
        <p className="mt-4 flex gap-2 rounded-lg border border-warning/30 bg-warning/10 p-3 text-[11px] leading-relaxed text-warning">
          <TriangleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          Pas encore assez de données mesurées pour projeter un volume. Lancez une campagne et
          revenez lorsque des visites et des formulaires auront été enregistrés.
        </p>
      ) : (
        <>
          <dl className="mt-4 space-y-2.5 text-xs">
            <Row label="Visites landing page nécessaires" value={`≈ ${formatNumber(forecast.requiredVisits)} / jour`} />
            <Row label="Clics nécessaires" value={forecast.requiredClicks ? `≈ ${formatNumber(forecast.requiredClicks)} / jour` : '—'} />
            <Row label="Emails à envoyer" value={forecast.requiredEmails ? `≈ ${formatNumber(forecast.requiredEmails)} / jour` : 'Taux de clic insuffisant'} />
          </dl>
          <div className="mt-3.5 space-y-1 border-t pt-3 text-[11px] text-muted-foreground">
            <p>Conversion landing page mesurée : <span className="num font-medium text-foreground">{forecast.landingConversionRate} %</span></p>
            <p>Taux de clic mesuré : <span className="num font-medium text-foreground">{forecast.clickRate} %</span></p>
            <p>Part de leads qualifiés : <span className="num font-medium text-foreground">{forecast.qualifiedRate} %</span></p>
          </div>
        </>
      )}

      <p className="mt-3.5 rounded-md bg-muted/60 p-2.5 text-[10px] leading-relaxed text-muted-foreground">
        <strong className="font-semibold">Estimation, pas une garantie.</strong> Ces volumes projettent vos
        taux passés sur la période à venir. Les résultats réels dépendent de la qualité de la base,
        de la délivrabilité et de l’offre.
        {!forecast.hasEnoughData ? ' Les données actuelles sont encore peu nombreuses : la marge d’erreur est élevée.' : ''}
      </p>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="num font-semibold">{value}</dd>
    </div>
  );
}
