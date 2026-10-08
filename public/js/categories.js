const token = localStorage.getItem("orvix_token");

if (!token) {
    window.location.href = "/login.html";
}


// ========================================
// ELEMENTOS
// ========================================

const incomeCategoriesElement =
    document.getElementById(
        "income-categories"
    );

const expenseCategoriesElement =
    document.getElementById(
        "expense-categories"
    );

const totalCategoriesElement =
    document.getElementById(
        "total-categories"
    );

const totalIncomeElement =
    document.getElementById(
        "total-income"
    );

const totalExpenseElement =
    document.getElementById(
        "total-expense"
    );

const addCategoryButton =
    document.getElementById(
        "add-category-button"
    );

const logoutButton =
    document.getElementById(
        "logout-button"
    );

const userNameElements =
    document.querySelectorAll("#user-name, [data-user-name]");

const userAvatarElements =
    document.querySelectorAll("#user-avatar, [data-user-initial]");

const modal =
    document.getElementById(
        "category-modal"
    );

const modalTitle =
    document.getElementById(
        "modal-title"
    );

const closeModalButton =
    document.getElementById(
        "close-modal-button"
    );

const cancelButton =
    document.getElementById(
        "cancel-button"
    );

const categoryForm =
    document.getElementById(
        "category-form"
    );

const categoryIdInput =
    document.getElementById(
        "category-id"
    );

const categoryNameInput =
    document.getElementById(
        "category-name"
    );

const categoryTypeInput =
    document.getElementById(
        "category-type"
    );

const formError =
    document.getElementById(
        "form-error"
    );


let categories = [];


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
// SEGURANÇA — HTML
// ========================================

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
// USUÁRIO
// ========================================

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


async function loadUser() {

    try {

        const data =
            await apiRequest(
                "/api/auth/me"
            );

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

        if (user.email) {
            localStorage.setItem("orvix_user_email", user.email);
        }

    } catch (error) {

        console.error(
            "Erro ao carregar usuário:",
            error
        );
        applyUserName(readStoredUser());
    }
}


// ========================================
// CARREGAR CATEGORIAS
// ========================================

async function loadCategories() {

    incomeCategoriesElement.innerHTML = `
        <div class="categories-loading">
            Carregando categorias...
        </div>
    `;


    expenseCategoriesElement.innerHTML = `
        <div class="categories-loading">
            Carregando categorias...
        </div>
    `;


    try {

        const data =
            await apiRequest(
                "/api/categories"
            );


        categories =
            Array.isArray(
                data.categories
            )
                ? data.categories
                : [];


        renderSummary();


        renderCategories();

    } catch (error) {

        console.error(
            "Erro ao carregar categorias:",
            error
        );


        incomeCategoriesElement.innerHTML = `
            <div class="empty-categories">
                Não foi possível carregar as categorias.
            </div>
        `;


        expenseCategoriesElement.innerHTML = `
            <div class="empty-categories">
                Não foi possível carregar as categorias.
            </div>
        `;
    }
}


// ========================================
// RESUMO
// ========================================

function renderSummary() {

    const incomeCount =
        categories.filter(
            category =>
                category.type ===
                "income"
        ).length;


    const expenseCount =
        categories.filter(
            category =>
                category.type ===
                "expense"
        ).length;


    totalCategoriesElement.textContent =
        categories.length;


    totalIncomeElement.textContent =
        incomeCount;


    totalExpenseElement.textContent =
        expenseCount;
}


// ========================================
// RENDERIZAR CATEGORIAS
// ========================================

function renderCategories() {

    const incomeCategories =
        categories.filter(
            category =>
                category.type ===
                "income"
        );


    const expenseCategories =
        categories.filter(
            category =>
                category.type ===
                "expense"
        );


    renderCategoryList(
        incomeCategories,
        incomeCategoriesElement,
        "income"
    );


    renderCategoryList(
        expenseCategories,
        expenseCategoriesElement,
        "expense"
    );
}


// ========================================
// RENDERIZAR LISTA
// ========================================

function renderCategoryList(
    categoryList,
    container,
    type
) {

    if (!categoryList.length) {

        container.innerHTML = `
            <div class="empty-categories">
                Nenhuma categoria de ${
                    type === "income"
                        ? "receita"
                        : "despesa"
                } cadastrada.
            </div>
        `;

        return;
    }


    container.innerHTML = "";


    categoryList.forEach(
        category => {

            const card =
                document.createElement(
                    "article"
                );


            card.className =
                "category-card";


            const icon =
                type === "income"
                    ? "↑"
                    : "↓";


            const typeLabel =
                type === "income"
                    ? "Receita"
                    : "Despesa";


            card.innerHTML = `
                <div class="category-info">

                    <div
                        class="category-icon ${type}"
                    >
                        ${icon}
                    </div>


                    <div class="category-details">

                        <h3>
                            ${escapeHtml(
                                category.name
                            )}
                        </h3>

                        <span>
                            ${typeLabel}
                        </span>

                    </div>

                </div>


                <div class="category-actions">

                    <button
                        type="button"
                        class="category-action edit"
                        data-id="${category.id}"
                        title="Editar categoria"
                    >
                        ✎
                    </button>


                    <button
                        type="button"
                        class="category-action delete"
                        data-id="${category.id}"
                        title="Excluir categoria"
                    >
                        ×
                    </button>

                </div>
            `;


            container.appendChild(
                card
            );
        }
    );


    attachCategoryActions();
}


