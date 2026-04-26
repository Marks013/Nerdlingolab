# Fase 16 - Migração visual inicial do tema legado

## Objetivo

Iniciar a substituição visual do tema legado sem importar Liquid para produção, usando apenas assets reais e úteis do tema exportado.

## Entregue

- Criada a pasta `public/brand-assets/` com assets selecionados do tema exportado.
- Extraídos logos, imagem de produto, ícones de conta/carrinho/suporte/nerdcoins e badges de app.
- Atualizado `src/components/shop/shop-header.tsx` para usar o logo real do tema legado.
- Atualizada a home em `src/app/(shop)/page.tsx` com hero visual usando imagem real do tema.
- Criado `src/components/shop/shop-trust-strip.tsx` para reutilizar assets reais de suporte, carrinho e Nerdcoins.
- Catálogo e detalhe do produto agora exibem benefícios visuais herdados do tema legado sem usar Liquid.
- Criado `src/components/shop/shop-footer.tsx` com barra colorida, links, atendimento e selos de confiança inspirados no footer tema legado.
- Removido texto técnico visível da home.
- Corrigido texto sem acentuação em `histórico`.

## Assets migrados

- `public/brand-assets/header_logo.webp`
- `public/brand-assets/logo.webp`
- `public/brand-assets/ESTAMPAS_MAIS_VENDIDAS_-_NERDLINGOLAB.webp`
- `public/brand-assets/instant-view.webp`
- `public/brand-assets/ima_digital.webp`
- `public/brand-assets/google-play-badge.webp`
- `public/brand-assets/disponivel-google-play-badge.webp`
- `public/brand-assets/disponivel-na-app-store-botao.webp`
- `public/brand-assets/nerd-icon-account.webp`
- `public/brand-assets/nerd-icon-cart.webp`
- `public/brand-assets/nerd-icon-nerdcoins.webp`
- `public/brand-assets/nerd-icon-support.webp`

## Guardrails aplicados

- tema legado foi usado como referência visual e de assets, não como código.
- Nenhum arquivo Liquid foi importado para a aplicação.
- Nenhuma regra de negócio do SavePointFinance foi copiada.
- A alteração ficou limitada à primeira camada visual pública: header e home.
- Nenhuma dependência nova foi adicionada.

## Próximos passos

- Verificar visualmente a home em desktop e mobile.
- Evoluir as pendências do mapa em `docs/legacy-theme-react-map.md`.
- Expandir a migração visual para listagem e detalhe de produto usando assets reais normalizados.
- Adicionar smoke test visual ou E2E cobrindo home, produtos e fidelidade.
