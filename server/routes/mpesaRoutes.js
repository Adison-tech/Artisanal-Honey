const express = require('express');
const { initiateSTKPush, mpesaCallback } = require('../controllers/mpesaController');

const router = express.Router();

router.post('/stkpush', initiateSTKPush);
router.post('/callback', mpesaCallback);
module.exports = router;