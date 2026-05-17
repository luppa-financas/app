export const CATEGORIES: Record<string, readonly string[]> = {
  Alimentação: [
    'Delivery',
    'Restaurante',
    'Supermercado',
    'Padaria / Café',
    'Lanchonete / Fast food',
  ],
  Transporte: [
    'Uber / 99 / Taxi',
    'Combustível',
    'Estacionamento',
    'Transporte público',
    'Pedágio',
  ],
  Moradia: [
    'Aluguel',
    'Condomínio',
    'Água / Luz / Gás',
    'Internet / TV',
    'Manutenção',
  ],
  Saúde: [
    'Farmácia',
    'Consulta médica',
    'Exame / Laboratório',
    'Plano de saúde',
    'Academia',
  ],
  Entretenimento: ['Cinema / Teatro', 'Jogos', 'Bares / Baladas'],
  Assinaturas: ['Streaming', 'Música', 'Software', 'Outros serviços'],
  Compras: [
    'Roupas / Calçados',
    'Eletrônicos',
    'Casa / Decoração',
    'Marketplace',
    'Cosméticos / Beleza',
  ],
  Educação: ['Faculdade / Curso', 'Livros', 'Assinatura de conteúdo'],
  Viagem: ['Passagem', 'Hospedagem', 'Aluguel de carro', 'Passeios / Atrações'],
  Finanças: ['Fatura / Boleto', 'Investimento', 'Seguro', 'Tarifa bancária'],
  Pets: ['Veterinário', 'Ração / Petisco', 'Pet shop / Banho e tosa', 'Medicamento / Vacina'],
  Outros: [],
};

export const VALID_CATEGORIES = new Set(Object.keys(CATEGORIES));

export const CONFIDENCE_THRESHOLD = 0.7;
export const MERCHANT_RULE_MIN_CONFIDENCE = 0.9;
export const FALLBACK_CATEGORY = 'Outros';
