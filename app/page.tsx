import { redirect } from 'next/navigation';
import type { ReactElement } from 'react';

export default function Page(): ReactElement {
    redirect('/portal');
}
