import 'next-auth';
import 'next-auth/jwt';
import 'next-auth/providers/keycloak';

declare module 'next-auth' {
    interface Session {
        user: {
            name: string;
            email: string;
            username: string;
            id: string;
        };
    }
}

declare module 'next-auth/jwt' {
    interface JWT {
        username: string;
    }
}

declare module 'next-auth/providers/keycloak' {
    interface KeycloakProfile {
        given_name: string;
        members: Array<string>;
    }
}
