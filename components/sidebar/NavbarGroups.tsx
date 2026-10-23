'use client';

import { Fragment, type ReactElement } from 'react';
import { CornerDownRight, Minus, PieChart, Plus } from 'lucide-react';
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
import type { GroupTreeNode } from '@/lib/groupOverview';

// Everything else goes to "Sonstiges".
const predefinedCategories: Array<{ categoryName: string; label: string }> = [
    { categoryName: 'Kollektiv', label: 'Kollektiv' },
    { categoryName: 'Kulturverein', label: 'Kulturverein' },
    { categoryName: 'GmbH', label: 'GmbH' },
    { categoryName: 'Körperschaft', label: 'Körperschaften' },
];
const predefinedCategoryNames = predefinedCategories.map(({ categoryName }) => categoryName);

export interface SidebarGroupNode extends GroupTreeNode {
    categoryName: string;
}

interface AppSidebarContentProps {
    groups?: Array<SidebarGroupNode>;
}

// parentName is null without a parent group, and empty if the user may not see it.
const SidebarGroupLink = ({ group, parentName }: { group: Group; parentName: string | null }): ReactElement => {
    const tooltip = parentName === null || parentName === '' ? group.displayName : `${group.displayName} (Untergruppe von ${parentName})`;

    return (
        <SidebarMenuSubItem>
            <SidebarMenuSubButton asChild>
                <a href={`/portal/groups/${group.id}`} title={tooltip} className="whitespace-nowrap">
                    {parentName !== null && <CornerDownRight className="shrink-0" />}
                    <span className="truncate">{group.displayName}</span>
                </a>
            </SidebarMenuSubButton>
        </SidebarMenuSubItem>
    );
};

// Parent group the user is not a member of.
const SidebarParentGroup = ({ name }: { name: string }): ReactElement => (
    <SidebarMenuSubItem>
        <SidebarMenuSubButton
            asChild
            className="cursor-default italic text-zinc-400 hover:bg-transparent hover:text-zinc-400 dark:text-zinc-500 dark:hover:text-zinc-500"
        >
            <span title={`${name} (du bist kein Mitglied)`}>
                {/* Keeps truncate from cutting off the italic last letter. */}
                <span className="pr-1">{name}</span>
            </span>
        </SidebarMenuSubButton>
    </SidebarMenuSubItem>
);

// buildGroupTree sorts subgroups by parent, so each parent is shown once.
const renderCategoryItems = (nodes: Array<SidebarGroupNode>): Array<ReactElement> => {
    const shownParentIds = new Set<string>();

    return nodes.flatMap(({ group, parent, subgroups }) => {
        const items: Array<ReactElement> = [];

        if (parent !== null && !shownParentIds.has(parent.id)) {
            shownParentIds.add(parent.id);
            items.push(<SidebarParentGroup key={`parent-${parent.id}`} name={parent.displayName} />);
        }

        items.push(
            <SidebarGroupLink key={group.id} group={group} parentName={group.parentGroup === null ? null : (parent?.displayName ?? '')} />,
            ...subgroups.map((subgroup) => <SidebarGroupLink key={subgroup.id} group={subgroup} parentName={group.displayName} />),
        );

        return items;
    });
};

export function NavbarGroups({ groups }: AppSidebarContentProps): ReactElement {
    if (groups === undefined) {
        return <div />;
    }

    const sections: Array<{ label: string; nodes: Array<SidebarGroupNode> }> = [
        ...predefinedCategories.map(({ categoryName, label }) => ({
            label,
            nodes: groups.filter((node) => node.categoryName === categoryName),
        })),
        {
            label: 'Sonstiges',
            nodes: groups.filter((node) => !predefinedCategoryNames.includes(node.categoryName) && node.categoryName !== ''),
        },
    ];

    return (
        <Fragment>
            <SidebarGroupLabel>Deine Gruppen</SidebarGroupLabel>
            <SidebarMenu className="mb-4">
                <SidebarMenuItem className="">
                    <SidebarMenuButton asChild>
                        <Link href="/portal/groups">
                            <PieChart />
                            <span>Gruppenübersicht</span>
                        </Link>
                    </SidebarMenuButton>
                </SidebarMenuItem>

                {sections.map(({ label, nodes }) => {
                    if (nodes.length === 0) {
                        return null;
                    }

                    return (
                        <Collapsible key={`collapsible-${label}`} defaultOpen={false} className="group/collapsible">
                            <SidebarMenuItem>
                                <CollapsibleTrigger asChild>
                                    <SidebarMenuButton>
                                        {label}
                                        <Plus className="ml-auto group-data-[state=open]/collapsible:hidden" />
                                        <Minus className="ml-auto group-data-[state=closed]/collapsible:hidden" />
                                    </SidebarMenuButton>
                                </CollapsibleTrigger>
                                <CollapsibleContent>
                                    <SidebarMenuSub>{renderCategoryItems(nodes)}</SidebarMenuSub>
                                </CollapsibleContent>
                            </SidebarMenuItem>
                        </Collapsible>
                    );
                })}
            </SidebarMenu>
        </Fragment>
    );
}
