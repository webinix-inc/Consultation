import React, { useEffect, useState } from "react";
import { Clock } from "lucide-react";

interface BookingTimerProps {
    expiresAt: Date | string;
    onExpire: () => void;
}

export const BookingTimer: React.FC<BookingTimerProps> = ({ expiresAt, onExpire }) => {
    const [timeLeft, setTimeLeft] = useState<string>("");
    const [isUrgent, setIsUrgent] = useState(false);

    useEffect(() => {
        const interval = setInterval(() => {
            const now = new Date().getTime();
            const end = new Date(expiresAt).getTime();
            const distance = end - now;

            if (distance < 0) {
                clearInterval(interval);
                setTimeLeft("00:00");
                onExpire();
                return;
            }

            const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
            const seconds = Math.floor((distance % (1000 * 60)) / 1000);

            setTimeLeft(
                `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`
            );

            if (distance < 60000) { // Less than 1 minute
                setIsUrgent(true);
            }
        }, 1000);

        return () => clearInterval(interval);
    }, [expiresAt, onExpire]);

    return (
        <div className={`flex items-center gap-2 text-sm font-semibold ${isUrgent ? "text-red-600 animate-pulse" : "text-blue-600"}`}>
            <Clock className="w-4 h-4" />
            <span>Time Remaining: {timeLeft}</span>
        </div>
    );
};
