import momemt, { Moment, duration } from 'moment';
import _ from 'lodash';

import timeSegments from '../datastore/congestion-charges.json';
import taxRules from '../datastore/tax-rules.json';

export enum VehicleType {
  EMERGENCY = 'emergency',
  BUS = 'bus',
  DIPLOMAT = 'diplomat',
  MOTORCYCLE = 'motorcycle',
  MILITARY = 'military',
  FOREIGN = 'foreign',
  CAR = 'car'
}

export interface TimeSegment {
  id: string;
  start: string;
  end: string;
  price: number;
}

export interface TaxRules {
  maxDailyCharge: number;
  tollFreeDays: TollFreeDays;
  tollFreeVehicles: VehicleType[];
  singleCharge: SingleCharge;
}

export interface SingleCharge {
  timeThreshold: number;
  type: string;
}

export interface TollFreeDays {
  description: string;
  dow: string[];
  months: string[];
  publicHolidays: string[];
}

interface TollChargeEvent {
  date: string;
  tollFee: number;
  value: number;
}

interface SingleChargeGroup {
  start: string;
  end: string;
  tollCharge: number;
}

interface TollEventsByDay {
  [key: string]: SingleChargeGroup[];
}

const timeFormat = 'HH:mm:ss';
const dateFormat = 'YYYY-MM-DD';
const dtFormat = 'YYYY-MM-DD HH:mm:ss'; // e.g 2013-01-14 21:00:00

const parseTimeString = (t: string): Moment => momemt(t, timeFormat);

const parseDateString = (dt: string): Moment => momemt(dt, dtFormat);

const parseMomentToDow = (m: Moment): string => m.format('ddd');

const parseMomentToMonth = (m: Moment): string => m.format('MMM');

const listContains = (list: string[], val: string): boolean => _.includes(list.map(_.lowerCase), _.lowerCase(val));

const dateListContains = (list: string[], val: Moment): boolean =>
  _.includes(
    list.map((dt) => parseDateString(dt).format(dateFormat)),
    val.format(dateFormat)
  );

const happenedNDaysBefore = (list: string[], val: Moment, n: number): boolean => {
  const holidayEve = _.find(list, (dtString) => {
    const t1 = parseDateString(dtString);
    const t0 = t1.clone().subtract(n, 'days');
    return val.isBetween(t0, t1, 'day', '[]');
  });

  return !_.isUndefined(holidayEve);
};

const getTimeDiff = (dt0: string, dt1: string) => duration(parseDateString(dt1).diff(parseDateString(dt0))).asMinutes();

const isSameDay = (dt0: string, dt1: string) =>
  parseDateString(dt0).format(dateFormat) === parseDateString(dt1).format(dateFormat);

// getTollFee new implementation
export const getCongestionChargeByTimeOfDay = (time: string): number => {
  const t0 = parseTimeString(time);
  return (
    _.find<TimeSegment>(timeSegments, ({ start, end }) => {
      const t1 = parseTimeString(start);
      const t2 = parseTimeString(end);

      // assume that t2 & t0 spans into the next day if t1 is > both values as time should be incremental and the order of args is important when calling moment.isBetween
      if (t1.isAfter(t2)) t2.add(1, 'day');
      if (t1.isAfter(t0)) t0.add(1, 'day');

      return t0.isBetween(t1, t2, 'minute', '[]');
    })?.price ?? -1
  );
};

export const isTollFreeDate = (dt: string): boolean => {
  const dt0 = parseDateString(dt);
  const {
    tollFreeDays: {
      dow: exemptedDays,
      months: exemptedMonths,
      publicHolidays: exemptedDates,
      publicHolidayEve: noOfDaysBeforePublicHolidays
    }
  } = taxRules;

  //dow test
  const dow = parseMomentToDow(dt0);
  const dowIsExempted = listContains(exemptedDays, dow);
  if (dowIsExempted) return true;

  // month test
  const month = parseMomentToMonth(dt0);
  const monthIsExempted = listContains(exemptedMonths, month);
  if (monthIsExempted) return true;

  const exemptedDatesStrings = _.map(exemptedDates, 'date');

  // date test
  const dateIsExempt = dateListContains(exemptedDatesStrings, dt0);
  if (dateIsExempt) return true;

  // days before public holidays
  const isHolidayEve = happenedNDaysBefore(exemptedDatesStrings, dt0, noOfDaysBeforePublicHolidays);
  if (isHolidayEve) return true;

  return false;
};

