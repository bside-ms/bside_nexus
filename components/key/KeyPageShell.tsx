import type { ReactElement, ReactNode } from 'react';
import NavbarTop from '@/components/sidebar/NavbarTop';

interface Crumb {
    title: string;
    url?: string;
}

interface KeyPageShellProps {
    // Crumbs below "Schlüsselverwaltung". The last one is the current page.
    breadcrumbs?: Array<Crumb>;
    title: string;
    description?: ReactNode;
    actions?: ReactNode;
    children: ReactNode;
}

// Header, breadcrumbs and page frame for all pages of the key management.
const KeyPageShell = ({ breadcrumbs = [], title, description, actions, children }: KeyPageShellProps): ReactElement => {
    const crumbs: Array<Crumb> = [{ title: 'Schlüsselverwaltung', url: '/key' }, ...breadcrumbs];
    const items = crumbs.map((crumb, index) =>
        index === crumbs.length - 1 ? { title: crumb.title, active: true, className: 'block' } : { title: crumb.title, url: crumb.url },
    );

    return (
        <div>
            <NavbarTop items={items} sidebar={true} />
            <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 p-4 lg:p-6">
                <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="space-y-1">
                        <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
                        {description !== undefined && <div className="text-muted-foreground">{description}</div>}
                    </div>
                    {actions !== undefined && <div className="flex flex-wrap gap-2">{actions}</div>}
                </div>
                {children}
            </div>
        </div>
    );
};

export default KeyPageShell;
