# Central de Dropshipping e Fornecedores

## Contexto encontrado

- Arquivo analisado: `data/shopify/products_export_1.csv`.
- Produtos unicos encontrados no CSV: 94.
- Produtos com origem Mercado Livre: 58.
- Produtos com origem Shopee: 35.
- Produto sem link de origem: 1.
- Campo de origem no CSV: `Link (product.metafields.nerdlingo.link)`.
- Campo atual no produto: metacampo `originalProductUrl`.

## Pesquisa tecnica

### Mercado Livre

O Mercado Livre entra como leitura publica referencial para links de terceiros. Isto nao usa credencial de seller e nao deve ser tratado como controle oficial de estoque do fornecedor. O dado serve como sinal operacional: preco publico, status publico, quantidade referencial e variacoes publicas.

Fontes:

- https://developers.mercadolivre.com.br/pt_br/itens-e-buscas
- https://developers.mercadolivre.com.br/en_us/visits-resource/variations
- https://developers.mercadolivre.com.br/pt_br/produto-sincronizacao-de-publicacoes

Pontos importantes:

- Links do Mercado Livre normalmente contem `MLB-...`; o modulo deve extrair e normalizar esse ID.
- `status`, `price`, `available_quantity`, `variations` e `attribute_combinations` sao os campos principais.
- Em recursos publicos, `available_quantity` pode ser referencial por faixa, nao estoque exato. Deve ser usado como sinal operacional, nao como garantia absoluta.

### Shopee

Shopee entra como modo assistido/manual, porque os links sao de terceiros e nao ha leitura publica confiavel e estavel assumida no projeto.

Opcoes futuras:

1. Provedor de dados de ecommerce, se houver necessidade real de automacao.
2. Coleta por navegador/scraping apenas como ultimo recurso, porque e mais fragil, pode quebrar com mudanca de front-end e pode ter restricoes de uso.
3. Validacao manual assistida, recomendada para inicio por ser previsivel e sem custo.

Para o projeto atual, Shopee deve iniciar em modo assistido/manual: centraliza link, alerta que nao ha dado automatico confiavel e permite manutencao rapida sem travar a loja.

Provedores de dados podem retornar modelos/SKUs com preco e estoque por variacao, mas o ideal e encapsular isso atras de um conector interno para poder trocar a origem depois sem reescrever o admin.

## Melhor arquitetura

Criar um modulo separado no admin: `Central de Fornecedores`.

Nao misturar a logica de dropshipping diretamente com o cadastro base de produto. Hoje todos os produtos podem ser dropshipping, mas isso deve ser reversivel para estoque proprio no futuro.

### Modelos recomendados

`Supplier`

- Nome do fornecedor.
- Tipo: `MERCADO_LIVRE`, `SHOPEE`, `MANUAL`, `CUSTOM`.
- Status: ativo/inativo.
- Configuracoes de API e limite de chamadas.

`ProductSource`

- `productId`.
- `supplierId`.
- URL original.
- ID externo normalizado: `MLB...`, `shop_id/item_id`, etc.
- Prioridade da origem.
- Ativo/inativo.
- Ultimo sync.
- Ultimo erro.

`ProductSourceSnapshot`

- Produto origem.
- Status externo.
- Preco fornecedor.
- Preco promocional.
- Moeda.
- Estoque bruto.
- Estoque normalizado.
- Payload resumido.
- Data da captura.

`ProductSourceVariant`

- Produto origem.
- Variante local opcional.
- ID externo da variacao/modelo.
- Cor, tamanho, sexo e imagem da origem.
- Preco fornecedor.
- Estoque fornecedor.
- Disponivel/indisponivel.
- Ultimo sync.

`PricingRule`

- Escopo: global, fornecedor, categoria ou produto.
- Margem percentual.
- Margem fixa.
- Margem minima.
- Arredondamento: `xx,90`, `xx,99`, inteiro.
- Preco minimo e preco maximo opcional.

`SourceAlert`

- Tipo: preco subiu, sem estoque, produto pausado, produto removido, variacao sumiu, link invalido, erro de API.
- Severidade.
- Status: aberto, ignorado, resolvido.
- Produto e variacao afetados.

## Fluxo recomendado

### Sync diario

1. Buscar produtos com `originalProductUrl`.
2. Resolver fornecedor pelo dominio.
3. Normalizar o ID externo quando possivel.
4. Mercado Livre: tentar leitura publica referencial.
5. Shopee: marcar como assistido/manual.
5. Salvar snapshot.
6. Comparar com snapshot anterior.
7. Gerar alertas.
8. Calcular preco sugerido.
9. Nao aplicar mudanca automaticamente sem regra explicita.

