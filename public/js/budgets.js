const token = localStorage.getItem("orvix_token");

if (!token) {
    window.location.href = "/login.html";
}


// ========================================
// ELEMENTOS
// ========================================

const monthInput =
    document.getElementById("budget-month");

const modalMonthInput =
    document.getElementById("month");

const budgetsList =
    document.getElementById("budgets-list");

const totalBudgetElement =
    document.getElementById("total-budget");

const totalSpentElement =
    document.getElementById("total-spent");

const totalRemainingElement =
    document.getElementById("total-remaining");

const totalPercentageElement =
    document.getElementById("total-percentage");

const addBudgetButton =
    document.getElementById("add-budget-button");

const modal =
    document.getElementById("budget-modal");

const modalTitle =
    document.getElementById("modal-title");

const closeModalButton =
    document.getElementById("close-modal-button");

const cancelButton =
    document.getElementById("cancel-button");

const budgetForm =
    document.getElementById("budget-form");

const budgetIdInput =
    document.getElementById("budget-id");

const categoryInput =
    document.getElementById("category");

const amountInput =
    document.getElementById("amount");

const formError =
    document.getElementById("form-error");

const logoutButton =
    document.getElementById("logout-button");

const userNameElements =
    document.querySelectorAll("#user-name, [data-user-name]");

const userAvatarElements =
    document.querySelectorAll("#user-avatar, [data-user-initial]");


let currentBudgets = [];


// ========================================
// FORMATAÇÃO
// ========================================

function formatCurrency(value) {
    return Number(value).toLocaleString(
        "pt-BR",
        {
            style: "currency",
            currency: "BRL"
        }
    );
}


