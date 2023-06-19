import { createRequire } from "module";
const require = createRequire(import.meta.url);
const Client = require("@replit/database");
const client = new Client(process.env.REPLIT_DB_URL);
import { v4 as uuidv4 } from 'uuid';

/** **************************************** */
// Support for the Connect Account endpoint //
/** ************************************** */
/*
DB schema:
"merchants" : {
  "setupId" : {
    "accountId" : string,
    "accountName" : string,
    "wixMerchantId" : string
}
*/
export async function createAccount (accountDetails) {
  console.log(accountDetails)
  // Check that currency is EUR
  if(accountDetails.currency != "EUR"){
    throw new Error("CURRENCY_NOT_SUPPORTED")
  }
  // Check that account details are provided
  if(!accountDetails.credentials.setupId||!accountDetails.credentials.email){
    throw new Error("INVALID_ACCOUNT_DETAILS")
  }

  const merchants = await client.get("merchants");
  // If the merchant doesn't exist yet, create it.
  if(!merchants.hasOwnProperty(accountDetails.credentials.setupId)){
    const newMerchant = {
      "accountId" : uuidv4(),
      "accountName" : accountDetails.credentials.email,
      "wixMerchantId" : accountDetails.wixMerchantId
    }
    merchants[accountDetails.credentials.setupId] = newMerchant
    await client.set("merchants", merchants);
    console.log(await client.get('merchants'))
    return newMerchant;
  // If the merchant already exists, return the details.
  } else {
    console.log(await client.get('merchants'))
    return merchants[accountDetails.credentials.setupId]
  }
  
}
/* Connect account testing stuff
const testAccount = {
  "credentials": {
    "setupId": "123",
    "email": "steve@steve.com"
  },
  "country": "US",
  "currency": "USD",
  "mode": "live",
  "wixMerchantId": "000000-0000-0000-0000-000000000000"
}


client.set('merchants', {
  "Initializer": {
    "accountId" : "123456",
    "accountName" : "test@test.com"
  }
})

console.log(await accountSetup(testAccount))
*/

/** ******************************************* */
// Support for the Create Transaction endpoint //
/** ***************************************** */
/*
DB schema:
"transactions" : {
  "wixTransactionId" : {
    "internalTransactionId" : string,
    "amount" : int,
    "currency" : string (must be EUR)
    "status" : enum ["APPROVED", "DECLINED", "PENDING"],
    "wixMerchantId" : string
}
*/
export async function processWixTransaction (transactionDetails) {
  // Validate currency
  if(transactionDetails.order.description.currency != "EUR"){
    throw new Error("CURRENCY_NOT_SUPPORTED")
  }
  // Validate that the method is credit card
  if(transactionDetails.paymentMethod != 'creditCard'){
    throw new Error("PAYMENT_TYPE_NOT_SUPPORTED")
  }

  // Check that the wixMerchantId is valid
  let merchantIdExists = false;
  const merchants = await client.get('merchants');
  const merchantList = Object.keys(merchants)
  for (const merchant of merchantList) {
    if(merchants[merchant]['wixMerchantId'] === transactionDetails.wixMerchantId){
      merchantIdExists = true;
    }
  }
  if (merchantIdExists === false){
    throw new Error("INVALID_ACCOUNT")
  }

  // Read existing transactions from DB
  const transactions = await client.get('transactions')
  // Check if the transaction already exists
  if (transactions.hasOwnProperty(transactionDetails.wixTransactionId)) {
    console.log('transaction not added', transactions)
    return transactions[transactionDetails.wixTransactionId] 
  
  // If the transaction is new, create it.
  } else {
    //Simulating payment results
    const results = ["APPROVED", "DECLINED", "PENDING"]
    const result = results[Math.floor(Math.random() * results.length)]

    // Create and store the new transaction
    const newTransaction = {
      internalTransactionId : uuidv4(),
      amount : transactionDetails.order.description.totalAmount,
      currency : transactionDetails.order.description.currency,
      status : result,
      wixMerchantId : transactionDetails.wixMerchantId
    }
    transactions[transactionDetails.wixTransactionId] = newTransaction;
    await client.set('transactions', transactions);
    return newTransaction;
  } 
}
/* Transaction testing stuff
const testTransaction = {
  wixTransactionId : "123123124sdfaw4erd35rf3dqw",
  paymentMethod : "creditCard",
  wixMerchantId : "000000-0000-0000-0000-000000000000",
  order : {
    description: {
      totalAmount : 10000,
      currency : "EUR",
      
    }
  }
}
processWixTransaction(testTransaction);
*/