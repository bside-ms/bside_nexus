import type { LucideIcon } from 'lucide-react';
import Link from 'next/link';
import type { ReactElement } from 'react';
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface NavTileProps {
    title: string;
    description: string;
    href: string;
    icon: LucideIcon;
}

// The card sets its own dark colors, so the hover colors need dark variants too.
const NavTile = ({ title, description, href, icon: Icon }: NavTileProps): ReactElement => (
    <Link href={href} className="group">
        <Card className="group-hover:border-primary/50 group-hover:bg-muted/50 dark:group-hover:border-primary/50 dark:group-hover:bg-muted/50 h-full transition-colors">
            <CardHeader className="flex-row items-center gap-4 space-y-0">
                <div className="bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground shrink-0 rounded-lg p-2 transition-colors">
                    <Icon className="size-5" />
                </div>
                <div className="flex flex-col gap-1">
                    <CardTitle className="text-base">{title}</CardTitle>
                    <CardDescription>{description}</CardDescription>
                </div>
            </CardHeader>
        </Card>
    </Link>
);

export default NavTile;
