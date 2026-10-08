const API_URL = "/api";

let goals = [];
let editingGoalId = null;

const token =
    localStorage.getItem("orvix_token");


/* =========================
   ELEMENTOS
========================= */

const userNameElement =
    document.getElementById("user-name");

const userInitialElement =
    document.getElementById("user-initial");

const messageElement =
    document.getElementById("message");

const totalGoalsElement =
    document.getElementById("total-goals");

const totalCurrentElement =
    document.getElementById("total-current");

const totalTargetElement =
    document.getElementById("total-target");

const goalFormSection =
    document.getElementById("goal-form-section");

const goalForm =
    document.getElementById("goal-form");

const formTitle =
    document.getElementById("form-title");

const goalNameInput =
    document.getElementById("goal-name");

const targetAmountInput =
    document.getElementById("target-amount");

const currentAmountInput =
    document.getElementById("current-amount");

const deadlineInput =
    document.getElementById("deadline");

const submitButton =
    document.getElementById("submit-button");

const cancelButton =
    document.getElementById("cancel-button");

const newGoalButton =
    document.getElementById("new-goal-button");

const emptyNewButton =
    document.getElementById("empty-new-button");

const loadingElement =
    document.getElementById("goals-loading");

const emptyElement =
    document.getElementById("goals-empty");

const goalsListElement =
    document.getElementById("goals-list");

const goalCountElement =
    document.getElementById("goal-count");

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
        return "Sem prazo";
    }

    const [year, month, day] =
        date.split("T")[0].split("-");

    return `${day}/${month}/${year}`;
}


function showMessage(message, type) {

    messageElement.textContent =
        message;

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

    const safeName =
        name || "Usuário";

    if (userNameElement) {
        userNameElement.textContent = safeName;
    }

    if (userInitialElement) {
        userInitialElement.textContent =
            safeName
                .trim()
                .charAt(0)
                .toUpperCase();
    }
}


