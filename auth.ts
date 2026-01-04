import type { NextAuthConfig, Profile } from 'next-auth';
import NextAuth from 'next-auth';
import Keycloak, { type KeycloakProfile } from 'next-auth/providers/keycloak';

const isKeycloakProfile = (profile?: Profile): profile is KeycloakProfile => profile !== undefined && 'members' in profile;

export const authOptions: NextAuthConfig = {
    providers: [
        Keycloak({
            issuer: `${process.env.KEYCLOAK_URL}auth/realms/${process.env.KEYCLOAK_REALM}`,
            clientId: process.env.KEYCLOAK_CLIENT_ID,
            clientSecret: process.env.KEYCLOAK_CLIENT_SECRET,
        }),
    ],

    pages: {
        signIn: '/auth/signin',
    },

    secret: process.env.AUTH_SECRET,

    events: {
        signOut: async (data) => {
            if ('token' in data && data.token && data.token.id_token) {
                try {
                    const issuerUrl = `${process.env.KEYCLOAK_URL}auth/realms/${process.env.KEYCLOAK_REALM}`;
                    const logOutUrl = new URL(`${issuerUrl}/protocol/openid-connect/logout`);
                    logOutUrl.searchParams.set('id_token_hint', data.token.id_token);
                    await fetch(logOutUrl);
                } catch {
                    // Do nothing.
                }
            }
        },
    },

    callbacks: {
        jwt: ({ token, profile, account }) => {
            if (!isKeycloakProfile(profile)) {
                return token;
            }

            token.id_token = account ? (account.id_token ?? '') : '';
            token.name = profile.name;
            token.email = profile.email;
            token.username = profile.preferred_username;
            token.sub = profile.sub;
            token.members = profile.members;
            token.roles = profile.roles;
            token.auth_time = Math.floor(Date.now() / 1000);

            return token;
        },
        session: ({ session, token }) => {
            session.user = {
                emailVerified: null,
                name: token.name ?? '',
                email: token.email ?? '',
                username: token.username ?? '',
                id: token.sub ?? '',
                members: token.members ?? [],
                roles: token.roles ?? [],
            };

            return session;
        },
    },
};

export const { handlers, signIn, signOut, auth } = NextAuth(authOptions);
