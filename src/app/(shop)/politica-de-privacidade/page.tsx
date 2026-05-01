import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Política de Privacidade",
  description: "Política de privacidade, cookies, direitos do titular e tratamento de dados da NerdLingoLab."
};

const updatedAt = "30 de abril de 2026";

export default function PrivacyPolicyPage(): React.ReactElement {
  return (
    <main className="geek-page min-h-screen px-5 py-10">
      <article className="mx-auto w-full max-w-[980px]">
        <div className="manga-panel rounded-lg bg-white p-6 shadow-sm sm:p-10">
          <p className="text-sm font-black uppercase tracking-[0.14em] text-primary">NerdLingoLab</p>
          <h1 className="mt-3 text-3xl font-black text-black sm:text-4xl">Política de Privacidade</h1>
          <p className="mt-4 max-w-3xl leading-7 text-[#4f5d65]">
            Esta política explica como coletamos, usamos, armazenamos, compartilhamos e protegemos dados pessoais
            relacionados a cadastro, compras, pagamentos, entregas, suporte, cupons, Nerdcoins e navegação.
          </p>
          <p className="mt-4 rounded-lg border border-[#f0dfd6] bg-[#fffaf6] px-4 py-3 text-sm font-bold text-[#4f5d65]">
            Última atualização: {updatedAt}. Este texto foi estruturado para adequação operacional à LGPD e ao
            comércio eletrônico, mas deve ser revisado por assessoria jurídica antes da publicação definitiva.
          </p>
        </div>

        <section className="mt-6 grid gap-4">
          <LegalSection title="1. Controlador e contato">
            <p>
              A NerdLingoLab é responsável pelo tratamento dos dados pessoais usados para operar a loja. Solicitações
              sobre privacidade, acesso, correção, exclusão, oposição ou revogação de consentimento podem ser enviadas
              pela página{" "}
              <Link className="font-black text-primary underline-offset-4 hover:underline" href="/suporte">
                Suporte
              </Link>.
            </p>
          </LegalSection>

          <LegalSection title="2. Dados que podemos coletar">
            <p>
              Podemos tratar nome, e-mail, telefone, CPF, data de nascimento, senha criptografada, endereços, CEP,
              histórico de pedidos, itens comprados, tickets de suporte, avaliações de atendimento, cupons, Nerdcoins,
              indicações, dados técnicos do dispositivo, cookies, logs de segurança e status de pagamento.
            </p>
            <p>
              Dados de pagamento sensíveis, como número completo do cartão e códigos de segurança, devem ser tratados
              pelo provedor de pagamento no ambiente seguro do checkout, conforme suas próprias políticas.
            </p>
          </LegalSection>

          <LegalSection title="3. Finalidades do tratamento">
            <p>
              Usamos dados para criar conta, autenticar acesso, processar pedidos, calcular frete, emitir comunicações,
              entregar produtos, prevenir fraudes, responder suporte, administrar cupons e Nerdcoins, cumprir obrigações
              legais, melhorar a loja, proteger sistemas e medir desempenho operacional.
            </p>
          </LegalSection>

          <LegalSection title="4. Bases legais">
            <p>
              O tratamento pode se apoiar em execução de contrato, cumprimento de obrigação legal ou regulatória,
              exercício regular de direitos, proteção ao crédito, prevenção a fraude, legítimo interesse e consentimento
              quando exigido, sempre observando necessidade, transparência, segurança e finalidade.
            </p>
          </LegalSection>

          <LegalSection title="5. Compartilhamento de dados">
            <p>
              Podemos compartilhar dados estritamente necessários com provedores de pagamento, antifraude, hospedagem,
              banco de dados, armazenamento de mídia, e-mail transacional, transportadoras, atendimento, analytics,
              autoridades públicas quando exigido e parceiros operacionais indispensáveis ao pedido.
            </p>
            <p>
              A loja não vende dados pessoais. Parceiros devem tratar dados conforme contrato, segurança adequada e
              finalidade compatível com a prestação do serviço.
            </p>
          </LegalSection>

          <LegalSection title="6. Cookies e tecnologias similares">
            <p>
              Usamos cookies e tecnologias semelhantes para manter sessão, carrinho, segurança, preferências, medição de
              desempenho e prevenção de abuso. O usuário pode ajustar preferências no navegador, mas isso pode afetar
              login, checkout e recursos essenciais.
            </p>
          </LegalSection>

          <LegalSection title="7. Retenção e exclusão">
            <p>
              Mantemos dados pelo tempo necessário para cumprir as finalidades informadas, atender obrigações legais,
              resolver disputas, prevenir fraude, manter histórico de pedidos e executar direitos. Quando possível,
              dados podem ser anonimizados ou excluídos após o fim da necessidade.
            </p>
          </LegalSection>

          <LegalSection title="8. Direitos do titular">
            <p>
              O titular pode solicitar confirmação de tratamento, acesso, correção, anonimização, bloqueio, eliminação,
              portabilidade, informações sobre compartilhamento, revisão de decisões automatizadas quando aplicável,
              revogação de consentimento e oposição a tratamentos em desconformidade.
            </p>
            <p>
              Algumas solicitações podem exigir verificação de identidade e podem ser limitadas por obrigações legais,
              fiscais, antifraude, contratuais ou de exercício regular de direitos.
            </p>
          </LegalSection>

          <LegalSection title="9. Segurança">
            <p>
              Aplicamos controles técnicos e administrativos para proteger dados contra acesso não autorizado, perda,
              alteração, divulgação indevida e abuso. Nenhum sistema é absolutamente imune a riscos; por isso, também
              orientamos o usuário a usar senha forte e não compartilhar credenciais.
            </p>
          </LegalSection>

          <LegalSection title="10. Crianças e adolescentes">
            <p>
              A loja não é direcionada a crianças. Compras por menores devem ocorrer com participação e autorização de
              responsável legal, especialmente quando envolver cadastro, pagamento e entrega.
            </p>
          </LegalSection>

          <LegalSection title="11. Transferências internacionais">
            <p>
              Alguns provedores de tecnologia podem armazenar ou processar dados fora do Brasil. Quando isso ocorrer,
              adotaremos medidas contratuais e técnicas compatíveis com a legislação aplicável.
            </p>
          </LegalSection>

          <LegalSection title="12. Alterações desta política">
            <p>
              A política pode ser atualizada para refletir mudanças no site, fornecedores, segurança, processos de
              compra ou exigências legais. A versão vigente será sempre publicada nesta página.
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
