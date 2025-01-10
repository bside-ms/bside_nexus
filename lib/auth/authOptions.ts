import type { AuthOptions, Profile } from 'next-auth';
import type { KeycloakProfile } from 'next-auth/providers/keycloak';
import Keycloak from 'next-auth/providers/keycloak';

const isKeycloakProfile = (profile?: Profile): profile is KeycloakProfile => profile !== undefined && 'members' in profile;

const authOptions: AuthOptions = {
    providers: [
        Keycloak({
            issuer: `${process.env.KEYCLOAK_URL}/auth/realms/${process.env.KEYCLOAK_REALM}`,
            clientId: process.env.KEYCLOAK_CLIENT_ID,
            clientSecret: process.env.KEYCLOAK_CLIENT_SECRET,
        }),
    ],
    secret: process.env.NEXTAUTH_SECRET,
    callbacks: {
        jwt: ({ token, profile }) => {
            if (!isKeycloakProfile(profile)) {
                return token;
            }

            token.name = profile.given_name;
            token.keycloakGroups = profile.members;
            token.email = profile.email;
            token.username = profile.preferred_username;
            token.sub = profile.sub;

            return token;
        },
        session: ({ session, token }) => {
            session.user = {
                name: token.name ?? '',
                keycloakGroups: token.keycloakGroups ?? [],
                email: token.email ?? '',
                username: token.username ?? '',
                id: token.sub ?? '',
            };

            return session;
        },
    },
};

export default authOptions;
