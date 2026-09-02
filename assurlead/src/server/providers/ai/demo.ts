import type { AiCompletionRequest, AiCompletionResponse, AiProvider } from './types';

/**
 * Deterministic, offline AI provider.
 *
 * It is NOT a language model: it is a rule-based generator that produces the
 * same structured output shape a real provider would, so the whole product can
 * be exercised end-to-end without API keys. Every response it produces is
 * flagged `simulated: true` and surfaced in the UI as "DEMO".
 *
 * Services address it by putting a `[TASK:<NAME>]` marker at the start of the
 * system prompt; the JSON context arrives in the last user message.
 */
export class DemoAiProvider implements AiProvider {
  readonly name = 'demo';
  readonly model = 'assurlead-rules-v1';
  readonly simulated = true;

  async complete(request: AiCompletionRequest): Promise<AiCompletionResponse> {
    const task = /\[TASK:([A-Z_]+)\]/.exec(request.system ?? '')?.[1] ?? 'GENERIC';
    const last = request.messages.filter((m) => m.role === 'user').at(-1)?.content ?? '{}';
    let ctx: Record<string, unknown> = {};
    try {
      ctx = JSON.parse(last) as Record<string, unknown>;
    } catch {
      ctx = { prompt: last };
    }

    const text = JSON.stringify(this.dispatch(task, ctx));
    return {
      text,
      provider: this.name,
      model: this.model,
      inputTokens: Math.ceil(last.length / 4),
      outputTokens: Math.ceil(text.length / 4),
      simulated: true,
    };
  }

  private dispatch(task: string, ctx: Record<string, unknown>): unknown {
    switch (task) {
      case 'EMAIL_COPY': return this.emailCopy(ctx);
      case 'SEGMENT_RULES': return this.segmentRules(ctx);
      case 'REPLY_CLASSIFY': return this.replyClassify(ctx);
      case 'PERFORMANCE_ANALYSIS': return this.performanceAnalysis(ctx);
      case 'LANDING_COPY': return this.landingCopy(ctx);
      case 'ASSISTANT_INTENT': return this.assistantIntent(ctx);
      default: return { text: "Le fournisseur IA DEMO n'a pas de réponse pour cette tâche." };
    }
  }

  // ── Email copy ────────────────────────────────────────────────
  private emailCopy(ctx: Record<string, unknown>) {
    const product = String(ctx.productLabel ?? "votre assurance");
    const objective = String(ctx.objective ?? 'QUOTE_REQUEST');
    const style = String(ctx.style ?? 'PROFESSIONAL');
    const company = String(ctx.company ?? 'notre cabinet');
    const cta = objective === 'CALLBACK_REQUEST' ? 'Être rappelé(e)' : 'Comparer mon tarif';

    const subjects: Record<string, string> = {
      SHORT: `{{first_name}}, votre ${product.toLowerCase()} en 2 minutes`,
      PROFESSIONAL: `${product} : votre comparatif personnalisé`,
      FRIENDLY: `{{first_name}}, on regarde votre ${product.toLowerCase()} ensemble ?`,
      URGENCY: `Votre contrat arrive à échéance le {{renewal_date}}`,
      OFFER: `${product} : recevez votre proposition personnalisée`,
      RENEWAL: `Échéance {{renewal_date}} : comparez avant de reconduire`,
      QUOTE: `Votre devis ${product.toLowerCase()} personnalisé`,
    };
    const subject = subjects[style] ?? subjects.PROFESSIONAL;

    const opener =
      style === 'RENEWAL' || style === 'URGENCY'
        ? `Votre contrat ${product.toLowerCase()} arrive à échéance le {{renewal_date}}. C'est le bon moment pour vérifier que vos garanties correspondent toujours à votre situation.`
        : `Vous êtes assuré(e) chez {{current_insurer}} à {{city}}. Nous pouvons comparer votre contrat ${product.toLowerCase()} avec les offres actuelles de nos partenaires.`;

    const bodyText = [
      `Bonjour {{first_name}},`,
      '',
      opener,
      '',
      "L'étude est gratuite et sans engagement. Elle prend deux minutes :",
      '• vous décrivez votre situation en quelques questions,',
      '• un conseiller vous rappelle avec une proposition chiffrée,',
      '• vous décidez librement de la suite.',
      '',
      `Nous ne communiquons aucun tarif avant d'avoir étudié votre dossier : chaque situation est différente.`,
      '',
      `[[CTA]]`,
      '',
      `Bien cordialement,`,
      `L'équipe ${company}`,
    ].join('\n');

    return {
      subject,
      previewText: `Étude gratuite et sans engagement · ${product}`,
      bodyText,
      ctaLabel: cta,
      alternative: {
        subject: `${product} : et si vous payiez moins pour les mêmes garanties ?`,
        previewText: 'Comparatif personnalisé en 2 minutes',
        bodyText: bodyText.replace(opener, `Beaucoup d'assurés à {{city}} n'ont pas revu leur contrat ${product.toLowerCase()} depuis plusieurs années. Un comparatif rapide permet de vérifier si vos garanties et votre cotisation sont toujours adaptées.`),
        ctaLabel: cta,
      },
      followUp: {
        subject: `Re: ${subject}`,
        bodyText: [
          'Bonjour {{first_name}},',
          '',
          "Je reviens vers vous au sujet de l'étude de votre contrat. Souhaitez-vous que nous en parlions rapidement ?",
          '',
          '[[CTA]]',
          '',
          `Bien cordialement,`,
          `L'équipe ${company}`,
        ].join('\n'),
        ctaLabel: 'Choisir un créneau',
      },
      notes: [
        "Aucun tarif, économie ou garantie chiffrée n'est annoncé : ces éléments doivent provenir d'une étude réelle.",
        'Les variables {{first_name}}, {{city}}, {{current_insurer}} et {{renewal_date}} disposent de valeurs de repli.',
      ],
    };
  }

