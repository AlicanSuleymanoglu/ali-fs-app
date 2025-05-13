export const isEmpty = (value: any) => {
  return (
    value === undefined ||
    value === null ||
    !value ||
    (typeof value === 'object' && Object.keys(value).length === 0) ||
    (typeof value === 'string' && value.trim().length === 0)
  );
};

export const formatToLocaleNumber = (val: number) => {
  if (!val || isNaN(val)) {
    val = 0;
  }

  try {
    return val.toLocaleString('de-DE', {
      maximumFractionDigits: 4,
      minimumFractionDigits: 2,
    });
  } catch (e) {
    return val.toFixed(2).toLocaleString();
  }
};

export const keyBy = <T extends Record<string, any>>(arr: T[] = [], key = '') => {
  if (isEmpty(arr)) {
    return {};
  }

  return arr.reduce<Record<string, T>>((acc, next) => {
    acc[next[key] || next.id] = next;
    return acc;
  }, {});
};

export const isServer = () => typeof window === 'undefined';

export const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
