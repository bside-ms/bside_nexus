import { notFound } from 'next/navigation';
import getUserSession from '@/lib/auth/getUserSession';
import { KEY_ROLE } from '@/lib/key/constants';

// Pages render in parallel to the layout. The check in layout alone is not sufficient.
// Every page calls this before loading data. The layout then shows the missing-permissions text.
const requireKeyPageAccess = async (): Promise<void> => {
    const session = await getUserSession();
    if (!(session?.roles?.includes(KEY_ROLE) ?? false)) {
        notFound();
    }
};

export default requireKeyPageAccess;
