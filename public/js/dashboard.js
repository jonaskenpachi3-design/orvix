const API_URL = "/api";


let evolutionChart = null;

let categoryChart = null;


// =========================================================
// ELEMENTOS
// =========================================================

const loadingElement =
    document.getElementById("loading");


const errorElement =
    document.getElementById("error-message");


const dashboardContent =
    document.getElementById("dashboard-content");


const userNameElements =
    document.querySelectorAll("[data-user-name]");


const userInitialElements =
    document.querySelectorAll("[data-user-initial]");


const totalIncomeElement =
    document.getElementById("total-income");


const totalExpenseElement =
    document.getElementById("total-expense");


const balanceElement =
    document.getElementById("balance");


const incomeComparisonElement =
    document.getElementById("income-comparison");


const expenseComparisonElement =
    document.getElementById("expense-comparison");


const balanceComparisonElement =
    document.getElementById("balance-comparison");


const savingRateElement =
    document.getElementById("saving-rate");


const topCategoryElement =
    document.getElementById("top-category");


const financialStatusElement =
    document.getElementById("financial-status");


const mainInsightElement =
    document.getElementById("main-insight");


const logoutButton =
    document.getElementById("logout-button");


const goalsContainer =
    document.getElementById("dashboard-goals");


const periodSelect =
    document.getElementById("period-select");


// =========================================================
// FORMATAÇÃO
// =========================================================

function formatCurrency(value) {

    return Number(value || 0).toLocaleString(
        "pt-BR",
        {
            style: "currency",
            currency: "BRL"
        }
    );

}


