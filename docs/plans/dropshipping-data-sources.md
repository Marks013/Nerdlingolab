# Fontes de dados para fornecedores de terceiros

## Regra do projeto

Os links atuais sao de anuncios de terceiros. Portanto o sistema nao deve depender de credenciais de seller nem prometer estoque exato.

Modo padrao:

- Mercado Livre: leitura publica referencial quando o ID MLB estiver disponivel e a origem permitir; caso contrario, manual assistido.
- Shopee: validacao assistida/manual.
- Checkout: nao bloqueia por falha de monitoramento, salvo se `DROPSHIPPING_CHECKOUT_STRICT=true` e houver indisponibilidade comprovada.

## Opcoes sem custo

### Validacao assistida/manual

Melhor ponto de partida.

Vantagens:

- Sem custo.
- Sem risco de bloqueio por scraping.
- Previsivel.
- Ja atende a compra operacional: link de origem, status, preco fornecedor, estoque observado e margem sugerida.

Limite:

- Depende de rotina humana.
- Nao avisa mudanca de preco automaticamente na Shopee.

### Leitura publica Mercado Livre

Boa para sinal operacional.

Vantagens:

- Sem credencial de seller.
- Retorna status publico, preco publico, variacoes e quantidade referencial.

Limite:

- Estoque pode ser referencial.
- Nao substitui conferencia antes da compra do fornecedor.

## Opcoes pagas ou freemium

### Apify

Boa opcao para testar sem compromisso, porque tem atores prontos para scraping e planos com creditos iniciais/freemium conforme disponibilidade da plataforma.

Uso recomendado:

- Validar alguns produtos Shopee por lote.
- Nunca deixar checkout depender diretamente do scraping.

Site: https://apify.com

### Bright Data

Mais robusto para operacao profissional de scraping/data collection, com infraestrutura, proxies e datasets. Normalmente e pago.

Uso recomendado:

- Quando o volume crescer e voce quiser monitoramento automatico com menor manutencao propria.

Site: https://brightdata.com

### Oxylabs

Foco em scraping/data gathering com infraestrutura profissional. Normalmente e pago.

Uso recomendado:

- Monitoramento mais estavel em escala.

Site: https://oxylabs.io

### DataForSEO

Pode ser util para dados de SERP/ecommerce dependendo da cobertura por marketplace e pais. Validar cobertura real antes de contratar.

Site: https://dataforseo.com

## Recomendacao

Comecar sem custo:

1. Usar Mercado Livre referencial.
2. Usar Shopee manual assistido.
3. Medir por 15 a 30 dias quantos produtos realmente exigem correcao diaria.
4. Se o volume de manutencao ficar alto, testar Apify primeiro por ser mais simples para prova de conceito.
5. Se virar processo critico, avaliar Bright Data ou Oxylabs.
