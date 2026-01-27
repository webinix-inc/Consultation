
const currencyMap: Record<string, { symbol: string; code: string }> = {
    // North America
    us: { symbol: '$', code: 'USD' },
    ca: { symbol: '$', code: 'CAD' },
    mx: { symbol: '$', code: 'MXN' },

    // Europe
    gb: { symbol: '£', code: 'GBP' },
    eu: { symbol: '€', code: 'EUR' },
    de: { symbol: '€', code: 'EUR' },
    fr: { symbol: '€', code: 'EUR' },
    it: { symbol: '€', code: 'EUR' },
    es: { symbol: '€', code: 'EUR' },
    nl: { symbol: '€', code: 'EUR' },
    be: { symbol: '€', code: 'EUR' },
    at: { symbol: '€', code: 'EUR' },
    ie: { symbol: '€', code: 'EUR' },
    fi: { symbol: '€', code: 'EUR' },
    pt: { symbol: '€', code: 'EUR' },
    gr: { symbol: '€', code: 'EUR' },
    ch: { symbol: 'Fr.', code: 'CHF' },
    se: { symbol: 'kr', code: 'SEK' },
    no: { symbol: 'kr', code: 'NOK' },
    dk: { symbol: 'kr', code: 'DKK' },
    pl: { symbol: 'zł', code: 'PLN' },
    cz: { symbol: 'Kč', code: 'CZK' },
    hu: { symbol: 'Ft', code: 'HUF' },
    ro: { symbol: 'lei', code: 'RON' },
    bg: { symbol: 'лв', code: 'BGN' },
    ru: { symbol: '₽', code: 'RUB' },
    ua: { symbol: '₴', code: 'UAH' },

    // Asia
    in: { symbol: '₹', code: 'INR' },
    cn: { symbol: '¥', code: 'CNY' },
    jp: { symbol: '¥', code: 'JPY' },
    kr: { symbol: '₩', code: 'KRW' },
    id: { symbol: 'Rp', code: 'IDR' },
    th: { symbol: '฿', code: 'THB' },
    vn: { symbol: '₫', code: 'VND' },
    my: { symbol: 'RM', code: 'MYR' },
    ph: { symbol: '₱', code: 'PHP' },
    sg: { symbol: '$', code: 'SGD' },
    hk: { symbol: '$', code: 'HKD' },
    tw: { symbol: 'NT$', code: 'TWD' },
    pk: { symbol: 'Rs', code: 'PKR' },
    bd: { symbol: '৳', code: 'BDT' },
    lk: { symbol: 'Rs', code: 'LKR' },
    np: { symbol: 'Rs', code: 'NPR' },
    ae: { symbol: 'AED', code: 'AED' },
    sa: { symbol: 'SR', code: 'SAR' },
    il: { symbol: '₪', code: 'ILS' },
    tr: { symbol: '₺', code: 'TRY' },

    // Oceania
    au: { symbol: '$', code: 'AUD' },
    nz: { symbol: '$', code: 'NZD' },

    // South America
    br: { symbol: 'R$', code: 'BRL' },
    ar: { symbol: '$', code: 'ARS' },
    co: { symbol: '$', code: 'COP' },
    cl: { symbol: '$', code: 'CLP' },
    pe: { symbol: 'S/', code: 'PEN' },

    // Africa
    za: { symbol: 'R', code: 'ZAR' },
    ng: { symbol: '₦', code: 'NGN' },
    eg: { symbol: 'E£', code: 'EGP' },
    ke: { symbol: 'KSh', code: 'KES' },
    gh: { symbol: 'GH₵', code: 'GHS' },
};

export const getCurrencyConfig = (countryCode: string) => {
    if (!countryCode) return { symbol: '₹', code: 'INR' };
    return currencyMap[countryCode.toLowerCase()] || { symbol: '$', code: 'USD' };
};

export const getCurrencySymbol = (countryCode: string) => getCurrencyConfig(countryCode).symbol;
export const getCurrencyCode = (countryCode: string) => getCurrencyConfig(countryCode).code;

export const getSymbolFromCurrency = (currencyCode: string) => {
    if (!currencyCode) return '₹';
    // Find entry by code
    const entry = Object.values(currencyMap).find(c => c.code === currencyCode);
    return entry ? entry.symbol : currencyCode;
};

export const formatCurrency = (amount: number | string, currencyCode = 'INR', locale = 'en-IN') => {
    const num = Number(amount) || 0;
    try {
        return new Intl.NumberFormat(locale, {
            style: 'currency',
            currency: currencyCode,
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        }).format(num);
    } catch (error) {
        // Fallback if currency code is invalid
        const symbol = getSymbolFromCurrency(currencyCode);
        return `${symbol}${num.toLocaleString(locale)}`;
    }
};
