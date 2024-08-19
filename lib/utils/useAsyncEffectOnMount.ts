import { useEffect } from 'react';
import type MaybePromise from '@/types/MaybePromise';

/**
 * We took the best from useEffectOnMount and useAsyncEffect and created this beauty.
 */
const useAsyncEffectOnMount = (asyncCallback: () => MaybePromise<void>, destructor?: () => void): void => {
    useEffect(
        () => {
            asyncCallback();
            return destructor;
        },
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [],
    );
};

export default useAsyncEffectOnMount;
