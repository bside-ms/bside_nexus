import { Fragment, type ReactElement } from 'react';
import Link from 'next/link';
import { BiArrowBack } from 'react-icons/bi';
import { Button } from '../ui/button';
import { ThemeToggle } from '@/components/theming/ThemeToggle';
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
    sidebar?: boolean;
}

export default function NavbarTop(props: BreadcrumbItemProps): ReactElement {
    const breadcrumbLength = props.items?.length ?? 0;

    return (
        <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
            {props.sidebar !== false && <SidebarTrigger className="-ml-1" />}
            {props.sidebar === false && (
                <Button variant="outline">
                    <Link href="/portal" className="whitespace-nowrap flex items-center gap-2">
                        <BiArrowBack />
                        Zurück zum Portal
                    </Link>
                </Button>
            )}
            {breadcrumbLength > 0 && (
                <>
                    <Separator orientation="vertical" className="mr-2 h-4" />
                    <Breadcrumb>
                        <BreadcrumbList>
                            {props.items.map((item, index) => (
                                <Fragment key={item.title}>
                                    <BreadcrumbItem className="hidden md:block">
                                        {item.active === true ? (
                                            <BreadcrumbPage>{item.title}</BreadcrumbPage>
                                        ) : (
                                            <BreadcrumbLink href={item.url}>{item.title}</BreadcrumbLink>
                                        )}
                                    </BreadcrumbItem>
                                    {breadcrumbLength - 1 !== index && <BreadcrumbSeparator className="hidden md:block" />}
                                </Fragment>
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
