'use client';

import type { ReactElement } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';

export default function AdvancedEntry(): ReactElement {
    return (
        <Card>
            <CardHeader className="text-xl underline underline-offset-4">Ausführliche Erfassung</CardHeader>
            <CardContent>Continue here</CardContent>
        </Card>
    );
}
