const http = require('http');

const url = 'http://localhost:5002/public/invoices/2026/INV-TXN_FALLBACK_TEST_1769330854723.pdf';

console.log(`Checking Headers for: ${url}`);

http.get(url, (res) => {
    console.log(`Status Code: ${res.statusCode}`);
    console.log(`Access-Control-Allow-Origin: ${res.headers['access-control-allow-origin']}`);
    console.log(`Content-Type: ${res.headers['content-type']}`);
    console.log('All Headers:', JSON.stringify(res.headers, null, 2));

    if (res.headers['access-control-allow-origin'] === '*') {
        console.log("✅ CORS Header Present!");
    } else {
        console.log("❌ CORS Header MISSING!");
    }
}).on('error', (e) => {
    console.error(`❌ Connection error: ${e.message}`);
});