  // ── Segment rules ─────────────────────────────────────────────
  private segmentRules(ctx: Record<string, unknown>) {
    const prompt = String(ctx.prompt ?? '').toLowerCase();
    const conditions: { field: string; operator: string; value: unknown }[] = [];
    const explanations: string[] = [];

    const products: [RegExp, string][] = [
      [/\bauto|voiture|véhicule\b/, 'AUTO'],
      [/\bmoto|scooter\b/, 'MOTO'],
      [/\bhabitation|maison|logement|locataire|propriétaire\b/, 'HABITATION'],
      [/\bsanté|mutuelle\b/, 'SANTE'],
      [/\bprévoyance\b/, 'PREVOYANCE'],
      [/\bemprunteur|prêt|credit|crédit\b/, 'EMPRUNTEUR'],
      [/\brc pro|responsabilité civile pro/, 'RC_PRO'],
      [/\bdécennale\b/, 'DECENNALE'],
    ];
    for (const [re, value] of products) {
      if (re.test(prompt)) {
        conditions.push({ field: 'insuranceInterests', operator: 'has', value });
        explanations.push(`Produit détecté : ${value}`);
        break;
      }
    }

    const cityMatch = /\b(?:à|a|de|sur|dans)\s+([A-ZÉÈÀÂÎÔÛ][\wéèêàâîôûç-]{2,})/.exec(String(ctx.prompt ?? ''));
    if (cityMatch) {
      conditions.push({ field: 'city', operator: 'equals', value: cityMatch[1] });
      explanations.push(`Ville détectée : ${cityMatch[1]}`);
    }

    const daysMatch = /(\d{1,3})\s*(?:prochains\s*)?jours/.exec(prompt);
    if (daysMatch || /échéance|renouvellement/.test(prompt)) {
      const days = daysMatch ? Number(daysMatch[1]) : 60;
      conditions.push({ field: 'renewalDate', operator: 'within_days', value: days });
      explanations.push(`Échéance dans les ${days} prochains jours`);
    }

    const ageMatch = /(\d{2})\s*(?:à|-|et)\s*(\d{2})\s*ans/.exec(prompt);
    if (ageMatch) {
      conditions.push({ field: 'age', operator: 'between', value: [Number(ageMatch[1]), Number(ageMatch[2])] });
      explanations.push(`Tranche d'âge ${ageMatch[1]}–${ageMatch[2]} ans`);
    }

    if (/vérifié|verifie|valide/.test(prompt)) {
      conditions.push({ field: 'verificationStatus', operator: 'in', value: ['VALID', 'LIKELY_VALID'] });
      explanations.push('Adresses email vérifiées uniquement');
    }
    if (/jamais contacté|jamais contactes|non contacté/.test(prompt)) {
      conditions.push({ field: 'campaignHistory', operator: 'never_contacted', value: true });
      explanations.push('Contacts jamais inclus dans une campagne');
    }
    if (/client/.test(prompt) && !/prospect/.test(prompt)) {
      conditions.push({ field: 'status', operator: 'equals', value: 'CUSTOMER' });
      explanations.push('Clients existants');
    } else if (/prospect/.test(prompt)) {
      conditions.push({ field: 'status', operator: 'equals', value: 'PROSPECT' });
      explanations.push('Prospects uniquement');
    }
    const cpMatch = /\b(\d{5})\b/.exec(prompt);
    if (cpMatch) {
      conditions.push({ field: 'postalCode', operator: 'starts_with', value: cpMatch[1].slice(0, 2) });
      explanations.push(`Département ${cpMatch[1].slice(0, 2)}`);
    }

    return {
      name: String(ctx.prompt ?? 'Segment IA').slice(0, 60),
      rules: { match: 'AND', conditions },
      explanations: explanations.length ? explanations : ['Aucun critère reconnu — ajustez les filtres manuellement.'],
    };
  }

