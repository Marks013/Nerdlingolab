import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Politica de Privacidade",
  description: "Politica de privacidade, cookies, direitos do titular e tratamento de dados da NerdLingoLab."
};

const updatedAt = "30 de abril de 2026";

export default function PrivacyPolicyPage(): React.ReactElement {
  return (
    <main className="geek-page min-h-screen px-5 py-10">
      <article className="mx-auto w-full max-w-[980px]">
        <div className="manga-panel rounded-lg bg-white p-6 shadow-sm sm:p-10">
          <p className="text-sm font-black uppercase tracking-[0.14em] text-primary">NerdLingoLab</p>
          <h1 className="mt-3 text-3xl font-black text-black sm:text-4xl">Politica de Privacidade</h1>
          <p className="mt-4 max-w-3xl leading-7 text-[#4f5d65]">
            Esta politica explica como coletamos, usamos, armazenamos, compartilhamos e protegemos dados pessoais
            relacionados a cadastro, compras, pagamentos, entregas, suporte, cupons, Nerdcoins e navegacao.
          </p>
          <p className="mt-4 rounded-lg border border-[#f0dfd6] bg-[#fffaf6] px-4 py-3 text-sm font-bold text-[#4f5d65]">
            Ultima atualizacao: {updatedAt}. Este texto foi estruturado para adequacao operacional a LGPD e ao
            comercio eletronico, mas deve ser revisado por assessoria juridica antes da publicacao definitiva.
          </p>
        </div>

        <section className="mt-6 grid gap-4">
          <LegalSection title="1. Controlador e contato">
            <p>
              A NerdLingoLab e responsavel pelo tratamento dos dados pessoais usados para operar a loja. Solicitacoes
              sobre privacidade, acesso, correcao, exclusao, oposicao ou revogacao de consentimento podem ser enviadas
              pela pagina{" "}
              <Link className="font-black text-primary underline-offset-4 hover:underline" href="/suporte">
                Suporte
              </Link>.
            </p>
          </LegalSection>

          <LegalSection title="2. Dados que podemos coletar">
            <p>
              Podemos tratar nome, e-mail, telefone, CPF, data de nascimento, senha criptografada, enderecos, CEP,
              historico de pedidos, itens comprados, tickets de suporte, avaliacoes de atendimento, cupons, Nerdcoins,
              indicacoes, dados tecnicos do dispositivo, cookies, logs de seguranca e status de pagamento.
            </p>
            <p>
              Dados de pagamento sensiveis, como numero completo do cartao e codigos de seguranca, devem ser tratados
              pelo provedor de pagamento no ambiente seguro do checkout, conforme suas proprias politicas.
            </p>
          </LegalSection>

          <LegalSection title="3. Finalidades do tratamento">
            <p>
              Usamos dados para criar conta, autenticar acesso, processar pedidos, calcular frete, emitir comunicacoes,
              entregar produtos, prevenir fraudes, responder suporte, administrar cupons e Nerdcoins, cumprir obrigacoes
              legais, melhorar a loja, proteger sistemas e medir desempenho operacional.
            </p>
          </LegalSection>

          <LegalSection title="4. Bases legais">
            <p>
              O tratamento pode se apoiar em execucao de contrato, cumprimento de obrigacao legal ou regulatoria,
              exercicio regular de direitos, protecao ao credito, prevencao a fraude, legitimo interesse e consentimento
              quando exigido, sempre observando necessidade, transparencia, seguranca e finalidade.
            </p>
          </LegalSection>

          <LegalSection title="5. Compartilhamento de dados">
            <p>
              Podemos compartilhar dados estritamente necessarios com provedores de pagamento, antifraude, hospedagem,
              banco de dados, armazenamento de midia, e-mail transacional, transportadoras, atendimento, analytics,
              autoridades publicas quando exigido e parceiros operacionais indispensaveis ao pedido.
            </p>
            <p>
              A loja nao vende dados pessoais. Parceiros devem tratar dados conforme contrato, seguranca adequada e
              finalidade compativel com a prestacao do servico.
            </p>
          </LegalSection>

          <LegalSection title="6. Cookies e tecnologias similares">
            <p>
              Usamos cookies e tecnologias semelhantes para manter sessao, carrinho, seguranca, preferencias, medicao de
              desempenho e prevencao de abuso. O usuario pode ajustar preferencias no navegador, mas isso pode afetar
              login, checkout e recursos essenciais.
            </p>
          </LegalSection>

          <LegalSection title="7. Retencao e exclusao">
            <p>
              Mantemos dados pelo tempo necessario para cumprir as finalidades informadas, atender obrigacoes legais,
              resolver disputas, prevenir fraude, manter historico de pedidos e executar direitos. Quando possivel,
              dados podem ser anonimizados ou excluidos apos o fim da necessidade.
            </p>
          </LegalSection>

          <LegalSection title="8. Direitos do titular">
            <p>
              O titular pode solicitar confirmacao de tratamento, acesso, correcao, anonimizacao, bloqueio, eliminacao,
              portabilidade, informacoes sobre compartilhamento, revisao de decisoes automatizadas quando aplicavel,
              revogacao de consentimento e oposicao a tratamentos em desconformidade.
            </p>
            <p>
              Algumas solicitacoes podem exigir verificacao de identidade e podem ser limitadas por obrigacoes legais,
              fiscais, antifraude, contratuais ou de exercicio regular de direitos.
            </p>
          </LegalSection>

          <LegalSection title="9. Seguranca">
            <p>
              Aplicamos controles tecnicos e administrativos para proteger dados contra acesso nao autorizado, perda,
              alteracao, divulgacao indevida e abuso. Nenhum sistema e absolutamente imune a riscos; por isso, tambem
              orientamos o usuario a usar senha forte e nao compartilhar credenciais.
            </p>
          </LegalSection>

          <LegalSection title="10. Criancas e adolescentes">
            <p>
              A loja nao e direcionada a criancas. Compras por menores devem ocorrer com participacao e autorizacao de
              responsavel legal, especialmente quando envolver cadastro, pagamento e entrega.
            </p>
          </LegalSection>

          <LegalSection title="11. Transferencias internacionais">
            <p>
              Alguns provedores de tecnologia podem armazenar ou processar dados fora do Brasil. Quando isso ocorrer,
              adotaremos medidas contratuais e tecnicas compativeis com a legislacao aplicavel.
            </p>
          </LegalSection>

          <LegalSection title="12. Alteracoes desta politica">
            <p>
              Podemos atualizar esta politica para refletir mudancas no site, fornecedores, seguranca, processos de
              compra ou exigencias legais. A versao vigente sera sempre publicada nesta pagina.
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
