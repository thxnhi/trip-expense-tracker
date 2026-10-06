import Big from "big.js";

/** Plain decimal text stays unchanged until the database validates and stores it. */
export function moneyInputPattern(decimalPlaces: number): string {
  return decimalPlaces === 0
    ? "[0-9]+"
    : `[0-9]+([.][0-9]{1,${decimalPlaces}})?`;
}

export function moneyInputError(
  value: string,
  decimalPlaces: number,
  allowZero = false,
): string {
  // Empty fields are handled by native required validation while typing.
  if (!value) return "";
  if (!new RegExp(`^${moneyInputPattern(decimalPlaces)}$`).test(value))
    return decimalPlaces === 0
      ? "Nhập số nguyên, không dùng dấu phân cách hàng nghìn."
      : `Nhập số tiền với tối đa ${decimalPlaces} chữ số thập phân; dùng dấu chấm, không dùng dấu phân cách hàng nghìn.`;
  const amount = new Big(value);
  if (!allowZero && amount.eq(0)) return "Tổng tiền phải lớn hơn 0.";
  if (amount.gt("1000000000000"))
    return "Số tiền không được vượt quá 1.000.000.000.000.";
  return "";
}
