# Guia de comandos do servidor

Este arquivo é uma cola operacional para atualizar, migrar, validar e reiniciar o NerdLingoLab no servidor.

## 1. Entrar na pasta do projeto

```bash
cd /caminho/onde/esta/NerdLingoLab
```

No Windows local, normalmente:

```powershell
cd "C:\Users\User\Desktop\NerdLingoLab"
```

## 2. Git

Ver em qual branch você está e se existem mudanças locais:

```bash
git status
```

Baixar as alterações da branch `main`:

```bash
git pull origin main
```

Ver os últimos commits:

```bash
git log --oneline -5
```

Enviar alterações para o GitHub:

```bash
git add .
git commit -m "Descreva a alteração"
git push origin main
```

Se aparecer `Everything up-to-date`, significa que não havia commit novo para enviar.

## 3. Docker Compose

Subir banco, MinIO e aplicação:

```bash
docker compose up -d
```

Subir reconstruindo a imagem da aplicação:

```bash
docker compose up -d --build
```

Ver containers ativos:

```bash
docker compose ps
```

Ver logs da aplicação:

```bash
docker compose logs -f app
```

Ver logs do banco:

```bash
docker compose logs -f postgres
```

Reiniciar somente a aplicação:

```bash
docker compose restart app
```

Parar os serviços sem apagar dados:

```bash
docker compose down
```

Não use `docker compose down -v` em produção, porque ele apaga volumes do banco e arquivos do MinIO.

## 4. Atualizar o site no servidor

Sequência recomendada depois que um commit novo já está na `main`:

```bash
git pull origin main
docker compose up -d --build
docker compose run --rm setup npm run db:deploy
docker compose restart app
docker compose ps
```

Se for a primeira instalação do servidor, rode o bootstrap completo:

```bash
docker compose --profile setup run --rm setup
docker compose up -d --build app
```

## 5. Prisma e banco de dados

Gerar cliente Prisma depois de mudar `prisma/schema.prisma`:

```bash
npm run prisma:generate
```

Criar migration em desenvolvimento:

```bash
npm run db:migrate
```

Aplicar migrations no servidor ou produção:

```bash
npm run db:deploy
```

Popular dados iniciais:

```bash
npm run db:seed
```

Instalação local completa com migration e seed:

```bash
npm run setup
```

Resetar banco local:

```bash
npm run db:reset
```

Use `db:reset` somente em ambiente local. Em produção ele pode apagar dados.

## 6. Scripts de validação

Checar TypeScript:

```bash
npm run typecheck
```

Checar lint:

```bash
npm run lint
```

Rodar validação completa do projeto:

```bash
npm run validate:project
```

Checar prontidão operacional:

```bash
npm run check:operational
```

Gerar build de produção:

```bash
npm run build
```

Rodar testes E2E:

```bash
npm run test:e2e
```

## 7. Scripts de auditoria específicos

Validar encoding dos textos:

```bash
npm run validate:encoding
```

Validar textos de UI:

```bash
npm run validate:ui-copy
```

Auditar imagens:

```bash
npm run audit:images
```

Auditar rotas:

```bash
npm run audit:routes
```

Auditar server actions:

```bash
npm run audit:actions
```

Auditar contratos de e-commerce:

```bash
npm run audit:ecommerce
```

Validar contraste visual:

```bash
npm run validate:contrast
```

Auditar UI em runtime:

```bash
npm run audit:ui-runtime
```

## 8. Shopify

Importar produtos do CSV configurado:

```bash
npm run import:shopify
```

O arquivo padrão vem de `SHOPIFY_PRODUCTS_CSV`. No projeto, o padrão atual é:

```text
data/shopify/products_export_1.csv
```

## 9. Mídias e imagens

Baixar imagens externas usadas em produtos, variações, slides e popups para o storage interno:

```bash
npm run media:import-external
```

Use este comando antes de encerrar Shopify/CDN/domínio antigo. Ele aplica migrations pendentes, baixa as imagens externas para o storage interno e troca URLs externas por URLs internas do próprio site, no formato `/api/media/...`.

No Docker:

```bash
docker compose run --rm app npm run media:import-external
```

Se aparecer `The table public.MediaAsset does not exist`, rode novamente o comando acima depois de atualizar o código. O script agora executa `prisma migrate deploy` antes da importação.

## 10. Desenvolvimento local

Instalar dependências:

```bash
npm ci
```

Subir serviços de apoio:

```bash
docker compose up -d postgres minio minio-create-bucket
```

Rodar o site local:

```bash
npm run dev
```

Rodar o site local com Webpack, útil para Playwright no Windows:

```bash
npm run dev:webpack
```

## 11. Diagnóstico rápido

Quando algo der errado, rode nesta ordem:

```bash
git status
docker compose ps
docker compose logs --tail=120 app
docker compose logs --tail=120 postgres
npm run typecheck
npm run lint
```

Se o erro envolver tabela ou campo faltando no banco, rode:

```bash
npm run db:deploy
```

Se estiver usando Docker no servidor:

```bash
docker compose run --rm setup npm run db:deploy
docker compose restart app
```

Exemplo comum: `P2021` ou `The table public.MarketingPopup does not exist` significa que o código novo subiu antes da migration correspondente. Rode o `db:deploy` acima e reinicie o `app`.
