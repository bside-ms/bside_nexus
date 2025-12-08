import Link from 'next/link';
import type { ReactElement } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function KeyLandingPage(): ReactElement {
  const links = [
    { href: '/key/profiles', title: 'Profile', desc: 'Profile anlegen, bearbeiten und verwalten.' },
    { href: '/key/types', title: 'Schließungen', desc: 'Schließungen (key types) verwalten und auffüllen.' },
    { href: '/key/items', title: 'Schlüssel', desc: 'Einzelne Schlüssel-Items anlegen und Status verwalten.' },
    { href: '/key/issuance', title: 'Ausgabe', desc: 'Schlüssel an Profile ausgeben und Quittungen erzeugen.' },
    { href: '/key/return', title: 'Rückgabe', desc: 'Teil- oder Komplett-Rückgaben durchführen.' },
  ];

  return (
    <div className="p-4 md:p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">Schlüsselverwaltung</h1>
        <p className="text-muted-foreground mt-1">Wähle einen Bereich aus, um fortzufahren.</p> 
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {links.map((l) => (
          <Card key={l.href} className="flex flex-col">
            <CardHeader>
              <CardTitle>{l.title}</CardTitle>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col justify-between">
              <p className="text-sm text-muted-foreground mb-4">{l.desc}</p>
              <div>
                <Button asChild>
                  <Link href={l.href}>Öffnen</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
