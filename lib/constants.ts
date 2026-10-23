// Project-wide limits and fixed values.
// Must stay importable in the browser and on the server, so no server-only imports here.

// Maximum number of users that can be added to a group at a time.
export const MAX_USERS_PER_ADD = 10;

// Inofficial Support-Channels.
export const MATTERMOST_SUPPORT_CHANNEL_URL = 'https://chat.b-side.ms/bside/channels/it_allgemeines';
export const MATTERMOST_SUPPORT_DM_URL = 'https://chat.b-side.ms/bside/messages/@kennet';

// Technical group for cloud access, not shown in the group overviews.
export const KOLLEKTIV_GROUP_ID = 'ab8395a3-9a52-47e3-a9f8-0838a5484fb8';

// HRP: employer-groups for contracts and other HRP-business logic.
export const HRP_EMPLOYER_GROUP_IDS = {
    gastro: 'dc4fb9a9-7a32-4318-ba33-fdd6627ccea9', // Cafe - Mitarbeitende (GmbH Gastro)
    gmbh: '1680099c-78e1-423c-bc70-92bec57e2f75', // GmbH - Mitarbeitende
    kv: '0ff34819-fbe0-4119-87d4-f73666ed2464', // Kulturverein - Mitarbeitende
} as const;
