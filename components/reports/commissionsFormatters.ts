export const formatNumber = (amount: number) => {
  if (!amount || isNaN(amount) || amount === Infinity || amount === -Infinity) {
    return '0';
  }
  const roundedAmount = Math.round(amount);
  return roundedAmount.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
};

export const formatCompact = (value: number) => {
  if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`;
  if (value >= 1000) return `$${(value / 1000).toFixed(0)}k`;
  return `$${value}`;
};