  // ── Reply classification ──────────────────────────────────────
  private replyClassify(ctx: Record<string, unknown>) {
    const body = String(ctx.body ?? '').toLowerCase();
    const rules: [RegExp, string, string][] = [
      [/désinscri|desinscri|stop|ne plus recevoir|unsubscribe|retirez[- ]moi/, 'UNSUBSCRIBE', 'Demande explicite de désinscription'],
      [/absent|congé|vacances|out of office|réponse automatique/, 'OUT_OF_OFFICE', 'Message d’absence automatique'],
      [/rappel|rappeler|téléphone|appelez|joindre/, 'CALLBACK_REQUEST', 'Demande de rappel téléphonique'],
      [/devis|tarif|proposition|chiffrage|combien/, 'QUOTE_REQUEST', 'Demande de devis ou de tarif'],
      [/pas intéressé|pas interesse|non merci|aucun intérêt/, 'NOT_INTERESTED', 'Refus explicite'],
      [/plus tard|dans quelques mois|recontactez|pas maintenant/, 'NOT_NOW', 'Report de la demande'],
      [/intéress|interess|ok pour|volontiers|d'accord/, 'INTERESTED', 'Signal d’intérêt'],
      [/\?|comment|pourquoi|est-ce que/, 'QUESTION', 'Question posée par le contact'],
    ];
    for (const [re, category, reasoning] of rules) {
      if (re.test(body)) {
        return { category, reasoning, confidence: 0.8, suggestedReply: this.suggestReply(category) };
      }
    }
    return { category: 'OTHER', reasoning: 'Aucun signal clair détecté', confidence: 0.3, suggestedReply: this.suggestReply('OTHER') };
  }

  private suggestReply(category: string): string {
    const map: Record<string, string> = {
      INTERESTED: "Bonjour,\n\nMerci pour votre retour. Un conseiller peut vous rappeler pour étudier votre situation. Quel créneau vous conviendrait ?\n\nBien cordialement,",
      CALLBACK_REQUEST: "Bonjour,\n\nTrès bien, nous vous rappelons. Pouvez-vous confirmer votre numéro et le meilleur moment pour vous joindre ?\n\nBien cordialement,",
      QUOTE_REQUEST: "Bonjour,\n\nPour établir une proposition adaptée, il nous manque quelques informations sur votre situation. Souhaitez-vous que nous en parlions par téléphone ?\n\nBien cordialement,",
      QUESTION: "Bonjour,\n\nMerci pour votre question. Voici les éléments dont nous disposons :\n\n[à compléter par le conseiller]\n\nBien cordialement,",
      NOT_INTERESTED: "Bonjour,\n\nMerci pour votre réponse, nous prenons note. Nous ne vous solliciterons plus sur ce sujet.\n\nBien cordialement,",
      NOT_NOW: "Bonjour,\n\nTrès bien, nous revenons vers vous plus tard. À quelle période cela vous conviendrait-il ?\n\nBien cordialement,",
      UNSUBSCRIBE: "Bonjour,\n\nVotre demande est prise en compte : votre adresse est retirée de nos envois.\n\nBien cordialement,",
      OUT_OF_OFFICE: '',
      OTHER: "Bonjour,\n\nMerci pour votre message. Un conseiller revient vers vous rapidement.\n\nBien cordialement,",
    };
    return map[category] ?? map.OTHER;
  }

  // ── Performance analysis (metrics come from the caller) ────────
  private performanceAnalysis(ctx: Record<string, unknown>) {
    const m = (ctx.metrics ?? {}) as Record<string, number>;
    const findings: string[] = [];
    const recommendations: string[] = [];

    const deliveryRate = m.deliveryRate ?? 0;
    const ctr = m.clickRate ?? 0;
    const lpConv = m.landingConversionRate ?? 0;
    const qualRate = m.qualifiedRate ?? 0;

    findings.push(`Taux de délivrabilité mesuré : ${deliveryRate.toFixed(1)} %.`);
    findings.push(`Taux de clic mesuré : ${ctr.toFixed(2)} %.`);
    findings.push(`Conversion de la landing page : ${lpConv.toFixed(1)} %.`);
    findings.push(`Part de leads qualifiés parmi les leads : ${qualRate.toFixed(1)} %.`);

    let bottleneck = 'delivery';
    if (deliveryRate < 92) {
      bottleneck = 'delivery';
      recommendations.push("Priorité : la délivrabilité. Vérifiez SPF/DKIM/DMARC et nettoyez les adresses non vérifiées avant le prochain envoi.");
    } else if (ctr < 3) {
      bottleneck = 'click';
      recommendations.push("Priorité : l'objet et l'offre de l'email. Testez deux objets en A/B avant de retoucher la landing page.");
    } else if (lpConv < 10) {
      bottleneck = 'landing';
      recommendations.push('Priorité : la landing page. Réduisez le nombre de champs du formulaire et clarifiez la promesse au-dessus de la ligne de flottaison.');
    } else if (qualRate < 40) {
      bottleneck = 'quality';
      recommendations.push("Priorité : le ciblage. Le volume de leads est correct mais leur qualité est faible — resserrez le segment (échéance, produit, zone).");
    } else {
      bottleneck = 'volume';
      recommendations.push("L'entonnoir convertit correctement. Pour davantage de leads, augmentez progressivement le volume d'envoi dans les limites de vos comptes.");
    }
    recommendations.push('Ne concluez pas sur un test A/B tant que chaque variante n’a pas atteint un échantillon suffisant.');

    return {
      summary: `Le point de perte le plus important se situe au niveau : ${bottleneck}.`,
      findings,
      recommendations,
      bottleneck,
    };
  }

  // ── Landing page copy ─────────────────────────────────────────
  private landingCopy(ctx: Record<string, unknown>) {
    const product = String(ctx.productLabel ?? 'votre assurance');
    return {
      headline: `${product} : votre comparatif personnalisé`,
      subheadline: 'Répondez à quelques questions, un conseiller vous rappelle avec une proposition adaptée à votre situation.',
      benefits: [
        { title: 'Étude gratuite', body: 'Aucune obligation, aucun engagement de votre part.' },
        { title: 'Conseiller dédié', body: 'Un interlocuteur unique qui connaît votre dossier.' },
        { title: 'Réponse rapide', body: 'Nous vous rappelons dans les meilleurs délais après votre demande.' },
      ],
      trust: [
        'Vos données ne sont utilisées que pour traiter votre demande.',
        'Vous pouvez demander leur suppression à tout moment.',
      ],
      ctaLabel: 'Demander mon étude gratuite',
    };
  }

  // ── Assistant intent routing ──────────────────────────────────
  private assistantIntent(ctx: Record<string, unknown>) {
    const p = String(ctx.prompt ?? '').toLowerCase();
    if (/crée|cree|créer|nouvelle/.test(p) && /segment/.test(p)) return { intent: 'CREATE_SEGMENT', prompt: ctx.prompt };
    if (/crée|cree|créer|nouvelle/.test(p) && /campagne/.test(p)) return { intent: 'CREATE_CAMPAIGN', prompt: ctx.prompt };
    if (/crée|cree|créer/.test(p) && /landing|page/.test(p)) return { intent: 'CREATE_LANDING', prompt: ctx.prompt };
    if (/pourquoi|analyse|baiss|performance/.test(p)) return { intent: 'ANALYSE', prompt: ctx.prompt };
    if (/non contacté|pas contacté|speed|réactivité/.test(p)) return { intent: 'LIST_UNCONTACTED', prompt: ctx.prompt };
    if (/campagnes?.*(plus de leads|meilleur|top)/.test(p) || /quelle campagne/.test(p)) return { intent: 'TOP_CAMPAIGNS', prompt: ctx.prompt };
    if (/écris|reformule|nouvelle version/.test(p)) return { intent: 'REWRITE_EMAIL', prompt: ctx.prompt };
    return { intent: 'ANSWER', prompt: ctx.prompt };
  }
}
