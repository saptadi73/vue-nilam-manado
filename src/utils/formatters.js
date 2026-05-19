export const fmtCurrency = (value) =>
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(value)

export const fmtNumber = (value) => new Intl.NumberFormat('id-ID').format(value)
