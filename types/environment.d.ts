declare namespace NodeJS {
    export interface ProcessEnv {
        DATABASE_URL: string;

        AUTH_URL: string;
        AUTH_SECRET: string;

        KEYCLOAK_URL: string;
        KEYCLOAK_REALM: string;
        KEYCLOAK_API_USER: string;
        KEYCLOAK_API_PASS: string;
        KEYCLOAK_CLIENT_ID: string;
        KEYCLOAK_CLIENT_SECRET: string;

        MATTERMOST_URL: string;
        MATTERMOST_AUTH_TOKEN: string;

        SUPPORT_EMAIL?: string;

        PDF_DOCX_ENABLED?: string;
        PDF_TIMEOUT_MS?: string;

        NEXT_PUBLIC_BASE_PATH?: string;
    }
}
