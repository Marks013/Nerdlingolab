# Mapeamento visual tema legado - NerdLingoLab

Referência ativa: https://nerdlingolab.com/

Capturas locais:
- `C:/Users/User/Desktop/NerdLingoLab/.reference-tema-legado-home-clean.png`
- `C:/Users/User/Desktop/NerdLingoLab/.reference-tema-legado-login.png`
- `C:/Users/User/Desktop/NerdLingoLab/.reference-tema-legado-cart.png`
- `C:/Users/User/Desktop/NerdLingoLab/.reference-tema-legado-collection.png`
- `C:/Users/User/Desktop/NerdLingoLab/.reference-tema-legado-product.png`

## Identidade visual

- Fonte base: Roboto, sans-serif.
- Fundo: branco e cinza muito claro.
- Cor dominante: laranja vivo `rgb(255, 105, 2)`.
- Cores auxiliares: preto para títulos, cinza `rgb(103, 114, 121)` para textos secundários, verde para selo `NOVO`, roxo/rosa/verde em círculos de categorias.
- Raio visual: cards e painéis com bordas arredondadas médias, mais próximo de 14-18px nos cards públicos.
- Botões principais: laranja sólido, texto branco, largura generosa em carrinho/produto.

## Estrutura comum

- Topbar laranja em largura total: `FRETE GRÁTIS em compras acima de R$99,90`.
- Header claro com logo grande à esquerda, busca central com borda laranja e links `Conta`, `Carrinho`, `Favoritos`, `Suporte`.
- Faixa de categorias laranja abaixo do header, com botão `Categorias` e quatro atalhos circulares: Cupons, Ofertas, Temporada, Action Figures.
- Footer comercial denso:
  - faixa laranja de benefícios;
  - atendimento, categorias, institucional e newsletter;
  - aviso antifraude;
  - selos de segurança;
  - selos de pagamentos: Mastercard, Visa, Elo, Hipercard, Amex, Diners, Boleto, Pix;
  - assinatura `Segurança desenvolvida & certificada pela Ímã Digital ©`.

## Home

- Hero visual grande logo após a faixa de categorias, usando imagem real/ilustrada e texto sobre a imagem.
- Trust strip branco sobre fundo claro, com quatro benefícios e ícones lineares laranja.
- Vitrines horizontais: `Novidades`, `Nossos Produtos`, `Mais Vendidos`.
- Títulos simples com sublinhado laranja curto.
- Cards de produto com imagem grande, selo verde `NOVO`, botão de favorito no canto, título em duas linhas e preço laranja grande.

## Login

- Header e categorias iguais à home.
- Espaço vertical amplo.
- Card central branco, sombra suave, largura aproximada de 460px.
- Título `Login`, subtítulo `Entre na sua conta`, campos `E-mail` e `Senha`, botão preto `Entrar`.
- Links de criar conta/recuperar senha e botões sociais coloridos.

## Carrinho

- Estado vazio com painel branco grande centralizado.
- Ícone de carrinho grande, texto `Seu carrinho está vazio`, botão laranja `Veja nossos produtos`.
- Footer aparece logo abaixo com faixa laranja de benefícios.

## Coleções / catálogo

- Breadcrumb simples.
- Título central.
- Grade horizontal de coleções com imagens grandes e nomes abaixo.
- Footer com selos de segurança e cartões bastante visíveis.

## Produto

- Breadcrumb acima do conteúdo.
- Layout em duas colunas:
  - galeria branca à esquerda com miniaturas verticais;
  - painel branco à direita com título, selo de vendedor, variações por botões, preço laranja, parcelamento, Pix, quantidade, botões de compra.
- Botões:
  - `Adicionar ao Carrinho` branco com borda;
  - `Comprar Agora` marrom/laranja forte;
  - WhatsApp verde claro;
  - lista de desejos branca com borda preta.
- Descrição em painel branco abaixo da galeria.

## Decisão de implantação

Primeira implantação no Next.js:
- ajustar tokens globais para tema claro/Roboto/laranja tema legado;
- reconstruir `ShopHeader` e `ShopFooter`;
- ajustar `ShopTrustStrip`, `ProductCard`, home, produto, carrinho vazio e prompt de conta;
- incluir selos de cartão e segurança no footer;
- manter backend/checkout atual sem mudança funcional.

## Assets locais implantados

- `public/brand-assets/FAVICON_NERDLINGOLAB.webp`: cabecalho, favicon/metadados e e-mails transacionais.
- `public/brand-assets/FAVICON_NERDLINGOLAB.webp`: favicon/metadados do app.
- `public/brand-assets/BANNER_01_*` a `BANNER_05_*`: vitrine principal responsiva da home, com versões PC e mobile.
- `public/brand-assets/ESTAMPAS_MAIS_VENDIDAS_-_NERDLINGOLAB.webp`: chamada de mais vendidos e fallback do primeiro produto.
- `public/brand-assets/OFERTA_DE_FRETE_GRATIS_-_NERDLINGOLAB.webp`: chamada de frete grátis e fallback de produto.
- `public/brand-assets/SOBRE_A_LOJA_-_NERDLINGOLAB.webp`: chamada institucional e fallback de categoria/produto.
- `public/brand-assets/FACHADA_NERDLINGOLAB.webp`: bloco "sobre a loja" na home.
- `public/brand-assets/MASCOTE_*` e `SIMBOLO_NERDLINGOLAB_TESTE.webp`: fallback visual de catálogo quando o Postgres local está indisponível.
