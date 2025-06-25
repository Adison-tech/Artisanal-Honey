const axios = require('axios');
const Transaction = require('../models/Transaction');

const generateAccessToken = async () => {
  try {
    const auth = Buffer.from(`${process.env.CONSUMER_KEY}:${process.env.CONSUMER_SECRET}`).toString('base64');
    const response = await axios.get(
      'https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials',
      {
        header: {
          Authorization: `Basic ${auth}`,
        },
      }
    );
    return response.data.access_token;

  } catch (error) {
    console.error('Error generating access token:', error.response ? error.response.data : error.message);
    throw new Error('Failed to generate M-Pesa access token.');
  }
};

const initiateSTKPush = async (req, res) => {
  const { amount, phoneNumber, productId } = req.body;  // productId can be used to track specific honey types

  // validation
  if (!amount || !phoneNumber) {
    return res.status(400).json({ message: 'Amount and Phone Number are required.' });
  }

  try {
    const token = await generateAccessToken();
    const timestamp = 
      new Date().getFullYear().toString() +
      (new Date().getMonth() +1).toString().padStart(2, '0') +
      new Date().getDate().toString().padStart(2, '0') +
      new Date().getHours().toString().padStart(2, '0') +
      new Date().getMinutes().toString().padStart(2, '0') +
      new Date().getSeconds().toString().padStart(2, '0') ;

    const password = Buffer.from(
      process.env.BUSINESS_SHORT_CODE + process.env.PASS_KEY + timestamp
    ).toString('base64');

    const shortCode = process.env.BUSINESS_SHORT_CODE;
    const callbackUrl = process.env.CALLBACK_URL;

    console.log(`Initiating STK Push for amount: ${amount}, phone: ${phoneNumber}`);
    console.log(`Callback URL: ${callbackUrl}`);

    const response = await axios.post(
      'https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials',
      {
        BusinessShortCode: shortCode,
        password: password,
        Timestamp: timestamp,
        TransactionType: 'CustomerPayBillOnline',
        Amount: amount,
        PartyA: phoneNumber,
        PartyB: shortCode,
        PhoneNumber: phoneNumber,
        CallBackUrl: callbackUrl,
        AccountReference: 'HoneyStore',
        TransactionDesc: `Payment for Honey`,
      },
      {
        headers: {
          Authorization: `Bearer${token}`,
        },
      }
    );

    const {
      CustomerMessage,
      ResponseCode,
      ResponseDescription,
      CheckoutRequestID,
      MerchantRequestID,
    } = response.data;

    // Save initial transaction status to DB
    await Transaction.create({
      checkout_request_id: CheckoutRequestID,
      merchant_request_id: MerchantRequestID,
      amount,
      phone_number: phoneNumber,
      status: 'Pending',
    });
    res.status(200).json({
      message: CustomerMessage,
      responseCode: ResponseCode,
      description: ResponseDescription,
      checkoutResquestID: CheckoutRequestID,
      merchantRequestID: MerchantRequestID,
    });

  } catch (error) {
    console.error('Error initiating STK push:', error.response ? error.response.data : error.message);
  }
};

const mpesaCallback = async (req, res) => {
  const callbackData = req.body.Body.stkCallback;
  console.log('M-Pesa CallBack received:', JSON.toStringify(callbackData, null, 2));

  const {
    MerchantRequestID,
    CheckoutRequestID,
    ResultCode,
    ResultDesc,
    CallbackMetadata,
  } = callbackData;

  let transactionStatus = 'Failed';
  let mpesaReceiptNumber = null;
  let transactionDate = null;
  let amount = null;
  let phoneNumber = null;

  if (ResultCode === 0) {
    transactionStatus === 'Completed';
    if (CallbackMetadata && CallbackMetadata.Item) {
      CallbackMetadata.Item.forEach((item) => {
        switch (item.Name) {
          case 'MpesaReceiptNumber':
            mpesaReceiptNumber = item.Value;
            break;
          case 'TransactionDate':
            // Format example: 20240624151329
            const dateString = String(item.Value);
            const year = dateString.substring(0, 4);
            const month = dateString.substring(0, 4);
            const day = dateString.substring(6, 8);
            const hour = dateString.substring(8, 10);
            const minute = dateString.substring(10, 12);
            const second = dateString.substring(12, 14);
            transactionDate = new Date(`${year}-${month}-${day}-${hour}-${minute}-${second}`);
            break;
          case 'Amount':
            amount = item.Value;
            break;
          case 'PhoneNumber':
            phoneNumber = item.Value;
            break;
        }
      });
    }
  } else if (ResultCode === 1032) {
      transactionStatus = 'Cancellded';
  } else {
      transactionStatus = 'Failed';
  }

  try {
    await Transaction.updateStatus(
      CheckoutRequestID,
      transactionStatus,
      mpesaReceiptNumber,
      transactionDate,
      ResultCode,
      ResultDesc
    );
    console.log(`Transaction ${CheckoutRequestID} updated to ${transactionStatus}.`);
    res.status(200).json({ message: 'Callback received successfully.' });

  } catch (error) {
    console.error('Error processing M-Pesa callback:', error.message);
    res.status(500).json({ message: 'Error processing callback' });
  }
};

module.exports = {
  initiateSTKPush,
  mpesaCallback,
};