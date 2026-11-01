// Project-wide limits and fixed values.
// Must stay importable in the browser and on the server, so no server-only imports here.

// Maximum number of users that can be added to a group at a time.
export const MAX_USERS_PER_ADD = 10;

// Inofficial Support-Channels.
export const MATTERMOST_SUPPORT_CHANNEL_URL = 'https://chat.b-side.ms/bside/channels/it_allgemeines';
export const MATTERMOST_SUPPORT_DM_URL = 'https://chat.b-side.ms/bside/messages/@kennet';

// Technical group for cloud access, not shown in the group overviews.
export const KOLLEKTIV_GROUP_ID = 'ab8395a3-9a52-47e3-a9f8-0838a5484fb8';

// Keycloak clients whose roles system admins can assign to groups. The roles always go to the member group.
export const GROUP_ROLE_CLIENTS = ['nextcloud', 'payload', 'nexus'] as const;
export type GroupRoleClient = (typeof GROUP_ROLE_CLIENTS)[number];
export const GROUP_ROLE_CLIENT_LABELS: Record<GroupRoleClient, string> = {
    nextcloud: 'Nextcloud',
    payload: 'Payload (CMS)',
    nexus: 'Nexus',
};
// New roles can only be created for these clients. Each Nextcloud role becomes a Nextcloud group.
export const GROUP_ROLE_CREATABLE_CLIENTS: ReadonlyArray<GroupRoleClient> = ['nextcloud'];

// HRP: employer-groups for contracts and other HRP-business logic.
export const HRP_EMPLOYER_GROUP_IDS = {
    gastro: 'dc4fb9a9-7a32-4318-ba33-fdd6627ccea9', // Cafe - Mitarbeitende (GmbH Gastro)
    gmbh: '1680099c-78e1-423c-bc70-92bec57e2f75', // GmbH - Mitarbeitende
    kv: '0ff34819-fbe0-4119-87d4-f73666ed2464', // Kulturverein - Mitarbeitende
} as const;

// HRP: Korrekturgruppe je Arbeitgebergruppe.
export const HRP_CORRECTION_GROUP_IDS: Readonly<Record<string, string | null>> = {
    [HRP_EMPLOYER_GROUP_IDS.gastro]: 'b708dce9-a35c-4c00-a4c5-30ab8994e832',
    [HRP_EMPLOYER_GROUP_IDS.gmbh]: 'ed9cb18e-d3f2-41de-9ee4-0b09f04c0b2a',
    [HRP_EMPLOYER_GROUP_IDS.kv]: '341793d8-ec6c-474d-aff8-bd11909fde0d',
};
