import { Cloud, Key, PlusCircle, Trello } from 'lucide-react';
import type { ReactElement } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export interface Service {
    id: string;
    name: string;
    type: 'cloud' | 'password' | 'project' | 'other';
    url?: string;
}

interface GroupServicesCardProps {
    services: Array<Service>;
}

const serviceIcons = {
    cloud: Cloud,
    password: Key,
    project: Trello,
    other: PlusCircle,
};

export function GroupDetailsServices({ services }: GroupServicesCardProps): ReactElement {
    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle>Dienste und Ressourcen</CardTitle>
            </CardHeader>
            <CardContent>
                <CardDescription className="mb-4">Dienste und Ressourcen, auf die diese Gruppe Zugriff hat</CardDescription>
                <div className="grid gap-2">
                    {services.map((service) => {
                        const Icon = serviceIcons[service.type];
                        return (
                            <div key={service.id} className="flex items-center justify-between">
                                <div className="flex items-center space-x-2">
                                    <Icon className=" size-4" />
                                    <span>{service.name}</span>
                                </div>
                                {service.url && (
                                    <Button variant="link" className="h-auto p-0" asChild>
                                        <a href={service.url} target="_blank" rel="noopener noreferrer">
                                            Öffnen
                                        </a>
                                    </Button>
                                )}
                            </div>
                        );
                    })}
                </div>
            </CardContent>
        </Card>
    );
}
