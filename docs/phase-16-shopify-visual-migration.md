# Fase 16 - Migração visual inicial do Shopify

## Objetivo

Iniciar a substituição visual do tema Shopify sem importar Liquid para produção, usando apenas assets reais e úteis do tema exportado.

## Entregue

- Criada a pasta `public/shopify/` com assets selecionados do tema exportado.
- Extraídos logos, imagem de produto, ícones de conta/carrinho/suporte/nerdcoins e badges de app.
- Atualizado `src/components/shop/shop-header.tsx` para usar o logo real do tema Shopify.
- Atualizada a home em `src/app/(shop)/page.tsx` com hero visual usando imagem real do tema.
- Criado `src/components/shop/shop-trust-strip.tsx` para reutilizar assets reais de suporte, carrinho e Nerdcoins.
- Catálogo e detalhe do produto agora exibem benefícios visuais herdados do Shopify sem usar Liquid.
- Criado `src/components/shop/shop-footer.tsx` com barra colorida, links, atendimento e selos de confiança inspirados no footer Shopify.
- Removido texto técnico visível da home.
- Corrigido texto sem acentuação em `histórico`.

## Assets migrados

- `public/shopify/header_logo.webp`
- `public/shopify/logo.webp`
- `public/shopify/product-1.webp`
- `public/shopify/instant-view.webp`
- `public/shopify/ima_digital.webp`
- `public/shopify/google-play-badge.webp`
- `public/shopify/disponivel-google-play-badge.webp`
- `public/shopify/disponivel-na-app-store-botao.webp`
- `public/shopify/nerd-icon-account.webp`
- `public/shopify/nerd-icon-cart.webp`
- `public/shopify/nerd-icon-nerdcoins.webp`
- `public/shopify/nerd-icon-support.webp`

## Guardrails aplicados

- Shopify foi usado como referência visual e de assets, não como código.
- Nenhum arquivo Liquid foi importado para a aplicação.
- Nenhuma regra de negócio do SavePointFinance foi copiada.
- A alteração ficou limitada à primeira camada visual pública: header e home.
- Nenhuma dependência nova foi adicionada.

## Próximos passos

- Verificar visualmente a home em desktop e mobile.
- Evoluir as pendências do mapa em `docs/shopify-liquid-react-map.md`.
- Expandir a migração visual para listagem e detalhe de produto usando assets reais normalizados.
- Adicionar smoke test visual ou E2E cobrindo home, produtos e fidelidade.
