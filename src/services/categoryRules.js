"use strict";

/**
 * Regras determinísticas (sem IA) para categorizar transações pela descrição.
 * Rodam primeiro: são gratuitas, instantâneas e não enviam nada para fora.
 * O texto chega já normalizado (minúsculo e sem acentos).
 */

const EXPENSE_RULES = [
    ["Assinaturas", /\b(netflix|spotify|disney|hbo|max\.com|prime video|amazon prime|youtube|apple\.com|apple com bill|icloud|google one|google play|deezer|globoplay|paramount|crunchyroll|chatgpt|openai|anthropic|claude\.ai|microsoft 365|adobe|canva|notion|github)\b/],
    ["Compras", /\b(mercado ?livre|amazon|shopee|magalu|magazine luiza|americanas|shein|aliexpress|casas bahia|renner|riachuelo|c&a|zara|nike|adidas|kabum|netshoes|centauro|leroy|havan|ponto frio|fast shop)\b/],
    ["Alimentação", /\b(ifood|rappi|uber ?eats|restaurante|lanchonete|lanche|pizzaria|pizza|burger|hamburguer|mcdonald|bk brasil|burger king|habib|subway|giraffas|outback|padaria|panificadora|cafeteria|cafe|sorveteria|acai|churrascaria|choperia|doceria|confeitaria|marmita|delivery)\b/],
    ["Transporte", /\b(uber|99\s?(pop|taxi|app)?|cabify|indriver|taxi|metro|onibus|bilhete unico|cptm|estacionamento|sem parar|veloe|conectcar|pedagio)\b/],
    ["Combustível", /\b(posto|combustivel|gasolina|etanol|shell|ipiranga|petrobras|br mania)\b/],
    ["Viagem", /\b(hotel|pousada|booking|airbnb|decolar|latam|gol linhas|azul linhas|passagem|cvc|hurb|123milhas|maxmilhas)\b/],
    ["Mercado", /\b(mercado|supermercado|atacadao|atacarejo|assai|carrefour|pao de acucar|hortifruti|sacolao|bompreco|tenda atacado|mateus|angeloni|condor|zaffari)\b/],
    ["Saúde", /\b(farmacia|drogaria|drogasil|droga raia|pacheco|pague menos|hospital|clinica|laboratorio|odonto|dentista|medico|consulta|unimed|amil|hapvida|bradesco saude)\b/],
    ["Lazer", /\b(cinema|cinemark|ingresso|steam|playstation|xbox|nintendo|teatro|show|parque|boliche|sympla|eventim)\b/],
    ["Educação", /\b(escola|colegio|faculdade|universidade|curso|udemy|alura|coursera|livraria|saraiva|mensalidade escolar)\b/],
    ["Moradia e Contas", /\b(energia|enel|cpfl|energisa|equatorial|cemig|copel|agua|sabesp|saneamento|internet|vivo|claro|aluguel|condominio|iptu|gas|comgas|seguro residencial)\b/],
    ["Beleza", /\b(salao|barbearia|cabeleireir|estetica|boticario|natura|sephora|manicure|spa)\b/],
];

const INCOME_RULES = [
    ["Salário", /\b(salario|folha de pagamento|proventos|pagto salario|13o|decimo terceiro|ferias)\b/],
    ["Rendimentos", /\b(rendimento|juros|dividendo|cdb|lci|lca|cashback|provento de)\b/],
    ["Reembolsos", /\b(estorno|reembolso|devolucao|ressarcimento)\b/],
];

// Pix/TED/transferência costumam trazer nome de pessoa: nunca vão para a IA
const TRANSFER_RE = /\b(pix|ted|doc|transferencia|transf|enviado|recebido de)\b/;

const TRANSFER_CATEGORY = "Transferências";

function normalizeText(value) {
    return String(value ?? "")
        .normalize("NFD")
        .replace(/[̀-ͯ]/g, "")
        .toLowerCase()
        .replace(/\s+/g, " ")
        .trim();
}

function isTransfer(normalized) {
    return TRANSFER_RE.test(normalized);
}

// Retorna o nome da categoria ou null (null = deixar para a IA)
function ruleCategory(type, description) {
    const text = normalizeText(description);

    if (isTransfer(text)) {
        return TRANSFER_CATEGORY;
    }

    const rules = type === "income" ? INCOME_RULES : EXPENSE_RULES;
    for (const [category, regex] of rules) {
        if (regex.test(text)) return category;
    }

    return null;
}

const TAXONOMY = {
    expense: [
        "Alimentação", "Mercado", "Transporte", "Combustível", "Saúde", "Educação", "Lazer",
        "Assinaturas", "Compras", "Moradia e Contas", "Viagem", "Beleza", "Serviços", "Transferências", "Outros"
    ],
    income: ["Salário", "Rendimentos", "Reembolsos", "Transferências", "Outros"]
};

module.exports = { ruleCategory, normalizeText, isTransfer, TAXONOMY, TRANSFER_CATEGORY };
