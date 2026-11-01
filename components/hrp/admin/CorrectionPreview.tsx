import type { ReactElement } from 'react';
import { formatMinutes } from '@/components/hrp/admin/correctionShared';
import type { DayPreview } from '@/lib/db/hrpCorrectionActions';

const formatDay = (day: string): string =>
    new Intl.DateTimeFormat('de-DE', { weekday: 'short', day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'UTC' }).format(
        new Date(`${day}T00:00:00Z`),
    );

const IssueList = ({ issues }: { issues: Array<string> }): ReactElement => {
    // Ein Tag ohne Buchungen ist kein Fehler.
    if (issues.length === 1 && issues[0] === 'Keine Buchungen') {
        return <span className="text-muted-foreground">keine Buchungen</span>;
    }
    return issues.length === 0 ? (
        <span className="text-green-700">ohne Fehler</span>
    ) : (
        <span className="text-red-600">{issues.join(', ')}</span>
    );
};

// DryRun der betroffenen Arbeitstage.
const CorrectionPreview = ({ preview }: { preview: Array<DayPreview> }): ReactElement => (
    <div className="space-y-2 rounded border bg-muted/30 p-3 text-xs">
        <div className="font-medium text-sm">Vorschau</div>
        {preview.length === 0 && <p className="text-muted-foreground">Kein Arbeitstag ändert sich.</p>}
        {preview.map((day) => (
            <div key={day.date} className="space-y-0.5">
                <div className="font-medium">{formatDay(day.date)}</div>
                <div>
                    Vorher: {formatMinutes(day.before.netMinutes)} netto, <IssueList issues={day.before.issues} />
                </div>
                <div>
                    Nachher: {formatMinutes(day.after.netMinutes)} netto, <IssueList issues={day.after.issues} />
                </div>
            </div>
        ))}
    </div>
);

export default CorrectionPreview;
