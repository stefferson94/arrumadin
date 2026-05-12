import { useEffect, useMemo, useRef, useState } from "react";
import { months, spreadsheetColumns } from "./data/financeData.js";

const brl = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL"
});

const DATA_RESET_VERSION = "empty-ledger-v1";

const navigationItems = [
  { id: "dashboard", label: "Dashboard", icon: "◼" },
  { id: "lancamentos", label: "Lancamentos", icon: "＋" },
  { id: "cartoes", label: "Cartoes", icon: "▤" },
  { id: "relatorios", label: "Relatorios", icon: "◒" }
];

const transactionTypeOptions = [
  { value: "single", label: "Unico", icon: "−", hint: "Gasto deste mes" },
  { value: "installment", label: "Parcelado", icon: "÷", hint: "Divide nos meses" },
  { value: "fixed", label: "Fixo", icon: "↻", hint: "Repete todo mes" },
  { value: "adjustment", label: "Estorno", icon: "+", hint: "Credito no cartao" }
];

function ensureDataReset() {
  if (localStorage.getItem("balanco-financeiro:reset-version") === DATA_RESET_VERSION) {
    return;
  }

  localStorage.removeItem("balanco-financeiro:gastos");
  localStorage.removeItem("balanco-financeiro:colunas-movidas");
  localStorage.removeItem("balanco-financeiro:ajustes-lancamentos");
  localStorage.setItem("balanco-financeiro:reset-version", DATA_RESET_VERSION);
}

function formatMoney(value) {
  return brl.format(value);
}

function creationMessage(type, count) {
  if (count <= 1) {
    return type === "adjustment" ? "Estorno criado." : "Lancamento criado.";
  }

  if (type === "installment") {
    return `${count} parcelas criadas. Use o seletor de mes acima para acompanhar as proximas parcelas.`;
  }

  if (type === "fixed") {
    return `${count} lancamentos fixos criados. Eles foram repetidos nos meses configurados.`;
  }

  return `${count} lancamentos criados.`;
}

function Icon({ children }) {
  return <span className="icon" aria-hidden="true">{children}</span>;
}

function MetricCard({ label, value, kind, helper }) {
  return (
    <article className={`metric metric-${kind}`}>
      <span>{label}</span>
      <strong>{formatMoney(value)}</strong>
      <small>{helper}</small>
    </article>
  );
}

function EditableMetricCard({ label, value, kind, helper, isEditing, draftValue, onStartEdit, onChange, onSave }) {
  return (
    <article className={`metric metric-${kind} editable-metric`}>
      <div className="metric-title-row">
        <span>{label}</span>
      </div>
      {isEditing ? (
        <form id="income-edit-form" className="metric-inline-edit" onSubmit={onSave}>
          <input
            aria-label="Rendimento liquido"
            inputMode="decimal"
            value={draftValue}
            onChange={(event) => onChange(event.target.value)}
            onBlur={onSave}
            autoFocus
          />
        </form>
      ) : (
        <>
          <strong role="button" tabIndex={0} onClick={onStartEdit} onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ") onStartEdit();
          }}>
            {formatMoney(value)}
          </strong>
          <small>{helper}</small>
        </>
      )}
      {isEditing && <small>{helper}</small>}
    </article>
  );
}

