import { FileCheck2, FileDown } from 'lucide-react';
import Link from 'next/link';
import type { ReactElement } from 'react';
import ProtocolTypeBadge from '@/components/key/ProtocolTypeBadge';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import type { KeyProtocolListEntry } from '@/lib/db/keyProtocolActions';
import { formatProtocolDate } from '@/lib/key/constants';
import { cn } from '@/lib/utils';

interface ProtocolTableProps {
    protocols: Array<KeyProtocolListEntry>;
    // On a profile page the recipient column is redundant.
    showRecipient?: boolean;
    emptyText?: string;
}

const ProtocolTable = ({ protocols, showRecipient = true, emptyText = 'Noch keine Protokolle.' }: ProtocolTableProps): ReactElement => (
    <div className="overflow-hidden rounded-lg border">
        <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
                <thead className="bg-muted text-muted-foreground">
                    <tr>
                        <th className="p-3">Nr.</th>
                        <th className="p-3">Datum</th>
                        <th className="p-3">Art</th>
                        {showRecipient && <th className="p-3">Empfänger*in</th>}
                        <th className="hidden p-3 sm:table-cell">Inhalt</th>
                        <th className="p-3 text-right">Quittung</th>
                    </tr>
                </thead>
                <tbody>
                    {protocols.map((protocol) => (
                        <tr key={protocol.id} className={cn('border-t hover:bg-muted/50', protocol.isCancelled && 'text-muted-foreground')}>
                            <td className="p-3 font-medium tabular-nums">
                                <Link
                                    href={`/key/protocols/${protocol.id}`}
                                    className={cn('hover:underline', protocol.isCancelled && 'line-through')}
                                >
                                    {protocol.protocolNumber}
                                </Link>
                            </td>
                            <td className="p-3 whitespace-nowrap">{formatProtocolDate(protocol.protocolDate)}</td>
                            <td className="p-3">
                                <div className="flex flex-wrap items-center gap-1">
                                    <ProtocolTypeBadge type={protocol.protocolType} deletionKind={protocol.deletionKind} />
                                    {protocol.uncertainReason !== null && !protocol.isCancelled && (
                                        <Badge
                                            variant="outline"
                                            className="border-amber-500 text-amber-700 dark:text-amber-400"
                                            title={protocol.uncertainReason}
                                        >
                                            unsicher
                                        </Badge>
                                    )}
                                </div>
                            </td>
                            {showRecipient && (
                                <td className="p-3">
                                    <Link href={`/key/profiles/${protocol.userProfileId}`} className="hover:underline">
                                        {protocol.recipientName}
                                    </Link>
                                </td>
                            )}
                            <td className="hidden p-3 sm:table-cell">{protocol.summary}</td>
                            <td className="p-3 text-right">
                                {protocol.profileKind === 'person' && !protocol.isCancelled && (
                                    <div className="flex items-center justify-end gap-1">
                                        {protocol.hasScan ? (
                                            <span title="Unterschriebene Quittung liegt vor" className="text-green-600 dark:text-green-400">
                                                <FileCheck2 className="size-4" />
                                                <span className="sr-only">Unterschrieben</span>
                                            </span>
                                        ) : (
                                            <span className="text-xs text-amber-600 dark:text-amber-400">Scan fehlt</span>
                                        )}
                                        <Button asChild size="sm" variant="ghost">
                                            <a href={`/api/key/protocols/${protocol.id}/pdf`} title="Quittung als PDF herunterladen">
                                                <FileDown className="size-4" />
                                                <span className="sr-only">PDF</span>
                                            </a>
                                        </Button>
                                    </div>
                                )}
                            </td>
                        </tr>
                    ))}
                    {protocols.length === 0 && (
                        <tr>
                            <td colSpan={showRecipient ? 6 : 5} className="p-6 text-center text-muted-foreground">
                                {emptyText}
                            </td>
                        </tr>
                    )}
                </tbody>
            </table>
        </div>
    </div>
);

export default ProtocolTable;
