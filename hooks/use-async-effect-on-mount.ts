import { useEffect } from 'react';
import type MaybePromise from '@/types/MaybePromise';

const useAsyncEffectOnMount = (asyncCallback: () => MaybePromise<void | (() => void)>): void => {
    useEffect(() => void (async (): Promise<void | (() => void)> => asyncCallback())(), []);
};

export default useAsyncEffectOnMount;
