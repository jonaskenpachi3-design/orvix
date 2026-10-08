const categoryService = require("../services/categoryService");


async function createCategory(req, res) {
    try {
        const { name, type } = req.body;

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

        const category = await categoryService.createCategory(
            req.user.id,
            name.trim(),
            type
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
        const { name, type } = req.body;

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

        const category =
            await categoryService.updateCategory(
                req.user.id,
                id,
                name.trim(),
                type
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