import { useTranslation } from 'react-i18next';
import { ContentContainer } from '@/components/common/ContentContainer';

export function PrivacyPolicyView() {
  const { t } = useTranslation();

  return (
    <main className="flex min-h-0 w-full min-w-0 flex-1 flex-col bg-background py-8 md:py-12">
      <ContentContainer className="flex flex-col gap-8 max-w-4xl mx-auto px-4 md:px-8">
        <h1 className="text-3xl md:text-4xl font-bold text-foreground">
          {t('隐私政策')}
        </h1>
        <div className="flex flex-col gap-6 text-sm md:text-base text-muted-foreground leading-relaxed">
          <section className="flex flex-col gap-3">
            <h2 className="text-xl font-semibold text-foreground">
              {t('1. 引言')}
            </h2>
            <p>
              {t(
                '1.1 本隐私政策解释了当您访问或使用我们的移动应用程序、StoryFun Web 应用程序、StoryFun 网站以及其他在线产品和服务（统称为“服务”）时，我们将如何收集、使用、存储、共享和保护您的个人信息。',
              )}
            </p>
            <p>
              {t(
                '1.2 本隐私政策适用于我们服务的所有用户。通过使用我们的服务，即表示您同意我们按照本隐私政策收集和使用您的个人信息。',
              )}
            </p>
            <p>
              {t(
                '1.3 本隐私政策应与我们的用户条款结合阅读。本隐私政策中未定义的任何术语应具有我们用户条款中规定的含义。',
              )}
            </p>
          </section>

          <section className="flex flex-col gap-3">
            <h2 className="text-xl font-semibold text-foreground">
              {t('2. 我们收集的信息')}
            </h2>
            <h3 className="text-lg font-medium text-foreground mt-2">
              {t('2.1 您提供给我们的信息')}
            </h3>
            <p>{t('我们收集您自愿提供给我们的信息，包括：')}</p>
            <ul className="list-none flex flex-col gap-2">
              <li>
                {t(
                  '2.1.1 账户信息 – 当您创建账户时，我们会收集您的法定姓名、个人手机号码、电子邮件地址以及您选择提供的任何其他信息。',
                )}
              </li>
              <li>
                {t(
                  '2.1.2 用户内容 – 当您在我们的服务上发布问题、答案、回复、评论或其他内容时，我们会收集并存储该内容，以及相关的元数据（例如发布时间）。',
                )}
              </li>
              <li>
                {t(
                  '2.1.3 个人资料信息 – 我们收集您添加到个人资料中的信息，例如您的用户名、个人资料照片、简介以及您选择分享的任何其他信息。',
                )}
              </li>
              <li>
                {t(
                  '2.1.4 通信 – 当您直接与我们联系时，我们会收集您的通信内容，包括您提交的任何反馈、建议或报告。',
                )}
              </li>
              <li>
                {t(
                  '2.1.5 支付和奖励信息 – 在适用情况下，我们会收集处理任何奖励或交易所需的信息，例如钱包地址或支付详细信息。',
                )}
              </li>
            </ul>

            <h3 className="text-lg font-medium text-foreground mt-4">
              {t('2.2 我们自动收集的信息')}
            </h3>
            <p>{t('当您访问或使用我们的服务时，我们会自动收集某些信息：')}</p>
            <ul className="list-none flex flex-col gap-2">
              <li>
                {t(
                  '2.2.1 设备信息 – 我们收集有关您用于访问我们服务的设备的信息，包括设备类型、操作系统版本、设备标识符和移动网络信息。',
                )}
              </li>
              <li>
                {t(
                  '2.2.2 使用信息 – 我们收集有关您在我们服务上活动的信息，包括您查看的内容、您提出或回答的问题、您给出的投票或点赞，以及您互动的频率和时间。',
                )}
              </li>
              <li>
                {t(
                  '2.2.3 日志信息 – 当您使用我们的服务时，我们会收集日志数据，包括 IP 地址、浏览器类型、访问时间以及您访问的页面。',
                )}
              </li>
              <li>
                {t(
                  '2.2.4 位置信息 – 我们可能会收集源自您的 IP 地址或设备设置的粗略位置信息。在收集精确位置数据之前，我们会请求您的许可。',
                )}
              </li>
            </ul>

            <h3 className="text-lg font-medium text-foreground mt-4">
              {t('2.3 我们从第三方收集的信息')}
            </h3>
            <p>{t('我们可能会从第三方接收有关您的信息，包括：')}</p>
            <ul className="list-none flex flex-col gap-2">
              <li>
                {t(
                  '2.3.1 身份验证提供商 – 如果您通过第三方服务对您的账户进行身份验证，我们将根据您在这些提供商处的隐私设置接收来自这些提供商的信息。',
                )}
              </li>
              <li>
                {t(
                  '2.3.2 合作伙伴和附属机构 – 我们可能会从我们的合作伙伴和附属机构处接收与您使用我们服务相关的信息。',
                )}
              </li>
              <li>
                {t(
                  '2.3.3 公开来源 – 在适用法律允许的范围内，我们可能会从公开来源收集有关您的信息。',
                )}
              </li>
            </ul>
          </section>

          <section className="flex flex-col gap-3">
            <h2 className="text-xl font-semibold text-foreground">
              {t('3. 我们如何使用您的信息')}
            </h2>
            <p>{t('我们将收集的信息用于以下目的：')}</p>
            <ul className="list-none flex flex-col gap-2">
              <li>
                {t(
                  '3.1 提供和改进我们的服务 – 我们使用您的信息来运营、维护和改进我们的服务，包括个性化您的体验、处理交易和开发新功能。',
                )}
              </li>
              <li>
                {t(
                  '3.2 与您沟通 – 我们使用您的信息向您发送服务更新、回复您的查询、通知您有关我们服务或政策的更改，并在法律允许的情况下向您发送促销通信。',
                )}
              </li>
              <li>
                {t(
                  '3.3 执行我们的条款和政策 – 我们使用您的信息来监控对我们用户条款和社区准则的遵守情况，检测和防止欺诈或滥用，并保护我们服务的完整性和安全性。',
                )}
              </li>
              <li>
                {t(
                  '3.4 用于研究和分析 – 我们使用您的信息来分析使用模式、进行研究并改进我们服务的内容和功能。',
                )}
              </li>
              <li>
                {t(
                  '3.5 用于法律合规 – 我们使用您的信息以遵守适用的法律、法规和法律程序，并响应公共和政府机构的合法请求。',
                )}
              </li>
              <li>
                {t(
                  '3.6 提供奖励 – 在适用情况下，我们使用您的信息根据我们的用户条款计算和分发奖励。',
                )}
              </li>
            </ul>
          </section>

          <section className="flex flex-col gap-3">
            <h2 className="text-xl font-semibold text-foreground">
              {t('4. 我们如何共享您的信息')}
            </h2>
            <ul className="list-none flex flex-col gap-2">
              <li>
                {t(
                  '4.1 与其他用户 – 您公开的个人资料信息和您发布的内容（包括问题、答案和评论）可能对我们服务的其他用户可见。',
                )}
              </li>
              <li>
                {t(
                  '4.2 与服务提供商 – 我们与代表我们执行服务的第三方服务提供商共享您的信息，例如托管、数据存储、分析、电子邮件发送和客户支持。这些提供商受合同约束，必须保护您的信息，并仅将其用于为我们提供的服务。',
                )}
              </li>
              <li>
                {t(
                  '4.3 与合作伙伴和附属机构 – 根据您的隐私设置和适用法律，我们可能会在提供我们服务的过程中与我们的合作伙伴和附属机构共享您的信息。',
                )}
              </li>
              <li>
                {t(
                  '4.4 与第三方平台 – 根据我们的用户条款，我们可能会将您创建的某些内容提供给与我们合作的其他组织或个人进行联合发布、广播或出版。',
                )}
              </li>
              <li>
                {t(
                  '4.5 出于法律原因 – 如果我们真诚地认为法律要求或允许披露您的信息，包括为了遵守法律程序、保护我们的用户或公众的权利或安全，或为了执行我们的用户条款和社区准则，我们可能会披露您的信息。',
                )}
              </li>
              <li>
                {t(
                  '4.6 与业务转让相关 – 如果我们参与合并、收购、资产出售或其他业务过渡，您的信息可能会作为该交易的一部分被转移。在您的信息被转移并受不同隐私政策约束之前，我们将提供通知。',
                )}
              </li>
              <li>
                {t(
                  '4.7 经您同意 – 在获得您明确同意的情况下，我们可能会以其他方式与第三方共享您的信息。',
                )}
              </li>
            </ul>
          </section>

          <section className="flex flex-col gap-3">
            <h2 className="text-xl font-semibold text-foreground">
              {t('5. 您的权利和选择')}
            </h2>
            <p>
              {t(
                '5.1 根据您所在的司法管辖区，您可能对您的个人信息拥有以下权利：',
              )}
            </p>
            <ul className="list-none flex flex-col gap-2">
              <li>
                {t('5.1.1 访问 – 您有权要求访问我们持有的关于您的个人信息。')}
              </li>
              <li>
                {t(
                  '5.1.2 更正 – 您有权要求我们更正关于您的不准确或不完整的信息。',
                )}
              </li>
              <li>
                {t(
                  '5.1.3 删除 – 您有权要求我们删除您的个人信息，但某些例外情况除外（例如，我们需要保留它以符合法律要求）。',
                )}
              </li>
              <li>
                {t(
                  '5.1.4 限制 – 您有权要求我们在某些情况下限制处理您的个人信息。',
                )}
              </li>
              <li>
                {t(
                  '5.1.5 数据可移植性 – 您有权要求以结构化、常用和机器可读的格式提供您的个人信息副本。',
                )}
              </li>
              <li>
                {t(
                  '5.1.6 反对 – 您有权基于您的特殊情况，反对为直接营销目的处理您的个人信息。',
                )}
              </li>
            </ul>
            <ul className="list-none flex flex-col gap-2 mt-2">
              <li>
                {t(
                  '5.2 账户设置 – 您可以直接通过您的账户设置更新或更正某些账户信息。',
                )}
              </li>
              <li>
                {t(
                  '5.3 设备权限 – 您可以通过您的设备设置控制我们请求的设备权限（例如，相机、麦克风、位置、联系人）。',
                )}
              </li>
              <li>
                {t(
                  '5.4 撤回同意 – 当我们基于您的同意处理您的信息时，您有权随时撤回您的同意。撤回同意不影响在撤回之前基于同意进行处理的合法性。',
                )}
              </li>
              <li>{t('5.5 要行使这些权利中的任何一项，请联系我们。')}</li>
            </ul>
          </section>

          <section className="flex flex-col gap-3">
            <h2 className="text-xl font-semibold text-foreground">
              {t('6. 数据保留')}
            </h2>
            <ul className="list-none flex flex-col gap-2">
              <li>
                {t(
                  '6.1 除非法律要求或允许更长的保留期限，否则我们将在实现本隐私政策中概述的目的所需的时间内保留您的个人信息。',
                )}
              </li>
              <li>
                {t(
                  '6.2 特定类型信息的保留期限可能会根据信息的性质和处理目的而有所不同。',
                )}
              </li>
              <li>
                {t(
                  '6.3 如果您关闭账户，我们通常会在合理期限内删除或匿名化您的个人信息，除非我们需要保留它以用于法律合规、欺诈预防或其他合法的业务目的。',
                )}
              </li>
              <li>
                {t(
                  '6.4 我们可能会保留不识别您身份的汇总和匿名信息，用于研究、分析和其他目的。',
                )}
              </li>
            </ul>
          </section>

          <section className="flex flex-col gap-3">
            <h2 className="text-xl font-semibold text-foreground">
              {t('7. 数据安全')}
            </h2>
            <ul className="list-none flex flex-col gap-2">
              <li>
                {t(
                  '7.1 我们实施并维护合理的物理、技术和管理安全措施，旨在保护您的个人信息免遭未经授权的访问、使用、披露、更改或破坏。',
                )}
              </li>
              <li>
                {t(
                  '7.2 然而，没有任何通过互联网传输或电子存储的方法是完全安全的。我们无法保证您的信息的绝对安全。',
                )}
              </li>
              <li>
                {t(
                  '7.3 您有责任维护您的账户凭据的安全。请使用强密码，不要与任何人分享您的账户详细信息。',
                )}
              </li>
              <li>
                {t(
                  '7.4 如果您怀疑或发现任何未经授权访问您账户的行为，请立即通知我们。',
                )}
              </li>
            </ul>
          </section>

          <section className="flex flex-col gap-3">
            <h2 className="text-xl font-semibold text-foreground">
              {t('8. 儿童隐私')}
            </h2>
            <ul className="list-none flex flex-col gap-2">
              <li>
                {t(
                  '8.1 我们的服务不适用于十八 (18) 岁以下的儿童。我们不会故意收集 18 岁以下任何人的个人信息。',
                )}
              </li>
              <li>
                {t(
                  '8.2 如果我们发现在未验证父母同意的情况下收集了 18 岁以下儿童的个人信息，我们将采取措施尽快删除该信息。',
                )}
              </li>
              <li>
                {t(
                  '8.3 如果您认为我们可能收集了 18 岁以下儿童的信息，请联系我们。',
                )}
              </li>
            </ul>
          </section>

          <section className="flex flex-col gap-3">
            <h2 className="text-xl font-semibold text-foreground">
              {t('9. 国际数据传输')}
            </h2>
            <ul className="list-none flex flex-col gap-2">
              <li>
                {t(
                  '9.1 我们的服务在世界各地的不同地点运营。通过使用我们的服务，您理解并承认您的信息可能会被传输、存储并在您居住国以外的国家/地区进行处理。',
                )}
              </li>
              <li>
                {t(
                  '9.2 我们采取适当的保护措施，确保您的信息根据本隐私政策受到保护，包括签订标准合同条款或在适用法律要求的情况下依赖其他合法机制。',
                )}
              </li>
              <li>
                {t(
                  '9.3 我们处理您信息的国家/地区的数据保护法律可能与您所在国家/地区的法律不同。我们努力确保您的信息无论在哪里处理都能获得充分的保护。',
                )}
              </li>
            </ul>
          </section>

          <section className="flex flex-col gap-3">
            <h2 className="text-xl font-semibold text-foreground">
              {t('10. Cookie 和跟踪技术')}
            </h2>
            <p>
              {t(
                '10.1 我们使用 Cookie 和类似的跟踪技术（如网络信标、像素和本地存储）来提供、改进和个性化我们的服务。',
              )}
            </p>
            <p>{t('10.2 我们使用的 Cookie 类型：')}</p>
            <ul className="list-none flex flex-col gap-2">
              <li>
                {t(
                  '10.2.1 绝对必要的 Cookie – 这些是运营我们的服务所必需的，例如用于身份验证和安全。',
                )}
              </li>
              <li>
                {t(
                  '10.2.2 功能性 Cookie – 这些允许我们记住您的偏好和选择，以增强您的体验。',
                )}
              </li>
              <li>
                {t(
                  '10.2.3 分析 Cookie – 这些帮助我们了解用户如何与我们的服务互动，使我们能够改进功能和性能。',
                )}
              </li>
              <li>
                {t(
                  '10.2.4 广告 Cookie – 这些用于向您提供相关的广告并衡量活动的有效性。',
                )}
              </li>
            </ul>
            <ul className="list-none flex flex-col gap-2 mt-2">
              <li>
                {t(
                  '10.3 您可以通过您的浏览器或设备设置管理您的 Cookie 偏好。但是，禁用某些 Cookie 可能会影响我们服务的功能。',
                )}
              </li>
              <li>
                {t('10.4 有关我们使用 Cookie 的更多详细信息，请联系我们。')}
              </li>
            </ul>
          </section>

          <section className="flex flex-col gap-3">
            <h2 className="text-xl font-semibold text-foreground">
              {t('11. 第三方链接和服务')}
            </h2>
            <ul className="list-none flex flex-col gap-2">
              <li>
                {t(
                  '11.1 我们的服务可能包含指向第三方网站、产品或服务的链接（“第三方内容”）。我们不对这些第三方的隐私实践或内容负责。',
                )}
              </li>
              <li>
                {t(
                  '11.2 我们鼓励您在向其提供您的个人信息之前，查看您通过我们的服务访问的任何第三方服务的隐私政策。',
                )}
              </li>
              <li>
                {t(
                  '11.3 我们的服务可能包括社交媒体功能和集成。您与这些功能的互动受适用社交媒体平台的隐私政策约束。',
                )}
              </li>
            </ul>
          </section>

          <section className="flex flex-col gap-3">
            <h2 className="text-xl font-semibold text-foreground">
              {t('12. 本隐私政策的变更')}
            </h2>
            <ul className="list-none flex flex-col gap-2">
              <li>
                {t(
                  '12.1 我们可能会不时更新本隐私政策，以反映我们实践、技术、法律要求或其他因素的变更。',
                )}
              </li>
              <li>
                {t(
                  '12.2 当我们进行更改时，我们将修改本隐私政策顶部的“最后更新”日期。如果我们进行重大更改，我们将向您提供通知，例如在我们的服务上发布显眼通知或通过电子邮件通知。',
                )}
              </li>
              <li>
                {t(
                  '12.3 在更新后的隐私政策生效日期后，您继续使用我们的服务即构成您对修订后隐私政策的接受。',
                )}
              </li>
              <li>
                {t(
                  '12.4 如果您不同意本隐私政策的任何更改，您唯一的补救措施是停止使用我们的服务并关闭您的账户。',
                )}
              </li>
            </ul>
          </section>

          <section className="flex flex-col gap-3">
            <h2 className="text-xl font-semibold text-foreground">
              {t('13. 一般规定')}
            </h2>
            <ul className="list-none flex flex-col gap-2">
              <li>
                {t(
                  '13.1 本隐私政策以及我们的用户条款和社区准则，构成您和我们之间关于处理您个人信息的完整协议。',
                )}
              </li>
              <li>
                {t(
                  '13.2 如果本隐私政策的任何部分被认定为无效或不可执行，其余部分将保持有效和可执行。',
                )}
              </li>
              <li>
                {t(
                  '13.3 我们未能行使或执行本隐私政策的任何权利或规定，不应构成对该权利或规定的放弃。',
                )}
              </li>
              <li>
                {t(
                  '13.4 本隐私政策可能会被翻译成英语以外的语言。如果出现任何差异，应以英文文本为准。',
                )}
              </li>
            </ul>
          </section>
        </div>
      </ContentContainer>
    </main>
  );
}
