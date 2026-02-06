const s3Service = require("../../../services/s3.service");
const Transaction = require("../../../models/transaction.model");

/**
 * Proxy file download from S3
 * Endpoint: GET /api/v1/storage/proxy?key=folder/filename.ext
 * Requires authentication. Users can only access their own files.
 */
const proxyDownload = async (req, res) => {
    try {
        const { key } = req.query;
        const userId = req.user?.id;
        const userRole = req.user?.role;

        if (!key || typeof key !== "string") {
            return res.status(400).json({ message: "File key is required" });
        }

        // Path traversal prevention
        const decodedKey = decodeURIComponent(key);
        if (decodedKey.includes("..") || decodedKey.includes("%2e%2e")) {
            return res.status(403).json({ message: "Invalid file path" });
        }

        // Only allow users/ and invoices/ prefixes
        if (!decodedKey.startsWith("users/") && !decodedKey.startsWith("invoices/")) {
            return res.status(403).json({ message: "Access denied" });
        }

        // Authorization: users/{userId}/... - only that user or Admin
        if (decodedKey.startsWith("users/")) {
            const parts = decodedKey.split("/");
            const keyUserId = parts[1]; // users/{userId}/...
            if (String(userId) !== String(keyUserId) && userRole !== "Admin" && userRole !== "Employee") {
                return res.status(403).json({ message: "Access denied" });
            }
        }

        if (decodedKey.startsWith("invoices/")) {
            if (userRole !== "Admin" && userRole !== "Employee") {
                // 1. Try to find transaction by invoiceUrl (robust for UUID filenames)
                // Use regex to match key anywhere in URL (handling query params like &filename=...)
                const regexPattern = decodedKey.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

                let transaction = await Transaction.findOne({
                    invoiceUrl: { $regex: regexPattern }
                }).lean();

                // 2. Fallback: Extract transactionId from filename (Legacy format: INV-{transactionId}.pdf)
                if (!transaction) {
                    const keyParts = decodedKey.split("/");
                    const filename = keyParts[keyParts.length - 1] || "";
                    const match = filename.match(/^INV-(.+)\.pdf$/i);
                    const transactionId = match ? match[1] : null;

                    if (transactionId) {
                        transaction = await Transaction.findOne({ transactionId }).lean();
                    }
                }

                if (!transaction) {
                    // If file exists in S3 but no transaction linked, we deny access for security
                    return res.status(403).json({ message: "Access denied (No linked transaction)" });
                }

                // Check Ownership
                // Transaction stores "user" (Client) and "consultant" (Consultant)
                const isOwner = String(transaction.user) === String(userId) ||
                    String(transaction.consultant) === String(userId) ||
                    (transaction.user?._id && String(transaction.user._id) === String(userId)); // Handle populated fields just in case

                if (!isOwner) {
                    return res.status(403).json({ message: "Access denied" });
                }
            }
        }

        const fileStream = await s3Service.getFileStream(decodedKey);

        // Create user-friendly filename
        // But getFileStream returns response.Body.
        // Let's rely on browser/client to sniff or explicit header if we updated s3Service to return metadata.
        // Or better: update s3Service.getFileStream to return { stream, contentType }?
        // For now, let's stream directly. Express handles piping well.

        // Better implementation: Get metadata.
        // But let's stick to simple piping for now, as S3 SDK streams usually carry minimal metadata in the body object directly suitable for piping unless we access the parent response.
        // Actually, stream is enough for download.

        // Create a user-friendly filename
        // 1. Try to get it from query param (e.g., ?filename=my-invoice.pdf)
        // 2. Fallback to extracting from key (e.g., invoices/2023/file.pdf -> file.pdf)
        let filename = req.query.filename;
        if (!filename) {
            const keyParts = decodedKey.split("/");
            filename = keyParts[keyParts.length - 1];
        }

        // Ensure safe characters in filename (basic sanitization)
        filename = filename.replace(/[^a-zA-Z0-9.\-_]/g, "_");

        // Default to attachment (download) for buttons elsewhere.
        // Use ?view=inline to open in browser (e.g. from notifications).
        const disposition = req.query.view === 'inline' ? 'inline' : 'attachment';
        res.setHeader('Content-Disposition', `${disposition}; filename="${filename}"`);
        res.setHeader('Content-Type', 'application/pdf'); // Assuming PDF for now, or could detect.

        fileStream.pipe(res);

        fileStream.on('error', (err) => {
            console.error("Stream error:", err);
            if (!res.headersSent) {
                res.status(500).json({ message: "Error streaming file" });
            }
        });

    } catch (error) {
        console.error("Proxy Download Error:", error);
        if (error.message.includes("NoSuchKey")) {
            return res.status(404).json({ message: "File not found" });
        }
        res.status(500).json({ message: "Internal Server Error" });
    }
};

module.exports = {
    proxyDownload,
};
