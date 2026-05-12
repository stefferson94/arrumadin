export const spreadsheetColumns = [
  "Mercado Pago",
  "Smiles Infinite",
  "Nubank",
  "Banco do Brasil",
  "OUTROS",
  "CONTAS DE CASA"
];

const monthLabels = [
  ["2026-01", "Janeiro 2026"],
  ["2026-02", "Fevereiro 2026"],
  ["2026-03", "Marco 2026"],
  ["2026-04", "Abril 2026"],
  ["2026-05", "Maio 2026"],
  ["2026-06", "Junho 2026"],
  ["2026-07", "Julho 2026"],
  ["2026-08", "Agosto 2026"],
  ["2026-09", "Setembro 2026"],
  ["2026-10", "Outubro 2026"],
  ["2026-11", "Novembro 2026"],
  ["2026-12", "Dezembro 2026"],
  ["2027-01", "Janeiro 2027"]
];

export const months = monthLabels.map(([id, label]) => ({
  id,
  label,
  income: 0,
  debt: 0,
  balance: 0,
  accounts: [],
  transactions: []
}));
