import type { ReactElement } from 'react';
import { Toaster } from 'sonner';
import FormChangeAvatar from '@/components/settings/FormChangeAvatar';
import FormChangeDisplayname from '@/components/settings/FormChangeDisplayname';
import { SidebarNav } from '@/components/settings/SidebarNav';
import NavbarTop from '@/components/sidebar/NavbarTop';
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
                                <FormChangeDisplayname displayname={user?.name ?? ''} />

                                <Separator className="my-6" />

                                <FormChangeAvatar username={user?.username ?? ''} />
                            </div>
                        </div>
                    </div>

                    <Toaster
                        position="top-right"
                        richColors
                        toastOptions={{}} // Voluntarily passing empty object as a workaround for `richColors` to work. Refer: https://github.com/shadcn-ui/ui/issues/2234.
                    />
                </div>
            </div>
        </>
    );
}
