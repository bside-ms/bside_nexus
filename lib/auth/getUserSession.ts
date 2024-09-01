import type { Session } from 'next-auth';
import { getServerSession } from 'next-auth';
import authOptions from '@/lib/auth/authOptions';

const getUserSession = async (): Promise<Session['user'] | null> => (await getServerSession(authOptions))?.user ?? null;

export default getUserSession;
