import isNotEmptyString from '@/lib/utils/isNotEmptyString';

const getSupportEmail = (): string | null => {
    const supportEmail = process.env.SUPPORT_EMAIL?.trim();

    return isNotEmptyString(supportEmail) ? supportEmail : null;
};

export default getSupportEmail;
