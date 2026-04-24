# Encoding e Acentuação

## Padrão do projeto

- Todos os arquivos de código, configuração e documentação devem ser salvos em UTF-8.
- A interface é em PT-BR e deve usar acentuação real: `Carrinho está vazio`, `Não enviado`, `Disponível`.
- Não usar substituições como `Nao`, `esta`, `indisponivel` em textos visíveis ao usuário.
- Não usar entidades HTML para texto comum em JSX, exceto quando necessário por sintaxe.

## Garantias adicionadas

- `.editorconfig` força `charset = utf-8`.
- `.gitattributes` registra arquivos textuais como UTF-8 e LF.
- `src/app/layout.tsx` usa `lang="pt-BR"`; o Next.js emite o documento como UTF-8.
- `npm run validate:encoding` falha se encontrar arquivo textual fora de UTF-8, BOM, mojibake ou texto Unicode fora de NFC.
- `npm run validate:ui-copy` falha se a interface voltar a exibir orientação técnica, termos de desenvolvimento ou palavras comuns sem acentuação.
- Backend, Frontend, Back-end e Front-end também são bloqueados na interface. Esses termos devem aparecer apenas em documentação local quando forem necessários.

## Regra prática

Código e identificadores continuam em inglês. Texto exibido na UI fica em português brasileiro com acentuação correta.
Instruções técnicas, decisões de arquitetura e notas de implementação devem ficar em arquivos locais dentro de `docs/`, nunca em cards ou páginas da interface.
