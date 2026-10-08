const API_URL = "/api";

let transactions = [];
let categories = [];

const token = localStorage.getItem("orvix_token");

const userNameElements =
    document.querySelectorAll("[data-user-name]");

const userInitialElements =
    document.querySelectorAll("[data-user-initial]");

const messageElement =
    document.getElementById("message");

const form =
    document.getElementById("transaction-form");

const descriptionInput =
    document.getElementById("description");

const amountInput =
    document.getElementById("amount");

const typeInput =
    document.getElementById("type");

const categoryInput =
    document.getElementById("category");

const dateInput =
    document.getElementById("transaction-date");

const submitButton =
    document.getElementById("submit-button");

const loadingElement =
    document.getElementById("transactions-loading");

const emptyElement =
    document.getElementById("transactions-empty");

const listElement =
    document.getElementById("transactions-list");

const countElement =
    document.getElementById("transaction-count");

const logoutButton =
    document.getElementById("logout-button");


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


function showMessage(message, type) {

    messageElement.textContent = message;

    messageElement.className =
        `message ${type}`;

    setTimeout(() => {

        messageElement.classList.add(
            "hidden"
        );

    }, 4000);
}


function getAuthHeaders() {

    return {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
    };
}


function escapeHtml(value) {

    const div =
        document.createElement("div");

    div.textContent =
        value ?? "";

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

        localStorage.setItem(
            "orvix_user",
            JSON.stringify({
                name,
                email: user.email || ""
            })
        );
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

        throw new Error(
            "Não foi possível carregar as categorias."
        );
    }

    const data =
        await response.json();

    /*
     * A API pode retornar:
     *
     * [
     *     { id, name, type }
     * ]
     *
     * ou:
     *
     * {
     *     categories: [...]
     * }
     *
     * ou:
     *
     * {
     *     data: [...]
     * }
     */

    if (Array.isArray(data)) {

        categories = data;

    } else if (
        data &&
        Array.isArray(data.categories)
    ) {

        categories = data.categories;

    } else if (
        data &&
        Array.isArray(data.data)
    ) {

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

        const option =
            document.createElement("option");

        option.value =
            category.id;

        option.textContent =
            category.name;

        option.dataset.type =
            category.type;

        categoryInput.appendChild(
            option
        );
    });
}


/* =========================
   TRANSAÇÕES
========================= */

async function loadTransactions() {

    loadingElement.classList.remove(
        "hidden"
    );

    emptyElement.classList.add(
        "hidden"
    );

    const response = await fetch(
        `${API_URL}/transactions`,
        {
            method: "GET",
            headers: getAuthHeaders()
        }
    );

    if (!response.ok) {

        throw new Error(
            "Não foi possível carregar as transações."
        );
    }

    const data =
        await response.json();

    /*
     * Compatibilidade com diferentes
     * formatos de resposta da API.
     */

    if (Array.isArray(data)) {

        transactions = data;

    } else if (
        data &&
        Array.isArray(data.transactions)
    ) {

        transactions =
            data.transactions;

    } else if (
        data &&
        Array.isArray(data.data)
    ) {

        transactions =
            data.data;

    } else {

        transactions = [];
    }

    renderTransactions();
}


function renderTransactions() {

    loadingElement.classList.add(
        "hidden"
    );

    listElement.innerHTML = "";

    countElement.textContent =
        `${transactions.length} ${
            transactions.length === 1
                ? "transação"
                : "transações"
        }`;

    if (transactions.length === 0) {

        emptyElement.classList.remove(
            "hidden"
        );

        return;
    }

    emptyElement.classList.add(
        "hidden"
    );

    transactions.forEach(
        transaction => {

            const item =
                createTransactionElement(
                    transaction
                );

            listElement.appendChild(
                item
            );
        }
    );
}


