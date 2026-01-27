import React from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { splitPhoneForDisplay } from "@/utils/validationUtils";

interface PhoneDisplayProps {
    phone: string;
    label?: string;
    className?: string;
}

export const PhoneDisplay: React.FC<PhoneDisplayProps> = ({ phone, label = "Phone Number", className }) => {
    const { countryCode, number, country } = splitPhoneForDisplay(phone);

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
                        disabled={true}
                        className="h-auto w-full border-0 bg-transparent p-0 shadow-none focus-visible:ring-0 text-sm"
                    />
                </div>
                <Input
                    value={number}
                    disabled={true}
                    className="bg-gray-50 flex-1 h-9"
                />
            </div>
        </div>
    );
};
