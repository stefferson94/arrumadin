import { supabase } from "./supabase.js";

export async function getIncomes() {
  const { data, error } = await supabase
    .from("monthly_incomes")
    .select("*");

  if (error) {
    console.error("Erro ao buscar rendas do Supabase:", error);
    return [];
  }
  return data || [];
}

export async function saveIncome(monthId, amount) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;

  const { error } = await supabase
    .from("monthly_incomes")
    .upsert({ user_id: user.id, month_id: monthId, amount }, { onConflict: "user_id, month_id" });

  return !error;
}

export async function deleteAllIncomes() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;

  const { error } = await supabase.from("monthly_incomes").delete().eq("user_id", user.id);
  return !error;
}