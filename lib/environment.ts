// Only "production" is production. Anything else, unset included, is a test system.

export type NexusEnvironment = 'production' | 'test' | 'development';

export const getNexusEnvironment = (): NexusEnvironment => {
    const value = (process.env.NEXUS_ENVIRONMENT ?? '').trim().toLowerCase();
    if (value === 'production' || value === 'test') {
        return value;
    }
    return 'development';
};

export const isProduction = (): boolean => getNexusEnvironment() === 'production';

const PRODUCTION_KEYCLOAK_HOST = 'login.b-side.ms';

export const getKeycloakHost = (): string | null => {
    try {
        return new URL(process.env.KEYCLOAK_URL).host.toLowerCase();
    } catch {
        return null;
    }
};

// Group, role and account changes are real then. Nexus only shows a warning.
export const isTestSystemOnProductionKeycloak = (): boolean => !isProduction() && getKeycloakHost() === PRODUCTION_KEYCLOAK_HOST;

export const NEXUS_ENVIRONMENT_LABELS: Record<NexusEnvironment, string> = {
    production: 'Produktion',
    test: 'Testsystem',
    development: 'Entwicklung',
};
