
const http = require("http");

const run = async () => {
    const filename = "TEST-INVOICE-NAME.pdf";
    const proxyUrl = `http://localhost:5002/api/v1/storage/proxy?key=invoices/proxy-test.txt&filename=${filename}`;

    console.log(`Checking URL: ${proxyUrl}`);

    http.get(proxyUrl, (res) => {
        console.log(`HTTP Status: ${res.statusCode}`);
        console.log("Headers:", res.headers);

        const disposition = res.headers['content-disposition'];
        if (disposition && disposition.includes(`filename="${filename}"`)) {
            console.log("✅ Filename Header Verified!");
        } else {
            console.log("❌ Filename Header Missing or Incorrect.");
            console.log(`Expected: filename="${filename}"`);
            console.log(`Actual: ${disposition}`);
        }

    }).on('error', (e) => {
        console.error("Network Error:", e);
    });
};

run();
