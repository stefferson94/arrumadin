export const DATA_RESET_VERSION = "empty-ledger-v1";

export function ensureDataReset() {
  if (localStorage.getItem("balanco-financeiro:reset-version") === DATA_RESET_VERSION) {
    return;
  }

  localStorage.removeItem("balanco-financeiro:gastos");
  localStorage.removeItem("balanco-financeiro:colunas-movidas");
  localStorage.removeItem("balanco-financeiro:ajustes-lancamentos");
  localStorage.setItem("balanco-financeiro:reset-version", DATA_RESET_VERSION);
}

export function persistExpenses(expenses, onError) {
  try {
    localStorage.setItem("balanco-financeiro:gastos", JSON.stringify(expenses));
    return true;
  } catch {
    onError?.("O Chrome bloqueou o armazenamento neste navegador. Verifique se o site esta em modo anonimo ou com armazenamento desativado.");
    return false;
  }
}

export function canUseExpenseStorage(onError) {
  const testKey = "balanco-financeiro:teste-storage";

  try {
    localStorage.setItem(testKey, "ok");
    localStorage.removeItem(testKey);
    return true;
  } catch {
    onError?.("O Chrome bloqueou o armazenamento neste navegador. Verifique se o site esta em modo anonimo ou com armazenamento desativado.");
    return false;
  }
}