function readStoredUser() {

    try {
        const raw =
            localStorage.getItem("orvix_user");

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

    const response =
        await fetch(
            `${API_URL}/auth/me`,
            {
                method: "GET",
                headers: getAuthHeaders()
            }
        );


    if (!response.ok) {

        throw new Error(
            "Sessão expirada."
        );
    }


    const data =
        await response.json();


    const user =
        data.user || data;


    const name =
        user.name || user.username || user.full_name || readStoredUser();

    applyUserName(name);

    localStorage.setItem(
        "orvix_user",
        JSON.stringify({
            name,
            email: user.email || ""
        })
    );
    localStorage.setItem("orvix_user_name", name);
}


/* =========================
   CARREGAR METAS
========================= */

async function loadGoals() {

    loadingElement.classList.remove(
        "hidden"
    );

    emptyElement.classList.add(
        "hidden"
    );


    const response =
        await fetch(
            `${API_URL}/goals`,
            {
                method: "GET",
                headers: getAuthHeaders()
            }
        );


    if (!response.ok) {

        throw new Error(
            "Não foi possível carregar as metas."
        );
    }


    const data =
        await response.json();


    if (Array.isArray(data)) {

        goals = data;

    } else if (
        data &&
        Array.isArray(data.goals)
    ) {

        goals = data.goals;

    } else if (
        data &&
        Array.isArray(data.data)
    ) {

        goals = data.data;

    } else {

        goals = [];
    }


    renderGoals();
}


/* =========================
   RESUMO
========================= */

function updateSummary() {

    const totalGoals =
        goals.length;


    const totalCurrent =
        goals.reduce(
            (total, goal) => {

                return total +
                    Number(
                        goal.current_amount || 0
                    );

            },
            0
        );


    const totalTarget =
        goals.reduce(
            (total, goal) => {

                return total +
                    Number(
                        goal.target_amount || 0
                    );

            },
            0
        );


    totalGoalsElement.textContent =
        totalGoals;


    totalCurrentElement.textContent =
        formatCurrency(
            totalCurrent
        );


    totalTargetElement.textContent =
        formatCurrency(
            totalTarget
        );


    goalCountElement.textContent =
        `${totalGoals} ${
            totalGoals === 1
                ? "meta"
                : "metas"
        }`;
}


/* =========================
   RENDERIZAR
========================= */

function renderGoals() {

    loadingElement.classList.add(
        "hidden"
    );


    goalsListElement.innerHTML =
        "";


    updateSummary();


    if (goals.length === 0) {

        emptyElement.classList.remove(
            "hidden"
        );

        return;
    }


    emptyElement.classList.add(
        "hidden"
    );


    goals.forEach(goal => {

        const element =
            createGoalElement(goal);

        goalsListElement.appendChild(
            element
        );
    });
}


/* =========================
   CARD DA META
========================= */

function createGoalElement(goal) {

    const card =
        document.createElement("article");


    card.className =
        "goal-card";


    const target =
        Number(
            goal.target_amount || 0
        );


    const current =
        Number(
            goal.current_amount || 0
        );


    let percentage =
        target > 0
            ? (current / target) * 100
            : 0;


    percentage =
        Math.min(
            Math.max(
                percentage,
                0
            ),
            100
        );


    const roundedPercentage =
        Math.round(
            percentage
        );


    card.innerHTML = `

        <div class="goal-top">

            <div>

                <h3 class="goal-name">
                    ${escapeHtml(
                        goal.name
                    )}
                </h3>

                <p class="goal-deadline">
                    ${
                        goal.deadline
                            ? `Prazo: ${formatDate(
                                goal.deadline
                            )}`
                            : "Sem prazo definido"
                    }
                </p>

            </div>


            <strong class="goal-percentage">
                ${roundedPercentage}%
            </strong>

        </div>


        <div class="goal-values">

            <div>

                <span>
                    Acumulado
                </span>

                <strong>
                    ${formatCurrency(
                        current
                    )}
                </strong>

            </div>


            <div>

                <span>
                    Objetivo
                </span>

                <strong>
                    ${formatCurrency(
                        target
                    )}
                </strong>

            </div>

        </div>


        <div class="progress-container">

            <div
                class="progress-bar"
                style="width: ${roundedPercentage}%"
            ></div>

        </div>


        <div class="goal-actions">

            <button
                class="action-button"
                title="Editar"
                data-action="edit"
                data-id="${goal.id}"
            >
                ✎
            </button>


            <button
                class="action-button delete"
                title="Excluir"
                data-action="delete"
                data-id="${goal.id}"
            >
                ×
            </button>

        </div>

    `;


    return card;
}


/* =========================
   ABRIR FORMULÁRIO
========================= */

function openCreateForm() {

    editingGoalId = null;


    formTitle.textContent =
        "Criar meta";


    submitButton.textContent =
        "Criar meta";


    goalForm.reset();


    currentAmountInput.value =
        "0";


    goalFormSection.classList.remove(
        "hidden"
    );


    goalNameInput.focus();


    goalFormSection.scrollIntoView({
        behavior: "smooth",
        block: "start"
    });
}


/* =========================
   EDITAR
========================= */

function openEditForm(id) {

    const goal =
        goals.find(
            item => item.id === id
        );


    if (!goal) {
        return;
    }


    editingGoalId =
        goal.id;


    formTitle.textContent =
        "Editar meta";


    submitButton.textContent =
        "Atualizar meta";


    goalNameInput.value =
        goal.name;


    targetAmountInput.value =
        goal.target_amount;


    currentAmountInput.value =
        goal.current_amount;


    deadlineInput.value =
        goal.deadline
            ? goal.deadline
                .split("T")[0]
            : "";


    goalFormSection.classList.remove(
        "hidden"
    );


    goalNameInput.focus();


    goalFormSection.scrollIntoView({
        behavior: "smooth",
        block: "start"
    });
}


/* =========================
   FECHAR FORMULÁRIO
========================= */

function closeForm() {

    editingGoalId = null;


    goalForm.reset();


    currentAmountInput.value =
        "0";


    goalFormSection.classList.add(
        "hidden"
    );
}


/* =========================
   CRIAR META
========================= */

async function createGoal() {

    const name =
        goalNameInput.value.trim();


    const targetAmount =
        Number(
            targetAmountInput.value
        );


    const currentAmount =
        Number(
            currentAmountInput.value || 0
        );


    const deadline =
        deadlineInput.value || null;


    if (!name) {

        throw new Error(
            "Informe o nome da meta."
        );
    }


    if (
        !targetAmount ||
        targetAmount <= 0
    ) {

        throw new Error(
            "Informe um valor objetivo válido."
        );
    }


    if (currentAmount < 0) {

        throw new Error(
            "O valor atual não pode ser negativo."
        );
    }


    if (
        currentAmount >
        targetAmount
    ) {

        throw new Error(
            "O valor atual não pode ser maior que o objetivo."
        );
    }


    const response =
        await fetch(
            `${API_URL}/goals`,
            {
                method: "POST",

                headers:
                    getAuthHeaders(),

                body: JSON.stringify({
                    name,
                    targetAmount,
                    currentAmount,
                    deadline
                })
            }
        );


    const data =
        await response.json();


    if (!response.ok) {

        throw new Error(
            data.error ||
            "Não foi possível criar a meta."
        );
    }


    return data;
}


/* =========================
   ATUALIZAR META
========================= */

async function updateGoal() {

    const name =
        goalNameInput.value.trim();


    const targetAmount =
        Number(
            targetAmountInput.value
        );


    const currentAmount =
        Number(
            currentAmountInput.value || 0
        );


    const deadline =
        deadlineInput.value || null;


    if (!name) {

        throw new Error(
            "Informe o nome da meta."
        );
    }


    if (
        !targetAmount ||
        targetAmount <= 0
    ) {

        throw new Error(
            "Informe um valor objetivo válido."
        );
    }


    if (currentAmount < 0) {

        throw new Error(
            "O valor atual não pode ser negativo."
        );
    }


    if (
        currentAmount >
        targetAmount
    ) {

        throw new Error(
            "O valor atual não pode ser maior que o objetivo."
        );
    }


    const response =
        await fetch(
            `${API_URL}/goals/${editingGoalId}`,
            {
                method: "PUT",

                headers:
                    getAuthHeaders(),

                body: JSON.stringify({
                    name,
                    targetAmount,
                    currentAmount,
                    deadline
                })
            }
        );


    const data =
        await response.json();


    if (!response.ok) {

        throw new Error(
            data.error ||
            "Não foi possível atualizar a meta."
        );
    }


    return data;
}


/* =========================
   FORM SUBMIT
========================= */

goalForm.addEventListener(
    "submit",
    async function(event) {

        event.preventDefault();


        submitButton.disabled =
            true;


        try {

            if (editingGoalId) {

                submitButton.textContent =
                    "Atualizando...";


                await updateGoal();


                showMessage(
                    "Meta atualizada com sucesso.",
                    "success"
                );

            } else {

                submitButton.textContent =
                    "Criando...";


                await createGoal();


                showMessage(
                    "Meta criada com sucesso.",
                    "success"
                );
            }


            closeForm();


            await loadGoals();

        } catch (error) {

            console.error(
                "Erro na meta:",
                error
            );


            showMessage(
                error.message ||
                "Não foi possível salvar a meta.",
                "error"
            );

        } finally {

            submitButton.disabled =
                false;


            submitButton.textContent =
                editingGoalId
                    ? "Atualizar meta"
                    : "Criar meta";
        }
    }
);


/* =========================
   AÇÕES DOS CARDS
========================= */

goalsListElement.addEventListener(
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


        if (action === "edit") {

            openEditForm(id);

        } else if (
            action === "delete"
        ) {

            await deleteGoal(id);
        }
    }
);


