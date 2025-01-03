import 'next-auth';
import 'next-auth/jwt';
import 'next-auth/providers/keycloak';

declare module 'next-auth' {
    interface Session {
        user: {
            name: string;
            keycloakGroups: Array<string>;
            email: string;
            username: string;
        };
    }
}

declare module 'next-auth/jwt' {
    interface JWT {
        keycloakGroups?: Array<string>;
        username: string;
    }
}

declare module 'next-auth/providers/keycloak' {
    interface KeycloakProfile {
        given_name: string;
        members: Array<string>;
    }
}
