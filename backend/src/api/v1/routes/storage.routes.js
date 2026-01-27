const express = require("express");
const controller = require("../controllers/storage.controller");

const router = express.Router();

router.get("/proxy", controller.proxyDownload);

module.exports = router;