function App() {
  const [activeView, setActiveView] = useState("lancamentos");
  const [activeMonthId, setActiveMonthId] = useState(() => {
    const savedMonthId = localStorage.getItem("balanco-financeiro:mes-ativo");
    return months.some((month) => month.id === savedMonthId) ? savedMonthId : "2026-05";
  });
  const [lastCreatedCount, setLastCreatedCount] = useState(0);
  const [lastCreatedType, setLastCreatedType] = useState("");
  const [editingTransaction, setEditingTransaction] = useState(null);
  const [editingColumnName, setEditingColumnName] = useState(null);
  const [editingIncome, setEditingIncome] = useState(false);
  const [incomeDraft, setIncomeDraft] = useState("");
  const quickEntryRef = useRef(null);
  const [formError, setFormError] = useState("");
  const [collapsedColumns, setCollapsedColumns] = useState({});
  const [isMobileLedger, setIsMobileLedger] = useState(() =>
    typeof window === "undefined" ? false : window.matchMedia("(max-width: 720px)").matches
  );
  const [savedExpenses, setSavedExpenses] = useState(() => {
    try {
      ensureDataReset();
      return JSON.parse(localStorage.getItem("balanco-financeiro:gastos")) ?? [];
    } catch {
      return [];
    }
  });
  const [movedColumns, setMovedColumns] = useState(() => {
    try {
      ensureDataReset();
      return JSON.parse(localStorage.getItem("balanco-financeiro:colunas-movidas")) ?? {};
    } catch {
      return {};
    }
  });
  const [ledgerOverrides, setLedgerOverrides] = useState(() => {
    try {
      ensureDataReset();
      return JSON.parse(localStorage.getItem("balanco-financeiro:ajustes-lancamentos")) ?? {};
    } catch {
      return {};
    }
  });
  const [accountColumns, setAccountColumns] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("balanco-financeiro:colunas-contas")) ?? spreadsheetColumns;
    } catch {
      return spreadsheetColumns;
    }
  });
  const [accountColors, setAccountColors] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("balanco-financeiro:cores-contas")) ?? {};
    } catch {
      return {};
    }
  });
  const [monthlyIncome, setMonthlyIncome] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("balanco-financeiro:rendimentos")) ?? {};
    } catch {
      return {};
    }
  });
  const [form, setForm] = useState({
    type: "single",
    description: "",
    amount: "",
    card: "Nubank",
    installments: "2",
    startInstallment: "1",
    repeatMonths: ""
  });

  const activeMonth = months.find((month) => month.id === activeMonthId) ?? months.at(-1);
  const activeMonthIndex = months.findIndex((month) => month.id === activeMonth.id);
  const activeIncome = monthlyIncome[activeMonth.id] ?? activeMonth.income;
  const monthExpenses = savedExpenses.filter((expense) => expense.monthId === activeMonth.id);
  const allTransactions = [
    ...monthExpenses.map((expense, index) => {
      const dragId = `saved:${expense.id}`;
      const override = ledgerOverrides[dragId] ?? {};
      const movedColumn = override.column ?? movedColumns[dragId];

      if (override.deleted) return null;

      return {
        ...expense,
        dragId,
        description: override.description ?? expense.description,
        amount: override.amount ?? expense.amount,
        ledgerType: override.type ?? normalizeLedgerType(expense.type),
        ledgerOrder: override.order ?? index,
        card: movedColumn ?? expense.card,
        group: movedColumn ?? expense.group
      };
    }),
    ...activeMonth.transactions.map((transaction, index) => {
      const dragId = `imported:${activeMonth.id}:${index}`;
      const override = ledgerOverrides[dragId] ?? {};
      const movedColumn = override.column ?? movedColumns[dragId];

      if (override.deleted) return null;

      return {
        ...transaction,
        dragId,
        description: override.description ?? transaction.description,
        amount: override.amount ?? transaction.amount,
        ledgerType: override.type ?? normalizeLedgerType(transaction.type),
        ledgerOrder: override.order ?? index + 1000,
        card: movedColumn ?? transaction.card,
        group: movedColumn ?? transaction.group
      };
    })
  ].filter(Boolean);
  const newExpensesTotal = monthExpenses.reduce((sum, expense) => sum + expense.amount, 0);
  const adjustedDebt = activeMonth.debt + newExpensesTotal;
  const adjustedBalance = activeIncome - adjustedDebt;

  const categoryTotals = useMemo(() => {
    const totals = allTransactions.reduce((map, transaction) => {
      const name = normalizeCategory(transaction.group);
      map.set(name, (map.get(name) ?? 0) + Math.max(transaction.amount, 0));
      return map;
    }, new Map());

    return Array.from(totals, ([name, value]) => ({
      name,
      value,
      tone: categoryTone(name)
    })).sort((a, b) => b.value - a.value);
  }, [allTransactions]);

  const transactionsByColumn = useMemo(() => {
    const grouped = Object.fromEntries(accountColumns.map((column) => [column, []]));

    allTransactions.forEach((transaction) => {
      const column = accountColumns.includes(transaction.card)
        ? transaction.card
        : accountColumns.includes(transaction.group)
          ? transaction.group
          : normalizeColumn(transaction.group, accountColumns);

      if (grouped[column]) {
        grouped[column].push(transaction);
      }
    });

    return grouped;
  }, [accountColumns, allTransactions]);

  const accountSummaries = useMemo(() => {
    return accountColumns.map((column) => {
      const transactions = transactionsByColumn[column] ?? [];
      const total = transactions.reduce((sum, transaction) => sum + transaction.amount, 0);
      const fixedTotal = transactions
        .filter((transaction) => transaction.ledgerType === "fixed")
        .reduce((sum, transaction) => sum + transaction.amount, 0);
      const installmentTotal = transactions
        .filter((transaction) => transaction.ledgerType === "installment")
        .reduce((sum, transaction) => sum + transaction.amount, 0);

      return {
        name: column,
        amount: total,
        fixedTotal,
        installmentTotal,
        count: transactions.length
      };
    });
  }, [accountColumns, transactionsByColumn]);

  const totalAccounts = useMemo(
    () => accountSummaries.reduce((sum, account) => sum + Math.max(account.amount, 0), 0),
    [accountSummaries]
  );

  useEffect(() => {
    persistExpenses(savedExpenses);
  }, [savedExpenses]);

  useEffect(() => {
    const completedExpenses = completeMissingInstallments(savedExpenses);
    if (completedExpenses.length !== savedExpenses.length) {
      setSavedExpenses(completedExpenses);
    }
  }, [savedExpenses]);

  useEffect(() => {
    localStorage.setItem("balanco-financeiro:colunas-movidas", JSON.stringify(movedColumns));
  }, [movedColumns]);

  useEffect(() => {
    localStorage.setItem("balanco-financeiro:ajustes-lancamentos", JSON.stringify(ledgerOverrides));
  }, [ledgerOverrides]);

  useEffect(() => {
    localStorage.setItem("balanco-financeiro:colunas-contas", JSON.stringify(accountColumns));
  }, [accountColumns]);

  useEffect(() => {
    localStorage.setItem("balanco-financeiro:cores-contas", JSON.stringify(accountColors));
  }, [accountColors]);

  useEffect(() => {
    localStorage.setItem("balanco-financeiro:rendimentos", JSON.stringify(monthlyIncome));
  }, [monthlyIncome]);

  useEffect(() => {
    localStorage.setItem("balanco-financeiro:mes-ativo", activeMonth.id);
  }, [activeMonth.id]);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(max-width: 720px)");
    const handleChange = (event) => setIsMobileLedger(event.matches);

    setIsMobileLedger(mediaQuery.matches);
    mediaQuery.addEventListener?.("change", handleChange);

    return () => mediaQuery.removeEventListener?.("change", handleChange);
  }, []);

  const maxCategory = Math.max(...categoryTotals.map((category) => category.value), 1);
  const maxAccount = Math.max(...accountSummaries.map((account) => Math.abs(account.amount)), 1);
  const filledAccounts = accountSummaries.filter((account) => account.count > 0).length;

  function clearCreationFeedback() {
    setLastCreatedCount(0);
    setLastCreatedType("");
  }

  function updateForm(field, value) {
    clearCreationFeedback();
    setForm((current) => ({ ...current, [field]: value }));
    if (formError) {
      setFormError("");
    }
  }

  function handleAddExpense(event) {
    event?.preventDefault?.();

    const parsedAmount = parseCurrencyInput(form.amount);
    if (!form.description.trim()) {
      setFormError("Informe a descricao do gasto.");
      return;
    }

    if (Number.isNaN(parsedAmount)) {
      setFormError("Informe um valor valido.");
      return;
    }

    const amount = normalizeAmountForType(form.type, parsedAmount);
    const selectedCard = accountColumns.includes(form.card) ? form.card : accountColumns[0];

    if (!selectedCard) {
      setFormError("Crie uma coluna antes de salvar o gasto.");
      return;
    }

    const formToSave = {
      ...form,
      card: selectedCard
    };
    const generatedExpenses = buildExpensesFromForm({ form: formToSave, activeMonth, amount });

    if (!canUseExpenseStorage(setFormError)) {
      return;
    }

    setSavedExpenses((current) => {
      const nextExpenses = [...generatedExpenses, ...current];
      persistExpenses(nextExpenses);
      return nextExpenses;
    });
    setLastCreatedCount(generatedExpenses.length);
    setLastCreatedType(formToSave.type);
    setFormError("");
    setForm((current) => ({
      ...current,
      card: selectedCard,
      description: "",
      amount: ""
    }));
  }

  function handleSaveExpenseTouch(event) {
    event.preventDefault();
    handleAddExpense(event);
  }

  function toggleLedgerColumn(column) {
    clearCreationFeedback();
    setCollapsedColumns((current) => {
      const currentlyCollapsed = current[column] ?? (transactionsByColumn[column] ?? []).length === 0;

      if (!isMobileLedger) {
        return {
          ...current,
          [column]: !currentlyCollapsed
        };
      }

      if (!currentlyCollapsed) {
        return {
          ...current,
          [column]: true
        };
      }

      return Object.fromEntries(accountColumns.map((accountColumn) => [accountColumn, accountColumn !== column]));
    });
  }

  function focusQuickEntry() {
    setActiveView("lancamentos");
    window.setTimeout(() => {
      quickEntryRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      quickEntryRef.current?.querySelector("input")?.focus({ preventScroll: true });
    }, 0);
  }

  function removeExpense(expenseId) {
    setSavedExpenses((current) => current.filter((expense) => expense.id !== expenseId));
    setMovedColumns((current) => {
      const next = { ...current };
      delete next[`saved:${expenseId}`];
      return next;
    });
    setLedgerOverrides((current) => {
      const next = { ...current };
      delete next[`saved:${expenseId}`];
      return next;
    });
  }

  function deleteTransaction(transaction) {
    clearCreationFeedback();
    if (transaction.ledgerType === "installment") {
      deleteInstallmentSeries(transaction);
      return;
    }

    if (transaction.ledgerType === "fixed") {
      deleteFixedSeries(transaction);
      return;
    }

    if (transaction.dragId.startsWith("saved:")) {
      removeExpense(transaction.dragId.replace("saved:", ""));
      return;
    }

    setLedgerOverrides((current) => ({
      ...current,
      [transaction.dragId]: {
        ...(current[transaction.dragId] ?? {}),
        deleted: true
      }
    }));
  }

  function deleteInstallmentSeries(transaction) {
    const info = getInstallmentInfo(transaction);
    const base = info?.base;

    setSavedExpenses((current) =>
      current.filter((expense) => {
        if (transaction.seriesId && expense.seriesId === transaction.seriesId) return false;
        if (!base || expense.type !== "installment") return true;

        const expenseInfo = parseInstallmentDescription(expense.description);
        return !(expenseInfo?.base === base && expense.card === transaction.card && expense.amount === transaction.amount);
      })
    );

    setLedgerOverrides((current) => {
      const next = { ...current };

      allTransactions.forEach((item) => {
        if (item.dragId.startsWith("saved:")) {
          if (transaction.seriesId && item.seriesId === transaction.seriesId) {
            delete next[item.dragId];
          }
          return;
        }

        const itemInfo = getInstallmentInfo(item);
        const sameSeries = transaction.seriesId && item.seriesId === transaction.seriesId;
        const sameLegacySeries = base && itemInfo?.base === base && item.card === transaction.card && item.amount === transaction.amount;

        if (sameSeries || sameLegacySeries) {
          next[item.dragId] = {
            ...(next[item.dragId] ?? {}),
            deleted: true
          };
        }
      });

      return next;
    });
  }

  function deleteFixedSeries(transaction) {
    setSavedExpenses((current) =>
      current.filter((expense) => {
        if (transaction.seriesId && expense.seriesId === transaction.seriesId) return false;
        return !(
          expense.type === "fixed" &&
          expense.description === transaction.description &&
          expense.card === transaction.card &&
          expense.amount === transaction.amount
        );
      })
    );

    setLedgerOverrides((current) => {
      const next = { ...current };

      allTransactions.forEach((item) => {
        const sameSeries = transaction.seriesId && item.seriesId === transaction.seriesId;
        const sameLegacySeries =
          item.ledgerType === "fixed" &&
          item.description === transaction.description &&
          item.card === transaction.card &&
          item.amount === transaction.amount;

        if (item.dragId.startsWith("saved:")) {
          if (sameSeries || sameLegacySeries) {
            delete next[item.dragId];
          }
          return;
        }

        if (sameSeries || sameLegacySeries) {
          next[item.dragId] = {
            ...(next[item.dragId] ?? {}),
            deleted: true
          };
        }
      });

      return next;
    });
  }

  function openEditTransaction(transaction) {
    clearCreationFeedback();
    const info = getInstallmentInfo(transaction);

    setEditingTransaction({
      dragId: transaction.dragId,
      source: transaction,
      type: transaction.ledgerType ?? "single",
      description: info?.base ?? transaction.description,
      amount: String(transaction.amount).replace(".", ","),
      card: transaction.card ?? normalizeColumn(transaction.group),
      installments: String(info?.total ?? 2),
      startInstallment: String(info?.current ?? 1),
      repeatMonths: ""
    });
  }

  function updateEditingForm(field, value) {
    setEditingTransaction((current) => ({ ...current, [field]: value }));
  }

  function saveEditedTransaction(event) {
    event.preventDefault();
    if (!editingTransaction) return;

    const parsedAmount = Number.parseFloat(editingTransaction.amount.replace(",", "."));
    if (!editingTransaction.description.trim() || Number.isNaN(parsedAmount)) return;
    const amount = normalizeAmountForType(editingTransaction.type, parsedAmount);

    if (editingTransaction.dragId.startsWith("saved:")) {
      const expenseId = editingTransaction.dragId.replace("saved:", "");
      setSavedExpenses((current) =>
        current.map((expense) =>
          expense.id === expenseId
            ? {
                ...expense,
                type: editingTransaction.type,
                description: editingTransaction.description.trim(),
                amount,
                card: editingTransaction.card,
                group: editingTransaction.card,
                installmentNumber: editingTransaction.type === "installment"
                  ? clampInteger(editingTransaction.startInstallment, 1, clampInteger(editingTransaction.installments, 1, 48))
                  : undefined,
                installments: editingTransaction.type === "installment"
                  ? clampInteger(editingTransaction.installments, 1, 48)
                  : undefined
              }
            : expense
        )
      );
    } else {
      setLedgerOverrides((current) => ({
        ...current,
        [editingTransaction.dragId]: {
          ...(current[editingTransaction.dragId] ?? {}),
          type: normalizeLedgerType(editingTransaction.type),
          description: editingTransaction.description.trim(),
          amount,
          column: editingTransaction.card
        }
      }));
      setMovedColumns((current) => ({ ...current, [editingTransaction.dragId]: editingTransaction.card }));
    }

    clearCreationFeedback();
    setEditingTransaction(null);
  }

  function goToRelativeMonth(offset) {
    const nextMonth = months[activeMonthIndex + offset];
    if (nextMonth) {
      clearCreationFeedback();
      setActiveMonthId(nextMonth.id);
    }
  }

  function clearTestData() {
    const confirmed = window.confirm("Limpar todos os gastos, ajustes e movimentacoes salvos neste navegador?");
    if (!confirmed) return;

    localStorage.removeItem("balanco-financeiro:gastos");
    localStorage.removeItem("balanco-financeiro:colunas-movidas");
    localStorage.removeItem("balanco-financeiro:ajustes-lancamentos");
    localStorage.removeItem("balanco-financeiro:rendimentos");
    localStorage.setItem("balanco-financeiro:reset-version", DATA_RESET_VERSION);

    setSavedExpenses([]);
    setMovedColumns({});
    setLedgerOverrides({});
    setMonthlyIncome({});
    setLastCreatedCount(0);
    setLastCreatedType("");
    setEditingTransaction(null);
    setEditingIncome(false);
    setIncomeDraft("");
  }

  function startEditingIncome() {
    const currentValue = monthlyIncome[activeMonth.id] ?? activeMonth.income;
    setIncomeDraft(String(currentValue).replace(".", ","));
    setEditingIncome(true);
  }

  function saveMonthlyIncome(event) {
    event?.preventDefault?.();
    const parsedValue = Number.parseFloat(incomeDraft.replace(",", "."));
    if (Number.isNaN(parsedValue)) {
      setIncomeDraft(String(activeIncome).replace(".", ","));
      setEditingIncome(false);
      return;
    }

    setMonthlyIncome((current) => ({
      ...current,
      [activeMonth.id]: parsedValue
    }));
    setEditingIncome(false);
    setIncomeDraft("");
  }

  function renameAccountColumn(oldName, rawNextName) {
    const nextName = rawNextName.trim();
    if (!nextName || nextName === oldName) return;
    if (accountColumns.includes(nextName)) {
      window.alert("Ja existe uma coluna com esse nome.");
      return;
    }

    setAccountColumns((current) => current.map((column) => (column === oldName ? nextName : column)));
    setSavedExpenses((current) =>
      current.map((expense) =>
        expense.card === oldName || expense.group === oldName
          ? { ...expense, card: nextName, group: nextName }
          : expense
      )
    );
    setMovedColumns((current) => renameMapValues(current, oldName, nextName));
    setLedgerOverrides((current) => {
      const next = {};

      Object.entries(current).forEach(([key, override]) => {
        next[key] = {
          ...override,
          column: override.column === oldName ? nextName : override.column
        };
      });

      return next;
    });
    setAccountColors((current) => {
      if (!current[oldName]) return current;
      const next = { ...current, [nextName]: current[oldName] };
      delete next[oldName];
      return next;
    });
    setForm((current) => ({
      ...current,
      card: current.card === oldName ? nextName : current.card
    }));
    setEditingTransaction((current) =>
      current
        ? {
            ...current,
            card: current.card === oldName ? nextName : current.card
          }
        : current
    );
  }

  function commitColumnName(oldName, rawNextName) {
    renameAccountColumn(oldName, rawNextName);
    setEditingColumnName(null);
  }

  function addAccountColumn() {
    const newName = window.prompt("Nome da nova categoria/cartao/conta:")?.trim();
    if (!newName) return;
    if (accountColumns.includes(newName)) {
      window.alert("Ja existe uma coluna com esse nome.");
      return;
    }

    setAccountColumns((current) => [...current, newName]);
    setForm((current) => ({ ...current, card: newName }));
  }

  function updateAccountColor(columnName, color) {
    setAccountColors((current) => ({
      ...current,
      [columnName]: color
    }));
  }

  function deleteAccountColumn(columnName) {
    if (accountColumns.length <= 1) {
      window.alert("Mantenha pelo menos uma coluna.");
      return;
    }

    const hasTransactions = (transactionsByColumn[columnName] ?? []).length > 0;
    const message = hasTransactions
      ? `Excluir a coluna "${columnName}" e todos os lançamentos nela?`
      : `Excluir a coluna "${columnName}"?`;
    const confirmed = window.confirm(message);
    if (!confirmed) return;

    const fallbackColumn = accountColumns.find((column) => column !== columnName) ?? spreadsheetColumns[0];

    setAccountColumns((current) => current.filter((column) => column !== columnName));
    setSavedExpenses((current) => current.filter((expense) => expense.card !== columnName && expense.group !== columnName));
    setMovedColumns((current) => {
      const next = {};
      Object.entries(current).forEach(([key, value]) => {
        if (value !== columnName) next[key] = value;
      });
      return next;
    });
    setLedgerOverrides((current) => {
      const next = { ...current };

      allTransactions.forEach((transaction) => {
        if (transaction.card === columnName || transaction.group === columnName) {
          if (transaction.dragId.startsWith("saved:")) {
            delete next[transaction.dragId];
          } else {
            next[transaction.dragId] = {
              ...(next[transaction.dragId] ?? {}),
              deleted: true
            };
          }
        }
      });

      Object.entries(next).forEach(([key, override]) => {
        if (override.column === columnName) delete next[key];
      });

      return next;
    });
    setAccountColors((current) => {
      const next = { ...current };
      delete next[columnName];
      return next;
    });
    setForm((current) => ({
      ...current,
      card: current.card === columnName ? fallbackColumn : current.card
    }));
    setEditingTransaction((current) =>
      current
        ? {
            ...current,
            card: current.card === columnName ? fallbackColumn : current.card
          }
        : current
    );
  }

  return (
    <main className="app-shell">
      <aside className="sidebar" aria-label="Navegacao principal">
        <div className="brand">
          <div className="brand-mark">BF</div>
          <div>
            <strong>Balanco Financeiro</strong>
            <span>Controle pessoal</span>
          </div>
        </div>

        <nav className="nav-list" aria-label="Secoes">
          {navigationItems.map((item) => (
            <button
              className={`nav-item ${activeView === item.id ? "active" : ""}`}
              key={item.id}
              type="button"
              onClick={() => setActiveView(item.id)}
            >
              <Icon>{item.icon}</Icon> {item.label}
            </button>
          ))}
        </nav>

          <div className="sidebar-panel">
            <span>Situacao do mes</span>
          <strong>{adjustedBalance >= 0 ? "Sob controle" : "Ajustar gastos"}</strong>
          <div className="mini-progress">
            <span style={{ width: `${Math.min(activeIncome ? (adjustedDebt / activeIncome) * 100 : 0, 100)}%` }} />
          </div>
        </div>
      </aside>

      <section className="content">
        <header className="topbar">
          <div className="month-control" aria-label="Selecionar mes">
            <button className="ghost-button" type="button" onClick={() => goToRelativeMonth(-1)} disabled={activeMonthIndex <= 0}>
              ‹
            </button>
            <select value={activeMonthId} onChange={(event) => {
              clearCreationFeedback();
              setActiveMonthId(event.target.value);
            }}>
              {months.map((month) => (
                <option key={month.id} value={month.id}>{month.label}</option>
              ))}
            </select>
            <button className="ghost-button" type="button" onClick={() => goToRelativeMonth(1)} disabled={activeMonthIndex >= months.length - 1}>
              ›
            </button>
          </div>
          <div className="top-actions">
            <button className="primary-button" type="button" onClick={focusQuickEntry}><Icon>＋</Icon> Adicionar gasto</button>
            <button className="danger-button" type="button" onClick={clearTestData}>Limpar testes</button>
          </div>
        </header>

        {(activeView === "dashboard" || activeView === "lancamentos") && (
          <section className="metrics-grid" aria-label="Resumo financeiro">
            <EditableMetricCard
              label="Rendimentos"
              value={activeIncome}
              kind="income"
              helper="Liquido do mes"
              isEditing={editingIncome}
              draftValue={incomeDraft}
              onStartEdit={startEditingIncome}
              onChange={setIncomeDraft}
              onSave={saveMonthlyIncome}
            />
            <MetricCard label="Gastos do mes" value={adjustedDebt} kind="debt" helper={`${allTransactions.length} lancamentos no mes`} />
            <MetricCard label="Saldo" value={adjustedBalance} kind={adjustedBalance >= 0 ? "income" : "danger"} helper={`${filledAccounts}/${accountColumns.length} colunas com lancamentos`} />
          </section>
        )}

        {activeView === "lancamentos" && (
          <>
            <section className="entry-section">
              <aside className="panel quick-entry" ref={quickEntryRef}>
                <div className="panel-heading compact">
                  <h2>Adicionar gasto</h2>
                </div>
                <form onSubmit={handleAddExpense} noValidate>
                  <div className="type-selector operation-selector" aria-label="Tipo de lancamento">
                    {transactionTypeOptions.map((option) => (
                      <button
                        className={`${form.type === option.value ? "active" : ""} ${option.value === "adjustment" ? "refund-type" : ""}`}
                        key={option.value}
                        type="button"
                        onClick={() => updateForm("type", option.value)}
                      >
                        <span className="operation-icon" aria-hidden="true">{option.icon}</span>
                        <span className="operation-copy">
                          <strong>{option.label}</strong>
                          <small>{option.hint}</small>
                        </span>
                      </button>
                    ))}
                  </div>
                  <label>
                    Descricao do gasto
                    <input
                      name="description"
                      placeholder="Ex.: Mercado, gasolina, remedio"
                      value={form.description}
                      onChange={(event) => updateForm("description", event.target.value)}
                    />
                  </label>
                  <label>
                    Cartao ou conta
                    <select value={form.card} onChange={(event) => updateForm("card", event.target.value)}>
                      {accountColumns.map((column) => (
                        <option key={column}>{column}</option>
                      ))}
                    </select>
                  </label>
                  <div className="form-row">
                    <label>
                      Valor
                      <input
                        name="amount"
                        inputMode="decimal"
                        enterKeyHint="done"
                        placeholder="R$ 0,00"
                        value={form.amount}
                        onChange={(event) => updateForm("amount", event.target.value)}
                      />
                    </label>
                  </div>
                  {form.type === "installment" && (
                    <div className="form-row">
                      <label>
                        Parcelas
                        <input
                          inputMode="numeric"
                          placeholder="Ex.: 10"
                          value={form.installments}
                          onChange={(event) => updateForm("installments", event.target.value)}
                        />
                      </label>
                      <label>
                        Parcela inicial
                        <input
                          inputMode="numeric"
                          placeholder="Ex.: 1"
                          value={form.startInstallment}
                          onChange={(event) => updateForm("startInstallment", event.target.value)}
                        />
                      </label>
                    </div>
                  )}
                  {form.type === "fixed" && (
                    <label>
                      Repetir por quantos meses
                      <input
                        inputMode="numeric"
                        placeholder="Em branco = todos os meses"
                        value={form.repeatMonths}
                        onChange={(event) => updateForm("repeatMonths", event.target.value)}
                      />
                    </label>
                  )}
                  <button className="save-entry-button" type="submit" onTouchEnd={handleSaveExpenseTouch}>
                    <span aria-hidden="true">✓</span>
                    Incluir
                  </button>
                  {formError && <small className="form-error">{formError}</small>}
                  {lastCreatedCount > 0 && !formError && (
                    <small className="creation-note">
                      {creationMessage(lastCreatedType, lastCreatedCount)}
                    </small>
                  )}
                  <small className="storage-note">Salvo neste navegador em localStorage.</small>
                </form>
              </aside>
            </section>

        <section className="ledger-flow">
          <article className="panel ledger-panel">
            <div className="panel-heading">
              <div>
                <span className="eyebrow">Planilha do mes</span>
                <h2>Lancamentos por cartao ou conta</h2>
              </div>
              <div className="panel-actions">
                <button className="ghost-button" type="button" onClick={addAccountColumn}>Nova coluna</button>
                <span className="ledger-count">{allTransactions.length} itens</span>
              </div>
            </div>
            <div className="ledger-board" aria-label="Lancamentos agrupados por coluna">
              {accountColumns.map((column) => {
                const transactions = transactionsByColumn[column];
                const total = transactions.reduce((sum, transaction) => sum + transaction.amount, 0);
                const groupedByType = groupTransactionsByType(transactions);
                const columnColor = accountColors[column] ?? defaultColumnColor(column, accountColumns);
                const isCollapsed = collapsedColumns[column] ?? transactions.length === 0;

                return (
                  <section className={`ledger-column ${columnClass(column, accountColumns)} ${isCollapsed ? "collapsed" : ""}`} key={column}>
                    <header
                      style={columnHeaderStyle(accountColors[column], !isCollapsed)}
                      role="button"
                      tabIndex={0}
                      aria-expanded={!isCollapsed}
                      onClick={() => toggleLedgerColumn(column)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault();
                          toggleLedgerColumn(column);
                        }
                      }}
                    >
                      <div className="ledger-column-toolbar">
                        <label className="column-color-button" title="Definir cor" onClick={(event) => event.stopPropagation()}>
                          <span style={{ background: columnColor }} />
                          <input
                            aria-label={`Definir cor de ${column}`}
                            type="color"
                            value={columnColor}
                            onClick={(event) => event.stopPropagation()}
                            onChange={(event) => updateAccountColor(column, event.target.value)}
                          />
                        </label>
                        <button
                          className="delete-column-button"
                          type="button"
                          title="Excluir coluna"
                          aria-label={`Excluir coluna ${column}`}
                          onClick={(event) => {
                            event.stopPropagation();
                            deleteAccountColumn(column);
                          }}
                        >
                          ×
                        </button>
                      </div>
                      <strong
                        className="editable-column-name"
                        contentEditable={!isMobileLedger}
                        suppressContentEditableWarning
                        spellCheck="false"
                        title={isMobileLedger ? "Toque no card para expandir" : "Clique para renomear"}
                        onFocus={(event) => {
                          if (isMobileLedger) {
                            event.currentTarget.blur();
                            return;
                          }

                          event.stopPropagation();
                          setEditingColumnName(column);
                          event.currentTarget.textContent = column;
                        }}
                        onClick={(event) => {
                          if (!isMobileLedger) event.stopPropagation();
                        }}
                        onBlur={(event) => commitColumnName(column, event.currentTarget.textContent ?? column)}
                        onKeyDown={(event) => {
                          if (event.key === "Enter") {
                            event.preventDefault();
                            event.currentTarget.blur();
                          }

                          if (event.key === "Escape") {
                            event.preventDefault();
                            event.currentTarget.textContent = column;
                            setEditingColumnName(null);
                            event.currentTarget.blur();
                          }
                        }}
                      >
                        {editingColumnName === column ? column : column}
                      </strong>
                      <span>{formatMoney(total)} • {transactions.length} itens</span>
                      <span className="ledger-collapse-indicator" aria-hidden="true">{isCollapsed ? "＋" : "−"}</span>
                    </header>
                    <div className={`ledger-items-wrap ${isCollapsed ? "collapsed" : "expanded"}`}>
                      <div className="ledger-items">
                        {ledgerSections.map((section) => (
                          <div
                            className="ledger-section"
                            key={`${column}-${section.key}`}
                          >
                            <div
                              className="ledger-section-title"
                            >
                              <span>{section.label}</span>
                              <strong>{groupedByType[section.key].length}</strong>
                            </div>
                            {groupedByType[section.key].length > 0 ? (
                              groupedByType[section.key].slice(0, 8).map((transaction) => (
                                <div
                                  className={`ledger-item ${section.key} ${transaction.ledgerType === "adjustment" ? "refund-item" : ""}`}
                                  key={transaction.dragId}
                                >
                                  <span>{transaction.description}</span>
                                  {section.key === "installment" && (
                                    <small>{installmentHint(transaction)}</small>
                                  )}
                                  <strong className={transaction.ledgerType === "adjustment" ? "refund-value" : "expense-value"}>
                                    {formatLedgerItemAmount(transaction)}
                                  </strong>
                                  <div className="ledger-actions">
                                    <button type="button" onClick={(event) => {
                                      event.stopPropagation();
                                      openEditTransaction(transaction);
                                    }}>
                                      Editar
                                    </button>
                                    <button type="button" onClick={(event) => {
                                      event.stopPropagation();
                                      deleteTransaction(transaction);
                                    }}>
                                      Excluir
                                    </button>
                                  </div>
                                </div>
                              ))
                            ) : (
                              <div className="empty-section">Sem lancamentos</div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  </section>
                );
              })}
            </div>
          </article>
        </section>
          </>
        )}

        {activeView === "cartoes" && (
          <section className="cards-view">
            <article className="panel account-panel">
              <div className="panel-heading">
                <div>
                  <span className="eyebrow">Cartoes e contas</span>
                  <h2>{formatMoney(totalAccounts)}</h2>
                </div>
                <button className="ghost-button" type="button" onClick={addAccountColumn}>Nova coluna</button>
              </div>

              <div className="account-list">
                {accountSummaries.map((account) => {
                  const width = maxAccount ? Math.max((Math.abs(account.amount) / maxAccount) * 100, 8) : 0;
                  return (
                    <div className="account-row account-manager-row" key={account.name}>
                      <div>
                        <strong>{account.name}</strong>
                        <span>{account.count} lancamentos • fixos {formatMoney(account.fixedTotal)} • parcelas {formatMoney(account.installmentTotal)}</span>
                      </div>
                      <div className="bar-track">
                        <span style={{ width: `${width}%` }} />
                      </div>
                      <strong className={account.amount < 0 ? "positive" : ""}>{formatMoney(account.amount)}</strong>
                      <button className="ghost-button" type="button" onClick={() => deleteAccountColumn(account.name)}>
                        Excluir
                      </button>
                    </div>
                  );
                })}
              </div>
            </article>
          </section>
        )}

        {(activeView === "dashboard" || activeView === "relatorios") && (
        <section className="secondary-grid">
          <article className="panel">
            <div className="panel-heading">
              <div>
                <span className="eyebrow">Categorias</span>
                <h2>Distribuicao</h2>
              </div>
            </div>
            <div className="category-list">
              {categoryTotals.slice(0, 5).map((category) => (
                <div className="category-row" key={category.name}>
                  <span className={`dot ${category.tone}`} />
                  <strong>{category.name}</strong>
                  <div className="category-track">
                    <span className={category.tone} style={{ width: `${(category.value / maxCategory) * 100}%` }} />
                  </div>
                  <span>{formatMoney(category.value)}</span>
                </div>
              ))}
            </div>
          </article>

          <article className="panel transactions-panel">
            <div className="panel-heading">
              <div>
                <span className="eyebrow">Lancamentos</span>
                <h2>Transacoes recentes</h2>
              </div>
            </div>
            <div className="transaction-list">
              {allTransactions.slice(0, 8).map((transaction) => (
                <div className="transaction-row" key={transaction.id ?? `${transaction.group}-${transaction.description}`}>
                  <div className="transaction-icon">{transaction.description.slice(0, 1)}</div>
                  <div>
                    <strong>{transaction.description}</strong>
                    <span>
                      {transaction.card ?? transaction.group}
                      {transaction.id ? " • cadastrado agora" : ""}
                    </span>
                  </div>
                  <strong>{formatMoney(transaction.amount)}</strong>
                  {transaction.id && (
                    <button className="icon-button" type="button" onClick={() => removeExpense(transaction.id)} aria-label="Remover gasto">
                      ×
                    </button>
                  )}
                </div>
              ))}
            </div>
          </article>
        </section>
        )}
      </section>

      {editingTransaction && (
        <div className="modal-backdrop" role="dialog" aria-modal="true" aria-label="Editar lançamento">
          <form className="edit-modal" onSubmit={saveEditedTransaction}>
            <div className="panel-heading compact">
              <div>
                <span className="eyebrow">Editar lançamento</span>
                <h2>Atualizar compra</h2>
              </div>
              <button className="icon-button" type="button" onClick={() => setEditingTransaction(null)}>×</button>
            </div>

            <div className="type-selector operation-selector light" aria-label="Tipo de lançamento">
              {transactionTypeOptions.map((option) => (
                <button
                  className={`${editingTransaction.type === option.value ? "active" : ""} ${option.value === "adjustment" ? "refund-type" : ""}`}
                  key={option.value}
                  type="button"
                  onClick={() => updateEditingForm("type", option.value)}
                >
                  <span className="operation-icon" aria-hidden="true">{option.icon}</span>
                  <span className="operation-copy">
                    <strong>{option.label}</strong>
                    <small>{option.hint}</small>
                  </span>
                </button>
              ))}
            </div>

            <label>
              Descricao do gasto
              <input value={editingTransaction.description} onChange={(event) => updateEditingForm("description", event.target.value)} />
            </label>
            <label>
              Cartao ou conta
              <select value={editingTransaction.card} onChange={(event) => updateEditingForm("card", event.target.value)}>
                {accountColumns.map((column) => (
                  <option key={column}>{column}</option>
                ))}
              </select>
            </label>
            <label>
              Valor
              <input inputMode="decimal" value={editingTransaction.amount} onChange={(event) => updateEditingForm("amount", event.target.value)} />
            </label>

            {editingTransaction.type === "installment" && (
              <div className="form-row">
                <label>
                  Parcelas
                  <input inputMode="numeric" value={editingTransaction.installments} onChange={(event) => updateEditingForm("installments", event.target.value)} />
                </label>
                <label>
                  Parcela inicial
                  <input inputMode="numeric" value={editingTransaction.startInstallment} onChange={(event) => updateEditingForm("startInstallment", event.target.value)} />
                </label>
              </div>
            )}

            {editingTransaction.type === "fixed" && (
              <label>
                Repetir por quantos meses
                <input inputMode="numeric" placeholder="Em branco = todos os meses" value={editingTransaction.repeatMonths} onChange={(event) => updateEditingForm("repeatMonths", event.target.value)} />
              </label>
            )}

            <button className="primary-button full" type="submit">Salvar alteracao</button>
          </form>
        </div>
      )}
    </main>
  );
}

const ledgerSections = [
  { key: "fixed", label: "Gastos fixos" },
  { key: "installment", label: "Parcelados" },
  { key: "single", label: "Avulsos / ajustes" }
];

function groupTransactionsByType(transactions) {
  const groups = transactions.reduce(
    (groups, transaction) => {
      if (transaction.ledgerType === "fixed") {
        groups.fixed.push(transaction);
      } else if (transaction.ledgerType === "installment") {
        groups.installment.push(transaction);
      } else {
        groups.single.push(transaction);
      }

      return groups;
    },
    { fixed: [], installment: [], single: [] }
  );

  Object.values(groups).forEach((group) => {
    group.sort((a, b) => a.ledgerOrder - b.ledgerOrder);
  });

  return groups;
}

function normalizeLedgerType(type) {
  if (type === "adjustment") return "adjustment";
  if (type === "fixed" || type === "installment") return type;
  return "single";
}

function formatLedgerItemAmount(transaction) {
  const amount = Math.abs(transaction.amount);
  const signal = transaction.ledgerType === "adjustment" ? "+" : "-";

  return `${signal} ${formatMoney(amount)}`;
}

function installmentHint(transaction) {
  const installmentInfo = getInstallmentInfo(transaction);

  if (!installmentInfo) return "Compra parcelada";

  const nextMonth = months.find((month) => month.id === installmentInfo.nextMonthId);
  const nextText = nextMonth ? ` • Proxima: ${nextMonth.label}` : " • Ultima parcela";

  return `Parcela ${installmentInfo.current}/${installmentInfo.total}${nextText}`;
}

function getInstallmentInfo(transaction) {
  if (transaction.installmentNumber && transaction.installments) {
    return {
      current: transaction.installmentNumber,
      total: transaction.installments,
      nextMonthId: nextMonthId(transaction.monthId)
    };
  }

  const match = transaction.description.match(/(\d+)\s*\/\s*(\d+)/);
  if (!match) return null;

  const current = Number.parseInt(match[1], 10);
  const total = Number.parseInt(match[2], 10);

  return {
    current,
    total,
    nextMonthId: current < total ? nextMonthId(transaction.monthId) : null
  };
}

function nextMonthId(monthId) {
  const currentIndex = months.findIndex((month) => month.id === monthId);
  return months[currentIndex + 1]?.id ?? null;
}

function normalizeColumn(group, columns = spreadsheetColumns) {
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

function renameMapValues(map, oldName, nextName) {
  return Object.fromEntries(
    Object.entries(map).map(([key, value]) => [key, value === oldName ? nextName : value])
  );
}

function buildExpensesFromForm({ form, activeMonth, amount }) {
  const startIndex = months.findIndex((month) => month.id === activeMonth.id);
  const base = {
    amount,
    group: form.card,
    card: form.card,
    createdAt: new Date().toISOString()
  };

  if (form.type === "installment") {
    const installments = clampInteger(form.installments, 2, 48);
    const startInstallment = clampInteger(form.startInstallment, 1, installments);
    const monthsToCreate = installments - startInstallment + 1;
    const seriesId = createId();

    return months
      .slice(startIndex, startIndex + monthsToCreate)
      .map((month, index) => ({
        ...base,
        id: createId(),
        monthId: month.id,
        type: "installment",
        seriesId,
        installmentNumber: startInstallment + index,
        installments,
        description: `${form.description.trim()} ${startInstallment + index}/${installments}`
      }));
  }

  if (form.type === "fixed") {
    const repeatMonths = String(form.repeatMonths).trim()
      ? clampInteger(form.repeatMonths, 1, 60)
      : months.length - startIndex;
    const seriesId = createId();

    return months
      .slice(startIndex, startIndex + repeatMonths)
      .map((month) => ({
        ...base,
        id: createId(),
        monthId: month.id,
        type: "fixed",
        seriesId,
        description: form.description.trim()
      }));
  }

  return [{
    ...base,
    id: createId(),
    monthId: activeMonth.id,
    type: form.type,
    description: form.description.trim()
  }];
}

function normalizeAmountForType(type, amount) {
  if (type === "adjustment") {
    return -Math.abs(amount);
  }

  return amount;
}

function createId() {
  if (globalThis.crypto?.randomUUID) {
    return globalThis.crypto.randomUUID();
  }

  const randomPart = Math.random().toString(36).slice(2, 10);
  return `${Date.now().toString(36)}-${randomPart}`;
}

function parseCurrencyInput(value) {
  const raw = String(value).trim().replace(/[^\d,.-]/g, "");

  if (!raw) {
    return Number.NaN;
  }

  const lastComma = raw.lastIndexOf(",");
  const lastDot = raw.lastIndexOf(".");
  let normalized = raw;

  if (lastComma > -1 && lastDot > -1) {
    normalized = lastComma > lastDot
      ? raw.replace(/\./g, "").replace(",", ".")
      : raw.replace(/,/g, "");
  } else if (lastComma > -1) {
    normalized = raw.replace(/\./g, "").replace(",", ".");
  }

  const parsed = Number.parseFloat(normalized);
  return Number.isFinite(parsed) ? parsed : Number.NaN;
}

function persistExpenses(expenses, onError) {
  try {
    localStorage.setItem("balanco-financeiro:gastos", JSON.stringify(expenses));
    return true;
  } catch {
    onError?.("O Chrome bloqueou o armazenamento neste navegador. Verifique se o site esta em modo anonimo ou com armazenamento desativado.");
    return false;
  }
}

function canUseExpenseStorage(onError) {
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

function completeMissingInstallments(expenses) {
  const completed = [...expenses];

  expenses.forEach((expense) => {
    if (expense.type !== "installment") return;

    const info = parseInstallmentDescription(expense.description);
    if (!info || info.current >= info.total) return;

    const startIndex = months.findIndex((month) => month.id === expense.monthId);
    if (startIndex < 0) return;
    const seriesId = expense.seriesId ?? createId();

    for (let nextNumber = info.current + 1; nextNumber <= info.total; nextNumber += 1) {
      const targetMonth = months[startIndex + (nextNumber - info.current)];
      if (!targetMonth) break;

      const nextDescription = `${info.base} ${nextNumber}/${info.total}`;
      const alreadyExists = completed.some((item) =>
        item.monthId === targetMonth.id &&
        item.type === "installment" &&
        item.card === expense.card &&
        item.amount === expense.amount &&
        item.description === nextDescription
      );

      if (!alreadyExists) {
        completed.push({
          ...expense,
          id: createId(),
          monthId: targetMonth.id,
          description: nextDescription,
          installmentNumber: nextNumber,
          installments: info.total,
          seriesId,
          createdAt: new Date().toISOString()
        });
      }
    }
  });

  return completed;
}

function parseInstallmentDescription(description) {
  const match = description.match(/^(.*?)\s+(\d+)\s*\/\s*(\d+)$/);
  if (!match) return null;

  return {
    base: match[1].trim(),
    current: Number.parseInt(match[2], 10),
    total: Number.parseInt(match[3], 10)
  };
}

function clampInteger(value, min, max) {
  const number = Number.parseInt(value, 10);
  if (Number.isNaN(number)) return min;
  return Math.min(Math.max(number, min), max);
}

function columnClass(column, columns = spreadsheetColumns) {
  const classes = ["col-mercado", "col-smiles", "col-nubank", "col-bb", "col-outros", "col-casa"];
  const index = columns.indexOf(column);

  return classes[index] ?? "";
}

function defaultColumnColor(column, columns = spreadsheetColumns) {
  const colors = ["#dff2f8", "#eeeeed", "#eee8f7", "#fbf7d9", "#eeeeee", "#e8f2f8"];
  const index = columns.indexOf(column);

  return colors[index] ?? "#eef2ee";
}

function columnHeaderStyle(color, isActive = false) {
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

function normalizeCategory(group) {
  const text = String(group).toLowerCase();
  if (text.includes("casa")) return "Casa";
  if (text.includes("transporte") || text.includes("gasolina") || text.includes("uber")) return "Transporte";
  if (text.includes("lazer")) return "Lazer";
  if (text.includes("outro")) return "Outros";
  if (text.includes("banco")) return "Banco";
  return "Cartoes";
}

function categoryTone(name) {
  const tones = {
    Cartoes: "teal",
    Casa: "amber",
    Outros: "coral",
    Banco: "ink",
    Transporte: "coral",
    Lazer: "amber"
  };

  return tones[name] ?? "teal";
}

export default App;
