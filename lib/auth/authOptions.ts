import type { DefaultSession, NextAuthOptions } from 'next-auth';
import type { JWT } from 'next-auth/jwt';
import Keycloak from 'next-auth/providers/keycloak';

const authOptions = {
    providers: [
        Keycloak({
            issuer: `https://login.b-side.ms/auth/realms/bside`,
            clientId: process.env.KEYCLOAK_CLIENT_ID,
            clientSecret: process.env.KEYCLOAK_CLIENT_SECRET,
        }),
    ],
    secret: process.env.NEXTAUTH_SECRET,
    callbacks: {
        jwt: ({ token }): JWT => {
            console.log('token', token);

            return token;
        },
        session: ({ session }): DefaultSession => {
            console.log('session', session);

            return session;
        },
    },
    debug: false,
} satisfies NextAuthOptions;

export default authOptions;
