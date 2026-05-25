import { supabase } from "./supabase.js";

export async function getExpenses() {
  const { data, error } = await supabase
    .from("expenses")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Erro ao buscar gastos do Supabase:", error);
    return [];
  }

  // Mapeamos as colunas do banco (snake_case) para o formato que seu app já usa (camelCase)
  return data.map(row => ({
    id: row.id,
    description: row.description,
    amount: Number(row.amount),
    card: row.card,
    type: row.type,
    monthId: row.month_id,
    installments: row.installments,
    installmentNumber: row.installment_number,
    seriesId: row.series_id
  }));
}

export async function saveExpenses(expensesArray) {
  // Mapeamos do app para as colunas do banco (ignoramos o ID local para o banco gerar o UUID real)
  const rows = expensesArray.map(exp => ({
    description: exp.description,
    amount: exp.amount,
    card: exp.card,
    type: exp.type,
    month_id: exp.monthId,
    installments: exp.installments,
    installment_number: exp.installmentNumber,
    series_id: exp.seriesId
  }));

  const { data, error } = await supabase
    .from("expenses")
    .insert(rows)
    .select(); // Pede ao banco para retornar a linha inserida (com o UUID gerado)

  if (error) {
    console.error("Erro ao salvar no Supabase:", error);
    return { error: error.message, data: null };
  }

  // Convertemos o retorno de volta para o app para que a tela seja atualizada corretamente
  const formattedData = data.map(row => ({
    id: row.id,
    description: row.description,
    amount: Number(row.amount),
    card: row.card,
    type: row.type,
    monthId: row.month_id,
    installments: row.installments,
    installmentNumber: row.installment_number,
    seriesId: row.series_id
  }));

  return { error: null, data: formattedData };
}

export async function updateExpense(id, updatedData) {
  const row = {
    description: updatedData.description,
    amount: updatedData.amount,
    card: updatedData.card,
    type: updatedData.type,
    month_id: updatedData.monthId,
    installments: updatedData.installments,
    installment_number: updatedData.installmentNumber,
    series_id: updatedData.seriesId
  };

  const { data, error } = await supabase
    .from("expenses")
    .update(row)
    .eq("id", id)
    .select();

  if (error) {
    console.error("Erro ao atualizar no Supabase:", error);
    return { error: error.message, data: null };
  }

  const formattedData = data.map(row => ({
    id: row.id,
    description: row.description,
    amount: Number(row.amount),
    card: row.card,
    type: row.type,
    monthId: row.month_id,
    installments: row.installments,
    installmentNumber: row.installment_number,
    seriesId: row.series_id
  }));

  return { error: null, data: formattedData[0] };
}

export async function deleteExpense(id) {
  const { error } = await supabase.from("expenses").delete().eq("id", id);
  if (error) {
    console.error("Erro ao excluir no Supabase:", error);
    return false;
  }
  return true;
}

export async function deleteAllExpenses() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;

  const { error } = await supabase.from("expenses").delete().eq("user_id", user.id);
  return !error;
}