export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatAmountWords(amount: number): string {
  const ones = [
    "", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine",
    "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen",
    "Seventeen", "Eighteen", "Nineteen",
  ];
  const tens = [
    "", "", "Twenty", "Thirty", "Forty", "Fifty",
    "Sixty", "Seventy", "Eighty", "Ninety",
  ];

  if (amount === 0) return "Zero";

  function convertBelow1000(n: number): string {
    if (n < 20) return ones[n];
    if (n < 100) return tens[Math.floor(n / 10)] + (n % 10 ? " " + ones[n % 10] : "");
    return ones[Math.floor(n / 100)] + " Hundred" + (n % 100 ? " " + convertBelow1000(n % 100) : "");
  }

  let result = "";
  if (amount >= 10000000) {
    result += convertBelow1000(Math.floor(amount / 10000000)) + " Crore ";
    amount %= 10000000;
  }
  if (amount >= 100000) {
    result += convertBelow1000(Math.floor(amount / 100000)) + " Lakh ";
    amount %= 100000;
  }
  if (amount >= 1000) {
    result += convertBelow1000(Math.floor(amount / 1000)) + " Thousand ";
    amount %= 1000;
  }
  if (amount > 0) {
    result += convertBelow1000(amount);
  }

  return result.trim() + " Only";
}

export function truncate(str: string, length: number): string {
  return str.length > length ? str.slice(0, length) + "..." : str;
}
