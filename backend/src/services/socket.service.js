const socketIo = require("socket.io");
const jwt = require("jsonwebtoken");

class SocketService {
    constructor() {
        this.io = null;
    }

    initialize(server) {
        this.io = socketIo(server, {
            cors: {
                origin: "*", // Adjust in production
                methods: ["GET", "POST"]
            }
        });

        // Authentication Middleware
        this.io.use((socket, next) => {
            const token = socket.handshake.auth?.token || socket.handshake.query?.token;

            if (!token) {
                return next(new Error("Authentication error: No token provided"));
            }

            try {
                // Verify token (strip 'Bearer ' if present, though usually client sends raw token)
                const cleanToken = token.startsWith("Bearer ") ? token.split(" ")[1] : token;
                const decoded = jwt.verify(cleanToken, process.env.JWT_SECRET);

                socket.user = decoded; // Attach user info to socket
                next();
            } catch (err) {
                return next(new Error("Authentication error: Invalid token"));
            }
        });

        this.io.on("connection", (socket) => {
            const { id, role } = socket.user;
            console.log(`[Socket] User connected: ${id} (${role}) - Socket ID: ${socket.id}`);

            // Join personal room (e.g., "user:65a1b2c3...")
            socket.join(`user:${id}`);

            // Join role-based room (e.g., "role:Consultant")
            if (role) {
                socket.join(`role:${role}`);
            }

            // Handle disconnection
            socket.on("disconnect", () => {
                console.log(`[Socket] User disconnected: ${id}`);
            });
        });

        console.log("[Socket] Service Initialized");
    }

    /**
     * Emit event to a specific user
     */
    emitToUser(userId, event, data) {
        if (!this.io) {
            console.warn("[Socket] IO not initialized. Cannot emit to user.");
            return;
        }
        this.io.to(`user:${userId}`).emit(event, data);
    }

    /**
     * Emit event to all users with a specific role
     */
    emitToRole(role, event, data) {
        if (!this.io) {
            console.warn("[Socket] IO not initialized. Cannot emit to role.");
            return;
        }
        this.io.to(`role:${role}`).emit(event, data);
    }

    /**
     * Emit global event (Broadcast)
     */
    emitGlobal(event, data) {
        if (!this.io) return;
        this.io.emit(event, data);
    }
}

// Export as Singleton
module.exports = new SocketService();
