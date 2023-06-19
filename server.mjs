import { createRequire } from "module";
const require = createRequire(import.meta.url);
const express = require('express');
const path = require('path');
import {jwtProcessing} from './jwt-validation.mjs';
import {createAccount, processWixTransaction} from './database.mjs'
import {submitEvent} from './submit-event.mjs'

const app = express();
app.use(express.json())
app.use(express.static('public'))

app.get('/', (req, res) => {
  res.send('Martini Payments Provider')
});

// Connect account endpoint
app.post('/connect', async (req, res) => {
  console.log('request body', JSON.stringify(req.body))
  // Validate JWT
  try{
    const jwtIsValid = jwtProcessing(req.get('Digest').replace('JWT=', ''), JSON.stringify(req.body))
    if (!jwtIsValid){
      res.status(400).send("Invalid request")
      return;
    }
  } catch (error) {
    console.log('Invalid request from error.')
    res.status(400).send("Invalid Request")
    return;
  }
  // Check DB for account and create account if needed
  try {
    const accountDetails = await createAccount(req.body)
    res.send({
      credentials : {
        merchantId : accountDetails.accountId,
        ...req.body.credentials
      },
      accountId : accountDetails.accountId,
      accountName : accountDetails.accountName
    })
  } catch (error) {
    if (error.message === "CURRENCY_NOT_SUPPORTED") {
      res.send({
          reasonCode: 2009,
          errorCode: "CURRENCY_IS_NOT_SUPPORTED",
          errorMessage: "Only EUR is supported"
      })
    } else if (error.message === "INVALID_ACCOUNT_DETAILS") {
      res.send({
          reasonCode: 2002,
          errorCode: "INVALID_ACCOUNT_DETAILS",
          errorMessage: "Provide setup ID and email"
      })
    }
  }
  
})

// Create transaction endpoint
app.post('/transaction', async (req, res) => {
  console.log('request body', JSON.stringify(req.body))
  // Validate JWT
  try{
    const jwtIsValid = jwtProcessing(req.get('Digest').replace('JWT=', ''), JSON.stringify(req.body))
    if (!jwtIsValid){
      res.status(400).send("Invalid request")
      return;
    }
  } catch (error) {
    console.log('Invalid request from error.')
    res.status(400).send("Invalid Request")
    return;
  }

  // Handle the transaction
  try {
    // Process transaction in the DB
    const transactionResults = await processWixTransaction(req.body)

    // Deal with different payment statuses

    // Payment approved
    if (transactionResults.status === "APPROVED") {
      const response = {
        pluginTransactionId : transactionResults.internalTransactionId
      }
      res.send(response);
      submitEvent({
        event: {
          transaction : {
            ...response,
            wixTransactionId : req.body.wixTransactionId
          }
        }
      })
    // Payment declined
    } else if (transactionResults.status === "DECLINED") {
        const response = {
          pluginTransactionId : transactionResults.internalTransactionId,
          reasonCode : 3019,
          errorCode: "CARD_LIMIT_EXCEEDED",
          errorMessage: "Not enough funds left in the card limit for this transaction."
        }
        res.send(response)
        submitEvent({
          event: {
            transaction : {
              ...response,
              wixTransactionId : req.body.wixTransactionId
            }
          }
        })
    // Payment pending
    } else if (transactionResults.status === "PENDING") {
        res.send({
          wixTransactionId: req.body.wixTransactionId,
          pluginTransactionId: transactionResults.internalTransactionId,
          reasonCode: 5005
        })

      // Send the follow-up submit event from somewhere else in the code.
    }
    console.log('transaction results that came through', transactionResults); 
  } catch (error) {
    // Deal with errors from the DB.
    if (error.message === "CURRENCY_NOT_SUPPORTED") {
      res.send({
          reasonCode: 3003,
          errorCode: "CURRENCY_IS_NOT_SUPPORTED",
          errorMessage: "Only EUR is supported"
      })
    } else if (error.message === "INVALID_ACCOUNT") {
      res.send({
          reasonCode: 3041,
          errorCode: "INVALID_ACCOUNT",
          errorMessage: "Wix Merchant ID not registered wit Martini Payments"
      })
    } else if (error.message === "PAYMENT_TYPE_NOT_SUPPORTED") {
      res.send({
        reasonCode: 3002,
        errorCode: "PAYMENT_TYPE_NOT_SUPPORTED",
        errorMessage: "Only credit card payments are supported"
      })
    }
  }
  
})

app.post('/paypal', async (req, res) => {
  res.send({
    "pluginTransactionId": "e89b-12d3-a456-42665",
    "redirectUrl": "https://wix-payment-spi-test.adamfriedmann.repl.co/paypal2"
  })
})

app.get('/paypal2', async (req, res) => {
  res.send('You made it to paypal!')
})



app.listen(3000, () => {
  console.log('server started');
});

