const insightService = require("../services/insightService");


// ========================================
// INSIGHTS FINANCEIROS
// ========================================

async function getFinancialInsights(
    req,
    res
) {
    try {

        const {
            start_date,
            end_date
        } = req.query;


        // ========================================
        // VALIDAÇÃO
        // ========================================

        if (
            !start_date ||
            !end_date
        ) {

            return res.status(400).json({
                error:
                    "As datas inicial e final são obrigatórias."
            });
        }


        if (
            start_date > end_date
        ) {

            return res.status(400).json({
                error:
                    "A data inicial não pode ser maior que a data final."
            });
        }


        // ========================================
        // BUSCAR INSIGHTS
        // ========================================

        const insights =
            await insightService.getFinancialInsights(
                req.user.id,
                start_date,
                end_date
            );


        return res.status(200).json(
            insights
        );

    } catch (error) {

        console.error(
            "Erro ao gerar insights financeiros:",
            error
        );


        return res.status(500).json({
            error:
                "Erro interno do servidor."
        });
    }
}


// ========================================
// EXPORT
// ========================================

module.exports = {
    getFinancialInsights
};