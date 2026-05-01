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
            Estes termos regulam o acesso, cadastro, compras, pagamentos, entregas, suporte e uso de benefícios
            da loja NerdLingoLab. Ao criar conta ou comprar, você declara que leu e concorda com estas regras.
          </p>
          <p className="mt-4 rounded-lg border border-[#f0dfd6] bg-[#fffaf6] px-4 py-3 text-sm font-bold text-[#4f5d65]">
            Última atualização: {updatedAt}. Este documento é um modelo operacional para a loja e deve ser revisado
            por assessoria jurídica antes da publicação definitiva em produção.
          </p>
        </div>

        <section className="mt-6 grid gap-4">
          <LegalSection title="1. Identificação da loja e atendimento">
            <p>
              A NerdLingoLab disponibiliza produtos de cultura geek, vestuário e itens relacionados por meio de
              comércio eletrônico. A loja deve manter canais claros de atendimento, identificação do fornecedor,
              informações essenciais do produto, preço, despesas, prazos, restrições e meios de contato.
            </p>
            <p>
              Dúvidas, arrependimento, trocas, devoluções, pedidos e suporte podem ser tratados pela página{" "}
              <Link className="font-black text-primary underline-offset-4 hover:underline" href="/suporte">
                Suporte
              </Link>.
            </p>
          </LegalSection>

          <LegalSection title="2. Conta, senha e cadastro">
            <p>
              Para comprar, acompanhar pedidos, abrir tickets e usar Nerdcoins, o usuario pode precisar criar uma
              conta com dados verdadeiros, completos e atualizados. O usuário é responsável por manter sua senha em
              sigilo e por comunicar qualquer uso indevido.
            </p>
            <p>
              A loja pode recusar ou suspender cadastros que apresentem fraude, tentativa de abuso de cupons,
              violação de regras, dados inconsistentes ou risco de segurança.
            </p>
          </LegalSection>

          <LegalSection title="3. Produtos, preços e disponibilidade">
            <p>
              As ofertas exibem nome, imagens, descrição, variações, preço, estoque estimado, condições de pagamento
              e informações relevantes. Imagens podem variar conforme tela, lote, fornecedor e iluminação.
            </p>
            <p>
              Estoque, preços, cupons e promoções podem mudar sem aviso prévio, respeitados os pedidos já confirmados.
              Em caso de erro evidente de preço, estoque ou informação técnica, a loja poderá cancelar a compra e
              restituir integralmente os valores pagos.
            </p>
          </LegalSection>

          <LegalSection title="4. Pedidos, pagamentos e antifraude">
            <p>
              O pedido é confirmado após validação de pagamento, disponibilidade e dados cadastrais. Pagamentos podem
              ser processados por parceiros como Mercado Pago, Pix, cartão, boleto ou outros meios habilitados no checkout.
            </p>
            <p>
              Transações podem passar por análise antifraude. A loja não solicita senha de banco, código completo de
              cartão fora do ambiente seguro do checkout ou códigos de autenticação por canais informais.
            </p>
          </LegalSection>

          <LegalSection title="5. Entrega, frete e acompanhamento">
            <p>
              O prazo de entrega considera confirmação do pagamento, preparação, postagem e transporte. O custo de
              frete, modalidade, prazo estimado e eventuais restrições serão informados antes da finalização da compra.
            </p>
            <p>
              O cliente deve informar endereço completo e correto, incluindo CEP, número, complemento e telefone. Erros
              de endereço podem gerar atraso, reenvio ou custos adicionais.
            </p>
          </LegalSection>

          <LegalSection title="6. Arrependimento, trocas e devoluções">
            <p>
              Em compras realizadas fora do estabelecimento comercial, o consumidor pode exercer o direito de
              arrependimento em até 7 dias corridos contados do recebimento, com devolução dos valores pagos conforme
              a legislação aplicável.
            </p>
            <p>
              Produtos personalizados, usados de forma inadequada, sem embalagem razoável ou com sinais de dano causado
              pelo consumidor podem exigir análise antes da troca ou devolução. A loja informará os passos pelo suporte.
            </p>
          </LegalSection>

          <LegalSection title="7. Cupons, Nerdcoins e benefícios">
            <p>
              Cupons, pontos, indicações e benefícios promocionais são pessoais, podem ter validade, regras de uso,
              limite por pedido e restrições cumulativas. Fraude, automação indevida ou abuso de benefícios podem
              levar ao cancelamento do benefício e revisão do pedido.
            </p>
          </LegalSection>

          <LegalSection title="8. Conteudos, propriedade intelectual e uso proibido">
            <p>
              Marcas, layout, textos, imagens, códigos, catálogos e elementos visuais da loja pertencem a seus titulares
              ou são usados mediante autorização/licença. É proibido copiar, explorar, raspar dados, atacar, fraudar,
              interferir na segurança ou usar a loja para fins ilícitos.
            </p>
          </LegalSection>

          <LegalSection title="9. Limitação de responsabilidade">
            <p>
              A loja trabalha para manter o site disponível e seguro, mas pode haver indisponibilidade por manutenção,
              falha de internet, provedor, pagamento, transporte ou evento fora de controle razoável. Nada nestes termos
              exclui direitos obrigatórios do consumidor previstos em lei.
            </p>
          </LegalSection>

          <LegalSection title="10. Alterações dos termos">
            <p>
              Estes termos podem ser atualizados para refletir melhorias do site, mudanças operacionais, novas regras de
              pagamento, segurança ou exigências legais. A versão vigente será publicada nesta página.
            </p>
          </LegalSection>

          <LegalSection title="11. Lei aplicável">
            <p>
              Estes termos seguem a legislação brasileira, incluindo normas de defesa do consumidor, comércio eletrônico,
              proteção de dados e uso da internet. Conflitos devem ser tratados preferencialmente pelos canais de suporte
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
