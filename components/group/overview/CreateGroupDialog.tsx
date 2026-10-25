'use client';

import { useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2, PlusCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';
import type { ReactElement } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import CategorySelect from '@/components/group/details/admin/CategorySelect';
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
    categoryName: z.string().trim().min(1, 'Wähle eine Kategorie.').max(100, 'Die Kategorie darf höchstens 100 Zeichen lang sein.'),
    groupType: z.enum(['kreis', 'permission']),
    hidden: z.boolean(),
});

type FormValues = z.infer<typeof formSchema>;

interface CreateGroupResponse extends GroupActionResponse {
    groupId: string;
}

// Only for system admins. The API checks this too.
const CreateGroupDialog = ({ categories }: { categories: Array<string> }): ReactElement => {
    const router = useRouter();
    const [open, setOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    const form = useForm<FormValues>({
        resolver: zodResolver(formSchema),
        defaultValues: { displayName: '', categoryName: '', groupType: 'kreis', hidden: false },
    });

    const slug = slugifyGroupName(form.watch('displayName'));

    const onSubmit = async (values: FormValues): Promise<void> => {
        setIsLoading(true);
        await postGroupAction<CreateGroupResponse>(
            '/api/group/create',
            values,
            { success: 'Die Gruppe wurde erstellt.', error: 'Die Gruppe konnte nicht erstellt werden.' },
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
                    Gruppe erstellen
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[520px]">
                <DialogHeader>
                    <DialogTitle>Gruppe erstellen</DialogTitle>
                    <DialogDescription>
                        Die Gruppe wird unter /kreise angelegt. Mitglieder, Administrator*innen und Rechte vergibst du danach auf ihrer
                        Seite.
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
                                        <Input placeholder="z. B. Gartenkreis" autoComplete="off" {...field} />
                                    </FormControl>
                                    <FormDescription>
                                        {isNotEmptyString(slug) ? `Wird in Keycloak als /kreise/${slug} angelegt.` : ' '}
                                    </FormDescription>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="categoryName"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Kategorie</FormLabel>
                                    <CategorySelect
                                        id="create-group-category"
                                        value={field.value}
                                        onChange={field.onChange}
                                        categories={categories}
                                        allowEmpty={false}
                                    />
                                    <FormDescription>Danach wird die Gruppe in der Seitenleiste einsortiert.</FormDescription>
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
                        <Button type="submit" disabled={isLoading}>
                            {isLoading ? <Loader2 className="size-4 animate-spin" /> : 'Erstellen'}
                        </Button>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
};

export default CreateGroupDialog;
