export function getStartOfDay(d: Date | string | number): Date {
  const newDate = new Date(d);
  newDate.setHours(0, 0, 0, 0);
  return newDate;
}

export function getEndOfDay(d: Date | string | number): Date {
  const newDate = new Date(d);
  newDate.setHours(23, 59, 59, 999);
  return newDate;
}

export function getStartOfToday(): Date {
  return getStartOfDay(new Date());
}

export function getEndOfToday(): Date {
  return getEndOfDay(new Date());
}

export function getStartOfYesterday(): Date {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return getStartOfDay(d);
}

export function getEndOfYesterday(): Date {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return getEndOfDay(d);
}
