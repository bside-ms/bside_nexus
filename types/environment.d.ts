declare namespace NodeJS {
    export interface ProcessEnv {
        DB_HOST: string;
        DB_NAME: string;
        DB_USER: string;
        DB_PASS: string;

        NEXTAUTH_URL: string;
        NEXTAUTH_SECRET: string;

        KEYCLOAK_URL: string;
        KEYCLOAK_REALM: string;
        KEYCLOAK_API_USER: string;
        KEYCLOAK_API_PASS: string;
        KEYCLOAK_CLIENT_ID: string;
        KEYCLOAK_CLIENT_SECRET: string;

        NEXTCLOUD_URL: string;
        NEXTCLOUD_API_USER: string;
        NEXTCLOUD_API_PASS: string;

        MATTERMOST_URL: string;
        MATTERMOST_AUTH_TOKEN: string;

        REDMINE_URL: string;
        REDMINE_API_KEY: string;

        LOG_LEVEL: string;

        MAINTENANCE_MODE: string;
        TESTING: string;

        BASE: string;
    }
}
