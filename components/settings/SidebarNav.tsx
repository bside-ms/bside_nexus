'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { ReactElement } from 'react';
import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const sidebarNavItems = [
    {
        title: 'Mein Profil',
        href: '/portal/settings/profile',
    },
    {
        title: 'Mein Account',
        href: '/portal/settings/account',
    },
];

export function SidebarNav({ className, ...props }: React.ComponentPropsWithoutRef<'nav'>): ReactElement {
    const pathname = usePathname();

    return (
        <nav className={cn('justify-center flex flex-wrap space-x-2 lg:flex-col lg:space-x-0 lg:space-y-1', className)} {...props}>
            {sidebarNavItems.map((item) => (
                <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                        buttonVariants({ variant: 'ghost' }),
                        pathname === item.href
                            ? 'bg-zinc-100 dark:bg-zinc-800/50 hover:bg-zinc-100 dark:hover:bg-zinc-800/50'
                            : 'hover:bg-zinc-100 dark:hover:bg-zinc-800/50 hover:underline',
                        'justify-start',
                    )}
                >
                    {item.title}
                </Link>
            ))}
        </nav>
    );
}
