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

        // Initialize Socket
        const socketUrl = import.meta.env.VITE_BACKEND_URL || "http://localhost:5002";

        const socketInstance = io(socketUrl, {
            auth: {
                token: token,
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
            });
        });

        setSocket(socketInstance);

        return () => {
            socketInstance.disconnect();
        };
    }, [isAuthenticated, token]);

    return (
        <SocketContext.Provider value={{ socket, isConnected }}>
            {children}
        </SocketContext.Provider>
    );
};
