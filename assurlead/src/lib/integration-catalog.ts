/** External providers the workspace can connect, shared with the settings UI. */
export const INTEGRATION_CATALOG = [
  {
    kind: 'AI', provider: 'anthropic', label: 'Anthropic',
    description: 'Rédaction des emails, création de segments, analyse de performance, classification des réponses.',
    fields: [
      { key: 'apiKey', label: 'Clé API', type: 'password' as const },
      { key: 'model', label: 'Modèle (facultatif)', type: 'text' as const, placeholder: 'claude-sonnet-4-5' },
    ],
  },
  {
    kind: 'AI', provider: 'openai', label: 'OpenAI',
    description: 'Alternative pour les fonctions IA.',
    fields: [
      { key: 'apiKey', label: 'Clé API', type: 'password' as const },
      { key: 'model', label: 'Modèle (facultatif)', type: 'text' as const, placeholder: 'gpt-4o-mini' },
    ],
  },
  {
    kind: 'VERIFICATION', provider: 'zerobounce', label: 'ZeroBounce',
    description: 'Vérification des adresses email avant envoi.',
    fields: [{ key: 'apiKey', label: 'Clé API', type: 'password' as const }],
  },
  {
    kind: 'VERIFICATION', provider: 'neverbounce', label: 'NeverBounce',
    description: 'Vérification des adresses email avant envoi.',
    fields: [{ key: 'apiKey', label: 'Clé API', type: 'password' as const }],
  },
  {
    kind: 'VERIFICATION', provider: 'hunter', label: 'Hunter',
    description: 'Vérification des adresses email avant envoi.',
    fields: [{ key: 'apiKey', label: 'Clé API', type: 'password' as const }],
  },
  {
    kind: 'EMAIL', provider: 'brevo', label: 'Brevo — webhooks',
    description: 'Secret partagé pour valider les événements de délivrance, rebond et plainte.',
    fields: [{ key: 'webhookSecret', label: 'Secret de webhook', type: 'password' as const }],
  },
  {
    kind: 'EMAIL', provider: 'mailgun', label: 'Mailgun — webhooks',
    description: 'Clé de signature HMAC utilisée pour vérifier les webhooks.',
    fields: [{ key: 'webhookSecret', label: 'Clé de signature', type: 'password' as const }],
  },
  {
    kind: 'EMAIL', provider: 'postmark', label: 'Postmark — webhooks',
    description: 'Jeton attendu dans l’en-tête X-Postmark-Token.',
    fields: [{ key: 'webhookSecret', label: 'Jeton de webhook', type: 'password' as const }],
  },
  {
    kind: 'EMAIL', provider: 'ses', label: 'Amazon SES — webhooks',
    description: 'Jeton partagé attendu dans l’en-tête X-Assurlead-Token.',
    fields: [{ key: 'webhookSecret', label: 'Jeton partagé', type: 'password' as const }],
  },
  {
    kind: 'CRM', provider: 'routing', label: 'Routage des leads',
    description: 'Table d’affectation par produit et par département, utilisée par les stratégies PRODUCT et REGION.',
    fields: [
      { key: 'byProductJson', label: 'Par produit (JSON)', type: 'text' as const, placeholder: '{"AUTO":"<userId>"}' },
      { key: 'byDepartmentJson', label: 'Par département (JSON)', type: 'text' as const, placeholder: '{"69":"<userId>"}' },
    ],
  },
] as const;
