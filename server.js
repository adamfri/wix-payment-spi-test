const express = require('express');

const app = express();
app.use(express.json())

app.get('/', (req, res) => {
  res.send('Hello Express app!')
});

app.post('/', (req, res) => {
  console.log(req.body)
  console.log(req.get('JWT'))
  res.send("Request received!")
})

app.listen(3000, () => {
  console.log('server started');
});
