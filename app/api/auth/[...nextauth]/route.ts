import NextAuth from 'next-auth';
import authOptions from '@/lib/auth/authOptions';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const handler: any = NextAuth(authOptions);
export { handler as GET, handler as POST };