function createTransactionElement(
    transaction
) {

    const item =
        document.createElement("div");

    item.className =
        "transaction-item";

    const isIncome =
        transaction.type === "income";

    const category =
        categories.find(
            category =>
                category.id ===
                transaction.category_id
        );

    const categoryName =
        category
            ? category.name
            : "Sem categoria";

    item.innerHTML = `

        <div class="transaction-main">

            <div
                class="transaction-icon ${
                    isIncome
                        ? "income"
                        : "expense"
                }"
            >
                ${isIncome ? "↑" : "↓"}
            </div>

            <div class="transaction-info">

                <span class="transaction-description">
                    ${escapeHtml(
                        transaction.description
                    )}
                </span>

                <span class="transaction-category">
                    ${escapeHtml(
                        categoryName
                    )}
                </span>

            </div>

        </div>


        <span
            class="transaction-type ${
                isIncome
                    ? "income"
                    : "expense"
            }"
        >
            ${
                isIncome
                    ? "Receita"
                    : "Despesa"
            }
        </span>


        <span class="transaction-date">
            ${formatDate(
                transaction.transaction_date
            )}
        </span>


        <span
            class="transaction-amount ${
                isIncome
                    ? "income"
                    : "expense"
            }"
        >
            ${isIncome ? "+" : "-"}
            ${formatCurrency(
                transaction.amount
            )}
        </span>


        <div class="transaction-actions">

            <button
                class="action-button"
                title="Editar"
                data-action="edit"
                data-id="${transaction.id}"
            >
                ✎
            </button>

            <button
                class="action-button delete"
                title="Excluir"
                data-action="delete"
                data-id="${transaction.id}"
            >
                ×
            </button>

        </div>

    `;

    return item;
}


/* =========================
   CRIAR TRANSAÇÃO
========================= */

async function createTransaction() {

    const description =
        descriptionInput.value.trim();

    const amount =
        Number(amountInput.value);

    const type =
        typeInput.value;

    const categoryId =
        categoryInput.value;

    const transactionDate =
        dateInput.value;

    if (!description) {

        throw new Error(
            "Informe uma descrição."
        );
    }

    if (!amount || amount <= 0) {

        throw new Error(
            "Informe um valor válido."
        );
    }

    if (!transactionDate) {

        throw new Error(
            "Informe a data da transação."
        );
    }

    const response =
        await fetch(
            `${API_URL}/transactions`,
            {
                method: "POST",

                headers:
                    getAuthHeaders(),

                body: JSON.stringify({
                    categoryId:
                        categoryId || null,

                    description,

                    amount,

                    type,

                    transactionDate
                })
            }
        );

    const data =
        await response.json();

    if (!response.ok) {

        throw new Error(
            data.error ||
            "Não foi possível criar a transação."
        );
    }

    return data;
}


/* =========================
   ATUALIZAR TRANSAÇÃO
========================= */

async function updateTransaction(id) {

    const description =
        descriptionInput.value.trim();

    const amount =
        Number(amountInput.value);

    const type =
        typeInput.value;

    const categoryId =
        categoryInput.value;

    const transactionDate =
        dateInput.value;

    if (!description) {

        throw new Error(
            "Informe uma descrição."
        );
    }

    if (!amount || amount <= 0) {

        throw new Error(
            "Informe um valor válido."
        );
    }

    if (!transactionDate) {

        throw new Error(
            "Informe a data da transação."
        );
    }

    const response =
        await fetch(
            `${API_URL}/transactions/${id}`,
            {
                method: "PUT",

                headers:
                    getAuthHeaders(),

                body: JSON.stringify({
                    categoryId:
                        categoryId || null,

                    description,

                    amount,

                    type,

                    transactionDate
                })
            }
        );

    const data =
        await response.json();

    if (!response.ok) {

        throw new Error(
            data.error ||
            "Não foi possível atualizar a transação."
        );
    }

    return data;
}


/* =========================
   FORMULÁRIO
========================= */

