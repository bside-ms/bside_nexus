/* eslint-disable react/jsx-no-bind */

'use client';

import { useEffect, useState } from 'react';
import { AlertCircle, CheckCircle2 } from 'lucide-react';
import type { ReactElement } from 'react';
import { Alert, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';

type EventType = 'start' | 'pause' | 'pause_end' | 'stop';

interface EventOption {
    label: string;
    type: EventType;
}

const EVENTS: Array<EventOption> = [
    { label: 'Kommen', type: 'start' },
    { label: 'Pause', type: 'pause' },
    { label: 'Pause: Ende', type: 'pause_end' },
    { label: 'Gehen', type: 'stop' },
];

export default function QuickEntry(): ReactElement {
    const [currentTime, setCurrentTime] = useState<string>('');
    const [loading, setLoading] = useState<EventType | null>(null);
    const [success, setSuccess] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    const [modalOpen, setModalOpen] = useState<boolean>(false);
    const [pendingEvent, setPendingEvent] = useState<EventOption | null>(null);
    const [pendingTimestamp, setPendingTimestamp] = useState<string | null>(null);

    useEffect((): (() => void) => {
        const timer = setInterval(() => {
            const now = new Date();
            setCurrentTime(now.toLocaleTimeString('de-DE'));
        }, 1000);
        return (): void => clearInterval(timer);
    }, []);

    const handleButtonClick = (event: EventOption): void => {
        const now = new Date();
        // Zeit im standardisierten ISO-Format an API schicken, aber für UI in de-DE anzeigen
        setPendingTimestamp(now.toLocaleTimeString('de-DE')); // für Modal und Anzeige
        setPendingEvent(event);
        setModalOpen(true);
    };

    const handleConfirm = async (): Promise<void> => {
        if (!pendingEvent || !pendingTimestamp) {
            return;
        }

        setLoading(pendingEvent.type);
        setError(null);
        setSuccess(null);
        setModalOpen(false);

        const tsISO = new Date().toISOString();

        try {
            const res = await fetch('/api/hrp/quick', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    event: pendingEvent.type,
                    timestamp: tsISO,
                }),
            });

            const data = await res.json();

            if (!res.ok || data.success === false) {
                setError(data.message || data.error || 'Es ist ein unbekannter Fehler aufgetreten.');
                return;
            }

            setSuccess(data.message || 'Deine Eintragung wurde erfasst!');
        } catch {
            setError('Es ist ein Fehler aufgetreten.');
        } finally {
            setLoading(null);
            setPendingEvent(null);
            setPendingTimestamp(null);
        }
    };

    const handleCancel = (): void => {
        setModalOpen(false);
        setPendingEvent(null);
        setPendingTimestamp(null);
    };

    return (
        <Card>
            <CardHeader className="text-xl underline underline-offset-4">Schnellerfassung</CardHeader>
            <CardContent>
                <p>Aktueller Zeitstempel: {currentTime}</p>
                <p className="mt-4">Wähle eine der folgenden Aktionen um deine Arbeitszeit zu erfassen:</p>
                <div className="py-2 flex flex-col space-y-2 max-w-xs">
                    {EVENTS.map((event) => (
                        <Button
                            key={event.type}
                            onClick={(): void => handleButtonClick(event)}
                            disabled={loading === event.type}
                            variant={loading === event.type ? 'outline' : 'outline'}
                            className="w-full"
                        >
                            {event.label}
                        </Button>
                    ))}
                </div>

                {(error || success) && (
                    <div className="pt-4 text-lg max-w-xs">
                        <Alert variant={error ? 'destructive' : 'default'}>
                            {error ? (
                                <>
                                    <AlertCircle className="h-5 w-5 text-red-500 dark:text-red-500" />
                                    <AlertTitle className="dark:text-red-500">{error}</AlertTitle>
                                </>
                            ) : (
                                <>
                                    <CheckCircle2 className="h-5 w-5 text-green-500" />
                                    <AlertTitle className="text-green-700 dark:text-green-500">{success}</AlertTitle>
                                </>
                            )}
                        </Alert>
                    </div>
                )}
            </CardContent>

            {modalOpen && pendingEvent && pendingTimestamp && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
                    <div className="bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 rounded-xl shadow-lg p-6 max-w-sm w-full border border-zinc-200 dark:border-zinc-700">
                        <div className="mb-4 text-lg font-semibold">Zeiterfassung bestätigen</div>
                        <div className="mb-2">
                            Möchtest du den Zeitstempel für&nbsp;
                            <span className="font-semibold">{pendingEvent.label}</span> wirklich absenden?
                        </div>
                        <div className="mb-4 text-sm text-zinc-700 dark:text-zinc-300">
                            Zeitstempel: <span className="font-mono">{pendingTimestamp}</span>
                        </div>
                        <div className="flex justify-end gap-2">
                            <Button variant="secondary" onClick={handleCancel}>
                                Abbrechen
                            </Button>
                            <Button variant="default" onClick={handleConfirm}>
                                Bestätigen
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </Card>
    );
}
