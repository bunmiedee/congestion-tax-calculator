import express from 'express';
import bodyParser from 'body-parser';

import { calculateCongestionCharge } from './lib/congestionTaxCalculator';

const app = express();

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

app.post('/calculateCongestionCharge', (req, res) => {
  const {
    body: { vehicleType, dates }
  } = req;

  const symbol = 'kr';
  const totalCongestionCharge = calculateCongestionCharge(vehicleType, dates);
  const formattedValue = `${symbol} ${totalCongestionCharge.toFixed(2)}`;

  res.status(200).json({
    totalCongestionCharge: formattedValue
  });
});

app.listen(8000, () => {
  console.log('Server running on port 8000');
});
