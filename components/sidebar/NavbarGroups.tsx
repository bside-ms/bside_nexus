'use client';

import { Fragment, type ReactElement } from 'react';
import { Minus, PieChart, Plus } from 'lucide-react';
import Link from 'next/link';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import {
    SidebarGroupLabel,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
    SidebarMenuSub,
    SidebarMenuSubButton,
    SidebarMenuSubItem,
} from '@/components/ui/sidebar';
import type { Group } from '@/db/schema';

const predefinedCategories: Array<string> = ['Kollektiv', 'Kulturverein', 'GmbH'];

interface AppSidebarContentProps {
    groups?: Array<Group>;
}
export function NavbarGroups({ groups }: AppSidebarContentProps): ReactElement {
    if (groups === undefined) {
        return <div />;
    }

    const definedGroups: Array<Array<Group>> = predefinedCategories.map((category) =>
        groups.filter((item) => item.categoryName === category).sort((a, b) => a.displayName.localeCompare(b.displayName)),
    );

    const otherGroups: Array<Group> = groups
        .filter((item) => !predefinedCategories.includes(item.categoryName) && item.categoryName !== '')
        .sort((a, b) => a.displayName.localeCompare(b.displayName));

    const sortedGroups: Array<Array<Group>> = [...definedGroups, otherGroups];

    return (
        <Fragment>
            <SidebarGroupLabel>Deine Gruppen</SidebarGroupLabel>
            <SidebarMenu className="mb-4">
                <SidebarMenuItem className="">
                    <SidebarMenuButton asChild>
                        <Link href="/groups">
                            <PieChart />
                            <span>Gruppenübersicht</span>
                        </Link>
                    </SidebarMenuButton>
                </SidebarMenuItem>

                {sortedGroups.map((category) => {
                    if (category.length === 0) {
                        return null;
                    }
                    const categoryName =
                        category[0]?.categoryName !== undefined && predefinedCategories.includes(category[0]?.categoryName)
                            ? category[0]?.categoryName
                            : 'Sonstiges';

                    return (
                        <Collapsible
                            key={`collapsible-${categoryName}`}
                            defaultOpen={false}
                            // defaultOpen={category[0]?.categoryName === predefinedCategories[0]}
                            className="group/collapsible"
                        >
                            <SidebarMenuItem>
                                <CollapsibleTrigger asChild>
                                    <SidebarMenuButton>
                                        {categoryName}
                                        <Plus className="ml-auto group-data-[state=open]/collapsible:hidden" />
                                        <Minus className="ml-auto group-data-[state=closed]/collapsible:hidden" />
                                    </SidebarMenuButton>
                                </CollapsibleTrigger>
                                <CollapsibleContent>
                                    <SidebarMenuSub>
                                        {category.map((group) => (
                                            <SidebarMenuSubItem key={group.id}>
                                                <SidebarMenuSubButton asChild>
                                                    <a href={`/groups/${group.id}`} className="whitespace-nowrap truncate">
                                                        <span>{group.displayName}</span>
                                                    </a>
                                                </SidebarMenuSubButton>
                                            </SidebarMenuSubItem>
                                        ))}
                                    </SidebarMenuSub>
                                </CollapsibleContent>
                            </SidebarMenuItem>
                        </Collapsible>
                    );
                })}

                <SidebarMenuItem className="">
                    <SidebarMenuButton asChild>
                        <Link href="/groups/all">
                            <PieChart />
                            <span>Alle Gruppen</span>
                        </Link>
                    </SidebarMenuButton>
                </SidebarMenuItem>
            </SidebarMenu>
        </Fragment>
    );
}
