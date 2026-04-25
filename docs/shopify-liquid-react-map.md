# Mapeamento Liquid para React

Data: 24/04/2026

Fonte: tema Shopify exportado em `C:\Users\samue\Desktop\theme_export__nerdlingolab-com-nerdlingolav-v11-9-5__24APR2026-1138am.zip`

Este mapa orienta a migração visual e funcional sem importar Liquid para produção.

## Seções prioritárias

| Liquid | Equivalente atual ou destino | Status | Observação |
| --- | --- | --- | --- |
| `sections/header.liquid` | `src/components/shop/shop-header.tsx` | Parcial | Logo real já migrado; menus e confiança ainda podem ser refinados. |
| `sections/footer.liquid` | `src/components/shop/shop-footer.tsx` | Parcial | Barra colorida, links, atendimento e selos de confiança foram migrados sem Liquid. |
| `sections/featured-collection.liquid` | `src/app/(shop)/page.tsx` e `src/app/(shop)/produtos/page.tsx` | Parcial | Catálogo existe com banco real; home ainda pode destacar coleções por categoria. |
| `sections/collection-template.liquid` | `src/app/(shop)/produtos/page.tsx` | Parcial | Falta filtro/busca/ordenação antes de equivaler à coleção Shopify. |
| `sections/product-template.liquid` | `src/app/(shop)/produtos/[slug]/page.tsx` | Parcial | Produto já tem imagem, preço, descrição, carrinho e frete; faltam variações avançadas e selos comerciais. |
| `sections/cart-template.liquid` | `src/app/(shop)/carrinho/page.tsx` e `src/features/cart/components/cart-client.tsx` | Parcial | Carrinho atual é mais robusto por revalidar estoque, cupom, pontos e frete no servidor. |
| `sections/offers.liquid` | Componente futuro de ofertas | Pendente | Deve usar cupons reais e produtos ativos, não blocos fixos do Liquid. |
| `sections/joy-loyalty-page.liquid` | `src/app/(shop)/programa-de-fidelidade/page.tsx` | Parcial | Nerdcoins já existem; pode herdar tom visual do Joy sem scripts externos. |
| `sections/cashback-page.liquid` | Fluxo de Nerdcoins/fidelidade | Pendente | Não copiar regra antiga sem reconciliação com o domínio atual. |
| `sections/newsletter.liquid` | Componente futuro de newsletter | Pendente | Depende de Resend/lista de contatos. |
| `sections/newsletter-bar.liquid` | Barra promocional futura | Pendente | Deve respeitar PT-BR e não bloquear fluxo de compra. |
| `sections/product-recommendations.liquid` | Recomendações futuras no produto/carrinho | Pendente | Deve usar produtos ativos e estoque disponível. |
| `sections/recently-viewed-products.liquid` | Componente futuro client-side | Pendente | Deve preservar privacidade e não afetar checkout. |

## Decisões aplicadas nesta etapa

- `ShopTrustStrip` concentra os assets visuais de confiança reutilizados no catálogo e no produto.
- `ShopFooter` migra a intenção do footer Shopify: barra colorida, atendimento, links, pagamento seguro e entrega acompanhada.
- O conteúdo visível reforça entrega, carrinho seguro e Nerdcoins.
- Nenhum script Shopify foi importado.
- Nenhuma regra financeira antiga foi copiada.

## Próxima migração recomendada

1. Adicionar busca/filtros de catálogo com validação por query server-side.
2. Evoluir produto com variações reais quando o modelo de variantes estiver completo na UI.
3. Completar o footer com dados institucionais reais quando o CNPJ/endereço oficial forem definidos.
