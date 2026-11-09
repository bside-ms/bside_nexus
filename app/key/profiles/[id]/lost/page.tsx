import type { ReactElement } from 'react';
import ReturnPage from '@/components/key/ReturnPage';

export default async function KeyLostPage({ params }: { params: Promise<{ id: string }> }): Promise<ReactElement> {
    const { id } = await params;
    return <ReturnPage profileId={id} mode="lost" />;
}
