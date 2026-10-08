const token = localStorage.getItem("orvix_token");

if (!token) {
    window.location.href = "/login.html";
}


// ========================================
// ELEMENTOS
// ========================================

const userNameElements =
    document.querySelectorAll("#user-name, [data-user-name]");

const userAvatarElements =
    document.querySelectorAll("#user-avatar, [data-user-initial]");

const logoutButton =
    document.getElementById(
        "logout-button"
    );

const startDateInput =
    document.getElementById(
        "start-date"
    );

const endDateInput =
    document.getElementById(
        "end-date"
    );

const generateInsightsButton =
    document.getElementById(
        "generate-insights-button"
    );

const insightsError =
    document.getElementById(
        "insights-error"
    );

const insightsLoading =
    document.getElementById(
        "insights-loading"
    );

const insightsContent =
    document.getElementById(
        "insights-content"
    );

const insightIncome =
    document.getElementById(
        "insight-income"
    );

const insightExpense =
    document.getElementById(
        "insight-expense"
    );

const insightBalance =
    document.getElementById(
        "insight-balance"
    );

const insightTransactions =
    document.getElementById(
        "insight-transactions"
    );

const insightsList =
    document.getElementById(
        "insights-list"
    );

const topCategories =
    document.getElementById(
        "top-categories"
    );

const insightPeriod =
    document.getElementById(
        "insight-period"
    );


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
// FORMATAÇÃO
// ========================================

function formatCurrency(
    value
) {
    return Number(value)
        .toLocaleString(
            "pt-BR",
            {
                style: "currency",
                currency: "BRL"
            }
        );
}


function formatNumber(
    value
) {
    return Number(value)
        .toLocaleString(
            "pt-BR"
        );
}


function formatDate(
    dateString
) {
    const date =
        new Date(
            `${dateString}T00:00:00`
        );


    return date.toLocaleDateString(
        "pt-BR"
    );
}


// ========================================
// DATAS PADRÃO
// ========================================

function setDefaultDates() {

    const today =
        new Date();


    const year =
        today.getFullYear();


    const month =
        String(
            today.getMonth() + 1
        ).padStart(
            2,
            "0"
        );


    const day =
        String(
            today.getDate()
        ).padStart(
            2,
            "0"
        );


    startDateInput.value =
        `${year}-01-01`;


    endDateInput.value =
        `${year}-${month}-${day}`;
}


// ========================================
// ERRO
// ========================================

function showError(
    message
) {
    insightsError.textContent =
        message;


    insightsError.classList.remove(
        "hidden"
    );
}


function hideError() {

    insightsError.textContent =
        "";


    insightsError.classList.add(
        "hidden"
    );
}


// ========================================
// LOADING
// ========================================

function setLoading(
    loading
) {

    if (loading) {

        insightsLoading.classList.remove(
            "hidden"
        );


        insightsContent.classList.add(
            "hidden"
        );


        generateInsightsButton.disabled =
            true;

    } else {

        insightsLoading.classList.add(
            "hidden"
        );


        insightsContent.classList.remove(
            "hidden"
        );


        generateInsightsButton.disabled =
            false;
    }
}


// ========================================
// GERAR INSIGHTS
// ========================================

async function generateInsights() {

    const startDate =
        startDateInput.value;


    const endDate =
        endDateInput.value;


    hideError();


    if (
        !startDate ||
        !endDate
    ) {

        showError(
            "Informe a data inicial e a data final."
        );

        return;
    }


    if (
        startDate > endDate
    ) {

        showError(
            "A data inicial não pode ser maior que a data final."
        );

        return;
    }


    setLoading(true);


    try {

        const params =
            new URLSearchParams({
                start_date:
                    startDate,

                end_date:
                    endDate
            });


        const data =
            await apiRequest(
                `/api/insights/financial?${params.toString()}`
            );


        renderInsights(
            data
        );

    } catch (error) {

        console.error(
            "Erro ao carregar insights:",
            error
        );


        showError(
            error.message
        );


        insightsContent.classList.add(
            "hidden"
        );

    } finally {

        setLoading(false);
    }
}


