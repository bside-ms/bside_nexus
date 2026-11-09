import type { ReactElement } from 'react';
import { Badge } from '@/components/ui/badge';
import type { KeyProtocolType } from '@/lib/key/constants';
import { KEY_PROTOCOL_TYPE_LABELS } from '@/lib/key/constants';

const VARIANTS: Record<KeyProtocolType, 'default' | 'secondary' | 'destructive'> = {
    issuance: 'default',
    return: 'secondary',
    lost: 'destructive',
};

const ProtocolTypeBadge = ({ type, isCancelled = false }: { type: KeyProtocolType; isCancelled?: boolean }): ReactElement =>
    isCancelled ? (
        <Badge variant="outline" className="text-muted-foreground">
            {KEY_PROTOCOL_TYPE_LABELS[type]} · storniert
        </Badge>
    ) : (
        <Badge variant={VARIANTS[type]}>{KEY_PROTOCOL_TYPE_LABELS[type]}</Badge>
    );

export default ProtocolTypeBadge;
