import type { ReactElement } from 'react';
import { ThemeToggle } from '@/components/theming/theme-toggle';

const Home = (): ReactElement => {
    return (
        <>
            <h1 className="text-2xl">Willkommen im B-Side Nexus</h1>
            <ThemeToggle />
        </>
    );
};

export default Home;
