export const ORDER_CURRENCY = "INR";
export const MINOR_UNITS_PER_RUPEE = 100;

export function toMinorUnits(rupees: number) {
  return Math.round(rupees * MINOR_UNITS_PER_RUPEE);
}

export function formatMoney(minorUnits: number) {
  return (minorUnits / MINOR_UNITS_PER_RUPEE).toFixed(2);
}
