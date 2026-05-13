# Importacao assistida de fornecedores

Fluxo recomendado para atualizar links de fornecedores com o computador local:

1. Acesse `/admin/fornecedores`.
2. Filtre os fornecedores, se quiser atualizar apenas um grupo.
3. Clique em **Baixar CSV preciso**.
4. Salve o arquivo baixado em uma pasta local.
5. No terminal, dentro do projeto, execute:

```powershell
npm run suppliers:assist -- --input "C:\caminho\fornecedores-importacao-assistida.csv" --output "data\dropshipping\fornecedores-pronto.csv"
```

O comando abre um navegador persistente para login no Mercado Livre/Shopee quando necessário. Depois de logar, volte ao terminal e pressione Enter.

O arquivo de saida preserva as colunas do CSV preciso e preenche:

- `preco_importacao`
- `estoque_importacao`
- `status`
- `titulo_importacao`
- `note`
- `checkedAt`

Depois, volte em `/admin/fornecedores`, selecione o CSV gerado e clique em **Importar CSV**.

## Opcoes uteis

```powershell
npm run suppliers:collect -- --input "entrada.csv" --output "saida.csv" --headed --login-first --limit 20 --delay 1200
```

- `--headed`: abre o navegador visivel.
- `--login-first`: abre Mercado Livre e Shopee antes da coleta para login/captcha.
- `--limit 20`: testa apenas os primeiros 20 links.
- `--delay 1200`: espera 1,2s apos abrir cada pagina.
- `--profile ".tmp\supplier-collector-profile"`: reaproveita a sessao de login.

## Cuidados

- Sempre use o CSV baixado do admin como base, porque ele contem `sourceId`.
- Nao remova `sourceId`, `url`, `externalId` ou `externalShopId`.
- Links que exigirem verificacao ficam como `CONFIG_REQUIRED` para revisao manual.
- O importador nao cria produtos novos; ele atualiza origens ja vinculadas aos produtos.
