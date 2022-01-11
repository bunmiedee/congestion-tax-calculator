## Why es5?

## What format is date/time string written as?

- Assumes YYYY-MM-DD HH:mm:ss as seen in 2013-01-14 21:00:00

## Should congestionTaxCalculator be able to process different days or restrict to single day

- Assumption here is to allow bulk date inputs for different days as well entries for a single days

## "days before a public holiday" How many days?

- Used 1 (However this is configurable and can be changed in tax-rules.json

## "a vehicle that passes several tolling stations within 60 minutes is only taxed once." Does this mean 60 mins is counted from the first entry or assumes 60 mins between two points

- Went with the first

## Is there a reason why a date/time library wasn't used?

- Introduced moment.js to the project