// ========================================
// RENDERIZAR
// ========================================

function renderInsights(
    data
) {

    renderSummary(
        data.summary
    );


    renderInsightCards(
        data.insights
    );


    renderTopCategories(
        data.top_categories
    );


    renderPeriod(
        data.period
    );
}


// ========================================
// RESUMO
// ========================================

function renderSummary(
    summary
) {

    insightIncome.textContent =
        formatCurrency(
            summary.income
        );


    insightExpense.textContent =
        formatCurrency(
            summary.expense
        );


    insightBalance.textContent =
        formatCurrency(
            summary.balance
        );


    insightTransactions.textContent =
        formatNumber(
            summary.transactions
        );


    insightBalance.classList.remove(
        "positive-balance",
        "negative-balance"
    );


    if (
        Number(summary.balance) < 0
    ) {

        insightBalance.classList.add(
            "negative-balance"
        );

    } else {

        insightBalance.classList.add(
            "positive-balance"
        );
    }
}


// ========================================
// CARDS DE INSIGHTS
// ========================================

function renderInsightCards(
    insights
) {

    if (
        !insights ||
        !insights.length
    ) {

        insightsList.innerHTML = `
            <div class="insights-empty">
                Ainda não existem insights suficientes para este período.
            </div>
        `;

        return;
    }


    insightsList.innerHTML =
        insights
            .map(
                insight => `
                    <article
                        class="insight-card ${escapeHtml(
                            insight.type
                        )}"
                    >

                        <div class="insight-card-top">

                            <div class="insight-icon">
                                ${escapeHtml(
                                    insight.icon
                                )}
                            </div>


                            <div class="insight-card-content">

                                <h3 class="insight-card-title">
                                    ${escapeHtml(
                                        insight.title
                                    )}
                                </h3>


                                <p class="insight-card-message">
                                    ${escapeHtml(
                                        insight.message
                                    )}
                                </p>

                            </div>

                        </div>

                    </article>
                `
            )
            .join("");
}


// ========================================
// TOP CATEGORIAS
// ========================================

function renderTopCategories(
    categories
) {

    if (
        !categories ||
        !categories.length
    ) {

        topCategories.innerHTML = `
            <div class="categories-empty">
                Nenhuma despesa encontrada no período.
            </div>
        `;

        return;
    }


    const total =
        categories.reduce(
            (
                sum,
                category
            ) =>
                sum +
                Number(
                    category.total
                ),
            0
        );


    topCategories.innerHTML =
        categories
            .map(
                category => {

                    const amount =
                        Number(
                            category.total
                        );


                    const percentage =
                        total > 0
                            ? (
                                amount /
                                total
                            ) * 100
                            : 0;


                    return `
                        <div class="category-item">

                            <div class="category-info">

                                <p class="category-name">
                                    ${escapeHtml(
                                        category.category_name
                                    )}
                                </p>


                                <span class="category-value">
                                    ${formatCurrency(
                                        amount
                                    )}
                                </span>

                            </div>


                            <div class="category-bar">

                                <div
                                    class="category-progress"
                                    style="width: ${percentage}%;"
                                ></div>

                            </div>


                            <span class="category-percentage">
                                ${percentage.toFixed(
                                    1
                                )}%
                            </span>

                        </div>
                    `;
                }
            )
            .join("");
}


// ========================================
// PERÍODO
// ========================================

function renderPeriod(
    period
) {

    insightPeriod.textContent =
        `${formatDate(
            period.start_date
        )} até ${formatDate(
            period.end_date
        )}`;
}


// ========================================
// SEGURANÇA
// ========================================

function escapeHtml(
    value
) {
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

generateInsightsButton.addEventListener(
    "click",
    generateInsights
);


logoutButton.addEventListener(
    "click",
    logout
);


// ========================================
// INICIALIZAÇÃO
// ========================================

async function initialize() {

    setDefaultDates();


    await loadUser();


    await generateInsights();
}


initialize();