'use client';

import { useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2, PlusCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';
import type { ReactElement } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import type { GroupActionResponse } from '@/components/group/details/postGroupAction';
import { postGroupAction } from '@/components/group/details/postGroupAction';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import isNotEmptyString from '@/lib/utils/isNotEmptyString';
import slugifyGroupName from '@/lib/utils/slugifyGroupName';

const formSchema = z.object({
    displayName: z
        .string()
        .trim()
        .min(3, 'Der Name muss mindestens 3 Zeichen lang sein.')
        .max(100, 'Der Name darf höchstens 100 Zeichen lang sein.'),
    groupType: z.enum(['kreis', 'permission']),
    hidden: z.boolean(),
    parentAdminsManage: z.boolean(),
});

type FormValues = z.infer<typeof formSchema>;

interface CreateSubgroupResponse extends GroupActionResponse {
    groupId: string;
}

// Only for system admins. The API checks this too.
const CreateSubgroupDialog = ({ parentGroupId }: { parentGroupId: string }): ReactElement => {
    const router = useRouter();
    const [open, setOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    const form = useForm<FormValues>({
        resolver: zodResolver(formSchema),
        defaultValues: { displayName: '', groupType: 'kreis', hidden: false, parentAdminsManage: false },
    });

    const slug = slugifyGroupName(form.watch('displayName'));

    const onSubmit = async (values: FormValues): Promise<void> => {
        setIsLoading(true);
        await postGroupAction<CreateSubgroupResponse>(
            '/api/group/create-subgroup',
            { parentGroupId, ...values },
            { success: 'Die Untergruppe wurde erstellt.', error: 'Die Untergruppe konnte nicht erstellt werden.' },
            ({ groupId }) => {
                setOpen(false);
                form.reset();
                router.push(`/portal/groups/${groupId}`);
            },
        );
        setIsLoading(false);
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button size="sm" variant="outline">
                    <PlusCircle className="mr-2 size-4" />
                    Untergruppe erstellen
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[520px]">
                <DialogHeader>
                    <DialogTitle>Untergruppe erstellen</DialogTitle>
                    <DialogDescription>
                        Die Mitgliedschaft ist unabhängig von dieser Gruppe. Rechte wie Nextcloud-Ordner vergibst du danach auf der Seite
                        der neuen Gruppe.
                    </DialogDescription>
                </DialogHeader>
                <Form {...form}>
                    <form className="grid items-start gap-4" onSubmit={form.handleSubmit(onSubmit)}>
                        <FormField
                            control={form.control}
                            name="displayName"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Name</FormLabel>
                                    <FormControl>
                                        <Input placeholder="z. B. Festival - Finanzen" autoComplete="off" {...field} />
                                    </FormControl>
                                    <FormDescription>
                                        {isNotEmptyString(slug) ? `Wird in Keycloak als /untergruppen/${slug} angelegt.` : ' '}
                                    </FormDescription>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="groupType"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Art</FormLabel>
                                    <Select value={field.value} onValueChange={field.onChange}>
                                        <FormControl>
                                            <SelectTrigger>
                                                <SelectValue />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            <SelectItem value="kreis">Arbeitsgruppe</SelectItem>
                                            <SelectItem value="permission">Berechtigung</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    <FormDescription>
                                        Eine Berechtigung vergibt nur einen Zugriff, z. B. auf einen Kalender.
                                    </FormDescription>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="hidden"
                            render={({ field }) => (
                                <FormItem className="flex flex-row items-start gap-3 space-y-0">
                                    <FormControl>
                                        <Checkbox checked={field.value} onCheckedChange={(checked) => field.onChange(checked === true)} />
                                    </FormControl>
                                    <div className="space-y-1 leading-none">
                                        <FormLabel>Versteckt</FormLabel>
                                        <FormDescription>Nur Mitglieder und Verwaltende sehen die Gruppe.</FormDescription>
                                    </div>
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="parentAdminsManage"
                            render={({ field }) => (
                                <FormItem className="flex flex-row items-start gap-3 space-y-0">
                                    <FormControl>
                                        <Checkbox checked={field.value} onCheckedChange={(checked) => field.onChange(checked === true)} />
                                    </FormControl>
                                    <div className="space-y-1 leading-none">
                                        <FormLabel>Admins der Obergruppe dürfen verwalten</FormLabel>
                                        <FormDescription>
                                            Sonst verwalten nur die eigenen Administrator*innen die Gruppe. Die ernennst du nach dem
                                            Erstellen.
                                        </FormDescription>
                                    </div>
                                </FormItem>
                            )}
                        />
                        <Button type="submit" disabled={isLoading}>
                            {isLoading ? <Loader2 className="size-4 animate-spin" /> : 'Erstellen'}
                        </Button>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
};

export default CreateSubgroupDialog;
