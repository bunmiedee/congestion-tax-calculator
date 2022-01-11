import {
  getCongestionChargeByTimeOfDay,
  isTollFreeDate,
  isTollFreeVehicle,
  calculateCongestionCharge,
  VehicleType
} from './congestionTaxCalculator';

/*
| Time        | Amount |
| ----------- | :----: |
| 06:00–06:29 | SEK 8  |
| 06:30–06:59 | SEK 13 |
| 07:00–07:59 | SEK 18 |
| 08:00–08:29 | SEK 13 |
| 08:30–14:59 | SEK 8  |
| 15:00–15:29 | SEK 13 |
| 15:30–16:59 | SEK 18 |
| 17:00–17:59 | SEK 13 |
| 18:00–18:29 | SEK 8  |
| 18:30–05:59 | SEK 0  |
*/

// all values pre populated in tollFreeVehicles in tax- rules
const taxExemptVehicles = [
  VehicleType.EMERGENCY,
  VehicleType.BUS,
  VehicleType.DIPLOMAT,
  VehicleType.MOTORCYCLE,
  VehicleType.MILITARY,
  VehicleType.FOREIGN
];

describe('congestionTaxCalculator', () => {
  describe('getCongestionChargeByTimeOfDay', () => {
    // Congestion tax is charged during fixed hours for vehicles driving into and out of Gothenburg.
    it('getCongestionChargeByTimeOfDay() should return price by time of day', () => {
      const input = ['06:15', '06:30', '07:59:59', '08:01', '08:30', '15:02', '16:00', '17:10', '18:20', '05:30'];
      const output = [8, 13, 18, 13, 8, 13, 18, 13, 8, 0];
      const result = input.map(getCongestionChargeByTimeOfDay);

      expect(result).toEqual(output);
    });
  });

  describe('isTollFreeDate', () => {
    it('isTollFreeDate() should return true for exempted dow', () => {
      // see https://random-date-generator.com/
      const sat = '2019-04-06 12:18:53';
      const sun = '2018-09-23 17:12:35';
      const mon = '2020-06-24 23:27:11';

      expect(isTollFreeDate(sat)).toBe(true);
      expect(isTollFreeDate(sun)).toBe(true);
      expect(isTollFreeDate(mon)).toBe(false);
    });

    it('isTollFreeDate() should return true for exempted month', () => {
      const aWednesdayInJuly = '2021-07-14 06:51:38';
      const aWednesdayInAugust = '2010-08-25 15:00:28';

      expect(isTollFreeDate(aWednesdayInJuly)).toBe(true);
      expect(isTollFreeDate(aWednesdayInAugust)).toBe(false);
    });

    it('isTollFreeDate() should return true for exempted date', () => {
      const aGoodFridayIn2021 = '2021-04-02 00:00:15'; // Good Friday - pre added in tax-rules
      const anEasterMondayIn2021 = '2021-04-05 00:00:38'; // Easter monday - pre added in tax-rules
      const aRandomTuesdayIn2016 = '2016-11-30 05:44:13';

      expect(isTollFreeDate(aGoodFridayIn2021)).toBe(true);
      expect(isTollFreeDate(anEasterMondayIn2021)).toBe(true);
      expect(isTollFreeDate(aRandomTuesdayIn2016)).toBe(false);
    });

    it('isTollFreeDate() should return true for days before a public holiday', () => {
      const aDayBeforeGoodFriday = '2021-04-01 00:00:38';

      expect(isTollFreeDate(aDayBeforeGoodFriday)).toBe(true);
    });
  });

  describe('isTollFreeVehicle', () => {
    it('isTollFreeVehicle() should return true for exempted vehicles', () => {
      const output = taxExemptVehicles.map(() => true);
      const result = taxExemptVehicles.map(isTollFreeVehicle);

      expect(result).toEqual(output);
      expect(isTollFreeVehicle(VehicleType.CAR)).toBe(false);
    });
  });

  describe('calculateCongestionCharge', () => {
    // test for toll free days, dates, days before public holidays, months, hours
    // test for toll free vehicles
    // test for time block charging @ 60 min
    // check for max daily charge
    // test for different time blocks

    // The tax is not charged on weekends (Saturdays and Sundays)
    it('calculateCongestionCharge() should return 0 for toll free days', () => {
      const sat = '2019-04-06 12:18:53';
      const sun = '2018-09-23 17:12:35';
      const aWeekendBlock = [sat, sun];
      const tollCharge = calculateCongestionCharge(VehicleType.CAR, aWeekendBlock);

      expect(tollCharge).toBe(0);
    });

    // public holidays
    it('calculateCongestionCharge() should return 0 for toll free dates', () => {
      const aTollFreeDateBlock = ['2021-04-02 00:00:15', '2021-04-05 15:30:10']; // set in tax-rules.json
      const tollCharge = calculateCongestionCharge(VehicleType.CAR, aTollFreeDateBlock);

      expect(tollCharge).toBe(0);
    });

    //days before a public holiday
    it('calculateCongestionCharge() should return 0 for days before a public holiday', () => {
      const aGoodFridayEveBlock = ['2021-04-01 00:00:38']; // set in tax-rules.json
      const tollCharge = calculateCongestionCharge(VehicleType.CAR, aGoodFridayEveBlock);

      expect(tollCharge).toBe(0);
    });

    // and during the month of July
    it('calculateCongestionCharge() should return 0 for exempted months', () => {
      const aWednesdayInJuly = '2021-07-14 06:51:38';
      const anExemptedMonthBlock = [aWednesdayInJuly];
      const tollCharge = calculateCongestionCharge(VehicleType.CAR, anExemptedMonthBlock);

      expect(tollCharge).toBe(0);
    });

    it('calculateCongestionCharge() should return 0 for toll free hours', () => {
      const aTollFreeDateTimeBlock = ['2016-11-29 19:00:10', '2016-11-30 05:44:13'];
      const tollCharge = calculateCongestionCharge(VehicleType.CAR, aTollFreeDateTimeBlock);

      expect(tollCharge).toBe(0);
    });

    it('calculateCongestionCharge() should return 0 for toll free vehicles', () => {
      const aWednesdayInAugust = '2010-08-25 15:00:28';
      const aRandomBlock = [aWednesdayInAugust];
      const output = taxExemptVehicles.map(() => 0);
      const result = taxExemptVehicles.map((vehicleType) => calculateCongestionCharge(vehicleType, aRandomBlock));

      expect(result).toEqual(output);
    });

    /*
      A single charge rule applies in Gothenburg.
      Under this rule, a vehicle that passes several tolling stations within 60 minutes is only taxed once.
      The amount that must be paid is the highest one.
    */
    it('calculateCongestionCharge() should only charge once and return the highest price within given time block', () => {
      const aSixtyMinuteDateTimeBlock = [
        '2010-08-25 15:00:28', // toll fee here should be 13 as per input in congestion-charges.json
        '2010-08-25 15:35:08' // toll fee here should be 18 as per input in congestion-charges.json
      ];
      const tollCharge = calculateCongestionCharge(VehicleType.CAR, aSixtyMinuteDateTimeBlock);

      expect(tollCharge).toBe(18);
    });

    // The maximum amount per day and vehicle is 60 SEK.
    it('calculateCongestionCharge() should return max daily charge if toll charges exceed preset value', () => {
      const aTwoHourIntervalTimeBlock = [
        '2010-08-25 06:30:28', // toll fee here should be 13 as per input in congestion-charges.json
        '2010-08-25 08:00:28', // toll fee here should be 13 as per input in congestion-charges.json
        '2010-08-25 10:05:18', // toll fee here should be 8 as per input in congestion-charges.json
        '2010-08-25 12:15:25', // toll fee here should be 8 as per input in congestion-charges.json
        '2010-08-25 14:05:11', // toll fee here should be 18 as per input in congestion-charges.json
        '2010-08-25 16:35:08', // toll fee here should be 18 as per input in congestion-charges.json
        '2010-08-25 18:08:21' // toll fee here should be 8 as per input in congestion-charges.json
      ];
      const tollCharge = calculateCongestionCharge(VehicleType.CAR, aTwoHourIntervalTimeBlock);

      expect(tollCharge).toBe(60);
    });

    it('calculateCongestionCharge() should calculate toll charges for different date time combinations and over different days', () => {
      const tollCharge = calculateCongestionCharge(VehicleType.CAR, [
        '2013-01-14 21:00:00',
        '2013-01-15 21:00:00',
        '2013-02-07 06:23:27',
        '2013-02-07 15:27:00',
        '2013-02-08 06:27:00',
        '2013-02-08 06:20:27',
        '2013-02-08 14:35:00',
        '2013-02-08 15:29:00',
        '2013-02-08 15:47:00',
        '2013-02-08 16:01:00',
        '2013-02-08 16:48:00',
        '2013-02-08 17:49:00',
        '2013-02-08 18:29:00',
        '2013-02-08 18:35:00',
        '2013-03-26 14:25:00',
        '2013-03-28 14:07:27'
      ]);

      expect(tollCharge).toBe(97);
    });
  });
});
