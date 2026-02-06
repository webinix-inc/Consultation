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

export const splitPhoneForDisplay = (phone: string, defaultCountry: string = "IN"): { countryCode: string; number: string; country?: string } => {
    try {
        if (!phone) return { countryCode: "", number: "" };
        // Try parsing as-is first (E.164 or international)
        let phoneNumber = parsePhoneNumber(phone);
        // If that fails and number looks like local (no +, digits only), try with default country
        if (!phoneNumber && !phone.startsWith("+")) {
            const digits = phone.replace(/\D/g, "");
            if (digits.length >= 10) {
                phoneNumber = parsePhoneNumber(phone, defaultCountry);
            }
        }
        if (phoneNumber) {
            return {
                countryCode: `+${phoneNumber.countryCallingCode}`,
                number: phoneNumber.formatNational(),
                country: phoneNumber.country // "US", "IN", etc.
            };
        }
        return { countryCode: "", number: phone };
    } catch (error) {
        // Fallback: for Indian numbers without +, assume +91
        const digits = (phone || "").replace(/\D/g, "");
        if (digits.length === 10 && /^[6-9]/.test(digits)) {
            return { countryCode: "+91", number: phone.trim(), country: "IN" };
        }
        if (digits.length === 12 && digits.startsWith("91")) {
            return { countryCode: "+91", number: digits.slice(2), country: "IN" };
        }
        return { countryCode: "", number: phone };
    }
};
