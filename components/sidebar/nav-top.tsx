import type { ReactElement } from 'react';
import { ThemeToggle } from '@/components/theming/theme-toggle';
import {
    Breadcrumb,
    BreadcrumbItem,
    BreadcrumbLink,
    BreadcrumbList,
    BreadcrumbPage,
    BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import { Separator } from '@/components/ui/separator';
import { SidebarTrigger } from '@/components/ui/sidebar';

interface BreadcrumbItemProps {
    items: Array<{
        title: string;
        url?: string;
        active?: boolean;
    }>;
}

export default function TopNav(props: BreadcrumbItemProps): ReactElement {
    const breadcrumbLength = props.items?.length ?? 0;

    return (
        <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
            <SidebarTrigger className="-ml-1" />
            {breadcrumbLength > 0 && (
                <>
                    <Separator orientation="vertical" className="mr-2 h-4" />
                    <Breadcrumb>
                        <BreadcrumbList>
                            {props.items.map((item, index) => (
                                <>
                                    <BreadcrumbItem className="hidden md:block">
                                        {item.active === true ? (
                                            <BreadcrumbPage>{item.title}</BreadcrumbPage>
                                        ) : (
                                            <BreadcrumbLink href={item.url}>{item.title}</BreadcrumbLink>
                                        )}
                                    </BreadcrumbItem>
                                    {breadcrumbLength - 1 !== index && <BreadcrumbSeparator className="hidden md:block" />}
                                </>
                            ))}
                        </BreadcrumbList>
                    </Breadcrumb>
                </>
            )}
            <div className="ml-auto">
                <ThemeToggle />
            </div>
        </header>
    );
}
