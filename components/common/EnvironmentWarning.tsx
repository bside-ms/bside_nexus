import { TriangleAlert } from 'lucide-react';
import type { ReactElement } from 'react';
import { isTestSystemOnProductionKeycloak } from '@/lib/environment';

// Shown on every page of a test system that uses the production Keycloak.
const EnvironmentWarning = (): ReactElement | null => {
    if (!isTestSystemOnProductionKeycloak()) {
        return null;
    }

    return (
        <div role="alert" className="flex items-start gap-2 bg-red-600 px-4 py-2 text-sm text-white">
            <TriangleAlert className="mt-0.5 size-4 shrink-0" />
            <p>
                <strong>Testsystem mit dem echten Keycloak.</strong> Änderungen an Gruppen, Mitgliedschaften, Rollen und Accounts wirken
                sich auf die echten Accounts aus.
            </p>
        </div>
    );
};

export default EnvironmentWarning;
