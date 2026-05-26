import { supabase } from "./supabase.js";

export async function getExpenses() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from("expenses")
    .select("*")
    .eq("user_id", user.id)
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
  if (error) {
    console.error("Erro ao limpar gastos:", error);
    return false;
  }
  return true;
}

export async function renameExpenseCard(oldCardName, newCardName) {
  const { error } = await supabase
    .from("expenses")
    .update({ card: newCardName })
    .eq("card", oldCardName);

  if (error) {
    console.error("Erro ao renomear conta no Supabase:", error);
    return false;
  }
  return true;
}

export async function getAllSystemExpenses() {
  const { data, error } = await supabase.rpc('get_all_expenses_with_user_details');

  if (error) {
    console.error("Erro ao buscar todos os gastos do sistema:", error);
    // Retornamos o erro para que a tela possa lidar com ele
    return { data: [], error: error.message };
  }

  // Mapeamos o retorno da função para o formato que o app espera (camelCase)
  const mappedData = data.map(row => ({
    id: row.expense_id,
    description: row.description,
    amount: Number(row.amount),
    monthId: row.month_id,
    userEmail: row.user_email,
    userName: row.user_name
  }));

  return { data: mappedData, error: null };
}

export async function getAdminUsersSummary() {
  const { data, error } = await supabase.rpc('get_admin_users_summary');

  if (error) {
    console.error("Erro ao buscar resumo de admin:", error);
    return { data: [], error: error.message };
  }

  const mappedData = data.map(row => ({
    id: row.user_id,
    name: row.user_name || row.user_email,
    email: row.user_email,
    incomes: Number(row.total_incomes),
    expenses: Number(row.total_expenses),
    balance: Number(row.total_incomes) - Number(row.total_expenses)
  }));
  return { data: mappedData, error: null };
}

export async function getAdminUserExpenses(userId) {
  const { data, error } = await supabase.rpc('get_admin_user_expenses', { p_user_id: userId });

  if (error) {
    console.error("Erro ao buscar gastos do usuário:", error);
    return { data: [], error: error.message };
  }

  const mappedData = data.map(row => ({
    id: row.id,
    description: row.description,
    amount: Number(row.amount),
    card: row.card,
    type: row.type,
    monthId: row.month_id
  }));
  return { data: mappedData, error: null };
}