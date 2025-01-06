import { isEmpty } from 'lodash-es';
import type { ReactElement } from 'react';
import { SidebarNav } from '@/components/settings/SidebarNav';
import NavbarTop from '@/components/sidebar/NavbarTop';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
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
        title: 'Profile',
        active: true,
    },
];

export default async function Page(): Promise<ReactElement> {
    const user = await getUserSession();

    if (!user) {
        return <div>Loading...</div>;
    }

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
                                        <CardTitle>Anzeigename</CardTitle>
                                        <CardDescription>
                                            Dieser Name wird in allen unseren Anwendungen als dein Anzeigename verwendet.
                                        </CardDescription>
                                    </CardHeader>
                                    <CardContent className="grid gap-6">
                                        <div className="grid gap-2">
                                            <Label htmlFor="name">Anzeigename</Label>
                                            <Input id="name" placeholder={user?.name ?? ''} value={user?.name ?? ''} />
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
                                        <CardTitle>Avatar</CardTitle>
                                        <CardDescription>
                                            Dieses Bild wird bei Mattermost und anderen Anwendungen als dein Profilbild angezeigt.
                                        </CardDescription>
                                    </CardHeader>
                                    <CardContent className="flex grid-cols-2">
                                        <Avatar className="mx-2 mt-2">
                                            <AvatarImage
                                                src={!isEmpty(user.username) ? `/api/mattermost/${user.username}` : ''}
                                                alt="shadcn"
                                            />
                                            <AvatarFallback>CN</AvatarFallback>
                                        </Avatar>
                                        <div className="mx-2 grid w-full max-w-sm items-center gap-1.5">
                                            <Label htmlFor="picture">Picture</Label>
                                            <Input id="picture" type="file" />
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