form.addEventListener(
    "submit",
    async function(event) {

        event.preventDefault();

        const editingId =
            form.dataset.editingId;

        submitButton.disabled = true;

        try {

            if (editingId) {

                submitButton.textContent =
                    "Atualizando...";

                await updateTransaction(
                    editingId
                );

                showMessage(
                    "Transação atualizada com sucesso.",
                    "success"
                );

            } else {

                submitButton.textContent =
                    "Salvando...";

                await createTransaction();

                showMessage(
                    "Transação adicionada com sucesso.",
                    "success"
                );
            }

            delete form.dataset.editingId;

            form.reset();

            setDefaultDate();

            submitButton.textContent =
                "Adicionar transação";

            await loadTransactions();

        } catch (error) {

            console.error(
                "Erro na transação:",
                error
            );

            showMessage(
                error.message ||
                "Não foi possível salvar a transação.",
                "error"
            );

        } finally {

            submitButton.disabled = false;

            if (!form.dataset.editingId) {

                submitButton.textContent =
                    "Adicionar transação";
            }
        }
    }
);


/* =========================
   AÇÕES DA LISTA
========================= */

listElement.addEventListener(
    "click",
    async function(event) {

        const button =
            event.target.closest(
                "[data-action]"
            );

        if (!button) {
            return;
        }

        const action =
            button.dataset.action;

        const id =
            button.dataset.id;

        if (action === "delete") {

            await deleteTransaction(id);

        } else if (action === "edit") {

            editTransaction(id);
        }
    }
);


/* =========================
   EXCLUIR
========================= */

async function deleteTransaction(id) {

    const transaction =
        transactions.find(
            item => item.id === id
        );

    if (!transaction) {
        return;
    }

    const confirmed =
        confirm(
            `Deseja excluir a transação "${transaction.description}"?`
        );

    if (!confirmed) {
        return;
    }

    try {

        const response =
            await fetch(
                `${API_URL}/transactions/${id}`,
                {
                    method: "DELETE",
                    headers: getAuthHeaders()
                }
            );

        const data =
            await response.json();

        if (!response.ok) {

            throw new Error(
                data.error ||
                "Não foi possível excluir a transação."
            );
        }

        showMessage(
            "Transação excluída com sucesso.",
            "success"
        );

        await loadTransactions();

    } catch (error) {

        console.error(
            "Erro ao excluir:",
            error
        );

        showMessage(
            error.message ||
            "Não foi possível excluir a transação.",
            "error"
        );
    }
}


/* =========================
   EDITAR
========================= */

function editTransaction(id) {

    const transaction =
        transactions.find(
            item => item.id === id
        );

    if (!transaction) {
        return;
    }

    descriptionInput.value =
        transaction.description;

    amountInput.value =
        transaction.amount;

    typeInput.value =
        transaction.type;

    categoryInput.value =
        transaction.category_id || "";

    dateInput.value =
        transaction.transaction_date
            .split("T")[0];

    form.dataset.editingId =
        transaction.id;

    submitButton.textContent =
        "Atualizar transação";

    form.scrollIntoView({
        behavior: "smooth",
        block: "start"
    });
}


/* =========================
   DATA PADRÃO
========================= */

function setDefaultDate() {

    const today =
        new Date();

    const year =
        today.getFullYear();

    const month =
        String(
            today.getMonth() + 1
        ).padStart(2, "0");

    const day =
        String(
            today.getDate()
        ).padStart(2, "0");

    dateInput.value =
        `${year}-${month}-${day}`;
}


/* =========================
   LOGOUT
========================= */

logoutButton.addEventListener(
    "click",
    function() {

        localStorage.removeItem(
            "orvix_token"
        );

        window.location.href =
            "/login.html";
    }
);


/* =========================
   INICIALIZAÇÃO
========================= */

async function initialize() {

    if (!token) {

        window.location.href =
            "/login.html";

        return;
    }

    try {

        setDefaultDate();

        await loadUser();

        await loadCategories();

        await loadTransactions();

    } catch (error) {

        console.error(
            "Erro ao inicializar transações:",
            error
        );

        if (
            error.message.includes(
                "Sessão"
            )
        ) {

            localStorage.removeItem(
                "orvix_token"
            );

            window.location.href =
                "/login.html";

            return;
        }

        loadingElement.classList.add(
            "hidden"
        );

        showMessage(
            error.message ||
            "Não foi possível carregar a página.",
            "error"
        );
    }
}


initialize();