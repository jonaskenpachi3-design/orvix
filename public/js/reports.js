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

const generateReportButton =
    document.getElementById(
        "generate-report-button"
    );

const reportError =
    document.getElementById(
        "report-error"
    );

const reportLoading =
    document.getElementById(
        "report-loading"
    );

const reportContent =
    document.getElementById(
        "report-content"
    );

const reportIncome =
    document.getElementById(
        "report-income"
    );

const reportExpense =
    document.getElementById(
        "report-expense"
    );

const reportBalance =
    document.getElementById(
        "report-balance"
    );

const reportTransactions =
    document.getElementById(
        "report-transactions"
    );

const reportPeriod =
    document.getElementById(
        "report-period"
    );

const categoryBreakdown =
    document.getElementById(
        "category-breakdown"
    );

const evolutionChartCanvas =
    document.getElementById(
        "evolution-chart"
    );

const categoryChartCanvas =
    document.getElementById(
        "category-chart"
    );


let evolutionChart = null;
let categoryChart = null;


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


function formatMonth(
    month
) {
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


    startDateInput.value =
        `${year}-01-01`;


    endDateInput.value =
        `${year}-${month}-${String(
            today.getDate()
        ).padStart(
            2,
            "0"
        )}`;
}


// ========================================
// ERRO
// ========================================

function showError(
    message
) {
    reportError.textContent =
        message;

    reportError.classList.remove(
        "hidden"
    );
}


function hideError() {

    reportError.textContent =
        "";

    reportError.classList.add(
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

        reportLoading.classList.remove(
            "hidden"
        );

        reportContent.classList.add(
            "hidden"
        );

        generateReportButton.disabled =
            true;

    } else {

        reportLoading.classList.add(
            "hidden"
        );

        reportContent.classList.remove(
            "hidden"
        );

        generateReportButton.disabled =
            false;
    }
}


// ========================================
// GERAR RELATÓRIO
// ========================================

async function generateReport() {

    const startDate =
        startDateInput.value;

    const endDate =
        endDateInput.value;


    hideError();


    if (!startDate || !endDate) {

        showError(
            "Informe a data inicial e a data final."
        );

        return;
    }


    if (startDate > endDate) {

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


        const report =
            await apiRequest(
                `/api/reports/financial?${params.toString()}`
            );


        renderReport(
            report
        );

    } catch (error) {

        console.error(
            "Erro ao gerar relatório:",
            error
        );


        showError(
            error.message
        );

        reportContent.classList.add(
            "hidden"
        );

    } finally {

        setLoading(false);
    }
}


// ========================================
// RENDERIZAR RELATÓRIO
// ========================================

function renderReport(
    report
) {

    renderSummary(
        report.summary
    );


    renderEvolutionChart(
        report.monthly_evolution
    );


    renderCategoryChart(
        report.expenses_by_category
    );


    renderCategoryBreakdown(
        report.expenses_by_category
    );


    renderPeriod(
        report.period
    );
}


// ========================================
// RESUMO
// ========================================

function renderSummary(
    summary
) {

    reportIncome.textContent =
        formatCurrency(
            summary.total_income
        );


    reportExpense.textContent =
        formatCurrency(
            summary.total_expense
        );


    reportBalance.textContent =
        formatCurrency(
            summary.balance
        );


    reportTransactions.textContent =
        formatNumber(
            summary.total_transactions
        );


    reportBalance.classList.remove(
        "positive-balance",
        "negative-balance"
    );


    if (
        Number(summary.balance) < 0
    ) {

        reportBalance.classList.add(
            "negative-balance"
        );

    } else {

        reportBalance.classList.add(
            "positive-balance"
        );
    }
}


// ========================================
// GRÁFICO — EVOLUÇÃO
// ========================================

