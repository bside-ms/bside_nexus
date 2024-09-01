import getUserSession from '@/lib/auth/getUserSession';

const isUserLoggedIn = async (): Promise<boolean> => (await getUserSession()) !== null;

export default isUserLoggedIn;
