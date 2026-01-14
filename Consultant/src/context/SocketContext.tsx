import React, { createContext, useContext, useEffect, useState } from "react";
import { io, Socket } from "socket.io-client";
import { useSelector } from "react-redux";
import { RootState } from "../app/store";
import { toast } from "sonner";

interface SocketContextType {
    socket: Socket | null;
    isConnected: boolean;
}

const SocketContext = createContext<SocketContextType>({
    socket: null,
    isConnected: false,
});

export const useSocket = () => useContext(SocketContext);

export const SocketProvider = ({ children }: { children: React.ReactNode }) => {
    const [socket, setSocket] = useState<Socket | null>(null);
    const [isConnected, setIsConnected] = useState(false);

    // Authenticated user state
    const { token, isAuthenticated } = useSelector((state: RootState) => state.auth);

    useEffect(() => {
        // Only connect if authenticated with a token
        if (!isAuthenticated || !token) {
            if (socket) {
                console.log("[Socket] Disconnecting due to logout/auth check");
                socket.disconnect();
                setSocket(null);
                setIsConnected(false);
            }
            return;
        }

        // Prevent re-connection if already connected with same token (simplification)
        // But socket.io handles instances well.

        // Initialize Socket
        // Use localhost:5002 as verified or relative path if proxied
        const socketUrl = "https://consultation-kywq.onrender.com";
        // const socketUrl = "http://localhost:5002";

        const socketInstance = io(socketUrl, {
            auth: {
                token: token, // Pass raw token (SocketService handles verification)
            },
            transports: ["websocket"],
            reconnection: true,
        });

        socketInstance.on("connect", () => {
            console.log("[Socket] Connected:", socketInstance.id);
            setIsConnected(true);
        });

        socketInstance.on("disconnect", () => {
            console.log("[Socket] Disconnected");
            setIsConnected(false);
        });

        socketInstance.on("connect_error", (err) => {
            console.error("[Socket] Connection Error:", err.message);
        });

        // Global Listener for Notifications
        socketInstance.on("notification:new", (data) => {
            console.log("[Socket] New Notification:", data);

            // Show Toast (sonner)
            toast(data.name || "New Notification", {
                description: data.message,
                duration: 5000,
                position: 'top-right',
                // Add icons based on type for better UI
                icon: data.type === 'payment' ? '💰' :
                    data.type === 'appointment' ? '📅' :
                        data.type === 'alert' ? '⚠️' : '🔔',
                // Optional: Add rich colors if needed, but sonner default is good
            });
        });

        setSocket(socketInstance);

        return () => {
            socketInstance.disconnect();
        };
    }, [isAuthenticated, token]); // Re-connect if auth state changes

    return (
        <SocketContext.Provider value={{ socket, isConnected }}>
            {children}
        </SocketContext.Provider>
    );
};
