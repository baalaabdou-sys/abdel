import {
  LayoutDashboard, Users, Filter, Send, LayoutTemplate, Flame, KanbanSquare,
  Inbox, CheckSquare, BarChart3, AtSign, ShieldCheck, FileText, Ban,
  Workflow, Plug, Settings,
} from 'lucide-react';
import type { TranslationKey } from '@/i18n';
import type { Permission } from './rbac';

export type NavItem = {
  href: string;
  labelKey: TranslationKey;
  icon: React.ComponentType<{ className?: string }>;
  permission: Permission;
  /** Marks the entry point of the core lead funnel — highlighted in onboarding. */
  core?: boolean;
};

export type NavGroup = { labelKey: TranslationKey; items: NavItem[] };

export const NAV_GROUPS: NavGroup[] = [
  {
    labelKey: 'nav.groups.pilotage',
    items: [
      { href: '/dashboard', labelKey: 'nav.dashboard', icon: LayoutDashboard, permission: 'analytics:read', core: true },
      { href: '/analytics', labelKey: 'nav.analytics', icon: BarChart3, permission: 'analytics:read' },
    ],
  },
  {
    labelKey: 'nav.groups.acquisition',
    items: [
      { href: '/contacts', labelKey: 'nav.contacts', icon: Users, permission: 'contacts:read', core: true },
      { href: '/segments', labelKey: 'nav.segments', icon: Filter, permission: 'segments:read', core: true },
      { href: '/campaigns', labelKey: 'nav.campaigns', icon: Send, permission: 'campaigns:read', core: true },
      { href: '/landing-pages', labelKey: 'nav.landing', icon: LayoutTemplate, permission: 'landing:read', core: true },
      { href: '/templates', labelKey: 'nav.templates', icon: FileText, permission: 'templates:read' },
    ],
  },
  {
    labelKey: 'nav.groups.conversion',
    items: [
      { href: '/leads', labelKey: 'nav.leads', icon: Flame, permission: 'leads:read', core: true },
      { href: '/crm', labelKey: 'nav.crm', icon: KanbanSquare, permission: 'leads:read', core: true },
      { href: '/inbox', labelKey: 'nav.inbox', icon: Inbox, permission: 'inbox:read' },
      { href: '/tasks', labelKey: 'nav.tasks', icon: CheckSquare, permission: 'tasks:read' },
    ],
  },
  {
    labelKey: 'nav.groups.infrastructure',
    items: [
      { href: '/email-accounts', labelKey: 'nav.emailAccounts', icon: AtSign, permission: 'email_accounts:read' },
      { href: '/deliverability', labelKey: 'nav.deliverability', icon: ShieldCheck, permission: 'deliverability:read' },
      { href: '/suppression', labelKey: 'nav.suppression', icon: Ban, permission: 'suppression:read' },
      { href: '/automations', labelKey: 'nav.automations', icon: Workflow, permission: 'automations:read' },
      { href: '/integrations', labelKey: 'nav.integrations', icon: Plug, permission: 'integrations:read' },
      { href: '/settings', labelKey: 'nav.settings', icon: Settings, permission: 'settings:read' },
    ],
  },
];

export const MOBILE_NAV: NavItem[] = [
  NAV_GROUPS[0].items[0],
  NAV_GROUPS[1].items[0],
  NAV_GROUPS[1].items[2],
  NAV_GROUPS[2].items[0],
  NAV_GROUPS[2].items[1],
];