/* =========================
   EXCLUIR META
========================= */

async function deleteGoal(id) {

    const goal =
        goals.find(
            item => item.id === id
        );


    if (!goal) {
        return;
    }


    const confirmed =
        confirm(
            `Deseja excluir a meta "${goal.name}"?`
        );


    if (!confirmed) {
        return;
    }


    try {

        const response =
            await fetch(
                `${API_URL}/goals/${id}`,
                {
                    method: "DELETE",
                    headers:
                        getAuthHeaders()
                }
            );


        const data =
            await response.json();


        if (!response.ok) {

            throw new Error(
                data.error ||
                "Não foi possível excluir a meta."
            );
        }


        showMessage(
            "Meta excluída com sucesso.",
            "success"
        );


        await loadGoals();

    } catch (error) {

        console.error(
            "Erro ao excluir meta:",
            error
        );


        showMessage(
            error.message ||
            "Não foi possível excluir a meta.",
            "error"
        );
    }
}


/* =========================
   BOTÕES
========================= */

newGoalButton.addEventListener(
    "click",
    openCreateForm
);


emptyNewButton.addEventListener(
    "click",
    openCreateForm
);


cancelButton.addEventListener(
    "click",
    closeForm
);


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


    const storedUser = readStoredUser();
    applyUserName(storedUser);

    try {

        await loadUser();

        await loadGoals();

    } catch (error) {

        console.error(
            "Erro ao inicializar metas:",
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