// Import `z` from here instead of 'zod'.
// This module sets the German default error messages before any schema runs.
import { z } from 'zod';
import { de } from 'zod/locales';

z.config(de());

export { z };
