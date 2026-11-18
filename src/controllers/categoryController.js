const categoryService = require("../services/categoryService");

// Ícones válidos do Bootstrap Icons (lista simplificada)
const VALID_ICONS = [
    'bi-tag', 'bi-egg-fried', 'bi-cart', 'bi-bus-front', 'bi-fuel-pump',
    'bi-heart-pulse', 'bi-book', 'bi-controller', 'bi-credit-card', 'bi-bag',
    'bi-house', 'bi-airplane', 'bi-gem', 'bi-tools', 'bi-arrow-left-right',
    'bi-cash-stack', 'bi-graph-up', 'bi-arrow-return-left', 'bi-gift',
    'bi-cup-hot', 'bi-pizza', 'bi-car-front', 'bi-truck', 'bi-bicycle',
    'bi-phone', 'bi-laptop', 'bi-tv', 'bi-headphones', 'bi-camera',
    'bi-music-note', 'bi-film', 'bi-gamepad', 'bi-dumbbell', 'bi-flower',
    'bi-palette', 'bi-briefcase', 'bi-bank', 'bi-piggy-bank', 'bi-coin',
    'bi-currency-dollar', 'bi-currency-euro', 'bi-wallet', 'bi-receipt',
    'bi-file-earmark-text', 'bi-calendar', 'bi-clock', 'bi-alarm',
    'bi-lightning', 'bi-droplet', 'bi-snow', 'bi-sun', 'bi-moon',
    'bi-cloud', 'bi-umbrella', 'bi-tree', 'bi-leaf', 'bi-flower',
    'bi-paw', 'bi-heart', 'bi-star', 'bi-trophy', 'bi-medal',
    'bi-award', 'bi-gift', 'bi-balloon', 'bi-cake', 'bi-party-popper'
];

function validateIcon(icon) {
    return VALID_ICONS.includes(icon);
}

function validateColor(color) {
    // Valida hex color: #RRGGBB
    return /^#[0-9A-Fa-f]{6}$/.test(color);
}


async function createCategory(req, res) {
    try {
        const { name, type, icon, color } = req.body;

        if (!name || !type) {
            return res.status(400).json({
                error: "Nome e tipo são obrigatórios."
            });
        }

        if (!["income", "expense"].includes(type)) {
            return res.status(400).json({
                error: "O tipo deve ser income ou expense."
            });
        }

        // Valida icon se fornecido
        const finalIcon = icon && validateIcon(icon) ? icon : 'bi-tag';
        // Valida color se fornecido
        const finalColor = color && validateColor(color) ? color : (type === 'income' ? '#28A745' : '#DC3545');

        const category = await categoryService.createCategory(
            req.user.id,
            name.trim(),
            type,
            finalIcon,
            finalColor
        );

        return res.status(201).json({
            message: "Categoria criada com sucesso.",
            category
        });

    } catch (error) {
        console.error("Erro ao criar categoria:", error);

        if (error.code === "23505") {
            return res.status(409).json({
                error: "Essa categoria já existe."
            });
        }

        return res.status(500).json({
            error: "Erro interno do servidor."
        });
    }
}


async function getCategories(req, res) {
    try {
        const categories =
            await categoryService.getCategoriesByUser(req.user.id);

        return res.status(200).json({
            categories
        });

    } catch (error) {
        console.error("Erro ao buscar categorias:", error);

        return res.status(500).json({
            error: "Erro interno do servidor."
        });
    }
}


async function updateCategory(req, res) {
    try {
        const { id } = req.params;
        const { name, type, icon, color } = req.body;

        if (!name || !type) {
            return res.status(400).json({
                error: "Nome e tipo são obrigatórios."
            });
        }

        if (!["income", "expense"].includes(type)) {
            return res.status(400).json({
                error: "O tipo deve ser income ou expense."
            });
        }

        // Valida icon se fornecido
        const finalIcon = icon && validateIcon(icon) ? icon : 'bi-tag';
        // Valida color se fornecido
        const finalColor = color && validateColor(color) ? color : (type === 'income' ? '#28A745' : '#DC3545');

        const category =
            await categoryService.updateCategory(
                req.user.id,
                id,
                name.trim(),
                type,
                finalIcon,
                finalColor
            );

        if (!category) {
            return res.status(404).json({
                error: "Categoria não encontrada."
            });
        }

        return res.status(200).json({
            message: "Categoria atualizada com sucesso.",
            category
        });

    } catch (error) {
        console.error("Erro ao atualizar categoria:", error);

        if (error.code === "23505") {
            return res.status(409).json({
                error: "Essa categoria já existe."
            });
        }

        return res.status(500).json({
            error: "Erro interno do servidor."
        });
    }
}


async function deleteCategory(req, res) {
    try {
        const { id } = req.params;

        const category =
            await categoryService.deleteCategory(
                req.user.id,
                id
            );

        if (!category) {
            return res.status(404).json({
                error: "Categoria não encontrada."
            });
        }

        return res.status(200).json({
            message: "Categoria excluída com sucesso."
        });

    } catch (error) {
        console.error("Erro ao excluir categoria:", error);

        return res.status(500).json({
            error: "Erro interno do servidor."
        });
    }
}


module.exports = {
    createCategory,
    getCategories,
    updateCategory,
    deleteCategory
};