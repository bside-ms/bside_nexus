'use client';

import { useRouter } from "next/navigation"; 
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export function ContractsTable({ data }: { data: Array<any> }) {
    const router = useRouter();

    return (
        <div className="border rounded-lg overflow-hidden">
            <table className="w-full text-sm text-left">
                <thead className="bg-muted text-muted-foreground">
                <tr>
                    <th className="p-3">Mitarbeiter*in</th>
                    <th className="p-3">Arbeitgeber (Gruppe)</th>
                    <th className="p-3">Typ</th>
                    <th className="p-3">Wochenstunden</th>
                    <th className="p-3">Laufzeit</th>
                    <th className="p-3 text-right">Aktion</th>
                </tr>
                </thead>
                <tbody>
                {data.map((c) => (
                    <tr key={c.id} className="border-t hover:bg-muted/50">
                        <td className="p-3 font-medium">{c.userName}</td>
                        <td className="p-3">{c.groupName}</td>
                        <td className="p-3">
                            {c.type === 'hourly'
                                ? <Badge variant="secondary">Stundenbasis</Badge>
                                : <Badge>Festanstellung</Badge>}
                        </td>
                        <td className="p-3">{c.weeklyHours} h</td>
                        <td className="p-3">
                            {new Date(c.validFrom).toLocaleDateString('de-DE')}
                            {c.validTo ? ` – ${new Date(c.validTo).toLocaleDateString('de-DE')}` : ' – unbefristet'}
                        </td>
                        <td className="p-3 text-right">
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => router.push(`/hrp/admin/contracts/${c.id}`)}
                            >
                                Bearbeiten
                            </Button>
                        </td>
                    </tr>
                ))}
                </tbody>
            </table>
        </div>
    );
}