function applyUserName(name) {

    const safeName =
        name || "Usuário";

    userNameElements.forEach((element) => {
        element.textContent = safeName;
    });

    const initial =
        safeName
            .trim()
            .charAt(0)
            .toUpperCase() || "U";

    userInitialElements.forEach((element) => {
        element.textContent = initial;
    });
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


function formatMonth(month) {

    if (!month) {
        return "";
    }


    const [
        year,
        monthNumber
    ] = month.split("-");


    const date =
        new Date(
            Number(year),
            Number(monthNumber) - 1,
            1
        );


    return date.toLocaleDateString(
        "pt-BR",
        {
            month: "short",
            year: "numeric"
        }
    );

}


function formatDate(dateString) {

    if (!dateString) {
        return "Sem prazo definido";
    }


    const [
        year,
        month,
        day
    ] = dateString.split("-");


    const date =
        new Date(
            Number(year),
            Number(month) - 1,
            Number(day)
        );


    return date.toLocaleDateString(
        "pt-BR"
    );

}


// =========================================================
// ERRO
// =========================================================

function showError(message) {

    loadingElement.classList.add(
        "hidden"
    );


    dashboardContent.classList.add(
        "hidden"
    );


    errorElement.textContent =
        message;


    errorElement.classList.remove(
        "hidden"
    );

}


// =========================================================
// CARREGAR USUÁRIO
// =========================================================

async function loadUser() {

    const token =
        localStorage.getItem(
            "orvix_token"
        );


    if (!token) {

        throw new Error(
            "Token não encontrado."
        );

    }


    const response =
        await fetch(
            `${API_URL}/auth/me`,
            {
                method: "GET",

                headers: {

                    Authorization:
                        `Bearer ${token}`,

                    "Content-Type":
                        "application/json"

                }
            }
        );


    if (!response.ok) {

        if (
            response.status === 401
        ) {

            throw new Error(
                "Sessão expirada. Faça login novamente."
            );

        }


        throw new Error(
            `Erro ao validar sessão: ${response.status}`
        );

    }


    const data =
        await response.json();


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

    return user;

}


// =========================================================
// CARREGAR DASHBOARD
// =========================================================

async function loadDashboard(
    period = "this_month"
) {

    const token =
        localStorage.getItem(
            "orvix_token"
        );


    if (!token) {

        throw new Error(
            "Token não encontrado."
        );

    }


    applyUserName(readStoredUser());

    const response =
        await fetch(
            `${API_URL}/dashboard?period=${encodeURIComponent(period)}`,
            {
                method: "GET",

                headers: {

                    Authorization:
                        `Bearer ${token}`,

                    "Content-Type":
                        "application/json"

                }
            }
        );


    if (!response.ok) {

        if (
            response.status === 401
        ) {

            throw new Error(
                "Sessão expirada. Faça login novamente."
            );

        }


        throw new Error(
            `Erro ao carregar dashboard: ${response.status}`
        );

    }


    return await response.json();

}


// =========================================================
// CARREGAR METAS
// =========================================================

async function loadGoals() {

    const token =
        localStorage.getItem(
            "orvix_token"
        );


    if (!token) {

        throw new Error(
            "Token não encontrado."
        );

    }


    const response =
        await fetch(
            `${API_URL}/goals`,
            {
                method: "GET",

                headers: {

                    Authorization:
                        `Bearer ${token}`,

                    "Content-Type":
                        "application/json"

                }
            }
        );


    if (!response.ok) {

        if (
            response.status === 401
        ) {

            throw new Error(
                "Sessão expirada. Faça login novamente."
            );

        }


        throw new Error(
            `Erro ao carregar metas: ${response.status}`
        );

    }


    return await response.json();

}


// =========================================================
// RESUMO
// =========================================================

function renderSummary(summary) {

    const income =
        Number(
            summary.totalIncome || 0
        );


    const expense =
        Number(
            summary.totalExpense || 0
        );


    const balance =
        Number(
            summary.balance || 0
        );


    totalIncomeElement.textContent =
        formatCurrency(
            income
        );


    totalExpenseElement.textContent =
        formatCurrency(
            expense
        );


    balanceElement.textContent =
        formatCurrency(
            balance
        );

}


// =========================================================
// COMPARAÇÃO COM MÊS ANTERIOR
// =========================================================

function formatVariation(
    variation,
    type
) {

    if (!variation) {

        return {

            text: "—",

            className:
                "comparison-neutral"

        };

    }


    const current =
        Number(
            variation.current || 0
        );


    const previous =
        Number(
            variation.previous || 0
        );


    if (
        current === 0 &&
        previous === 0
    ) {

        return {

            text:
                "Sem movimentação",

            className:
                "comparison-neutral"

        };

    }


    if (
        variation.direction === "new" ||
        (
            previous === 0 &&
            current > 0
        )
    ) {

        return {

            text:
                "Novo este mês",

            className:
                type === "expense"
                    ? "comparison-down"
                    : "comparison-up"

        };

    }


    const percentage =
        Number(
            variation.percentage || 0
        );


    const rounded =
        Math.abs(
            percentage
        ).toFixed(1);


    if (
        type === "income"
    ) {

        if (
            variation.direction === "up"
        ) {

            return {

                text:
                    `↑ +${rounded}% vs mês anterior`,

                className:
                    "comparison-up"

            };

        }


        if (
            variation.direction === "down"
        ) {

            return {

                text:
                    `↓ -${rounded}% vs mês anterior`,

                className:
                    "comparison-down"

            };

        }

    }


    if (
        type === "expense"
    ) {

        if (
            variation.direction === "up"
        ) {

            return {

                text:
                    `↑ +${rounded}% vs mês anterior`,

                className:
                    "comparison-down"

            };

        }


        if (
            variation.direction === "down"
        ) {

            return {

                text:
                    `↓ -${rounded}% vs mês anterior`,

                className:
                    "comparison-up"

            };

        }

    }


    if (
        type === "balance"
    ) {

        if (
            variation.direction === "up"
        ) {

            return {

                text:
                    `↑ +${rounded}% vs mês anterior`,

                className:
                    "comparison-up"

            };

        }


        if (
            variation.direction === "down"
        ) {

            return {

                text:
                    `↓ -${rounded}% vs mês anterior`,

                className:
                    "comparison-down"

            };

        }

    }


    return {

        text:
            "→ 0,0% vs mês anterior",

        className:
            "comparison-neutral"

    };

}


function renderComparison(
    element,
    variation,
    type
) {

    if (!element) {
        return;
    }


    const result =
        formatVariation(
            variation,
            type
        );


    element.textContent =
        result.text;


    element.classList.remove(
        "comparison-up",
        "comparison-down",
        "comparison-neutral"
    );


    element.classList.add(
        result.className
    );

}


function renderMonthlyComparison(
    monthlyComparison
) {

    if (!monthlyComparison) {

        renderComparison(
            incomeComparisonElement,
            null,
            "income"
        );


        renderComparison(
            expenseComparisonElement,
            null,
            "expense"
        );


        renderComparison(
            balanceComparisonElement,
            null,
            "balance"
        );


        return;

    }


    renderComparison(
        incomeComparisonElement,
        monthlyComparison.incomeVariation,
        "income"
    );


    renderComparison(
        expenseComparisonElement,
        monthlyComparison.expenseVariation,
        "expense"
    );


    renderComparison(
        balanceComparisonElement,
        monthlyComparison.balanceVariation,
        "balance"
    );

}


// =========================================================
// INTELIGÊNCIA DAS METAS
// =========================================================

function getGoalProgress(
    target,
    current
) {

    if (target <= 0) {
        return 0;
    }


    const percentage =
        (current / target) * 100;


    return Math.min(
        Math.max(
            percentage,
            0
        ),
        100
    );

}


function getGoalStatus(
    percentage
) {

    if (percentage >= 100) {

        return {

            text:
                "Concluída",

            className:
                "progress-complete"

        };

    }


    if (percentage >= 80) {

        return {

            text:
                "Quase concluída",

            className:
                "progress-high"

        };

    }


    if (percentage >= 50) {

        return {

            text:
                "Bom progresso",

            className:
                "progress-medium"

        };

    }


    return {

        text:
            "Em andamento",

        className:
            "progress-low"

    };

}


// =========================================================
// RENDERIZAR METAS
// =========================================================

function renderGoals(goals) {

    if (!goalsContainer) {
        return;
    }


    let goalsList = [];


    if (Array.isArray(goals)) {

        goalsList =
            goals;

    } else if (
        goals &&
        Array.isArray(
            goals.goals
        )
    ) {

        goalsList =
            goals.goals;

    } else if (
        goals &&
        Array.isArray(
            goals.data
        )
    ) {

        goalsList =
            goals.data;

    }


    if (
        goalsList.length === 0
    ) {

        goalsContainer.innerHTML = `
            <div class="goals-loading">
                Nenhuma meta cadastrada.
            </div>
        `;


        return;

    }


    goalsContainer.innerHTML = "";


    goalsList.forEach(
        function(goal) {

            const target =
                Number(
                    goal.target_amount || 0
                );


            const current =
                Number(
                    goal.current_amount || 0
                );


            const percentage =
                getGoalProgress(
                    target,
                    current
                );


            const percentageText =
                percentage.toFixed(0);


            const status =
                getGoalStatus(
                    percentage
                );


            const card =
                document.createElement(
                    "div"
                );


            card.className =
                "dashboard-goal-card";


            card.innerHTML = `
                <div class="dashboard-goal-header">

                    <span class="dashboard-goal-name">
                        ${goal.name || "Meta sem nome"}
                    </span>

                    <span class="dashboard-goal-percentage">
                        ${percentageText}%
                    </span>

                </div>


                <div class="dashboard-goal-values">

                    <span class="dashboard-goal-current">
                        ${formatCurrency(current)}
                    </span>

                    <span class="dashboard-goal-target">
                        de ${formatCurrency(target)}
                    </span>

                </div>


                <div class="dashboard-goal-progress">

                    <div
                        class="dashboard-goal-progress-bar ${status.className}"
                        style="width: ${percentage}%"
                    ></div>

                </div>


                <div class="dashboard-goal-footer">

                    <span class="dashboard-goal-deadline">
                        Prazo: ${formatDate(goal.deadline)}
                    </span>

                    <span class="dashboard-goal-status">
                        ${status.text}
                    </span>

                </div>
            `;


            goalsContainer.appendChild(
                card
            );

        }
    );

}


// =========================================================
// GRÁFICO DE EVOLUÇÃO
// =========================================================

function renderEvolutionChart(data) {

    const canvas =
        document.getElementById(
            "evolution-chart"
        );


    if (!canvas) {
        return;
    }


    if (evolutionChart) {

        evolutionChart.destroy();

    }


    evolutionChart =
        new Chart(
            canvas,
            {

                type:
                    "line",

                data: {

                    labels:
                        data.map(
                            item =>
                                formatMonth(
                                    item.month
                                )
                        ),

                    datasets: [

                        {

                            label:
                                "Receitas",

                            data:
                                data.map(
                                    item =>
                                        Number(
                                            item.income || 0
                                        )
                                ),

                            borderColor:
                                "#22C55E",

                            backgroundColor:
                                "rgba(34, 197, 94, 0.08)",

                            tension:
                                0.35,

                            fill:
                                true

                        },


                        {

                            label:
                                "Despesas",

                            data:
                                data.map(
                                    item =>
                                        Number(
                                            item.expense || 0
                                        )
                                ),

                            borderColor:
                                "#EF4444",

                            backgroundColor:
                                "rgba(239, 68, 68, 0.08)",

                            tension:
                                0.35,

                            fill:
                                true

                        }

                    ]

                },


                options: {

                    responsive:
                        true,

                    maintainAspectRatio:
                        false,

                    plugins: {

                        legend: {

                            labels: {

                                color:
                                    "#94A3B8"

                            }

                        }

                    },


                    scales: {

                        x: {

                            ticks: {

                                color:
                                    "#64748B"

                            },

                            grid: {

                                color:
                                    "rgba(148, 163, 184, 0.05)"

                            }

                        },


                        y: {

                            beginAtZero:
                                true,

                            ticks: {

                                color:
                                    "#64748B",

                                callback:
                                    function(value) {

                                        return formatCurrency(
                                            value
                                        );

                                    }

                            },

                            grid: {

                                color:
                                    "rgba(148, 163, 184, 0.05)"

                            }

                        }

                    }

                }

            }
        );

}


// =========================================================
// GRÁFICO DE CATEGORIAS
// =========================================================

function renderCategoryChart(data) {

    const canvas =
        document.getElementById(
            "category-chart"
        );


    if (!canvas) {
        return;
    }


    if (categoryChart) {

        categoryChart.destroy();

    }


    if (
        !data ||
        data.length === 0
    ) {

        return;

    }


    categoryChart =
        new Chart(
            canvas,
            {

                type:
                    "doughnut",

                data: {

                    labels:
                        data.map(
                            item =>
                                item.category
                        ),

                    datasets: [

                        {

                            data:
                                data.map(
                                    item =>
                                        Number(
                                            item.total || 0
                                        )
                                ),

                            borderWidth:
                                0

                        }

                    ]

                },


                options: {

                    responsive:
                        true,

                    maintainAspectRatio:
                        false,

                    cutout:
                        "65%",

                    plugins: {

                        legend: {

                            position:
                                "bottom",

                            labels: {

                                color:
                                    "#94A3B8",

                                padding:
                                    15

                            }

                        },


                        tooltip: {

                            callbacks: {

                                label:
                                    function(context) {

                                        return (
                                            " " +
                                            formatCurrency(
                                                context.raw
                                            )
                                        );

                                    }

                            }

                        }

                    }

                }

            }
        );

}


// =========================================================
// INSIGHT PRINCIPAL
// =========================================================

function renderMainInsight(
    mainInsight
) {

    if (!mainInsightElement) {
        return;
    }


    const card =
        mainInsightElement.closest(
            ".main-insight-card"
        );


    if (card) {

        card.classList.remove(
            "insight-excellent",
            "insight-good",
            "insight-warning",
            "insight-critical"
        );

    }


    if (!mainInsight) {

        const titleElement =
            card?.querySelector(
                ".main-insight-content strong"
            );


        const messageElement =
            card?.querySelector(
                ".main-insight-content p"
            );


        const iconElement =
            card?.querySelector(
                ".main-insight-icon"
            );


        if (titleElement) {

            titleElement.textContent =
                "Visão financeira";

        }


        if (messageElement) {

            messageElement.textContent =
                "Continue acompanhando suas finanças.";

        }


        if (iconElement) {

            iconElement.textContent =
                "💡";

        }


        return;

    }


    const type =
        mainInsight.type ||
        "good";


    const title =
        mainInsight.title ||
        "Visão financeira";


    const message =
        mainInsight.message ||
        "Continue acompanhando suas finanças.";


    const icon =
        mainInsight.icon ||
        "💡";


    const titleElement =
        card?.querySelector(
            ".main-insight-content strong"
        );


    const messageElement =
        card?.querySelector(
            ".main-insight-content p"
        );


    const iconElement =
        card?.querySelector(
            ".main-insight-icon"
        );


    if (titleElement) {

        titleElement.textContent =
            title;

    }


    if (messageElement) {

        messageElement.textContent =
            message;

    }


    if (iconElement) {

        iconElement.textContent =
            icon;

    }


    if (card) {

        const allowedTypes = [
            "excellent",
            "good",
            "warning",
            "critical"
        ];


        if (
            allowedTypes.includes(
                type
            )
        ) {

            card.classList.add(
                `insight-${type}`
            );

        }

    }

}


// =========================================================
// INSIGHTS INTELIGENTES
// =========================================================

function renderInsights(
    summary,
    expensesByCategory,
    monthlyComparison,
    goals,
    mainInsight,
    topCategory
) {

    const income =
        Number(
            summary.totalIncome || 0
        );


    const expense =
        Number(
            summary.totalExpense || 0
        );


    const balance =
        Number(
            summary.balance || 0
        );


    // =====================================================
    // TAXA DE ECONOMIA
    // =====================================================

    let savingRate =
        Number(
            summary.savingsRate
        );


    if (
        !Number.isFinite(
            savingRate
        )
    ) {

        savingRate = 0;


        if (income > 0) {

            savingRate =
                (
                    balance /
                    income
                ) * 100;

        }

    }


    if (savingRateElement) {

        savingRateElement.textContent =
            `${savingRate.toFixed(1)}%`;


        savingRateElement.title =
            `Taxa de economia no período: ${savingRate.toFixed(1)}%`;

    }


    // =====================================================
    // MAIOR CATEGORIA
    // =====================================================

    if (topCategory) {

        const categoryName =
            topCategory.name ||
            topCategory.category ||
            "Sem categoria";


        const categoryTotal =
            Number(
                topCategory.total || 0
            );


        const categoryPercentage =
            Number(
                topCategory.percentage || 0
            );


        topCategoryElement.textContent =
            categoryName;


        topCategoryElement.title =
            `${formatCurrency(
                categoryTotal
            )} • ${categoryPercentage.toFixed(
                1
            )}% das despesas`;

    } else if (
        expensesByCategory &&
        expensesByCategory.length > 0
    ) {

        const category =
            expensesByCategory[0];


        topCategoryElement.textContent =
            category.category ||
            "Sem categoria";

    } else {

        topCategoryElement.textContent =
            "Nenhuma";


        topCategoryElement.title =
            "Nenhuma despesa registrada.";

    }


    // =====================================================
    // STATUS FINANCEIRO
    // =====================================================

    const financialHealth =
        summary.financialHealth ||
        "critical";


    const financialHealthLabel =
        summary.financialHealthLabel ||
        "Crítica";


    financialStatusElement.textContent =
        financialHealthLabel;


    financialStatusElement.title =
        getFinancialStatusMessage(
            financialHealthLabel
        );


    financialStatusElement.classList.remove(
        "status-excellent",
        "status-good",
        "status-attention",
        "status-critical",
        "financial-excellent",
        "financial-good",
        "financial-attention",
        "financial-critical"
    );


    if (
        financialHealth === "excellent"
    ) {

        financialStatusElement.classList.add(
            "status-excellent"
        );

    } else if (
        financialHealth === "good"
    ) {

        financialStatusElement.classList.add(
            "status-good"
        );

    } else if (
        financialHealth === "attention"
    ) {

        financialStatusElement.classList.add(
            "status-attention"
        );

    } else {

        financialStatusElement.classList.add(
            "status-critical"
        );

    }


    // =====================================================
    // INSIGHT PRINCIPAL
    // =====================================================

    renderMainInsight(
        mainInsight
    );


    // =====================================================
    // COMPARAÇÃO
    // =====================================================

    if (monthlyComparison) {

        updateComparisonTitles(
            monthlyComparison
        );

    }


    // =====================================================
    // METAS
    // =====================================================

    updateGoalInsight(
        goals
    );

}


function getFinancialStatusMessage(
    status
) {

    const messages = {

        "Excelente":
            "Sua margem de economia está excelente.",

        "Boa":
            "Suas receitas estão cobrindo suas despesas com uma boa margem.",

        "Saudável":
            "Suas receitas estão cobrindo suas despesas com uma boa margem.",

        "Atenção":
            "Suas despesas estão pressionando sua margem financeira.",

        "Crítica":
            "Suas despesas estão acima ou muito próximas das suas receitas.",

        "Sem receitas":
            "Ainda não existem receitas suficientes para avaliar sua saúde financeira."

    };


    return (
        messages[status] ||
        "Acompanhe seus indicadores financeiros."
    );

}


// =========================================================
// TÍTULOS DOS INDICADORES
// =========================================================

function updateComparisonTitles(
    monthlyComparison
) {

    if (
        incomeComparisonElement &&
        monthlyComparison.incomeVariation
    ) {

        const variation =
            monthlyComparison.incomeVariation;


        incomeComparisonElement.title =
            buildComparisonMessage(
                "receitas",
                variation
            );

    }


    if (
        expenseComparisonElement &&
        monthlyComparison.expenseVariation
    ) {

        const variation =
            monthlyComparison.expenseVariation;


        expenseComparisonElement.title =
            buildComparisonMessage(
                "despesas",
                variation
            );

    }


    if (
        balanceComparisonElement &&
        monthlyComparison.balanceVariation
    ) {

        const variation =
            monthlyComparison.balanceVariation;


        balanceComparisonElement.title =
            buildComparisonMessage(
                "saldo",
                variation
            );

    }

}


function buildComparisonMessage(
    label,
    variation
) {

    const current =
        Number(
            variation.current || 0
        );


    const previous =
        Number(
            variation.previous || 0
        );


    if (
        current === 0 &&
        previous === 0
    ) {

        return `Sem movimentação de ${label} nos dois meses.`;

    }


    if (
        variation.direction === "new" ||
        (
            previous === 0 &&
            current > 0
        )
    ) {

        return `Novo movimento de ${label} neste mês: ${formatCurrency(
            current
        )}.`;

    }


    if (
        variation.direction === "up"
    ) {

        return `As ${label} aumentaram em relação ao mês anterior.`;

    }


    if (
        variation.direction === "down"
    ) {

        return `As ${label} diminuíram em relação ao mês anterior.`;

    }


    return `As ${label} permaneceram estáveis.`;

}


// =========================================================
// INSIGHT DAS METAS
// =========================================================

function updateGoalInsight(
    goals
) {

    if (!goals) {
        return;
    }


    let goalsList = [];


    if (Array.isArray(goals)) {

        goalsList =
            goals;

    } else if (
        Array.isArray(
            goals.goals
        )
    ) {

        goalsList =
            goals.goals;

    } else if (
        Array.isArray(
            goals.data
        )
    ) {

        goalsList =
            goals.data;

    }


    if (
        goalsList.length === 0
    ) {

        return;

    }


    const completed =
        goalsList.filter(
            goal => {

                const target =
                    Number(
                        goal.target_amount || 0
                    );


                const current =
                    Number(
                        goal.current_amount || 0
                    );


                return (
                    target > 0 &&
                    current >= target
                );

            }
        ).length;


    const almostComplete =
        goalsList.filter(
            goal => {

                const target =
                    Number(
                        goal.target_amount || 0
                    );


                const current =
                    Number(
                        goal.current_amount || 0
                    );


                if (
                    target <= 0
                ) {

                    return false;

                }


                const percentage =
                    (
                        current /
                        target
                    ) * 100;


                return (
                    percentage >= 80 &&
                    percentage < 100
                );

            }
        ).length;


    if (
        completed > 0
    ) {

        goalsContainer.title =
            `${completed} meta(s) concluída(s).`;

    } else if (
        almostComplete > 0
    ) {

        goalsContainer.title =
            `${almostComplete} meta(s) estão próximas de serem concluídas.`;

    } else {

        goalsContainer.title =
            "Continue acompanhando o progresso das suas metas.";

    }

}


// =========================================================
// ATUALIZAR DASHBOARD
// =========================================================

async function refreshDashboard(
    period
) {

    try {

        loadingElement.classList.remove(
            "hidden"
        );


        errorElement.classList.add(
            "hidden"
        );


        dashboardContent.classList.add(
            "hidden"
        );


        const dashboard =
            await loadDashboard(
                period
            );


        renderSummary(
            dashboard.summary
        );


        renderMonthlyComparison(
            dashboard.monthlyComparison
        );


        renderEvolutionChart(
            dashboard.monthlyEvolution || []
        );


        renderCategoryChart(
            dashboard.expensesByCategory || []
        );


        const goals =
            window.orvixGoals || [];


        renderInsights(
            dashboard.summary,
            dashboard.expensesByCategory || [],
            dashboard.monthlyComparison,
            goals,
            dashboard.mainInsight,
            dashboard.topCategory
        );


        loadingElement.classList.add(
            "hidden"
        );


        dashboardContent.classList.remove(
            "hidden"
        );


        console.log(
            "Dashboard atualizado.",
            {
                period,
                dashboard
            }
        );


    } catch (error) {

        console.error(
            "Erro ao atualizar dashboard:",
            error
        );


        showError(
            error.message ||
            "Não foi possível atualizar o dashboard."
        );

    }

}


// =========================================================
// FILTRO DE PERÍODO
// =========================================================

if (periodSelect) {

    periodSelect.addEventListener(
        "change",
        function() {

            const selectedPeriod =
                periodSelect.value ||
                "this_month";


            refreshDashboard(
                selectedPeriod
            );

        }
    );

}


// =========================================================
// LOGOUT
// =========================================================

if (logoutButton) {

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

}


// =========================================================
// INICIALIZAÇÃO
// =========================================================

async function initializeDashboard() {

    const token =
        localStorage.getItem(
            "orvix_token"
        );


    if (!token) {

        showError(
            "Token não encontrado. Faça login novamente."
        );


        return;

    }


    try {

        const user =
            await loadUser();


        const selectedPeriod =
            periodSelect
                ? periodSelect.value
                : "this_month";


        const dashboard =
            await loadDashboard(
                selectedPeriod
            );


        const goals =
            await loadGoals();


        window.orvixGoals =
            goals;


        renderGoals(
            goals
        );


        renderSummary(
            dashboard.summary
        );


        renderMonthlyComparison(
            dashboard.monthlyComparison
        );


        renderEvolutionChart(
            dashboard.monthlyEvolution || []
        );


        renderCategoryChart(
            dashboard.expensesByCategory || []
        );


        renderInsights(
            dashboard.summary,
            dashboard.expensesByCategory || [],
            dashboard.monthlyComparison,
            goals,
            dashboard.mainInsight,
            dashboard.topCategory
        );


        loadingElement.classList.add(
            "hidden"
        );


        errorElement.classList.add(
            "hidden"
        );


        dashboardContent.classList.remove(
            "hidden"
        );


        console.log(
            "Dashboard carregado com sucesso.",
            {
                user,
                period:
                    selectedPeriod,
                dashboard,
                goals
            }
        );


    } catch (error) {

        console.error(
            "Erro no dashboard:",
            error
        );


        showError(
            error.message ||
            "Não foi possível carregar o dashboard."
        );

    }

}


// =========================================================
// INICIAR
// =========================================================

initializeDashboard();