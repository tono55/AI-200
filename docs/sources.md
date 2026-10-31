# 出典と情報の確度

調査日: 2026-10-31

## 調査の方法と制約

- 調査環境のネットワーク制限により、**learn.microsoft.com（公式スタディガイド・認定ページ）を直接取得できませんでした**。
  公式ページの内容は、(1) 検索エンジンの結果に表示された公式ページの記載、(2) 公式の文言をそのまま引用している公開リポジトリ、(3) 複数の第三者資料を照合して確認しています。
- 技術的な数値（既定値・上限）は、可能なものは **Microsoft Learn のドキュメントのソース（GitHub の MicrosoftDocs リポジトリ）** と、**pgvector の公式 README** で直接確認しました。
- 公式ページを開ける環境では、受験前に下記の「一次情報」を必ず確認してください。

## 確度の目安

| 表記 | 意味 |
|---|---|
| [公式] | 公式ドキュメント（ソースを含む）で確認、または公式ページの記載を引用する複数の資料で一致 |
| [複数] | 複数の第三者資料で一致 |
| [要確認] | 資料間で食い違う・一次情報で未確認 |

## 資料間で食い違っている点

| 項目 | 内容 | 本リポジトリの扱い |
|---|---|---|
| 試験時間 | 120 分（認定ページの記載とされる。日本語資料も 120 分）/ 100 分（一部の第三者資料） | 120 分と記載し、注記 |
| データ管理分野の配点 | Skills at a glance: 30–35% / 詳細見出し: 25–30%（公式ガイド内の不一致。2026-10-07 の変更履歴は「増加」） | 30–35% と記載し、注記 |
| AZ-204 の廃止日 | 2026-07-31（AZ-204 の公式スタディガイドの記載）/ 2026-08-31（一部の第三者資料） | 2026-07-31 |
| ベータ開始 | 2026 年 5 月（多数）/ 4 月（事前の予測記事） | 5 月 |
| 試験言語 | 英語のみ（古い資料）/ 2026 年 8 月に日本語化（受験者の報告）/ 13 言語（一部資料） | 要確認とした |
| 公式模擬試験 | 未提供 / 提供あり | 要確認とした |
| Cosmos DB のベクトルポリシーの変更可否 | 作成後は変更不可（ドキュメントの記載） | 変更不可として記載 |

## 一次情報（Microsoft）

- [Study guide for Exam AI-200: Developing AI Cloud Solutions on Azure](https://learn.microsoft.com/credentials/certifications/resources/study-guides/ai-200)
- [Microsoft Certified: Azure AI Cloud Developer Associate](https://learn.microsoft.com/credentials/certifications/azure-ai-cloud-developer-associate/)
- [Study guide for Exam AZ-204（廃止のお知らせを含む）](https://learn.microsoft.com/credentials/certifications/resources/study-guides/az-204)
- [Renew your Microsoft Certification FAQ](https://learn.microsoft.com/credentials/certifications/renew-your-microsoft-certification-faq)
- Microsoft Learn ラーニングパス（AI-200T00）: 本リポジトリの [01-skills-outline.md](01-skills-outline.md) の対応表を参照

## 技術仕様の確認に使った公式ドキュメント（ソース）

| トピック | ドキュメント（MicrosoftDocs/azure-docs ほか） |
|---|---|
| Container Apps のスケール | `articles/container-apps/scale-app.md` |
| Container Apps のリビジョン | `articles/container-apps/revisions.md` |
| Container Apps のシークレット | `articles/container-apps/manage-secrets.md` |
| ACR の SKU / Tasks | `MicrosoftDocs/azure-management-docs`: `container-registry-skus.md`、`container-registry-tasks-overview.md` |
| Functions のホスティング | `articles/azure-functions/functions-scale.md` |
| Functions の Service Bus バインド | `articles/azure-functions/functions-bindings-service-bus.md` |
| Service Bus のクォータ・DLQ・ロック・フィルター・重複検出 | `articles/service-bus-messaging/`（`service-bus-quotas.md`、`service-bus-dead-letter-queues.md`、`message-transfers-locks-settlement.md`、`topic-filters.md`、`duplicate-detection.md`） |
| Event Grid の再試行・フィルター | `articles/event-grid/delivery-and-retry.md`、`event-filtering.md` |
| App Configuration | `articles/azure-app-configuration/`（動的構成、Key Vault 参照、機能管理） |
| OpenTelemetry | `MicrosoftDocs/azure-monitor-docs`: `articles/azure-monitor/app/opentelemetry-enable.md` |
| pgvector | [pgvector/pgvector README](https://github.com/pgvector/pgvector) |
| Cosmos DB のベクトルインデックス | [Index vector data](https://learn.microsoft.com/azure/cosmos-db/index-vector-data)、[Vector search performance tips](https://learn.microsoft.com/azure/cosmos-db/gen-ai/vector-search-performance-tips)（検索結果の抜粋で確認） |
| Azure Managed Redis | [Vector similarity overview](https://learn.microsoft.com/azure/redis/overview-vector-similarity)、[Architecture](https://learn.microsoft.com/azure/redis/architecture)、[Semantic cache tutorial](https://learn.microsoft.com/azure/redis/tutorial-semantic-cache)（検索結果の抜粋で確認） |

## 第三者の学習資料（参考）

公式ではないため、内容は一次情報と照合して使ってください。

- [Suralmk/learn-AI-200](https://github.com/Suralmk/learn-AI-200)（AI-200 Learn。公式の 2026-10-07 版の文言をそのまま引用した出題範囲と、9 本のラーニングパスの構成）
- [MO2k4/azure-developer-associate](https://github.com/MO2k4/azure-developer-associate)（AZ-204 から AI-200 への移行の分析）
- [DEV Community: Bye AZ-204, hello AI-200](https://dev.to/lovelacecoding/bye-az-204-hello-ai-200-what-you-need-to-know-about-the-new-azure-developer-certification-2lo)
- [DEV Community: AZ-204 Retired: AI-200 Study Guide](https://dev.to/epifive/az-204-retired-ai-200-study-guide-for-azure-ai-cloud-developers-1aa0)
- [Whizlabs: AI-200 Study Guide](https://www.whizlabs.com/blog/ai-200-study-guide/)
- [open-exam-prep: AI-200 Study Guide 2026](https://open-exam-prep.com/blog/ai-200-study-guide-2026-four-domain-lab-plan)
- [mscertquiz: AI-103 vs AI-200](https://mscertquiz.com/blog/ai-103-vs-ai-200-beta-to-ga-explained)

### 日本語の合格体験記

- [note: [Pass Experience] AI-200 Microsoft Azure AI Cloud Developer (August 2026)](https://note.com/ghost_choisuke/n/nffd1d6c53de0)（2026 年 8 月、854 点、約 20 時間）
- [Qiita: 【AI-200】Azure AI Cloud Developer Associate って、どんな試験？](https://qiita.com/ai-chan-2315/items/a69dced29940d17b009e)（2026 年 8 月、850 点、約 50 時間。コードを読む問題が多い、AZ-204 範囲の復習を優先）

## 使わなかったもの

- 「実際の試験問題」をうたう問題集（いわゆる dump）サイト。規約違反であり、内容の正確性も保証されないため参照していません。
