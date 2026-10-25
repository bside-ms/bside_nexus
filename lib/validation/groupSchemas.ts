import { z } from 'zod';
import { GROUP_ROLE_CLIENTS } from '@/lib/constants';
import { idSchema } from '@/lib/validation/keySchemas';

const displayNameSchema = z.string().trim().min(3).max(100);
const categoryNameSchema = z.string().trim().max(100);
const groupTypeSchema = z.enum(['kreis', 'permission']);

export const groupCreateSchema = z.object({
    displayName: displayNameSchema,
    categoryName: categoryNameSchema.min(1),
    groupType: groupTypeSchema,
    hidden: z.boolean(),
});

export const subgroupCreateSchema = z.object({
    parentGroupId: idSchema,
    displayName: displayNameSchema,
    groupType: groupTypeSchema,
    hidden: z.boolean(),
    parentAdminsManage: z.boolean(),
});

export const groupSettingsSchema = z.object({
    groupId: idSchema,
    displayName: displayNameSchema,
    // Only for groups without a parent. Empty removes the category.
    categoryName: categoryNameSchema.optional(),
    includedGroupIds: z.array(idSchema).max(20),
    // Takes the roles of this group away from the member groups of removed included groups.
    removeRolesFromRemovedGroups: z.boolean().default(false),
    hidden: z.boolean(),
    parentAdminsManage: z.boolean(),
});

export const groupArchiveSchema = z.object({
    groupId: idSchema,
    archived: z.boolean(),
});

const groupRoleSchema = z.object({
    groupId: idSchema,
    clientId: z.enum(GROUP_ROLE_CLIENTS),
    roleName: z.string().trim().min(1).max(255),
});

// Lowercase like the existing Nextcloud roles, so the group names stay predictable.
export const newRoleNamePattern = /^[\da-z][\d_a-z-]*$/;

export const groupRoleAddSchema = groupRoleSchema.extend({
    create: z.boolean().default(false),
});

// Roles belong on the member group. The other two are old mappings.
export const groupRoleLocationSchema = z.enum(['members', 'group', 'admin']);
export type GroupRoleLocation = z.infer<typeof groupRoleLocationSchema>;

export const groupRoleRemoveSchema = groupRoleSchema.extend({
    location: groupRoleLocationSchema,
});

export const groupRoleMoveSchema = groupRoleSchema.extend({
    from: z.enum(['group', 'admin']),
});
