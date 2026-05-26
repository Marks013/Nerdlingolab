# Nerdlingolab Backup E Restore

O backup nao versiona `/srv/nerdlingolab` diretamente no repositorio principal.
Em vez disso, gera um arquivo criptografado com:

- dump SQL do PostgreSQL;
- dados do MinIO;
- arquivos criticos do projeto (`.env`, `docker-compose.yml`, `prisma`, `data/shopify`, `ops`);
- copia de recuperacao da chave de criptografia de campos sensiveis (`secrets/field-encryption.env`, dentro do arquivo criptografado);
- manifesto e checksum.

## Rodar Backup Manual

```bash
cd /home/ubuntu/Nerdlingolab
docker compose --profile backup run --rm backup-runner
```

Os arquivos ficam em:

```txt
/srv/nerdlingolab/migration-backups/archives/YYYY/MM/DD/
```

## Restore De Teste

Por padrao o restore nao sobrescreve o banco de producao. Ele cria
`nerdlingolab_restore_test`.

```bash
cd /home/ubuntu/Nerdlingolab
npm run backup:restore:test
```

Os arquivos do MinIO e arquivos criticos sao extraidos para:

```txt
/srv/nerdlingolab/migration-backups/restore-output/
```

## Restore Em Producao

Use somente em emergencia, depois de conferir o backup:

```bash
cd /home/ubuntu/Nerdlingolab
RESTORE_MODE=prod \
RESTORE_PRODUCTION_CONFIRMATION=RESTORE_NERDLINGOLAB_PROD \
docker compose --profile backup run --rm --entrypoint /bin/sh backup-runner -lc \
  'apk add --no-cache bash curl jq openssl tar gzip coreutils findutils >/dev/null && bash /workspace/ops/backup/restore-backup.sh'
```

## GitHub Releases

Configure no `.env`:

```env
BACKUP_GITHUB_ENABLED=true
BACKUP_GITHUB_TOKEN=...
BACKUP_GITHUB_REPOSITORY=Marks013/nerdlingolab-Backup
BACKUP_GITHUB_RELEASE_TAG=nerdlingolab-backups
BACKUP_GITHUB_RETENTION_COUNT=30
```

O upload cria ou reutiliza a release configurada e remove backups antigos
acima da retencao.

## Observacao Importante

Guarde `BACKUP_ENCRYPTION_PASSPHRASE` fora do servidor tambem. Sem essa senha,
os backups criptografados nao podem ser restaurados.

Tambem preserve a chave `DATA_ENCRYPTION_KEY`. Ela fica no `.env` e tambem em
`secrets/field-encryption.env` dentro do backup criptografado. Sem essa chave,
os registros sensiveis do banco restaurado continuam ilegíveis mesmo com o dump
SQL recuperado.
