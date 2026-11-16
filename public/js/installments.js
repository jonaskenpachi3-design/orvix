const API_URL = "/api";

let installmentPlans = [];
let categories = [];
let forecastChart = null;

const token = localStorage.getItem("orvix_token");

const userNameElements =
    document.querySelectorAll("[data-user-name]");

const userInitialElements =
    document.querySelectorAll("[data-user-initial]");

const messageElement =
    document.getElementById("message");

const form =
    document.getElementById("installment-form");

const descriptionInput =
    document.getElementById("description");

const totalAmountInput =
    document.getElementById("total-amount");

const installmentsTotalInput =
    document.getElementById("installments-total");

const firstDueDateInput =
    document.getElementById("first-due-date");

const categoryInput =
    document.getElementById("category");

const submitButton =
    document.getElementById("submit-button");

const previewElement =
    document.getElementById("installment-preview");

const previewListElement =
    document.getElementById("preview-list");

const loadingElement =
    document.getElementById("installments-loading");

const emptyElement =
    document.getElementById("installments-empty");

const listElement =
    document.getElementById("installments-list");

const countElement =
    document.getElementById("installments-count");

const logoutButton =
    document.getElementById("logout-button");

const forecastChartCanvas =
    document.getElementById("forecast-chart");

/* =========================
   UTILITÁRIOS
========================= */

function formatCurrency(value) {
    return Number(value || 0).toLocaleString(
        "pt-BR",
        {
            style: "currency",
            currency: "BRL"
        }
    );
}

function formatDate(date) {
    if (!date) {
        return "—";
    }
    const [year, month, day] =
        date.split("T")[0].split("-");
    return `${day}/${month}/${year}`;
}

function formatMonthYear(dateStr) {
    if (!dateStr) return "—";
    const [year, month] = dateStr.split("-");
    const months = [
        "Jan", "Fev", "Mar", "Abr", "Mai", "Jun",
        "Jul", "Ago", "Set", "Out", "Nov", "Dez"
    ];
    return `${months[parseInt(month) - 1]}/${year}`;
}

function showMessage(message, type) {
    messageElement.textContent = message;
    messageElement.className = `message ${type}`;
    messageElement.classList.remove("hidden");
    setTimeout(() => {
        messageElement.classList.add("hidden");
    }, 4000);
}

function getAuthHeaders() {
    return {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
    };
}

function escapeHtml(value) {
    const div = document.createElement("div");
    div.textContent = value ?? "";
    return div.innerHTML;
}

function applyUserName(name) {
    const safeName = name || "Usuário";
    userNameElements.forEach((element) => {
        element.textContent = safeName;
    });
    const initial = safeName.trim().charAt(0).toUpperCase() || "U";
    userInitialElements.forEach((element) => {
        element.textContent = initial;
    });
}

function readStoredUser() {
    try {
        const raw = localStorage.getItem("orvix_user");
        if (raw) {
            const parsed = JSON.parse(raw);
            if (parsed?.name) {
                return parsed.name;
            }
        }
    } catch (error) {
        console.warn("Não foi possível ler o usuário salvo:", error);
    }
    return localStorage.getItem("orvix_user_name") || "Usuário";
}

/* =========================
   PRÉVIA DAS PARCELAS (CLIENT-SIDE)
========================= */

function calculateInstallmentAmounts(totalAmount, installmentsTotal) {
    const baseAmount = Math.floor((totalAmount * 100) / installmentsTotal) / 100;
    const remainder = Math.round((totalAmount - baseAmount * installmentsTotal) * 100) / 100;
    const amounts = [];
    for (let i = 1; i <= installmentsTotal; i++) {
        if (i === installmentsTotal) {
            amounts.push(Number((baseAmount + remainder).toFixed(2)));
        } else {
            amounts.push(Number(baseAmount.toFixed(2)));
        }
    }
    return amounts;
}

