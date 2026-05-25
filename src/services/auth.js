import { supabase } from "./supabase.js";

export async function getCurrentSession() {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return null;
  return {
    id: session.user.id,
    name: session.user.user_metadata?.name || session.user.email,
    email: session.user.email
  };
}

export async function createLocalAccount({ name, email, password, confirmPassword }) {
  if (password !== confirmPassword) {
    return { ok: false, message: "As senhas não conferem." };
  }

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { name } }
  });

  if (error) return { ok: false, message: error.message };
  return { ok: true, user: { id: data.user.id, name, email: data.user.email } };
}

export async function loginLocalAccount({ email, password }) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password
  });

  if (error) {
    if (error.message === "Invalid login credentials") {
      return { ok: false, message: "E-mail ou senha incorretos." };
    }
    if (error.message === "Email not confirmed") {
      return { ok: false, message: "E-mail não confirmado. Verifique a caixa de entrada ou desative a opção no Supabase." };
    }
    return { ok: false, message: error.message };
  }
  return { ok: true, user: { id: data.user.id, name: data.user.user_metadata?.name || data.user.email, email: data.user.email } };
}

export async function logoutLocalAccount() {
  await supabase.auth.signOut();
}
