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
  if (!name || !name.trim()) {
    return { ok: false, message: "O nome é obrigatório para criar a conta." };
  }

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

export async function requestPasswordReset(email) {
  const normalizedEmail = String(email ?? "").trim();
  if (!normalizedEmail) {
    return { ok: false, message: "Informe o e-mail da conta para recuperar a senha." };
  }

  const { error } = await supabase.auth.resetPasswordForEmail(normalizedEmail, {
    redirectTo: window.location.origin
  });

  if (error) {
    // Intercepta a mensagem de segurança de tempo de espera do Supabase
    if (error.message.includes("For security purposes, you can only request this after")) {
      return { ok: false, message: "Aguarde cerca de um minuto antes de pedir um novo link." };
    }
    
    return { ok: false, message: error.message };
  }

  return { ok: true };
}

export async function logoutLocalAccount() {
  await supabase.auth.signOut();
}

export async function updateUserAccount(updates) {
  const updateData = {};

  if (updates.password) {
    updateData.password = updates.password;
  }
  if (updates.email) {
    updateData.email = updates.email;
  }
  if (updates.name) {
    updateData.data = { name: updates.name };
  }

  const { data, error } = await supabase.auth.updateUser(updateData);

  if (error) {
    return { ok: false, message: error.message };
  }

  const updatedUser = {
    id: data.user.id,
    name: data.user.user_metadata?.name || data.user.email,
    email: data.user.email
  };

  return { ok: true, user: updatedUser };
}
