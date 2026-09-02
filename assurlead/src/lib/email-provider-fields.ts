/** Credential fields each email provider needs, shared with the settings UI. */
export const EMAIL_PROVIDER_FIELDS: Record<
  string,
  { key: string; label: string; type: 'text' | 'password' | 'number' | 'boolean'; placeholder?: string }[]
> = {
  DEMO: [],
  SMTP: [
    { key: 'host', label: 'Serveur SMTP', type: 'text', placeholder: 'smtp.exemple.fr' },
    { key: 'port', label: 'Port', type: 'number', placeholder: '587' },
    { key: 'secure', label: 'TLS implicite (port 465)', type: 'boolean' },
    { key: 'user', label: 'Utilisateur', type: 'text' },
    { key: 'password', label: 'Mot de passe', type: 'password' },
  ],
  BREVO: [{ key: 'apiKey', label: 'Clé API Brevo', type: 'password' }],
  MAILGUN: [
    { key: 'apiKey', label: 'Clé API Mailgun', type: 'password' },
    { key: 'domain', label: 'Domaine Mailgun', type: 'text', placeholder: 'mg.exemple.fr' },
    { key: 'region', label: 'Région (eu / us)', type: 'text', placeholder: 'eu' },
  ],
  SES: [
    { key: 'accessKeyId', label: 'AWS Access Key ID', type: 'text' },
    { key: 'secretAccessKey', label: 'AWS Secret Access Key', type: 'password' },
    { key: 'region', label: 'Région AWS', type: 'text', placeholder: 'eu-west-1' },
  ],
  POSTMARK: [
    { key: 'serverToken', label: 'Server Token', type: 'password' },
    { key: 'messageStream', label: 'Message stream', type: 'text', placeholder: 'broadcast' },
  ],
};
