import Link from 'next/link';
import type { ReactElement } from 'react';
import { SiNexusmods } from 'react-icons/si';
import GroupsNavigation from '@/components/navigation/GroupsNavigation';
import isUserLoggedIn from '@/lib/auth/isUserLoggedIn';

const Navigation = async (): Promise<ReactElement> => {
    const isLoggedIn = await isUserLoggedIn();

    return (
        <aside className="w-64 border-r border-gray-200 bg-white">
            <div className="p-5">
                <Link href="/">
                    <h2 className="text-xl">
                        B-Side Nexus <SiNexusmods className="inline" />
                    </h2>
                </Link>
            </div>

            {isLoggedIn && (
                <nav className="p-5">
                    <GroupsNavigation />
                </nav>
            )}
        </aside>
    );
};

export default Navigation;
