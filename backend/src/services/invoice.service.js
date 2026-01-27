const PDFDocument = require("pdfkit");
const { uploadFile } = require("./s3.service");

// Helper to format currency
const formatCurrency = (amount) => {
    return "INR " + (amount || 0).toFixed(2);
};

// Helper to format date
const formatDate = (date) => {
    if (!date) return "";
    const d = new Date(date);
    return d.toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
    });
};

const generateInvoice = async (transaction, appointment, client, consultant) => {
    return new Promise((resolve, reject) => {
        try {
            const doc = new PDFDocument({ margin: 50, size: "A4" });
            let buffers = [];

            doc.on("data", buffers.push.bind(buffers));
            doc.on("end", async () => {
                try {
                    const pdfData = Buffer.concat(buffers);
                    const fileName = `INV-${transaction.transactionId}.pdf`;
                    const folder = `invoices/${new Date().getFullYear()}`;

                    console.log(`Uploading invoice ${fileName} to ${folder}...`);

                    // 1. Try S3 Upload
                    const { url, key } = await uploadFile(pdfData, fileName, folder, "application/pdf");
                    console.log(`Invoice uploaded to S3: ${url}`);

                    // Construct Proxy URL for Frontend
                    const backendUrl = process.env.BACKEND_URL;
                    if (!backendUrl) throw new Error("BACKEND_URL env variable is not set");
                    const proxyUrl = `${backendUrl}/api/v1/storage/proxy?key=${key}`;

                    // Generate User-Friendly Filename: INVOICE-ConsultantName-Date-Slot
                    try {
                        const cName = transaction.consultantSnapshot?.name || consultant?.name || "Consultant";
                        // Retrieve date and slot more robustly
                        const aDateObj = appointment.date ? new Date(appointment.date) : (appointment.startAt ? new Date(appointment.startAt) : new Date());
                        const aDate = aDateObj.toISOString().split('T')[0]; // YYYY-MM-DD

                        const aSlot = appointment.timeStart || (appointment.startAt ? new Date(appointment.startAt).toLocaleTimeString('en-US', { hour12: false }).replace(/:/g, "-") : "Slot");

                        // Sanitize components
                        const safeName = cName.replace(/[^a-zA-Z0-9]/g, "_");
                        const safeDate = aDate.replace(/[^a-zA-Z0-9-]/g, "_");
                        const safeSlot = aSlot.replace(/[^a-zA-Z0-9-]/g, "");

                        const customFilename = `INVOICE-${safeName}-${safeDate}-${safeSlot}.pdf`;

                        // Append filename to proxy URL
                        resolve(`${proxyUrl}&filename=${customFilename}`);
                        return; // Exit early to avoid resolving twice
                    } catch (e) {
                        console.warn("Filename generation failed, using default:", e);
                        resolve(proxyUrl);
                        return;
                    }

                    resolve(proxyUrl);
                } catch (s3Err) {
                    console.error("CRITICAL: S3 Upload Failed.", s3Err);
                    reject(s3Err);
                }


            });

            // Handle errors during PDF generation
            doc.on("error", (err) => {
                console.error("Error generating PDF:", err);
                reject(err);
            });

            generateHeader(doc);
            generateCustomerInformation(doc, transaction, client, consultant);
            generateInvoiceTable(doc, transaction, appointment, consultant);
            generateFooter(doc);

            doc.end();
        } catch (err) {
            reject(err);
        }
    });
};

function generateHeader(doc) {
    doc
        .fillColor("#444444")
        .fontSize(20)
        .text("TAX INVOICE", 50, 57)
        .fontSize(10)
        .text("Original for Recipient", 200, 65, { align: "right" })
        .moveDown();

    // Divider
    doc.moveTo(50, 80).lineTo(550, 80).strokeColor("#DDDDDD").stroke();
}

function generateCustomerInformation(doc, transaction, client, consultant) {
    // Platform / Provider Info
    doc.fillColor("#444444").fontSize(20).text("Consultation Platform", 50, 100);

    // Future: Add address/GSTIN here if available in env or config
    // doc.fontSize(10).text("123 Platform Way, Tech City", 50, 115);

    generateHr(doc, 130);

    const customerInformationTop = 145;
    const clientName = client?.fullName || client?.name || "Valued Client";
    const clientEmail = client?.email || "";
    const clientMobile = client?.mobile || client?.phone || "";

    doc.fontSize(10)
        .text("Invoice Number:", 50, customerInformationTop)
        .font("Helvetica-Bold")
        .text(transaction.transactionId || "N/A", 150, customerInformationTop)
        .font("Helvetica")
        .text("Invoice Date:", 50, customerInformationTop + 15)
        .text(formatDate(transaction.createdAt || new Date()), 150, customerInformationTop + 15)

        .font("Helvetica-Bold")
        .text("Bill To:", 300, customerInformationTop)
        .font("Helvetica")
        .text(clientName, 300, customerInformationTop + 15)
        .text(clientEmail, 300, customerInformationTop + 30)
        .text(clientMobile, 300, customerInformationTop + 45)
        .moveDown();

    generateHr(doc, 200);
}

function generateInvoiceTable(doc, transaction, appointment, consultant) { // Accept consultant here
    let i;
    const invoiceTableTop = 220;

    doc.font("Helvetica-Bold");
    generateTableRow(
        doc,
        invoiceTableTop,
        "Item",
        "Rate",
        "Qty",
        "Amount"
    );
    generateHr(doc, invoiceTableTop + 20);
    doc.font("Helvetica");

    // Robust consultant name retrieval
    const consultantName = transaction.consultantSnapshot?.name || consultant?.name || consultant?.fullName || "Consultant";
    const dateStr = appointment.date || (appointment.startAt ? new Date(appointment.startAt).toLocaleDateString() : "");
    const timeStr = appointment.timeStart || (appointment.startAt ? new Date(appointment.startAt).toLocaleTimeString() : "");

    const itemDescription = `Consultation with ${consultantName}\n(${dateStr} ${timeStr})`;

    const amount = transaction.amount || 0;

    generateTableRow(
        doc,
        invoiceTableTop + 30,
        itemDescription,
        formatCurrency(amount),
        1,
        formatCurrency(amount)
    );

    generateHr(doc, invoiceTableTop + 50); // Increased spacing for multi-line description if needed

    const subtotalPosition = invoiceTableTop + 70;

    generateTableRow(
        doc,
        subtotalPosition,
        "",
        "Total",
        "",
        formatCurrency(amount)
    );

    doc.font("Helvetica-Bold");
    generateTableRow(
        doc,
        subtotalPosition + 20,
        "",
        "Amount Paid",
        "",
        formatCurrency(amount)
    );
    doc.font("Helvetica");
}

function generateFooter(doc) {
    doc
        .fontSize(10)
        .text(
            "Payment received. Thank you for your business.",
            50,
            700,
            { align: "center", width: 500 }
        );
}

function generateTableRow(
    doc,
    y,
    item,
    unitCost,
    quantity,
    lineTotal
) {
    doc
        .fontSize(10)
        .text(item, 50, y, { width: 250 }) // Allow detailed description
        .text(unitCost, 280, y, { width: 90, align: "right" })
        .text(quantity, 370, y, { width: 90, align: "right" })
        .text(lineTotal, 0, y, { align: "right" });
}

function generateHr(doc, y) {
    doc
        .strokeColor("#aaaaaa")
        .lineWidth(1)
        .moveTo(50, y)
        .lineTo(550, y)
        .stroke();
}

module.exports = {
    generateInvoice,
};
