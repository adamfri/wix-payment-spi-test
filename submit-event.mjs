import fetch from 'node-fetch';

// Function to retrieve OAuth access tokens for Submit Event endpoint.
async function getAccessToken(){
  const body = {
    grant_type : "client_credentials",
    scope : "CASHIER.GET_ACCESS",
    client_id : process.env['WIX_APP_ID'],
    client_secret : process.env['WIX_APP_SECRET_KEY']
  }
  
  const response = await fetch('https://www.wixapis.com/oauth/access', {
    method: 'post',
    body : JSON.stringify(body),
    headers : {'Content-Type': 'application/json'}
  });

  try {
    const data = await response.json();
    return data.access_token;
  } catch (e) {
    throw e
  }
}


// Helper function for sending payment and refund webhooks to Wix.
export async function submitEvent(eventDetails) {
  console.log('submit event was pinged!')
  const response = await fetch('https://www.wixapis.com/payments/v1/provider-platform-events', {
    method : 'post',
    body: JSON.stringify(eventDetails),
    headers : {
      'Authorization' : await getAccessToken(),
      'Content-Type' : 'application/json'
    }
  })
  return response.status;
}