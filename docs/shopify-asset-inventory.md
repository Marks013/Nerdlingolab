# Inventário de assets Shopify

Data: 24/04/2026

Fonte: `C:\Users\samue\Desktop\theme_export__nerdlingolab-com-nerdlingolav-v11-9-5__24APR2026-1138am.zip`

## Critério de migração

- Copiar para `public/shopify/` somente assets usados pela aplicação.
- Manter nomes estáveis e legíveis.
- Não migrar JavaScript, CSS ou arquivos de configuração do tema Liquid para produção.
- Reavaliar assets pendentes apenas quando uma tela real precisar deles.

## Assets visuais

| Arquivo no ZIP | Status | Uso atual ou decisão |
| --- | --- | --- |
| `assets/header_logo.webp` | Migrado | Logo do cabeçalho. |
| `assets/logo.webp` | Migrado | Logo da home. |
| `assets/product-1.webp` | Migrado | Imagem principal da home e fallback visual inicial. |
| `assets/instant-view.webp` | Migrado | Reservado para selo visual em etapa futura. |
| `assets/ima_digital.webp` | Migrado | Reservado para confiança/integrações em etapa futura. |
| `assets/google-play-badge.webp` | Migrado | Reservado para seção de app. |
| `assets/disponivel-google-play-badge.webp` | Migrado | Reservado para seção de app. |
| `assets/disponivel-na-app-store-botao.webp` | Migrado | Reservado para seção de app. |
| `assets/nerd-icon-account.webp` | Migrado | Home e blocos de confiança. |
| `assets/nerd-icon-cart.webp` | Migrado | Home e blocos de confiança. |
| `assets/nerd-icon-nerdcoins.webp` | Migrado | Blocos de confiança e fidelidade. |
| `assets/nerd-icon-support.webp` | Migrado | Home e blocos de entrega/rastreamento. |
| `assets/correios.svg` | Pendente | Útil para entrega/rastreamento, mas ainda não usado na interface. |
| `assets/RD-tesmoney.webp` | Pendente | Origem/uso comercial precisa ser confirmado antes de entrar em produção. |

## Assets técnicos não migrados

| Arquivo no ZIP | Decisão |
| --- | --- |
| `assets/theme.css` | Não migrar; extrair apenas padrões visuais úteis manualmente. |
| `assets/theme.min.js` | Não migrar; lógica Liquid/Shopify não deve entrar no Next.js. |
| `assets/custom.css` | Não migrar direto; usar como referência visual quando necessário. |
| `assets/custom.js` | Não migrar. |
| `assets/cart-api.js` | Não migrar; carrinho atual usa validação server-side própria. |
| `assets/cart-quantity-fix.js` | Não migrar. |
| `assets/frenet-shipping-calculator.js` | Não migrar; frete atual é recalculado no servidor. |
| `assets/product-variant-switcher.js` | Não migrar; variações devem ser implementadas em React com validação server-side. |
| `assets/joy-integration.js` | Não migrar; fidelidade atual usa domínio próprio. |
| `assets/cashback-page.js` | Não migrar; cashback/Nerdcoins deve ficar no fluxo próprio. |
| `assets/cashback-notification.js` | Não migrar. |
| `assets/cashback-styles.css` | Não migrar direto; usar como referência se a página de fidelidade evoluir. |
| `assets/correcoes.css` | Não migrar direto. |
| `assets/fix-grid-images.css` | Não migrar. |
| `assets/fix-images.js` | Não migrar. |
| `assets/grid-images-check.js` | Não migrar. |
| `assets/jquery-shim.js` | Não migrar. |
| `assets/kits.css` | Não migrar direto. |
| `assets/mini-cart-enhanced.css` | Não migrar direto. |
| `assets/backupwavecheckout.js` | Não migrar. |
| `assets/zuban.js` | Não migrar. |
| `assets/superfields_definitions.json` | Não migrar para runtime; consultar apenas para entender metacampos antigos. |
| `assets/CASHBACK-ARCHITECTURE.md` | Não migrar para runtime; usar como referência documental, com validação contra o domínio atual. |

## Assets usados nesta etapa

- `nerd-icon-support.webp`
- `nerd-icon-cart.webp`
- `nerd-icon-nerdcoins.webp`

Eles agora aparecem no catálogo e no detalhe do produto por meio de `ShopTrustStrip`, reforçando entrega, carrinho seguro e Nerdcoins sem importar Liquid.
