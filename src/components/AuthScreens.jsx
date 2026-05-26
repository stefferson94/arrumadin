import { BrandIdentity } from "./BrandIdentity.jsx";

export function WelcomeScreen({ onStart }) {
  return (
    <main className="auth-screen welcome-screen">
      <section className="welcome-panel" aria-label="Boas-vindas">
        <BrandIdentity subtitle="" />

        <div className="welcome-grid">
          <div className="welcome-copy">
            <h1>Controle seus gastos com clareza desde o primeiro lancamento.</h1>
            <p>
              Organize contas, acompanhe meses, veja seu saldo e prepare seus dados para uma experiencia financeira mais inteligente.
            </p>
            <button className="primary-button welcome-action" type="button" onClick={onStart}>
              Comecar agora
            </button>
          </div>

          <div className="phone-preview" aria-hidden="true">
            <div className="phone-frame">
              <div className="phone-speaker" />
              <div className="phone-screen">
                <div className="preview-card preview-balance">
                  <span>Saldo previsto</span>
                  <strong>R$ 2.840,00</strong>
                  <small>+12% melhor que o mes anterior</small>
                </div>
                <div className="preview-row">
                  <div>
                    <span>Gastos</span>
                    <strong>R$ 860</strong>
                  </div>
                  <div>
                    <span>Contas</span>
                    <strong>6</strong>
                  </div>
                </div>
                <div className="preview-bars">
                  <span style={{ height: "46%" }} />
                  <span style={{ height: "64%" }} />
                  <span style={{ height: "38%" }} />
                  <span style={{ height: "78%" }} />
                  <span style={{ height: "54%" }} />
                </div>
                <div className="preview-footer">
                  <span>Alimentacao</span>
                  <strong>32%</strong>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
      <footer className="app-footer" style={{ marginTop: "auto", textAlign: "center", padding: "1.5rem", opacity: 0.8, fontSize: "0.85rem", display: "flex", flexDirection: "column", alignItems: "center", gap: "0.5rem" }}>
        <span>© 2026 arrumadin. Todos os direitos reservados.</span>
        <a href="https://instagram.com/steffersonluz" target="_blank" rel="noopener noreferrer" className="instagram-link" style={{ display: "inline-flex", alignItems: "center", gap: "0.3rem", color: "inherit", textDecoration: "none" }}>
          <svg className="instagram-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <rect x="2" y="2" width="20" height="20" rx="5" ry="5"/>
            <circle cx="12" cy="12" r="5"/>
            <circle cx="17.5" cy="6.5" r="1.5"/>
          </svg>
          steffersonluz
        </a>
      </footer>
    </main>
  );
}

export function LoginScreen({ mode, draft, error, notice, onChange, onModeChange, onSubmit, onBack }) {
  const isSignup = mode === "signup";
  const isRecover = mode === "recover";

  return (
    <main className="auth-screen login-screen">
      <section className="login-panel" aria-label="Login local">
        <BrandIdentity subtitle="" />

        <div className="login-copy">
          <h1>{isRecover ? "Recupere sua senha." : isSignup ? "Crie seu acesso financeiro." : "Entre no seu espaco financeiro."}</h1>
          <p>{isRecover ? "Informe seu e-mail abaixo para receber um link de redefinicao." : "Acesse sua conta para visualizar e gerenciar seus lancamentos na nuvem."}</p>
        </div>

        <div className="auth-mode-tabs" aria-label="Modo de acesso">
          <button className={mode === "signin" ? "active" : ""} type="button" onClick={() => onModeChange("signin")}>
            Entrar
          </button>
          <button className={isSignup ? "active" : ""} type="button" onClick={() => onModeChange("signup")}>
            Criar conta
          </button>
          <button className={isRecover ? "active" : ""} type="button" onClick={() => onModeChange("recover")}>
            Recuperar
          </button>
        </div>

        <form className="login-form" onSubmit={onSubmit}>
          {isSignup && (
            <label>
              Nome
              <input
                autoFocus
                value={draft.name}
                onChange={(event) => onChange("name", event.target.value)}
                placeholder="Seu nome"
              />
            </label>
          )}
          <label>
            E-mail
            <input
              autoFocus={!isSignup}
              inputMode="email"
              value={draft.email}
              onChange={(event) => onChange("email", event.target.value)}
              placeholder="voce@email.com"
            />
          </label>
          {isRecover && (
            <p style={{ fontSize: "0.85rem", color: "var(--text-color-light)", marginTop: "-0.5rem", marginBottom: "0.5rem", lineHeight: 1.4 }}>
              Um e-mail com um link seguro sera enviado para voce redefinir sua senha. Verifique tambem sua caixa de spam.
            </p>
          )}
          {!isRecover && (
            <label>
              Senha
              <input
                type="password"
                value={draft.password}
                onChange={(event) => onChange("password", event.target.value)}
                placeholder="Sua senha secreta"
              />
            </label>
          )}
          {isSignup && (
            <label>
              Confirmar senha
              <input
                type="password"
                value={draft.confirmPassword}
                onChange={(event) => onChange("confirmPassword", event.target.value)}
                placeholder="Repita a senha"
              />
            </label>
          )}

        {!isRecover && (
          <label className="remember-access">
            <input
              type="checkbox"
              checked={draft.remember}
              onChange={(event) => onChange("remember", event.target.checked)}
            />
            Manter conectado neste navegador
          </label>
        )}

        {error && <p className="form-error" style={{ animation: "smooth-fade-in 0.3s ease-out forwards" }}>{error}</p>}
        {notice && <p className="form-notice" style={{ color: "var(--positive-color)", fontSize: "0.9rem", marginTop: "0.5rem", textAlign: "center", animation: "smooth-fade-in 0.3s ease-out forwards" }}>{notice}</p>}

          <div className="login-actions">
          <button className="primary-button" type="submit">{isRecover ? "Enviar link" : isSignup ? "Criar conta" : "Entrar"}</button>
          <button className="ghost-button" type="button" onClick={isRecover ? () => onModeChange("signin") : onBack}>Voltar</button>
          </div>
        </form>
      </section>
      <footer className="app-footer" style={{ marginTop: "auto", textAlign: "center", padding: "1.5rem", opacity: 0.8, fontSize: "0.85rem", display: "flex", flexDirection: "column", alignItems: "center", gap: "0.5rem" }}>
        <span>© 2026 arrumadin. Todos os direitos reservados.</span>
        <a href="https://instagram.com/steffersonluz" target="_blank" rel="noopener noreferrer" className="instagram-link" style={{ display: "inline-flex", alignItems: "center", gap: "0.3rem", color: "inherit", textDecoration: "none" }}>
          <svg className="instagram-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <rect x="2" y="2" width="20" height="20" rx="5" ry="5"/>
            <circle cx="12" cy="12" r="5"/>
            <circle cx="17.5" cy="6.5" r="1.5"/>
          </svg>
          steffersonluz
        </a>
      </footer>
    </main>
  );
}
