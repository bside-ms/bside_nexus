const isNotEmptyString = (value: string | null | undefined): value is string => value !== null && value !== undefined && value.length > 0;

export default isNotEmptyString;