function renderEvolutionChart(
    monthlyEvolution
) {

    if (evolutionChart) {

        evolutionChart.destroy();
    }


    const labels =
        monthlyEvolution.map(
            item =>
                formatMonth(
                    item.month
                )
        );


    const incomeData =
        monthlyEvolution.map(
            item =>
                Number(
                    item.income
                )
        );


    const expenseData =
        monthlyEvolution.map(
            item =>
                Number(
                    item.expense
                )
        );


    evolutionChart =
        new Chart(
            evolutionChartCanvas,
            {
                type: "line",

                data: {
                    labels,

                    datasets: [
                        {
                            label:
                                "Receitas",

                            data:
                                incomeData,

                            borderColor:
                                "#22c55e",

                            backgroundColor:
                                "rgba(34, 197, 94, 0.08)",

                            borderWidth:
                                2,

                            tension:
                                0.35,

                            fill:
                                true,

                            pointRadius:
                                3,

                            pointHoverRadius:
                                5
                        },

                        {
                            label:
                                "Despesas",

                            data:
                                expenseData,

                            borderColor:
                                "#ef4444",

                            backgroundColor:
                                "rgba(239, 68, 68, 0.08)",

                            borderWidth:
                                2,

                            tension:
                                0.35,

                            fill:
                                true,

                            pointRadius:
                                3,

                            pointHoverRadius:
                                5
                        }
                    ]
                },

                options: {
                    responsive:
                        true,

                    maintainAspectRatio:
                        false,

                    interaction: {
                        mode:
                            "index",

                        intersect:
                            false
                    },

                    plugins: {
                        legend: {
                            position:
                                "top",

                            align:
                                "end",

                            labels: {
                                color:
                                    "#94A3B8",

                                usePointStyle:
                                    true,

                                boxWidth:
                                    8
                            }
                        },

                        tooltip: {
                            callbacks: {

                                label:
                                    context => {

                                        return `${context.dataset.label}: ${formatCurrency(
                                            context.raw
                                        )}`;
                                    }
                            }
                        }
                    },

                    scales: {
                        x: {
                            grid: {
                                color:
                                    "rgba(148, 163, 184, 0.08)"
                            },

                            ticks: {
                                color:
                                    "#94A3B8"
                            }
                        },

                        y: {
                            beginAtZero:
                                true,

                            grid: {
                                color:
                                    "rgba(148, 163, 184, 0.08)"
                            },

                            ticks: {
                                color:
                                    "#94A3B8",

                                callback:
                                    value =>
                                        formatCurrency(
                                            value
                                        )
                            }
                        }
                    }
                }
            }
        );
}


// ========================================
// GRÁFICO — CATEGORIAS
// ========================================

function renderCategoryChart(
    categories
) {

    if (categoryChart) {

        categoryChart.destroy();
    }


    const labels =
        categories.map(
            category =>
                category.category_name
        );


    const values =
        categories.map(
            category =>
                Number(
                    category.total
                )
        );


    if (!categories.length) {

        categoryChart =
            new Chart(
                categoryChartCanvas,
                {
                    type: "doughnut",

                    data: {
                        labels: [
                            "Sem despesas"
                        ],

                        datasets: [
                            {
                                data: [1],

                                backgroundColor: [
                                    "#334155"
                                ],

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

                        plugins: {
                            legend: {
                                position:
                                    "bottom",

                                labels: {
                                    color:
                                        "#94A3B8"
                                }
                            }
                        }
                    }
                }
            );

        return;
    }


    categoryChart =
        new Chart(
            categoryChartCanvas,
            {
                type: "doughnut",

                data: {
                    labels,

                    datasets: [
                        {
                            data:
                                values,

                            backgroundColor: [
                                "#6C63FF",
                                "#22C55E",
                                "#EF4444",
                                "#F59E0B",
                                "#3B82F6",
                                "#EC4899",
                                "#14B8A6",
                                "#8B5CF6"
                            ],

                            borderColor:
                                "#121820",

                            borderWidth:
                                3
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

                                usePointStyle:
                                    true,

                                padding:
                                    14
                            }
                        },

                        tooltip: {
                            callbacks: {

                                label:
                                    context => {

                                        return `${context.label}: ${formatCurrency(
                                            context.raw
                                        )}`;
                                    }
                            }
                        }
                    }
                }
            }
        );
}


// ========================================
// DETALHAMENTO POR CATEGORIA
// ========================================

function renderCategoryBreakdown(
    categories
) {

    if (!categories.length) {

        categoryBreakdown.innerHTML = `
            <div class="category-breakdown-empty">
                Nenhuma despesa encontrada no período.
            </div>
        `;

        return;
    }


    const totalExpense =
        categories.reduce(
            (
                total,
                category
            ) =>
                total +
                Number(
                    category.total
                ),
            0
        );


    categoryBreakdown.innerHTML =
        categories
            .map(
                category => {

                    const amount =
                        Number(
                            category.total
                        );


                    const percentage =
                        totalExpense > 0
                            ? (
                                amount /
                                totalExpense
                            ) * 100
                            : 0;


                    return `
                        <div class="breakdown-item">

                            <div class="breakdown-info">

                                <p class="breakdown-name">
                                    ${escapeHtml(
                                        category.category_name
                                    )}
                                </p>

                                <span class="breakdown-value">
                                    ${formatCurrency(
                                        amount
                                    )}
                                </span>

                            </div>


                            <div class="breakdown-bar">

                                <div
                                    class="breakdown-progress"
                                    style="width: ${percentage}%;"
                                ></div>

                            </div>


                            <span class="breakdown-percentage">
                                ${percentage.toFixed(1)}%
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

    reportPeriod.textContent =
        `${formatDate(
            period.start_date
        )} até ${formatDate(
            period.end_date
        )}`;
}


// ========================================
// SEGURANÇA — HTML
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

generateReportButton.addEventListener(
    "click",
    generateReport
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

    await generateReport();
}


initialize();