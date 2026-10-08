const dashboardService = require("../services/dashboardService");


async function getDashboard(req, res) {
    try {

        const period =
            req.query.period || "this_month";


        const dashboard =
            await dashboardService.getDashboard(
                req.user.id,
                period
            );


        return res.status(200).json(dashboard);

    } catch (error) {

        console.error(
            "Erro ao carregar dashboard:",
            error
        );


        return res.status(500).json({
            error: "Erro interno do servidor."
        });
    }
}


module.exports = {
    getDashboard
};