function applyUserName(name) {
    const safeName = name || "Usuário";

    userNameElements.forEach((element) => {
        element.textContent = safeName;
    });

    userAvatarElements.forEach((element) => {
        element.textContent = safeName.trim().charAt(0).toUpperCase();
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


function getCurrentMonth() {
    const date = new Date();

    const year =
        date.getFullYear();

    const month =
        String(
            date.getMonth() + 1
        ).padStart(2, "0");

    return `${year}-${month}`;
}


function convertMonthToDate(month) {
    return `${month}-01`;
}


function getStatusLabel(status) {
    const labels = {
        within: "Dentro do orçamento",
        attention: "Atenção",
        near_limit: "Próximo do limite",
        exceeded: "Orçamento excedido"
    };

    return labels[status] ||
        "Dentro do orçamento";
}


function getStatusClass(status) {
    const classes = {
        within: "status-within",
        attention: "status-attention",
        near_limit: "status-near-limit",
        exceeded: "status-exceeded"
    };

    return classes[status] ||
        "status-within";
}


function getProgressWidth(percentage) {
    return Math.min(
        Math.max(
            Number(percentage),
            0
        ),
        100
    );
}


function escapeHtml(value) {
    return String(value)
        .replace(
            /&/g,
            "&amp;"
        )
        .replace(
            /</g,
            "&lt;"
        )
        .replace(
            />/g,
            "&gt;"
        )
        .replace(
            /"/g,
            "&quot;"
        )
        .replace(
            /'/g,
            "&#039;"
        );
}


// ========================================
// API
// ========================================

async function apiRequest(
    url,
    options = {}
) {
    const response =
        await fetch(
            url,
            {
                ...options,

                headers: {
                    "Content-Type":
                        "application/json",

                    "Authorization":
                        `Bearer ${token}`,

                    ...(options.headers || {})
                }
            }
        );


    let data = {};

    try {
        data =
            await response.json();

    } catch (error) {
        data = {};
    }


    if (!response.ok) {

        if (
            response.status === 401
        ) {
            localStorage.removeItem(
                "orvix_token"
            );

            window.location.href =
                "/login.html";

            return;
        }


        throw new Error(
            data.error ||
            "Não foi possível realizar a operação."
        );
    }


    return data;
}


// ========================================
// USUÁRIO
// ========================================

async function loadUser() {
    try {

        const data =
            await apiRequest(
                "/api/auth/me"
            );


        const user =
            data.user || data;


        const name =
            user.name ||
            user.username ||
            user.full_name ||
            readStoredUser();

        applyUserName(name);

        localStorage.setItem(
            "orvix_user",
            JSON.stringify({
                name,
                email: user.email || ""
            })
        );
        localStorage.setItem("orvix_user_name", name);

    } catch (error) {

        console.error(
            "Erro ao carregar usuário:",
            error
        );

        applyUserName(readStoredUser());
    }
}


// ========================================
// CATEGORIAS
// ========================================

async function loadCategories() {

    try {

        const data =
            await apiRequest(
                "/api/categories"
            );


        const categories =
            data.categories || [];


        categoryInput.innerHTML = `
            <option value="">
                Selecione uma categoria
            </option>
        `;


        const expenseCategories =
            categories.filter(
                category =>
                    category.type ===
                    "expense"
            );


        expenseCategories.forEach(
            category => {

                const option =
                    document.createElement(
                        "option"
                    );


                option.value =
                    category.id;


                option.textContent =
                    category.name;


                categoryInput.appendChild(
                    option
                );
            }
        );


        if (
            expenseCategories.length === 0
        ) {

            categoryInput.innerHTML = `
                <option value="">
                    Nenhuma categoria de despesa encontrada
                </option>
            `;
        }

    } catch (error) {

        console.error(
            "Erro ao carregar categorias:",
            error
        );


        categoryInput.innerHTML = `
            <option value="">
                Erro ao carregar categorias
            </option>
        `;
    }
}


// ========================================
// CARREGAR ORÇAMENTOS
// ========================================

async function loadBudgets() {

    const month =
        monthInput.value;


    if (!month) {
        return;
    }


    budgetsList.innerHTML = `
        <div class="budgets-loading">
            Carregando orçamentos...
        </div>
    `;


    try {

        const data =
            await apiRequest(
                `/api/budgets/usage?month=${encodeURIComponent(
                    convertMonthToDate(month)
                )}`
            );


        currentBudgets =
            Array.isArray(data)
                ? data
                : [];


        renderBudgets(
            currentBudgets
        );

    } catch (error) {

        console.error(
            "Erro ao carregar orçamentos:",
            error
        );


        currentBudgets = [];


        budgetsList.innerHTML = `
            <div class="empty-budgets">
                Não foi possível carregar os orçamentos.
            </div>
        `;


        renderSummary([]);
    }
}


// ========================================
// RESUMO
// ========================================

function renderSummary(
    budgets
) {

    const totalBudget =
        budgets.reduce(
            (
                total,
                budget
            ) =>
                total +
                Number(
                    budget.budget_amount
                ),
            0
        );


    const totalSpent =
        budgets.reduce(
            (
                total,
                budget
            ) =>
                total +
                Number(
                    budget.spent_amount
                ),
            0
        );


    const totalRemaining =
        totalBudget -
        totalSpent;


    const percentage =
        totalBudget > 0
            ? (
                totalSpent /
                totalBudget
            ) * 100
            : 0;


    totalBudgetElement.textContent =
        formatCurrency(
            totalBudget
        );


    totalSpentElement.textContent =
        formatCurrency(
            totalSpent
        );


    totalRemainingElement.textContent =
        formatCurrency(
            totalRemaining
        );


    totalPercentageElement.textContent =
        `${percentage.toFixed(1)}%`;


    if (totalRemaining < 0) {

        totalRemainingElement.style.color =
            "#ef4444";

    } else {

        totalRemainingElement.style.color =
            "";
    }
}


// ========================================
// RENDERIZAR LISTA
// ========================================

function renderBudgets(
    budgets
) {

    renderSummary(
        budgets
    );


    if (!budgets.length) {

        budgetsList.innerHTML = `
            <div class="empty-budgets">
                Nenhum orçamento criado para este mês.
            </div>
        `;

        return;
    }


    budgetsList.innerHTML = "";


    budgets.forEach(
        budget => {

            const card =
                document.createElement(
                    "article"
                );


            card.className =
                "budget-card";


            const percentage =
                Number(
                    budget.percentage
                );


            const progressWidth =
                getProgressWidth(
                    percentage
                );


            const statusClass =
                getStatusClass(
                    budget.status
                );


            const statusLabel =
                getStatusLabel(
                    budget.status
                );


            const remainingClass =
                Number(
                    budget.remaining_amount
                ) < 0
                    ? "negative"
                    : "";


            card.innerHTML = `
                <div class="budget-card-header">

                    <div class="budget-category">

                        <div class="budget-category-icon">
                            ◫
                        </div>

                        <div>

                            <h3>
                                ${escapeHtml(
                                    budget.category_name
                                )}
                            </h3>

                            <span>
                                Orçamento mensal
                            </span>

                        </div>

                    </div>


                    <div class="budget-actions">

                        <button
                            type="button"
                            class="budget-action edit"
                            data-id="${budget.id}"
                            title="Editar"
                        >
                            ✎
                        </button>


                        <button
                            type="button"
                            class="budget-action delete"
                            data-id="${budget.id}"
                            title="Excluir"
                        >
                            ×
                        </button>

                    </div>

                </div>


                <div class="budget-values">

                    <div class="budget-value">

                        <span>
                            Orçamento
                        </span>

                        <strong>
                            ${formatCurrency(
                                budget.budget_amount
                            )}
                        </strong>

                    </div>


                    <div class="budget-value">

                        <span>
                            Gasto
                        </span>

                        <strong>
                            ${formatCurrency(
                                budget.spent_amount
                            )}
                        </strong>

                    </div>


                    <div class="budget-value">

                        <span>
                            Disponível
                        </span>

                        <strong
                            class="${remainingClass}"
                        >
                            ${formatCurrency(
                                budget.remaining_amount
                            )}
                        </strong>

                    </div>

                </div>


                <div class="budget-progress-header">

                    <span>
                        Utilização
                    </span>

                    <span class="budget-percentage">
                        ${percentage.toFixed(1)}%
                    </span>

                </div>


                <div class="budget-progress">

                    <div
                        class="budget-progress-bar"
                        style="width: ${progressWidth}%"
                    ></div>

                </div>


                <span
                    class="budget-status ${statusClass}"
                >
                    ${statusLabel}
                </span>
            `;


            budgetsList.appendChild(
                card
            );
        }
    );


    attachBudgetActions();
}


// ========================================
// AÇÕES DOS CARDS
// ========================================

function attachBudgetActions() {

    const editButtons =
        document.querySelectorAll(
            ".budget-action.edit"
        );


    const deleteButtons =
        document.querySelectorAll(
            ".budget-action.delete"
        );


    editButtons.forEach(
        button => {

            button.addEventListener(
                "click",
                () => {

                    const budget =
                        currentBudgets.find(
                            item =>
                                item.id ===
                                button.dataset.id
                        );


                    if (budget) {

                        openEditModal(
                            budget
                        );
                    }
                }
            );
        }
    );


    deleteButtons.forEach(
        button => {

            button.addEventListener(
                "click",
                async () => {

                    const confirmed =
                        confirm(
                            "Deseja realmente excluir este orçamento?"
                        );


                    if (!confirmed) {
                        return;
                    }


                    await deleteBudget(
                        button.dataset.id
                    );
                }
            );
        }
    );
}


// ========================================
// EXCLUIR ORÇAMENTO
// ========================================

async function deleteBudget(
    budgetId
) {

    try {

        await apiRequest(
            `/api/budgets/${budgetId}`,
            {
                method: "DELETE"
            }
        );


        await loadBudgets();

    } catch (error) {

        console.error(
            "Erro ao excluir orçamento:",
            error
        );


        alert(
            error.message
        );
    }
}


// ========================================
// ABRIR MODAL — NOVO
// ========================================

function openModal() {

    modalTitle.textContent =
        "Novo orçamento";


    budgetIdInput.value =
        "";


    categoryInput.value =
        "";


    amountInput.value =
        "";


    modalMonthInput.value =
        monthInput.value ||
        getCurrentMonth();


    formError.textContent =
        "";


    formError.classList.add(
        "hidden"
    );


    modal.classList.remove(
        "hidden"
    );
}


// ========================================
// ABRIR MODAL — EDITAR
// ========================================

function openEditModal(
    budget
) {

    modalTitle.textContent =
        "Editar orçamento";


    budgetIdInput.value =
        budget.id;


    categoryInput.value =
        budget.category_id;


    amountInput.value =
        budget.budget_amount;


    modalMonthInput.value =
        String(
            budget.month
        ).substring(
            0,
            7
        );


    formError.textContent =
        "";


    formError.classList.add(
        "hidden"
    );


    modal.classList.remove(
        "hidden"
    );
}


// ========================================
// FECHAR MODAL
// ========================================

function closeModal() {

    modal.classList.add(
        "hidden"
    );


    budgetForm.reset();


    budgetIdInput.value =
        "";


    formError.textContent =
        "";


    formError.classList.add(
        "hidden"
    );
}


// ========================================
// SALVAR ORÇAMENTO
// ========================================

async function saveBudget(
    event
) {

    event.preventDefault();


    formError.textContent =
        "";


    formError.classList.add(
        "hidden"
    );


    const budgetId =
        budgetIdInput.value;


    const categoryId =
        categoryInput.value;


    const amount =
        Number(
            amountInput.value
        );


    const month =
        modalMonthInput.value;


    if (
        !categoryId ||
        !month
    ) {

        formError.textContent =
            "Categoria e mês são obrigatórios.";


        formError.classList.remove(
            "hidden"
        );


        return;
    }


    if (
        !amount ||
        amount <= 0
    ) {

        formError.textContent =
            "O valor do orçamento deve ser maior que zero.";


        formError.classList.remove(
            "hidden"
        );


        return;
    }


    const payload = {
        categoryId,
        amount,
        month:
            convertMonthToDate(
                month
            )
    };


    try {

        if (budgetId) {

            await apiRequest(
                `/api/budgets/${budgetId}`,
                {
                    method: "PUT",

                    body:
                        JSON.stringify(
                            payload
                        )
                }
            );

        } else {

            await apiRequest(
                "/api/budgets",
                {
                    method: "POST",

                    body:
                        JSON.stringify(
                            payload
                        )
                }
            );
        }


        closeModal();


        monthInput.value =
            month;


        await loadBudgets();

    } catch (error) {

        console.error(
            "Erro ao salvar orçamento:",
            error
        );


        formError.textContent =
            error.message;


        formError.classList.remove(
            "hidden"
        );
    }
}


// ========================================
// LOGOUT
// ========================================

function logout() {

    localStorage.removeItem(
        "orvix_token"
    );
    localStorage.removeItem("orvix_user");
    localStorage.removeItem("orvix_user_name");
    localStorage.removeItem("orvix_user_email");


    window.location.href =
        "/login.html";
}


// ========================================
// EVENTOS
// ========================================

addBudgetButton.addEventListener(
    "click",
    openModal
);


closeModalButton.addEventListener(
    "click",
    closeModal
);


cancelButton.addEventListener(
    "click",
    closeModal
);


budgetForm.addEventListener(
    "submit",
    saveBudget
);


monthInput.addEventListener(
    "change",
    loadBudgets
);


logoutButton.addEventListener(
    "click",
    logout
);


modal
    .querySelector(
        ".modal-overlay"
    )
    .addEventListener(
        "click",
        closeModal
    );


// ========================================
// INICIALIZAÇÃO
// ========================================

async function initialize() {

    const currentMonth =
        getCurrentMonth();


    monthInput.value =
        currentMonth;


    modalMonthInput.value =
        currentMonth;


    await loadUser();


    await loadCategories();


    await loadBudgets();
}


initialize();