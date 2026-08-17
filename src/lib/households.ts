export type HouseholdSlug = 'renato-claudia' | 'mom-pop';

export interface HouseholdMember {
  username: string;
  label: string;
  emoji: string;
  color: string;
  avatar: string | null;
}

export interface HouseholdDefinition {
  slug: HouseholdSlug;
  name: string;
  usernames: readonly string[];
  members: Record<string, HouseholdMember>;
  allowedEmails: Record<string, string>;
  plaidEnvSuffix: string;
}

export const HOUSEHOLDS: Record<HouseholdSlug, HouseholdDefinition> = {
  'renato-claudia': {
    slug: 'renato-claudia',
    name: 'Renato & Claudia',
    usernames: ['renato', 'claudia'],
    members: {
      renato: { username: 'renato', label: 'Renato', emoji: '👦', color: '#3b82f6', avatar: '/avatars/renato.png' },
      claudia: { username: 'claudia', label: 'Claudia', emoji: '👧', color: '#8b5cf6', avatar: '/avatars/claudia.png' },
      joint: { username: 'joint', label: 'Joint', emoji: '🤝', color: '#10b981', avatar: null },
    },
    allowedEmails: {
      'renatountalan@gmail.com': 'renato',
      'claudiapuente00@outlook.com': 'claudia',
    },
    plaidEnvSuffix: '',
  },
  'mom-pop': {
    slug: 'mom-pop',
    name: 'Mom & Pop',
    usernames: ['mom', 'pop'],
    members: {
      mom: { username: 'mom', label: 'Mom', emoji: '👩', color: '#ec4899', avatar: null },
      pop: { username: 'pop', label: 'Pop', emoji: '👨', color: '#f59e0b', avatar: null },
      joint: { username: 'joint', label: 'Joint', emoji: '🤝', color: '#10b981', avatar: null },
    },
    allowedEmails: {
      'ellieuntalan@gmail.com': 'mom',
      'nummuber33@hotmail.com': 'pop',
    },
    plaidEnvSuffix: '_MOMPOP',
  },
};

export function householdByUsername(username: string): HouseholdDefinition | undefined {
  return Object.values(HOUSEHOLDS).find(h => h.usernames.includes(username));
}

export function householdByEmail(email: string): HouseholdDefinition | undefined {
  return Object.values(HOUSEHOLDS).find(h => email in h.allowedEmails);
}

export const ALL_ALLOWED_EMAILS: string[] =
  Object.values(HOUSEHOLDS).flatMap(h => Object.keys(h.allowedEmails));

export function getHouseholdSlugForUsername(username: string): HouseholdSlug {
  return householdByUsername(username)?.slug ?? 'renato-claudia';
}
