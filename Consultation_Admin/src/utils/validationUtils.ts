import { isValidPhoneNumber, parsePhoneNumber } from 'libphonenumber-js';

export const validatePhone = (phone: string, countryCode?: string): boolean => {
    try {
        // If phone starts with + it's parsed as international
        const phoneWithPlus = phone.startsWith('+') ? phone : `+${phone}`;
        return isValidPhoneNumber(phoneWithPlus);
    } catch (error) {
        return false;
    }
};

export const formatPhoneForBackend = (phone: string, countryCode: string): string => {
    // Ensure phone number has + prefix for E.164 format
    // react-phone-input-2 usually provides the number with country code but without +
    if (!phone.startsWith('+')) {
        return `+${phone}`;
    }
    return phone;
};

export const formatPhoneForDisplay = (phone: string): string => {
    try {
        if (!phone) return "";
        const phoneNumber = parsePhoneNumber(phone);
        return phoneNumber ? phoneNumber.formatInternational() : phone;
    } catch (error) {
        return phone;
    }
};

export const splitPhoneForDisplay = (phone: string): { countryCode: string; number: string; country?: string } => {
    try {
        if (!phone) return { countryCode: "", number: "" };
        const phoneNumber = parsePhoneNumber(phone);
        if (phoneNumber) {
            return {
                countryCode: `+${phoneNumber.countryCallingCode}`,
                number: phoneNumber.formatNational(),
                country: phoneNumber.country // "US", "IN", "IS", etc.
            };
        }
        return { countryCode: "", number: phone };
    } catch (error) {
        return { countryCode: "", number: phone };
    }
};
