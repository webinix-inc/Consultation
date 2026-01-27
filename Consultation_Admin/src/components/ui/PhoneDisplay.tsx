import React from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { splitPhoneForDisplay } from "@/utils/validationUtils";

interface PhoneDisplayProps {
    phone: string;
    label?: string;
    className?: string;
    variant?: "default" | "card";
}

export const PhoneDisplay: React.FC<PhoneDisplayProps> = ({ phone, label = "Phone Number", className, variant = "default" }) => {
    const { countryCode, number, country } = splitPhoneForDisplay(phone);

    if (variant === "card") {
        return (
            <div className={`flex items-center gap-3 text-sm text-slate-600 group-hover:text-slate-900 transition-colors ${className}`}>
                <div className="h-8 w-[52px] rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-center gap-1 shrink-0">
                    {country && (
                        <img
                            src={`https://flagcdn.com/w20/${country.toLowerCase()}.png`}
                            srcSet={`https://flagcdn.com/w40/${country.toLowerCase()}.png 2x`}
                            alt={country}
                            className="h-3 w-4 object-cover rounded-[1px]"
                        />
                    )}
                    <span className="text-[10px] font-medium text-slate-500">{countryCode}</span>
                </div>
                <span className="truncate font-medium text-xs text-slate-700">{number}</span>
            </div>
        );
    }

    return (
        <div className={className}>
            {label && (
                <Label className="text-xs text-muted-foreground mb-1 block">
                    {label}
                </Label>
            )}
            <div className="flex gap-2">
                <div className="flex h-9 w-[124px] shrink-0 items-center gap-2 rounded-md border border-input bg-gray-50 px-3">
                    {country && (
                        <img
                            src={`https://flagcdn.com/w20/${country.toLowerCase()}.png`}
                            srcSet={`https://flagcdn.com/w40/${country.toLowerCase()}.png 2x`}
                            alt="Flag"
                            className="h-auto w-5 shrink-0 rounded-[2px] object-cover"
                        />
                    )}
                    <Input
                        value={countryCode}
                        readOnly
                        disabled={true}
                        className="h-auto w-full border-0 bg-transparent p-0 shadow-none focus-visible:ring-0 text-sm"
                    />
                </div>
                <Input
                    value={number}
                    readOnly
                    disabled={true}
                    className="bg-gray-50 flex-1 h-9"
                />
            </div>
        </div>
    );
};