// ========================================
// AÇÕES DAS CATEGORIAS
// ========================================

function attachCategoryActions() {

    const editButtons =
        document.querySelectorAll(
            ".category-action.edit"
        );


    const deleteButtons =
        document.querySelectorAll(
            ".category-action.delete"
        );


    editButtons.forEach(
        button => {

            button.addEventListener(
                "click",
                () => {

                    const category =
                        categories.find(
                            item =>
                                item.id ===
                                button.dataset.id
                        );


                    if (category) {

                        openEditModal(
                            category
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

                    const category =
                        categories.find(
                            item =>
                                item.id ===
                                button.dataset.id
                        );


                    if (!category) {
                        return;
                    }


                    const confirmed =
                        confirm(
                            `Deseja realmente excluir a categoria "${category.name}"?`
                        );


                    if (!confirmed) {
                        return;
                    }


                    await deleteCategory(
                        category.id
                    );
                }
            );
        }
    );
}


// ========================================
// CRIAR CATEGORIA
// ========================================

async function createCategory() {

    const name =
        categoryNameInput.value.trim();

    const type =
        categoryTypeInput.value;


    if (!name) {

        showFormError(
            "Informe o nome da categoria."
        );

        return;
    }


    if (!type) {

        showFormError(
            "Selecione o tipo da categoria."
        );

        return;
    }


    try {

        await apiRequest(
            "/api/categories",
            {
                method: "POST",

                body:
                    JSON.stringify({
                        name,
                        type
                    })
            }
        );


        closeModal();

        await loadCategories();

    } catch (error) {

        console.error(
            "Erro ao criar categoria:",
            error
        );


        showFormError(
            error.message
        );
    }
}


// ========================================
// ATUALIZAR CATEGORIA
// ========================================

async function updateCategory() {

    const categoryId =
        categoryIdInput.value;

    const name =
        categoryNameInput.value.trim();

    const type =
        categoryTypeInput.value;


    if (!categoryId) {

        showFormError(
            "Categoria inválida."
        );

        return;
    }


    if (!name) {

        showFormError(
            "Informe o nome da categoria."
        );

        return;
    }


    if (!type) {

        showFormError(
            "Selecione o tipo da categoria."
        );

        return;
    }


    try {

        await apiRequest(
            `/api/categories/${categoryId}`,
            {
                method: "PUT",

                body:
                    JSON.stringify({
                        name,
                        type
                    })
            }
        );


        closeModal();

        await loadCategories();

    } catch (error) {

        console.error(
            "Erro ao atualizar categoria:",
            error
        );


        showFormError(
            error.message
        );
    }
}


// ========================================
// EXCLUIR CATEGORIA
// ========================================

async function deleteCategory(
    categoryId
) {

    try {

        await apiRequest(
            `/api/categories/${categoryId}`,
            {
                method: "DELETE"
            }
        );


        await loadCategories();

    } catch (error) {

        console.error(
            "Erro ao excluir categoria:",
            error
        );


        alert(
            error.message
        );
    }
}


// ========================================
// MODAL — NOVA CATEGORIA
// ========================================

function openCreateModal() {

    modalTitle.textContent =
        "Nova categoria";


    categoryIdInput.value =
        "";


    categoryNameInput.value =
        "";


    categoryTypeInput.value =
        "";


    hideFormError();


    modal.classList.remove(
        "hidden"
    );


    categoryNameInput.focus();
}


// ========================================
// MODAL — EDITAR
// ========================================

function openEditModal(
    category
) {

    modalTitle.textContent =
        "Editar categoria";


    categoryIdInput.value =
        category.id;


    categoryNameInput.value =
        category.name;


    categoryTypeInput.value =
        category.type;


    hideFormError();


    modal.classList.remove(
        "hidden"
    );


    categoryNameInput.focus();
}


// ========================================
// FECHAR MODAL
// ========================================

function closeModal() {

    modal.classList.add(
        "hidden"
    );


    categoryForm.reset();


    categoryIdInput.value =
        "";


    hideFormError();
}


// ========================================
// ERRO DO FORMULÁRIO
// ========================================

function showFormError(
    message
) {

    formError.textContent =
        message;


    formError.classList.remove(
        "hidden"
    );
}


function hideFormError() {

    formError.textContent =
        "";


    formError.classList.add(
        "hidden"
    );
}


// ========================================
// SUBMIT
// ========================================

async function handleFormSubmit(
    event
) {

    event.preventDefault();


    hideFormError();


    const categoryId =
        categoryIdInput.value;


    if (categoryId) {

        await updateCategory();

    } else {

        await createCategory();
    }
}


// ========================================
// LOGOUT
// ========================================

function logout() {

    localStorage.removeItem(
        "orvix_token"
    );


    window.location.href =
        "/login.html";
}


// ========================================
// EVENTOS
// ========================================

addCategoryButton.addEventListener(
    "click",
    openCreateModal
);


closeModalButton.addEventListener(
    "click",
    closeModal
);


cancelButton.addEventListener(
    "click",
    closeModal
);


categoryForm.addEventListener(
    "submit",
    handleFormSubmit
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

    await loadUser();

    await loadCategories();
}


initialize();