'use client';

import { isEmpty } from 'lodash-es';
import type { ReactElement } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function FormChangeAvatar({ username }: { username: string }): ReactElement {
    if (username === undefined) {
        return <div>Loading...</div>;
    }

    return (
        <Card className="rounded-xl ">
            <CardHeader>
                <CardTitle>Avatar</CardTitle>
                <CardDescription>Dieses Bild wird bei Mattermost und anderen Anwendungen als dein Profilbild angezeigt.</CardDescription>
            </CardHeader>
            <CardContent className="flex grid-cols-2">
                <Avatar className="mx-2 mt-2">
                    <AvatarImage src={!isEmpty(username) ? `/api/mattermost/${username}` : ''} alt="shadcn" />
                    <AvatarFallback>{username.charAt(0)}</AvatarFallback>
                </Avatar>
                <div className="mx-2 grid w-full max-w-sm items-center gap-1.5">
                    <Label htmlFor="picture">Picture</Label>
                    <Input id="picture" type="file" />
                </div>
            </CardContent>
            <CardFooter>
                <Button variant="destructive" disabled={true} className="w-full">
                    Speichern
                </Button>
            </CardFooter>
        </Card>
    );
}
