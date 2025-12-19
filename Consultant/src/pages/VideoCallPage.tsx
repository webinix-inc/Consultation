import React, { useEffect, useState } from "react";
import { useParams, useSearchParams, useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import type { RootState } from "@/app/store";
import { VideoCallRoom } from "@/components/videoCall/VideoCallRoom";

const VideoCallPage = () => {
    const { id } = useParams<{ id: string }>();
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const { user } = useSelector((state: RootState) => state.auth);

    const [channelName, setChannelName] = useState("");

    // Agora App ID from env
    // Agora App ID from env or fallback (to avoid restart requirement)
    // Agora App ID from env or fallback (to avoid restart requirement)
    const appId = import.meta.env.VITE_AGORA_APP_ID || "2ad83189742b4b1a8a6f22ca512a2c48";

    useEffect(() => {
        const channel = searchParams.get("channel");
        if (channel) {
            setChannelName(channel);
        } else if (id) {
            setChannelName(`appointment-${id}`);
        }
    }, [searchParams, id]);

    if (!id) return <div>Invalid Appointment ID</div>;
    if (!appId) return <div className="p-8 text-center text-red-500">Agora App ID not configured</div>;
    if (!user) return <div className="p-8 text-center">Please login to join the call</div>;

    const userId = (user as any)._id || user.id;

    return (
        <div className="w-full h-screen bg-gray-900">
            <VideoCallRoom
                appointmentId={id}
                appId={appId}
                userId={userId}
                role="publisher" // Both client and consultant are publishers
                onLeave={() => {
                    // Close window or navigate back
                    if (window.opener) {
                        window.close();
                    } else {
                        navigate("/dashboard");
                    }
                }}
            />
        </div>
    );
};

export default VideoCallPage;
