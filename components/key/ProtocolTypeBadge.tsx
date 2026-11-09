import type { ReactElement } from 'react';
import { Badge } from '@/components/ui/badge';
import type { KeyDeletionKind, KeyProtocolType } from '@/lib/key/constants';
import { KEY_DELETION_KIND_LABELS, KEY_PROTOCOL_TYPE_LABELS } from '@/lib/key/constants';

const VARIANTS: Record<KeyProtocolType, 'default' | 'secondary' | 'destructive'> = {
    issuance: 'default',
    return: 'secondary',
    lost: 'destructive',
};

interface ProtocolTypeBadgeProps {
    type: KeyProtocolType;
    // Set for protocols that are marked invalid.
    deletionKind?: KeyDeletionKind | null;
}

const ProtocolTypeBadge = ({ type, deletionKind = null }: ProtocolTypeBadgeProps): ReactElement =>
    deletionKind === null ? (
        <Badge variant={VARIANTS[type]}>{KEY_PROTOCOL_TYPE_LABELS[type]}</Badge>
    ) : (
        <Badge variant="outline" className="text-muted-foreground">
            {KEY_PROTOCOL_TYPE_LABELS[type]} · {KEY_DELETION_KIND_LABELS[deletionKind].toLowerCase()}
        </Badge>
    );

export default ProtocolTypeBadge;
