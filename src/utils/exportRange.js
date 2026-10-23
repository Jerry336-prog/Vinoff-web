const pad = value => String(value).padStart(2, '0');
const dateKey = (year, month, day) => `${year}-${pad(month)}-${pad(day)}`;

// Store operations use Lagos calendar days, independent of the viewer's timezone.
export const exportDateKey = value => {
  if (!value) return '';
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return '';
  const parts = new Intl.DateTimeFormat('en-GB', { timeZone: 'Africa/Lagos', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(date);
  const get = type => parts.find(part => part.type === type).value;
  return `${get('year')}-${get('month')}-${get('day')}`;
};

const validDate = value => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value || '')) return false;
  const [year, month, day] = value.split('-').map(Number);
  return year >= 1900 && year <= 9999 && new Date(Date.UTC(year, month - 1, day)).toISOString().slice(0, 10) === value;
};

export const validateExportRange = ({ startDate = '', endDate = '' } = {}) => {
  if (!startDate && !endDate) return '';
  if (!validDate(startDate) || !validDate(endDate)) return 'Choose a valid start and end date.';
  if (startDate > endDate) return 'The end date must be on or after the start date.';
  return '';
};

export const resolveExportRange = ({ period = 'all', month, quarter = 1, year, startDate = '', endDate = '' }) => {
  if (period === 'all') return { startDate: '', endDate: '' };
  if (period === 'custom') {
    const error = validateExportRange({ startDate, endDate });
    if (error || !startDate) throw new Error(error || 'Choose a start and end date.');
    return { startDate, endDate };
  }
  let y = Number(year);
  let firstMonth = 1;
  let lastMonth = 12;
  if (period === 'month') {
    if (!/^\d{4}-\d{2}$/.test(month || '')) throw new Error('Choose a month.');
    [y, firstMonth] = month.split('-').map(Number);
    lastMonth = firstMonth;
  } else if (period === 'quarter') {
    if (![1, 2, 3, 4].includes(Number(quarter))) throw new Error('Choose a valid quarter.');
    firstMonth = (Number(quarter) - 1) * 3 + 1;
    lastMonth = firstMonth + 2;
  } else if (period !== 'year') throw new Error('Choose a valid date period.');
  if (!Number.isInteger(y) || y < 1900 || y > 9999 || firstMonth < 1 || firstMonth > 12) throw new Error('Choose a valid month and year.');
  const lastDay = new Date(Date.UTC(y, lastMonth, 0)).getUTCDate();
  return { startDate: dateKey(y, firstMonth, 1), endDate: dateKey(y, lastMonth, lastDay) };
};

export const filterByExportRange = (records, range = {}, getDate = record => record.date) => {
  const error = validateExportRange(range);
  if (error) throw new Error(error);
  if (!range.startDate && !range.endDate) return records;
  return records.filter(record => {
    const date = exportDateKey(getDate(record));
    return date && date >= range.startDate && date <= range.endDate;
  });
};

export const exportRangeParams = range => range?.startDate ? {
  startDate: `${range.startDate}T00:00:00.000+01:00`,
  endDate: `${range.endDate}T23:59:59.999+01:00`,
} : {};

export const exportRangeLabel = range => range?.startDate ? `${range.startDate} to ${range.endDate} (Lagos time)` : 'All dates';

export const groupExportRecords = (records, grouping = 'month') => {
  if (!['day', 'month', 'year'].includes(grouping)) throw new Error('Choose a valid archive grouping.');
  const groups = new Map();
  records.forEach(record => {
    const date = exportDateKey(record.date);
    const key = date ? date.slice(0, grouping === 'day' ? 10 : grouping === 'year' ? 4 : 7) : 'undated';
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(record);
  });
  return [...groups.entries()].sort(([a], [b]) => a.localeCompare(b));
};
