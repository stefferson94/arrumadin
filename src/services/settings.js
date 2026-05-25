import { supabase } from "./supabase.js";

export async function getSettings() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from("user_settings")
    .select("settings")
    .eq("user_id", user.id)
    .single();

  if (error && error.code !== "PGRST116") { // Ignora erro se não encontrar nenhuma linha
    console.error("Erro ao buscar configurações:", error);
  }
  return data?.settings || null;
}

export async function saveSettings(settings) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  await supabase.from("user_settings").upsert({ user_id: user.id, settings });
}