function calculateDueDate(firstDueDate, installmentIndex) {
    const [year, month, day] = firstDueDate.split("-").map(Number);
    const date = new Date(Date.UTC(year, month - 1, day));
    date.setUTCMonth(date.getUTCMonth() + (installmentIndex - 1));
    const originalDay = day;
    if (date.getUTCDate() !== originalDay) {
        date.setUTCDate(0);
    }
    const y = date.getUTCFullYear();
    const m = String(date.getUTCMonth() + 1).padStart(2, "0");
    const d = String(date.getUTCDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
}

function updatePreview() {
    const totalAmount = Number(totalAmountInput.value);
    const installmentsTotal = Number(installmentsTotalInput.value);
    const firstDueDate = firstDueDateInput.value;

    if (!totalAmount || !installmentsTotal || !firstDueDate || totalAmount <= 0 || installmentsTotal <= 0) {
        previewElement.classList.add("hidden");
        return;
    }

    const amounts = calculateInstallmentAmounts(totalAmount, installmentsTotal);

    previewListElement.innerHTML = "";
    for (let i = 1; i <= installmentsTotal; i++) {
        const dueDate = calculateDueDate(firstDueDate, i);
        const amount = amounts[i - 1];
        const item = document.createElement("div");
        item.className = "preview-item";
        item.innerHTML = `
            <span class="preview-item-number">${i}/${installmentsTotal}</span>
            <div class="preview-item-info">
                <span class="preview-item-description">${escapeHtml(descriptionInput.value) || "Descrição"}</span>
                <span class="preview-item-date">${formatDate(dueDate)}</span>
            </div>
            <span class="preview-item-amount">${formatCurrency(amount)}</span>
        `;
        previewListElement.appendChild(item);
    }
    previewElement.classList.remove("hidden");
}

// Atualiza prévia quando campos mudam
[totalAmountInput, installmentsTotalInput, firstDueDateInput, descriptionInput].forEach(input => {
    input.addEventListener("input", updatePreview);
    input.addEventListener("change", updatePreview);
});

/* =========================
   USUÁRIO
========================= */

async function loadUser() {
    try {
        const response = await fetch(
            `${API_URL}/auth/me`,
            {
                method: "GET",
                headers: getAuthHeaders()
            }
        );
        if (!response.ok) {
            throw new Error("Sessão expirada.");
        }
        const data = await response.json();
        const user = data.user || data;
        const name = user.name || user.username || user.full_name || readStoredUser();
        applyUserName(name);
        localStorage.setItem("orvix_user", JSON.stringify({ name, email: user.email || "" }));
        localStorage.setItem("orvix_user_name", name);
        if (user.email) {
            localStorage.setItem("orvix_user_email", user.email);
        }
    } catch (error) {
        console.error("Erro ao carregar usuário:", error);
        applyUserName(readStoredUser());
    }
}

/* =========================
   CATEGORIAS
========================= */

async function loadCategories() {
    const response = await fetch(
        `${API_URL}/categories`,
        {
            method: "GET",
            headers: getAuthHeaders()
        }
    );
    if (!response.ok) {
        throw new Error("Não foi possível carregar as categorias.");
    }
    const data = await response.json();
    if (Array.isArray(data)) {
        categories = data;
    } else if (data && Array.isArray(data.categories)) {
        categories = data.categories;
    } else if (data && Array.isArray(data.data)) {
        categories = data.data;
    } else {
        categories = [];
    }
    renderCategories();
}

function renderCategories() {
    categoryInput.innerHTML = `
        <option value="">
            Sem categoria
        </option>
    `;
    categories.forEach(category => {
        const option = document.createElement("option");
        option.value = category.id;
        option.textContent = category.name;
        option.dataset.type = category.type;
        categoryInput.appendChild(option);
    });
}

/* =========================
   PLANOS DE PARCELAMENTO
========================= */

async function loadInstallmentPlans() {
    loadingElement.classList.remove("hidden");
    emptyElement.classList.add("hidden");
    listElement.innerHTML = "";

    try {
        const response = await fetch(
            `${API_URL}/installments`,
            {
                method: "GET",
                headers: getAuthHeaders()
            }
        );
        if (!response.ok) {
            throw new Error("Não foi possível carregar os parcelamentos.");
        }
        const data = await response.json();
        installmentPlans = data.plans || data || [];
        renderInstallmentPlans();
        await loadForecastChart();
    } catch (error) {
        console.error("Erro ao carregar parcelamentos:", error);
        loadingElement.classList.add("hidden");
        showMessage(error.message || "Erro ao carregar parcelamentos.", "error");
    }
}

function renderInstallmentPlans() {
    loadingElement.classList.add("hidden");
    listElement.innerHTML = "";
    countElement.textContent = `${installmentPlans.length} plano${installmentPlans.length !== 1 ? "s" : ""}`;

    if (installmentPlans.length === 0) {
        emptyElement.classList.remove("hidden");
        return;
    }
    emptyElement.classList.add("hidden");

    installmentPlans.forEach(plan => {
        const planElement = createInstallmentPlanElement(plan);
        listElement.appendChild(planElement);
    });
}

function createInstallmentPlanElement(plan) {
    const planDiv = document.createElement("div");
    planDiv.className = "installment-plan";
    planDiv.dataset.planId = plan.id;

    const paid = Number(plan.installments_paid || 0);
    const pending = Number(plan.installments_pending || 0);
    const total = paid + pending;
    const progressPercent = total > 0 ? (paid / total) * 100 : 0;

    const category = categories.find(c => c.id === plan.category_id);
    const categoryName = category ? category.name : "Sem categoria";

    // Header
    const header = document.createElement("div");
    header.className = "installment-plan-header";
    header.innerHTML = `
        <div class="installment-plan-main">
            <span class="installment-plan-icon">≡</span>
            <div class="installment-plan-info">
                <span class="installment-plan-description">${escapeHtml(plan.description)}</span>
                <div class="installment-plan-meta">
                    <span class="installment-plan-category">${escapeHtml(categoryName)}</span>
                    <span>${formatCurrency(plan.total_amount)} total</span>
                </div>
            </div>
        </div>
        <div class="installment-plan-progress">
            <div class="installment-plan-progress-bar">
                <div class="installment-plan-progress-fill" style="width: ${progressPercent}%"></div>
            </div>
            <span class="installment-plan-progress-text">${paid}/${total}</span>
        </div>
    `;

    // Details
    const details = document.createElement("div");
    details.className = "installment-plan-details";
    details.innerHTML = `
        <div class="installment-plan-detail">
            <span class="installment-plan-detail-label">Valor total</span>
            <span class="installment-plan-detail-value">${formatCurrency(plan.total_amount)}</span>
        </div>
        <div class="installment-plan-detail">
            <span class="installment-plan-detail-label">Parcelas</span>
            <span class="installment-plan-detail-value">${plan.installments_total}x</span>
        </div>
        <div class="installment-plan-detail">
            <span class="installment-plan-detail-label">1º vencimento</span>
            <span class="installment-plan-detail-value">${formatDate(plan.first_due_date)}</span>
        </div>
        <div class="installment-plan-detail">
            <span class="installment-plan-detail-label">Pagas</span>
            <span class="installment-plan-detail-value">${paid}</span>
        </div>
        <div class="installment-plan-detail">
            <span class="installment-plan-detail-label">Pendentes</span>
            <span class="installment-plan-detail-value">${pending}</span>
        </div>
    `;

    // Installments list (we'll load details when expanding or via separate call)
    const installmentsContainer = document.createElement("div");
    installmentsContainer.className = "installment-plan-installments";
    installmentsContainer.innerHTML = `<div class="loading-small">Carregando parcelas...</div>`;

    planDiv.appendChild(header);
    planDiv.appendChild(details);
    planDiv.appendChild(installmentsContainer);

    // Load installments for this plan
    loadPlanInstallments(plan.id, installmentsContainer);

    return planDiv;
}

async function loadPlanInstallments(planId, container) {
    try {
        const response = await fetch(
            `${API_URL}/installments/${planId}`,
            {
                method: "GET",
                headers: getAuthHeaders()
            }
        );
        if (!response.ok) {
            throw new Error("Não foi possível carregar as parcelas.");
        }
        const data = await response.json();
        const transactions = data.plan?.transactions || data.transactions || [];
        renderPlanInstallments(transactions, container);
    } catch (error) {
        console.error("Erro ao carregar parcelas do plano:", error);
        container.innerHTML = `<span class="error-text">Erro ao carregar parcelas</span>`;
    }
}

function renderPlanInstallments(transactions, container) {
    // Ordena por número da parcela
    transactions.sort((a, b) => (a.installment_number || 0) - (b.installment_number || 0));

    container.innerHTML = "";
    transactions.forEach(tx => {
        const item = document.createElement("div");
        const status = tx.status || "paid";
        item.className = `installment-item ${status}`;
        item.innerHTML = `
            <span class="installment-item-number">${tx.installment_number || "?"}</span>
            <div class="installment-item-info">
                <span class="installment-item-date">${formatDate(tx.transaction_date)}</span>
                <span class="installment-item-amount">${formatCurrency(tx.amount)}</span>
            </div>
            <div class="installment-item-actions">
                ${status === "scheduled" ? `
                    <button
                        class="installment-pay-button"
                        data-action="pay"
                        data-id="${tx.id}"
                        title="Marcar como paga"
                    >
                        ✓
                    </button>
                ` : `
                    <span class="status-badge paid">✓ Paga</span>
                `}
            </div>
        `;
        container.appendChild(item);
    });

    // Event listener para botões de pagar
    container.querySelectorAll("[data-action='pay']").forEach(button => {
        button.addEventListener("click", async (e) => {
            const id = e.currentTarget.dataset.id;
            await payInstallment(id);
        });
    });
}

/* =========================
   PAGAR PARCELA
========================= */

async function payInstallment(transactionId) {
    try {
        const response = await fetch(
            `${API_URL}/installments/${transactionId}/pay`,
            {
                method: "PUT",
                headers: getAuthHeaders()
            }
        );
        const data = await response.json();
        if (!response.ok) {
            throw new Error(data.error || "Não foi possível pagar a parcela.");
        }
        showMessage("Parcela marcada como paga.", "success");
        await loadInstallmentPlans();
    } catch (error) {
        console.error("Erro ao pagar parcela:", error);
        showMessage(error.message || "Erro ao pagar parcela.", "error");
    }
}

/* =========================
   CRIAR PARCELAMENTO
========================= */

async function createInstallmentPlan() {
    const description = descriptionInput.value.trim();
    const totalAmount = Number(totalAmountInput.value);
    const installmentsTotal = Number(installmentsTotalInput.value);
    const firstDueDate = firstDueDateInput.value;
    const categoryId = categoryInput.value;

    if (!description) {
        throw new Error("Informe uma descrição.");
    }
    if (!totalAmount || totalAmount <= 0) {
        throw new Error("Informe um valor total válido.");
    }
    if (!installmentsTotal || installmentsTotal <= 0) {
        throw new Error("Informe o número de parcelas.");
    }
    if (!firstDueDate) {
        throw new Error("Informe a data do primeiro vencimento.");
    }

    const response = await fetch(
        `${API_URL}/installments`,
        {
            method: "POST",
            headers: getAuthHeaders(),
            body: JSON.stringify({
                description,
                totalAmount,
                installmentsTotal,
                firstDueDate,
                categoryId: categoryId || null
            })
        }
    );

    const data = await response.json();
    if (!response.ok) {
        throw new Error(data.error || "Não foi possível criar o parcelamento.");
    }
    return data;
}

/* =========================
   GRÁFICO DE PREVISÃO
========================= */

async function loadForecastChart() {
    // Calcula período: próximos 12 meses
    const today = new Date();
    const startDate = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-01`;
    const endDate = new Date(today.getFullYear() + 1, today.getMonth(), 0);
    const endDateStr = `${endDate.getFullYear()}-${String(endDate.getMonth() + 1).padStart(2, "0")}-${endDate.getDate()}`;

    try {
        const response = await fetch(
            `${API_URL}/installments/upcoming?startDate=${startDate}&endDate=${endDateStr}`,
            {
                method: "GET",
                headers: getAuthHeaders()
            }
        );
        if (!response.ok) {
            throw new Error("Não foi possível carregar a previsão.");
        }
        const data = await response.json();
        const installments = data.installments || data || [];
        renderForecastChart(installments);
    } catch (error) {
        console.error("Erro ao carregar previsão:", error);
    }
}

function renderForecastChart(installments) {
    const labels = installments.map(item => formatMonthYear(item.month));
    const values = installments.map(item => item.total);

    const ctx = forecastChartCanvas.getContext("2d");

    if (forecastChart) {
        forecastChart.destroy();
    }

    forecastChart = new Chart(ctx, {
        type: "bar",
        data: {
            labels,
            datasets: [{
                label: "Parcelas futuras",
                data: values,
                backgroundColor: "rgba(251, 146, 60, 0.8)",
                borderColor: "rgb(251, 146, 60)",
                borderWidth: 1,
                borderRadius: 6,
                borderSkipped: false
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    backgroundColor: "rgba(15, 23, 42, 0.9)",
                    titleColor: "white",
                    bodyColor: "rgba(255,255,255,0.9)",
                    padding: 12,
                    callbacks: {
                        label: (context) => {
                            return `Parcelas: ${formatCurrency(context.raw)}`;
                        }
                    }
                }
            },
            scales: {
                x: {
                    grid: {
                        display: false
                    },
                    ticks: {
                        color: "rgba(148, 163, 184, 0.8)",
                        font: { size: 11 }
                    }
                },
                y: {
                    beginAtZero: true,
                    grid: {
                        color: "rgba(148, 163, 184, 0.1)",
                        drawBorder: false
                    },
                    ticks: {
                        color: "rgba(148, 163, 184, 0.8)",
                        font: { size: 11 },
                        callback: (value) => formatCurrency(value)
                    }
                }
            },
            interaction: {
                intersect: false,
                mode: "index"
            }
        }
    });
}

/* =========================
   FORMULÁRIO
========================= */

form.addEventListener("submit", async function(event) {
    event.preventDefault();
    submitButton.disabled = true;
    submitButton.textContent = "Criando...";

    try {
        await createInstallmentPlan();
        showMessage("Parcelamento criado com sucesso!", "success");
        form.reset();
        setDefaultFirstDueDate();
        previewElement.classList.add("hidden");
        await loadInstallmentPlans();
    } catch (error) {
        console.error("Erro ao criar parcelamento:", error);
        showMessage(error.message || "Não foi possível criar o parcelamento.", "error");
    } finally {
        submitButton.disabled = false;
        submitButton.textContent = "Criar parcelamento";
    }
});

function setDefaultFirstDueDate() {
    const today = new Date();
    // Primeiro dia do próximo mês
    const nextMonth = new Date(today.getFullYear(), today.getMonth() + 1, 1);
    const year = nextMonth.getFullYear();
    const month = String(nextMonth.getMonth() + 1).padStart(2, "0");
    const day = String(nextMonth.getDate()).padStart(2, "0");
    firstDueDateInput.value = `${year}-${month}-${day}`;
}

/* =========================
   AÇÕES DA LISTA (DELEGADAS)
========================= */

listElement.addEventListener("click", async function(event) {
    const payButton = event.target.closest("[data-action='pay']");
    if (payButton) {
        const id = payButton.dataset.id;
        await payInstallment(id);
    }
});

/* =========================
   LOGOUT
========================= */

logoutButton.addEventListener("click", function() {
    localStorage.removeItem("orvix_token");
    window.location.href = "/login.html";
});

/* =========================
   INICIALIZAÇÃO
========================= */

async function initialize() {
    if (!token) {
        window.location.href = "/login.html";
        return;
    }
    try {
        setDefaultFirstDueDate();
        await loadUser();
        await loadCategories();
        await loadInstallmentPlans();
    } catch (error) {
        console.error("Erro ao inicializar parcelamentos:", error);
        if (error.message.includes("Sessão")) {
            localStorage.removeItem("orvix_token");
            window.location.href = "/login.html";
            return;
        }
        loadingElement.classList.add("hidden");
        showMessage(error.message || "Não foi possível carregar a página.", "error");
    }
}

initialize();