export function normalizeCategory(group) {
  const text = String(group).toLowerCase();
  if (text.includes("casa")) return "Casa";
  if (text.includes("transporte") || text.includes("gasolina") || text.includes("uber")) return "Transporte";
  if (text.includes("lazer")) return "Lazer";
  if (text.includes("outro")) return "Outros";
  if (text.includes("banco")) return "Banco";
  return "Contas";
}

export function categoryTone(name) {
  const tones = {
    Contas: "teal",
    Casa: "amber",
    Outros: "coral",
    Banco: "ink",
    Transporte: "coral",
    Lazer: "amber"
  };

  return tones[name] ?? "teal";
}
