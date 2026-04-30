import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Termos de Uso",
  description: "Termos de uso, compra, atendimento, trocas e responsabilidades da NerdLingoLab."
};

const updatedAt = "30 de abril de 2026";

export default function TermsOfUsePage(): React.ReactElement {
  return (
    <main className="geek-page min-h-screen px-5 py-10">
      <article className="mx-auto w-full max-w-[980px]">
        <div className="manga-panel rounded-lg bg-white p-6 shadow-sm sm:p-10">
          <p className="text-sm font-black uppercase tracking-[0.14em] text-primary">NerdLingoLab</p>
          <h1 className="mt-3 text-3xl font-black text-black sm:text-4xl">Termos de Uso</h1>
          <p className="mt-4 max-w-3xl leading-7 text-[#4f5d65]">
            Estes termos regulam o acesso, cadastro, compras, pagamentos, entregas, suporte e uso de beneficios
            da loja NerdLingoLab. Ao criar conta ou comprar, voce declara que leu e concorda com estas regras.
          </p>
          <p className="mt-4 rounded-lg border border-[#f0dfd6] bg-[#fffaf6] px-4 py-3 text-sm font-bold text-[#4f5d65]">
            Ultima atualizacao: {updatedAt}. Este documento e um modelo operacional para a loja e deve ser revisado
            por assessoria juridica antes da publicacao definitiva em producao.
          </p>
        </div>

        <section className="mt-6 grid gap-4">
          <LegalSection title="1. Identificacao da loja e atendimento">
            <p>
              A NerdLingoLab disponibiliza produtos de cultura geek, vestuario e itens relacionados por meio de
              comercio eletronico. A loja deve manter canais claros de atendimento, identificacao do fornecedor,
              informacoes essenciais do produto, preco, despesas, prazos, restricoes e meios de contato.
            </p>
            <p>
              Duvidas, arrependimento, trocas, devolucoes, pedidos e suporte podem ser tratados pela pagina{" "}
              <Link className="font-black text-primary underline-offset-4 hover:underline" href="/suporte">
                Suporte
              </Link>.
            </p>
          </LegalSection>

          <LegalSection title="2. Conta, senha e cadastro">
            <p>
              Para comprar, acompanhar pedidos, abrir tickets e usar Nerdcoins, o usuario pode precisar criar uma
              conta com dados verdadeiros, completos e atualizados. O usuario e responsavel por manter sua senha em
              sigilo e por comunicar qualquer uso indevido.
            </p>
            <p>
              A loja pode recusar ou suspender cadastros que apresentem fraude, tentativa de abuso de cupons,
              violacao de regras, dados inconsistentes ou risco de seguranca.
            </p>
          </LegalSection>

          <LegalSection title="3. Produtos, precos e disponibilidade">
            <p>
              As ofertas exibem nome, imagens, descricao, variacoes, preco, estoque estimado, condicoes de pagamento
              e informacoes relevantes. Imagens podem variar conforme tela, lote, fornecedor e iluminacao.
            </p>
            <p>
              Estoque, precos, cupons e promocoes podem mudar sem aviso previo, respeitados os pedidos ja confirmados.
              Em caso de erro evidente de preco, estoque ou informacao tecnica, a loja podera cancelar a compra e
              restituir integralmente os valores pagos.
            </p>
          </LegalSection>

          <LegalSection title="4. Pedidos, pagamentos e antifraude">
            <p>
              O pedido e confirmado apos validacao de pagamento, disponibilidade e dados cadastrais. Pagamentos podem
              ser processados por parceiros como Mercado Pago, Pix, cartao, boleto ou outros meios habilitados no checkout.
            </p>
            <p>
              Transacoes podem passar por analise antifraude. A loja nao solicita senha de banco, codigo completo de
              cartao fora do ambiente seguro do checkout ou codigos de autenticacao por canais informais.
            </p>
          </LegalSection>

          <LegalSection title="5. Entrega, frete e acompanhamento">
            <p>
              O prazo de entrega considera confirmacao do pagamento, preparacao, postagem e transporte. O custo de
              frete, modalidade, prazo estimado e eventuais restricoes serao informados antes da finalizacao da compra.
            </p>
            <p>
              O cliente deve informar endereco completo e correto, incluindo CEP, numero, complemento e telefone. Erros
              de endereco podem gerar atraso, reenvio ou custos adicionais.
            </p>
          </LegalSection>

          <LegalSection title="6. Arrependimento, trocas e devolucoes">
            <p>
              Em compras realizadas fora do estabelecimento comercial, o consumidor pode exercer o direito de
              arrependimento em ate 7 dias corridos contados do recebimento, com devolucao dos valores pagos conforme
              a legislacao aplicavel.
            </p>
            <p>
              Produtos personalizados, usados de forma inadequada, sem embalagem razoavel ou com sinais de dano causado
              pelo consumidor podem exigir analise antes da troca ou devolucao. A loja informara os passos pelo suporte.
            </p>
          </LegalSection>

          <LegalSection title="7. Cupons, Nerdcoins e beneficios">
            <p>
              Cupons, pontos, indicacoes e beneficios promocionais sao pessoais, podem ter validade, regras de uso,
              limite por pedido e restricoes cumulativas. Fraude, automacao indevida ou abuso de beneficios podem
              levar ao cancelamento do beneficio e revisao do pedido.
            </p>
          </LegalSection>

          <LegalSection title="8. Conteudos, propriedade intelectual e uso proibido">
            <p>
              Marcas, layout, textos, imagens, codigos, catalogos e elementos visuais da loja pertencem a seus titulares
              ou sao usados mediante autorizacao/licenca. E proibido copiar, explorar, raspar dados, atacar, fraudar,
              interferir na seguranca ou usar a loja para fins ilicitos.
            </p>
          </LegalSection>

          <LegalSection title="9. Limitacao de responsabilidade">
            <p>
              A loja trabalha para manter o site disponivel e seguro, mas pode haver indisponibilidade por manutencao,
              falha de internet, provedor, pagamento, transporte ou evento fora de controle razoavel. Nada nestes termos
              exclui direitos obrigatorios do consumidor previstos em lei.
            </p>
          </LegalSection>

          <LegalSection title="10. Alteracoes dos termos">
            <p>
              Estes termos podem ser atualizados para refletir melhorias do site, mudancas operacionais, novas regras de
              pagamento, seguranca ou exigencias legais. A versao vigente sera publicada nesta pagina.
            </p>
          </LegalSection>

          <LegalSection title="11. Lei aplicavel">
            <p>
              Estes termos seguem a legislacao brasileira, incluindo normas de defesa do consumidor, comercio eletronico,
              protecao de dados e uso da internet. Conflitos devem ser tratados preferencialmente pelos canais de suporte
              antes de medidas administrativas ou judiciais.
            </p>
          </LegalSection>
        </section>
      </article>
    </main>
  );
}

function LegalSection({
  children,
  title
}: {
  children: React.ReactNode;
  title: string;
}): React.ReactElement {
  return (
    <section className="rounded-lg border border-[#f0dfd6] bg-white p-5 shadow-sm sm:p-7">
      <h2 className="text-xl font-black text-black">{title}</h2>
      <div className="mt-4 grid gap-3 leading-7 text-[#4f5d65]">{children}</div>
    </section>
  );
}
