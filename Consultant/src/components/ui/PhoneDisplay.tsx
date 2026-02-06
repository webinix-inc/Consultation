import React from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { splitPhoneForDisplay } from "@/utils/validationUtils";

interface PhoneDisplayProps {
    phone: string;
    label?: string;
    className?: string;
    defaultCountry?: string;
}

export const PhoneDisplay: React.FC<PhoneDisplayProps> = ({ phone, label = "Phone Number", className, defaultCountry = "IN" }) => {
    const { countryCode, number, country } = splitPhoneForDisplay(phone, defaultCountry);
    const hasCountryCode = Boolean(countryCode);

    return (
        <div className={className}>
            {label && (
                <Label className="text-xs text-muted-foreground mb-1 block">
                    {label}
                </Label>
            )}
            <div className="flex min-w-0 gap-2">
                {hasCountryCode ? (
                    <>
                        <div className="flex h-9 w-16 shrink-0 items-center gap-1.5 rounded-md border border-input bg-muted/50 px-2">
                            {country && (
                                <img
                                    src={`https://flagcdn.com/w20/${country.toLowerCase()}.png`}
                                    srcSet={`https://flagcdn.com/w40/${country.toLowerCase()}.png 2x`}
                                    alt=""
                                    className="h-4 w-4 shrink-0 rounded-[2px] object-cover"
                                />
                            )}
                            <span className="truncate text-sm font-medium text-foreground">{countryCode}</span>
                        </div>
                        <Input
                            value={number}
                            disabled={true}
                            className="h-9 min-w-0 flex-1 bg-muted/50"
                        />
                    </>
                ) : (
                    <Input
                        value={number || phone}
                        disabled={true}
                        className="h-9 min-w-0 flex-1 bg-muted/50"
                    />
                )}
            </div>
        </div>
    );
};
