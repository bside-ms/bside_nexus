import { useEffect } from 'react';
import type { EffectCallback } from 'react';

/**
 * Just a small hook to use when you want to make it explicit that this
 * effectful code must only be run once on mount
 */
const useEffectOnMount = (effect: EffectCallback): void =>
    // eslint-disable-next-line react-hooks/exhaustive-deps
    useEffect(effect, []);

export default useEffectOnMount;
