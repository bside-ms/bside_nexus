import type { Session } from 'next-auth';
import { auth } from '@/auth';

const getUserSession = async (): Promise<Session['user'] | null> => (await auth())?.user ?? null;

export default getUserSession;