### Sync no checkout

Antes de criar preferencia de pagamento:

1. Opcionalmente revalidar origem dos itens do carrinho.
2. Nao bloquear por falha de API ou ausencia de dado de terceiro.
3. Bloquear apenas se `DROPSHIPPING_CHECKOUT_STRICT=true` e houver indisponibilidade comprovada.
4. Alertar admin se preco fornecedor mudou acima do limite configurado.
5. Permitir compra se a mudanca estiver dentro da margem de seguranca configurada.

### Aplicacao de alteracoes

O admin deve ter tres modos:

- Manual: apenas mostra alertas e sugestoes.
- Assistido: admin seleciona e aplica em lote.
- Automatico controlado: aplica estoque/preco apenas quando regra for segura.

Para o inicio, usar `Assistido`. E o melhor equilibrio entre robustez e controle.

## UI administrativa recomendada

Tela principal: `/admin/fornecedores/dropshipping`

Colunas:

- Produto.
- Fornecedor.
- Status origem.
- Preco fornecedor.
- Preco atual da loja.
- Preco sugerido.
- Margem atual.
- Estoque origem.
- Estoque loja.
- Variacoes divergentes.
- Ultimo sync.
- Acao.

Filtros:

- Mercado Livre.
- Shopee.
- Sem estoque.
- Preco subiu.
- Produto pausado/removido.
- Link com erro.
- Margem abaixo do minimo.
- Sync atrasado.

Acoes:

- Sincronizar agora.
- Abrir link de compra.
- Aplicar preco sugerido.
- Pausar produto.
- Atualizar estoque.
- Ignorar alerta.
- Editar regra de margem.
- Vincular variacoes.

Detalhe do produto:

- Historico de preco.
- Historico de disponibilidade.
- Mapa de variacoes origem x loja.
- Fotos por variacao.
- Log de sync.
- Alertas abertos.

## Conectores

Interface interna:

```ts
type SupplierProductSnapshot = {
  provider: "mercado_livre" | "shopee" | "manual";
  externalId: string;
  title: string;
  status: "active" | "paused" | "closed" | "deleted" | "unknown";
  priceCents: number | null;
  currency: string | null;
  availableQuantity: number | null;
  variants: SupplierVariantSnapshot[];
  rawUrl: string;
  fetchedAt: string;
};
```

Essa interface evita acoplar o admin ao formato de cada marketplace.

## Riscos e protecoes

- Shopee pode nao oferecer dado confiavel de produto de terceiro sem fonte externa. Mitigacao: modo assistido/manual e conector isolado apenas se uma fonte de dados for contratada.
- Estoque de marketplace pode ser referencial. Mitigacao: nao prometer estoque exato; usar checagem no checkout.
- Preco pode mudar entre sync e compra. Mitigacao: revalidacao no checkout.
- Rate limit. Mitigacao: fila, cache, sync incremental e backoff.
- Produto pausado/removido. Mitigacao: alerta e pausa assistida no produto local.
- Variacoes podem ter nomes diferentes. Mitigacao: tela de vinculo manual com sugestao automatica por cor/tamanho/sexo.

## Implantacao sugerida

### Fase 1

- Criar tabelas de fornecedor, origem, snapshots e alertas.
- Migrar `originalProductUrl` para `ProductSource`.
- Criar conector Mercado Livre.
- Criar tela de auditoria com sync manual.

### Fase 2

- Criar regras de margem.
- Criar preco sugerido.
- Criar aplicacao assistida em lote.
- Criar alertas de preco/estoque/status.

### Fase 3

- Criar modo assistido para Shopee de terceiros.
- Validar se algum provedor externo autorizado cobre os links reais.
- Se nao cobrir, manter fallback manual, sem chutes de preco/estoque.

### Fase 4

- Revalidacao no checkout.
- Bloqueio seguro de produto indisponivel.
- Logs e eventos no Sentry.

### Fase 5

- Dashboard de margem, risco e produtos que exigem acao.
- Historico visual de preco e disponibilidade.
- Jobs automaticos diarios.

## Recomendacao final

Comecar pelo Mercado Livre e pela estrutura comum de fornecedores. Depois plugar Shopee. O ganho maior vem de ter modelo, snapshots, alertas e margem bem desenhados. O conector e so uma peca trocavel.
