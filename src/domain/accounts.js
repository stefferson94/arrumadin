import { spreadsheetColumns } from "../data/financeData.js";

export const accountTypeOptions = [
  { value: "credit_card", label: "Cartao de Credito" },
  { value: "bank", label: "Banco" },
  { value: "other", label: "Outros" }
];

export function normalizeColumn(group, columns = spreadsheetColumns) {
  const text = String(group).toLowerCase();
  const fallbackIndex = text.includes("mercado pago")
    ? 0
    : text.includes("smiles")
      ? 1
      : text.includes("nubank")
        ? 2
        : text.includes("banco")
          ? 3
          : text.includes("casa")
            ? 5
            : 4;

  return columns[fallbackIndex] ?? columns[0] ?? spreadsheetColumns[0];
}

export function defaultAccountType(accountName) {
  const text = String(accountName).toLowerCase();

  if (text.includes("mercado pago") || text.includes("smiles") || text.includes("nubank")) {
    return "credit_card";
  }

  if (text.includes("banco")) {
    return "bank";
  }

  return "other";
}

export function normalizeAccountType(type) {
  if (type === "bank_account") return "bank";
  if (type === "expense_group") return "other";
  if (type === "credit_card" || type === "bank" || type === "other") return type;
  return "other";
}

export function accountTypeLabel(type) {
  return accountTypeOptions.find((option) => option.value === normalizeAccountType(type))?.label ?? "Outros";
}

export function renameMapValues(map, oldName, nextName) {
  return Object.fromEntries(
    Object.entries(map).map(([key, value]) => [key, value === oldName ? nextName : value])
  );
}

export function columnClass(column, columns = spreadsheetColumns) {
  const classes = ["col-mercado", "col-smiles", "col-nubank", "col-bb", "col-outros", "col-casa"];
  const index = columns.indexOf(column);

  return classes[index] ?? "";
}

export function defaultColumnColor(column, columns = spreadsheetColumns) {
  const colors = ["#dff2f8", "#eeeeed", "#eee8f7", "#fbf7d9", "#eeeeee", "#e8f2f8"];
  const index = columns.indexOf(column);

  return colors[index] ?? "#eef2ee";
}

export function columnHeaderStyle(color, isActive = false) {
  if (!color) return undefined;

  const topColor = isActive ? shadeHexColor(color, 18) : shadeHexColor(color, 32);
  const bottomColor = isActive ? shadeHexColor(color, -12) : color;

  return {
    background: `linear-gradient(145deg, ${topColor} 0%, ${bottomColor} 100%)`,
    color: readableTextColor(bottomColor)
  };
}

function shadeHexColor(hex, percent) {
  const normalized = hex.replace("#", "");
  const value = Number.parseInt(normalized, 16);
  const amount = Math.round(2.55 * percent);
  const red = clampColor((value >> 16) + amount);
  const green = clampColor(((value >> 8) & 0xff) + amount);
  const blue = clampColor((value & 0xff) + amount);

  return `#${((1 << 24) + (red << 16) + (green << 8) + blue).toString(16).slice(1)}`;
}

function clampColor(value) {
  return Math.max(0, Math.min(255, value));
}

function readableTextColor(hex) {
  const normalized = hex.replace("#", "");
  const value = Number.parseInt(normalized, 16);
  const red = value >> 16;
  const green = (value >> 8) & 0xff;
  const blue = value & 0xff;
  const brightness = (red * 299 + green * 587 + blue * 114) / 1000;

  return brightness > 150 ? "#1f2623" : "#ffffff";
}
