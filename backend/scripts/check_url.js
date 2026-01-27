const http = require('http');

const url = 'http://localhost:5002/public/invoices/2026/INV-TXN_FALLBACK_TEST_1769330854723.pdf';

console.log(`Checking URL: ${url}`);

http.get(url, (res) => {
    console.log(`Status Code: ${res.statusCode}`);
    console.log(`Content-Type: ${res.headers['content-type']}`);
    console.log(`Content-Length: ${res.headers['content-length']}`);

    if (res.statusCode === 200) {
        console.log("✅ File is reachable!");
    } else {
        console.log("❌ File retrieval failed.");
    }
}).on('error', (e) => {
    console.error(`❌ Connection error: ${e.message}`);
});
