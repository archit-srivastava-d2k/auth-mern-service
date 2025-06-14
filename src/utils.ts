export const calculatePriceWithTax = (price: number, taxPercentage: number) => {
  const taxAmount = (price * taxPercentage) / 100;
  return price + taxAmount + "$";
};
