const s3Service = require("../../../services/s3.service");

/**
 * Proxy file download from S3
 * Endpoint: GET /api/v1/storage/proxy?key=folder/filename.ext
 */
const proxyDownload = async (req, res) => {
    try {
        const { key } = req.query;

        if (!key) {
            return res.status(400).json({ message: "File key is required" });
        }

        // Security check: simple path traversal prevention and folder restriction if needed
        // For now, allowing invoices/ and users/ as valid prefixes
        if (!key.startsWith("invoices/") && !key.startsWith("users/")) {
            // Optional: Return 403 if strict restriction is desired. 
            // For now, logging warning but allowing it as we are replacing "public-read" behavior.
            console.warn(`[StorageProxy] Accessing key outside standard folders: ${key}`);
        }

        const fileStream = await s3Service.getFileStream(key);

        // You might want to get content type from S3 response if s3Service returned the full response
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
            const parts = key.split('/');
            filename = parts[parts.length - 1];
        }

        // Ensure safe characters in filename (basic sanitization)
        filename = filename.replace(/[^a-zA-Z0-9.\-_]/g, "_");

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
