import type { ReactElement } from 'react';
import { SidebarNav } from '@/components/settings/SidebarNav';
import NavbarTop from '@/components/sidebar/NavbarTop';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import getUserSession from '@/lib/auth/getUserSession';

const breadCrumbs = [
    {
        title: 'Settings',
        url: '/settings',
    },
    {
        title: 'Account',
        active: true,
    },
];

export default async function Page(): Promise<ReactElement> {
    const user = await getUserSession();

    return (
        <>
            <NavbarTop items={breadCrumbs} />
            <div className="space-y-6 p-10 pb-16">
                <div className="space-y-0.5">
                    <h2 className="text-2xl font-bold tracking-tight">Einstellungen</h2>
                    <p>Hier kannst du Einstellungen deines Accounts ändern, die für alle unsere Anwendungen gültig sind.</p>
                </div>

                <Separator className="my-6" />

                <div className="flex flex-col space-y-8 lg:flex-row lg:space-x-12 lg:space-y-0">
                    <aside className="mx-4 lg:w-1/5 lg:py-6 ">
                        <SidebarNav />
                    </aside>

                    <Separator className="my-6 block lg:hidden" />

                    <div className="flex-1 lg:max-w-4xl">
                        <div className="flex flex-1 flex-col gap-4 p-4">
                            <div className="grid auto-rows-min gap-4 md:grid-cols-1">
                                <Card className="rounded-xl ">
                                    <CardHeader>
                                        <CardTitle>Mail-Adresse</CardTitle>
                                        <CardDescription>Diese Mail-Adresse wird für den Login verwendet.</CardDescription>
                                    </CardHeader>
                                    <CardContent className="grid gap-6">
                                        <div className="grid gap-2">
                                            <Label htmlFor="name">Mail-Adresse</Label>
                                            <Input id="email" placeholder={user?.email ?? ''} value={user?.email ?? ''} />
                                        </div>
                                    </CardContent>
                                    <CardFooter>
                                        <Button variant="secondary" className="w-full">
                                            Speichern
                                        </Button>
                                    </CardFooter>
                                </Card>

                                <Separator className="my-6" />

                                <Card className="rounded-xl ">
                                    <CardHeader>
                                        <CardTitle>Benutzer*innenname</CardTitle>
                                        <CardDescription>
                                            Dieser Name wird als dein Benutzername verwendet.
                                            <br />
                                            Dieser Name muss eindeutig sein und darf keine Leerzeichen enthalten.
                                        </CardDescription>
                                    </CardHeader>
                                    <CardContent className="grid gap-6">
                                        <div className="grid gap-2">
                                            <Label htmlFor="name">Benutzer*innenname</Label>
                                            <Input id="name" placeholder={user?.username ?? ''} value={user?.username ?? ''} />
                                        </div>
                                    </CardContent>
                                    <CardFooter>
                                        <Button variant="secondary" className="w-full">
                                            Speichern
                                        </Button>
                                    </CardFooter>
                                </Card>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}
