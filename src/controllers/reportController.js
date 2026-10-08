const reportService = require("../services/reportService");


// ========================================
// RELATÓRIO FINANCEIRO
// ========================================

async function getFinancialReport(req, res) {
    try {

        const {
            start_date,
            end_date
        } = req.query;


        if (!start_date || !end_date) {
            return res.status(400).json({
                error:
                    "As datas inicial e final são obrigatórias."
            });
        }


        if (start_date > end_date) {
            return res.status(400).json({
                error:
                    "A data inicial não pode ser maior que a data final."
            });
        }


        const report =
            await reportService.getFinancialReport(
                req.user.id,
                start_date,
                end_date
            );


        return res.status(200).json(
            report
        );

    } catch (error) {

        console.error(
            "Erro ao gerar relatório financeiro:",
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
    getFinancialReport
};