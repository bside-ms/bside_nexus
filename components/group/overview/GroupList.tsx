import { ChevronRight, CornerDownRight, Star, Users } from 'lucide-react';
import Link from 'next/link';
import type { ReactElement } from 'react';
import GroupLogo from '@/components/group/overview/GroupLogo';
import { Badge } from '@/components/ui/badge';
import type { GroupAdminStatus } from '@/lib/db/groupActions';
import type { GroupOverviewEntry } from '@/lib/groupOverview';
import { cn } from '@/lib/utils';
import isNotEmptyString from '@/lib/utils/isNotEmptyString';

const GroupStatusBadge = ({ status }: { status: GroupAdminStatus }): ReactElement | null => {
    switch (status) {
        case 'Admin':
            return (
                <Badge>
                    <Star className="mr-1 size-3" /> Administrator*in
                </Badge>
            );
        case 'Member':
            return (
                <Badge variant="secondary">
                    <Users className="mr-1 size-3" /> Mitglied
                </Badge>
            );
        default:
            return null;
    }
};

const GroupRow = ({ entry }: { entry: GroupOverviewEntry }): ReactElement => {
    const { group, parent, memberCount, status } = entry;

    return (
        <Link href={`/portal/groups/${group.id}`} className="flex min-w-0 flex-1 items-start gap-3 px-2 py-2">
            <div className="flex min-w-0 flex-1 flex-col gap-1 sm:flex-row sm:items-start sm:gap-4">
                <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                        <span className="font-medium">
                            {parent !== null && <span className="text-muted-foreground font-normal">{parent.displayName} › </span>}
                            {group.displayName}
                        </span>
                        {group.groupType === 'permission' && <Badge variant="outline">Berechtigung</Badge>}
                    </div>
                    {isNotEmptyString(group.description) && (
                        <p className="text-muted-foreground line-clamp-2 text-sm">{group.description}</p>
                    )}
                </div>
                {/* Fixed width, so the count is in the same place in every row. */}
                <div className="flex shrink-0 items-center gap-2">
                    <Badge variant="outline" className="w-16 justify-center gap-1 tabular-nums sm:order-last">
                        <Users className="size-3" />
                        <span>{memberCount}</span>
                    </Badge>
                    <GroupStatusBadge status={status} />
                </div>
            </div>
            {/* Always visible, touch devices have no hover. */}
            <ChevronRight className="text-muted-foreground group-hover:text-foreground size-5 shrink-0 self-center transition-transform group-hover:translate-x-0.5" />
        </Link>
    );
};

// Highlights the logo too. active: is for touch devices.
const rowClassName = 'group flex rounded-md p-1 transition-colors hover:bg-muted active:bg-muted';

// The logo sits outside of the link, because its hover card contains links itself.
const GroupList = ({ entries, emptyText }: { entries: Array<GroupOverviewEntry>; emptyText: string }): ReactElement => {
    if (entries.length === 0) {
        return <p className="text-muted-foreground">{emptyText}</p>;
    }

    return (
        <ul className="divide-y rounded-lg border">
            {entries.map((entry) => (
                <li key={entry.group.id} className="p-1">
                    <div className={cn(rowClassName, 'items-start gap-2')}>
                        <GroupLogo group={entry.parent ?? entry.group} className="mt-1 size-8" />
                        <GroupRow entry={entry} />
                    </div>
                    {entry.subgroups.length > 0 && (
                        <ul>
                            {entry.subgroups.map((subgroup) => (
                                <li key={subgroup.group.id} className={cn(rowClassName, 'items-start gap-2 lg:ml-8')}>
                                    <div className="mt-1 flex size-8 shrink-0 items-center justify-center">
                                        <CornerDownRight className="text-muted-foreground size-5" />
                                    </div>
                                    <GroupRow entry={subgroup} />
                                </li>
                            ))}
                        </ul>
                    )}
                </li>
            ))}
        </ul>
    );
};

export default GroupList;
