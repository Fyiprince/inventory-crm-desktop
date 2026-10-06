import dayjs from 'dayjs';

export const formatINR = (n) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 })
    .format(Number(n || 0));

export const formatNumber = (n) =>
  new Intl.NumberFormat('en-IN').format(Number(n || 0));

export const formatDate = (d) => (d ? dayjs(d).format('DD MMM YYYY') : '—');
export const formatDateTime = (d) => (d ? dayjs(d).format('DD MMM YYYY, HH:mm') : '—');
export const formatMonth = (m) => dayjs(m + '-01').format('MMM YYYY');
