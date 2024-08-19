import isNotEmptyString from '@/lib/utils/isNotEmptyString';

const isEmptyString = (value: string | null | undefined): value is '' | null | undefined => !isNotEmptyString(value);

export default isEmptyString;