export const isTollFreeVehicle = (type: VehicleType): boolean => {
  const { tollFreeVehicles } = taxRules;
  return _.includes(tollFreeVehicles, type);
};

export const processTollCharges = (dates: string[]): TollChargeEvent[] =>
  _.sortBy<TollChargeEvent>(
    dates.map((date: string) => {
      const timeOfDay = parseDateString(date);
      return {
        date,
        tollFee: isTollFreeDate(date) ? 0 : getCongestionChargeByTimeOfDay(timeOfDay.format(timeFormat)),
        value: timeOfDay.valueOf()
      };
    }),
    'value'
  );

export const groupByInterval = (tollChargeEvents: TollChargeEvent[], timeThreshold: number): TollChargeEvent[][] => {
  let currentIndex = 0;

  return _.reduce(
    tollChargeEvents,
    (result: TollChargeEvent[][], current) => {
      if (_.isUndefined(result[currentIndex])) {
        result[currentIndex] = [current];
      } else {
        const [base] = result[currentIndex];
        const { date: dt0 } = base;
        const { date: dt1 } = current;
        const sameDay = isSameDay(dt0, dt1);
        const timeDiff = getTimeDiff(dt0, dt1);

        if (sameDay && timeDiff <= timeThreshold) {
          // add item to current cluster
          result[currentIndex].push(current);
        } else {
          // shift index and init next cluster
          currentIndex++;
          result[currentIndex] = [current];
        }
      }
      return result;
    },
    []
  );
};

export const processSingleChargeEvents = (eventsByInterval: TollChargeEvent[][]): SingleChargeGroup[] =>
  eventsByInterval.map((group: TollChargeEvent[]) => {
    const { 0: first, [group.length - 1]: last } = group;
    return {
      start: first.date,
      end: last.date,
      tollCharge: (<TollChargeEvent>_.maxBy(group, 'tollFee')).tollFee
    };
  });

export const groupTollEventsByDay = (tollEvents: SingleChargeGroup[]): TollEventsByDay =>
  _.groupBy(tollEvents, ({ start }) => parseDateString(start).format(dateFormat));

export const calculateTotalCharges = (allTollEvents: TollEventsByDay, maxDailyCharge: number): number =>
  _.reduce(
    allTollEvents,
    (totalCharges: number, items: SingleChargeGroup[]) => {
      // get charges per day and apply max daily charge where necessary
      const dayCharge = Math.min(
        _.reduce(items, (res: number, { tollCharge }) => res + tollCharge, 0),
        maxDailyCharge
      );

      return totalCharges + dayCharge;
    },
    0
  );

// new getTax implementation
export const calculateCongestionCharge = (type: VehicleType, dates: string[]) => {
  if (isTollFreeVehicle(type)) return 0;

  const {
    maxDailyCharge,
    singleCharge: { timeThreshold }
  } = taxRules;

  // get all toll charges / date-time
  const tollChargeEvents = processTollCharges(dates);
  // create time clusters for items within the same day & time interval
  const tollChargeEventsByInterval: TollChargeEvent[][] = groupByInterval(tollChargeEvents, timeThreshold);
  // apply single charge
  const singleChargedTollEvents: SingleChargeGroup[] = processSingleChargeEvents(tollChargeEventsByInterval);
  // group items by day - will need this to be able to process max daily charge/day
  const tollEventsByDay: TollEventsByDay = groupTollEventsByDay(singleChargedTollEvents);
  // calculate congestion charge
  const totalCongestionCharge = calculateTotalCharges(tollEventsByDay, maxDailyCharge);

  return totalCongestionCharge;
};
