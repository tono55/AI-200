# 出典と情報の確度

最終更新: 2026-10-31

## 調査の方法

1. **初回の調査**: ネットワーク制限で learn.microsoft.com を直接開けなかったため、検索結果、公式の文言を引用している公開リポジトリ、GitHub 上の Microsoft Learn ドキュメントのソース（MicrosoftDocs）、pgvector の公式 README から組み立てました。
2. **追加の検証（Microsoft Learn コネクタ）**: その後 Microsoft Learn のコネクタで公式ページを直接取得し、試験情報と技術仕様を照合して訂正しました（下記「訂正した点」）。

## 確度の目安

| 表記 | 意味 |
|---|---|
| [公式] | Microsoft Learn の公式ページ・ドキュメントで確認 |
| [複数] | 複数の第三者資料で一致 |
| [要確認] | 資料間で食い違う・一次情報で未確認 |

## 公式ページで訂正・確定した点

| 項目 | 初回の記載 | 公式で確認した内容 |
|---|---|---|
| データ管理分野の配点 | 30–35%（詳細見出しは 25–30%） | **25–30%**（Skills at a glance・詳細見出しとも）。変更履歴は "% of exam increased" |
| 試験時間 | 120 分（100 分説あり） | ラボなしのアソシエイト試験は **100 分（着席 120 分）**、ラボが含まれうる試験は 120 分（着席 140 分）。ラボのある試験は非公表で、申し込み時に時間が表示される |
| 公式模擬試験 | 要確認 | **あり**（AI Skills Navigator の Practice Assessment） |
| AZ-204 の廃止日 | 2026-07-31（有力） | **2026-07-31 23:59 CST** で確定 |
| 公式コース | AI-200T00 | AZ-204T00 は 2026-05-29 に廃止、後継が **AI-200T00** |
| Container Apps の Key Vault 参照 | 更新は手動で再起動が必要 | **バージョンなしの参照は 30 分以内に自動で取得し、参照しているリビジョンを自動再起動**（直接入力したシークレットは手動） |
| Cosmos DB のベクトルポリシー | 作成後は変更不可 | 設定の直接変更は不可だが、**削除して追加し直せる**。パスの追加・削除は可 |
| Cosmos DB のデータ型 | float32 / int8 / uint8 | **float16 も対応**。次元数の既定は 1536 |
| Cosmos DB の制限 | — | **共有スループットのアカウントではベクトル検索不可**、1,000 件未満は全件スキャン、一度有効にすると無効化不可 |
| PgBouncer | — | **Burstable 層では使えない**。既定: transaction / pool 50 / client 5000。再起動不要 |
| Azure Managed Redis のスケール | スケールダウン不可 | 条件付きで**スケールダウン可**。Flash ↔ in-memory 間は不可。クラスタリングポリシーは原則変更不可 |
| Redis の追い出しポリシーの既定 | — | **volatile-lru** |
| Key Vault の論理的な削除 | 常に有効 | 既定で有効・無効化不可、保持期間は**作成時のみ設定可**。消去保護は**既定で無効** |
| OpenTelemetry のサンプリング | — | 既定はレート制限 **5 トレース / 秒**。メトリックはサンプリングされない |

## まだ確認できていない点

| 項目 | 状況 |
|---|---|
| 日本語での受験 | 受験者の報告（2026 年 8 月に日本語化）はあるが、公式ページに言語一覧がない。申し込み画面で確認 |
| 受験料（日本円） | 米国は USD 165。日本の価格は申し込み画面で確認 |
| AI-200 のラーニングパス名 | 第三者の整理に基づく。Microsoft Learn の検索ではまだ確認できていない |
| ベータ開始 / GA の正確な日付 | 第三者資料では 2026 年 5 月にベータ、7 月に GA |

## 一次情報（Microsoft）

- [Study guide for Exam AI-200: Developing AI Cloud Solutions on Azure](https://learn.microsoft.com/credentials/certifications/resources/study-guides/ai-200)
- [Microsoft Certified: Azure AI Cloud Developer Associate](https://learn.microsoft.com/credentials/certifications/azure-ai-cloud-developer-associate/)
- [AI-200 Practice Assessment（AI Skills Navigator）](http://aka.ms/AI200-PA)
- [Exam Readiness Zone（AI-200）](https://aka.ms/AI200-ExamPrep)
- [Study guide for Exam AZ-204（廃止のお知らせと最終版の出題範囲）](https://learn.microsoft.com/credentials/certifications/resources/study-guides/az-204)
- [Exam duration and exam experience](https://learn.microsoft.com/credentials/support/exam-duration-exam-experience)
- [Exam retake policies](https://learn.microsoft.com/credentials/support/retake-policy)
- [Renew your Microsoft Certification](https://learn.microsoft.com/credentials/certifications/renew-your-microsoft-certification)
- [Retired courses（AZ-204T00 → AI-200T00）](https://learn.microsoft.com/credentials/certifications/retired-courses)
- [Exam sandbox](https://aka.ms/examdemo)

## 技術仕様の確認に使った公式ドキュメント

| トピック | ドキュメント |
|---|---|
| Container Apps | [Scale rules](https://learn.microsoft.com/azure/container-apps/scale-app)、[Revisions](https://learn.microsoft.com/azure/container-apps/revisions)、[Manage secrets](https://learn.microsoft.com/azure/container-apps/manage-secrets)、[Troubleshoot deployment failures](https://learn.microsoft.com/azure/container-apps/troubleshoot-deployment-errors) |
| ACR | [Service tiers](https://learn.microsoft.com/azure/container-registry/container-registry-skus)、[ACR Tasks](https://learn.microsoft.com/azure/container-registry/container-registry-tasks-overview) |
| App Service | [Key Vault references](https://learn.microsoft.com/azure/app-service/app-service-key-vault-references) |
| Cosmos DB | [Vector search in Azure Cosmos DB for NoSQL](https://learn.microsoft.com/azure/cosmos-db/vector-search) |
| PostgreSQL | [PgBouncer](https://learn.microsoft.com/azure/postgresql/connectivity/concepts-pgbouncer)、[Connection pooling best practices](https://learn.microsoft.com/azure/postgresql/connectivity/concepts-connection-pooling-best-practices)、[azure_ai extension](https://learn.microsoft.com/azure/postgresql/azure-ai/generative-ai-azure-overview)、[pgvector README](https://github.com/pgvector/pgvector) |
| Azure Managed Redis | [Redis modules](https://learn.microsoft.com/azure/redis/redis-modules)、[Choose a tier](https://learn.microsoft.com/azure/redis/plan-tiers-and-capacity)、[Memory management](https://learn.microsoft.com/azure/redis/best-practices-memory-management)、[Azure Cache for Redis の更新情報（廃止日）](https://learn.microsoft.com/azure/azure-cache-for-redis/cache-whats-new) |
| Functions | [Hosting options](https://learn.microsoft.com/azure/azure-functions/functions-scale)、[Service Bus bindings](https://learn.microsoft.com/azure/azure-functions/functions-bindings-service-bus) |
| Service Bus | [Quotas](https://learn.microsoft.com/azure/service-bus-messaging/service-bus-quotas)、[Dead-letter queues](https://learn.microsoft.com/azure/service-bus-messaging/service-bus-dead-letter-queues)、[Locks and settlement](https://learn.microsoft.com/azure/service-bus-messaging/message-transfers-locks-settlement)、[Topic filters](https://learn.microsoft.com/azure/service-bus-messaging/topic-filters)、[Duplicate detection](https://learn.microsoft.com/azure/service-bus-messaging/duplicate-detection) |
| Event Grid | [Delivery and retry](https://learn.microsoft.com/azure/event-grid/delivery-and-retry)、[Event filtering](https://learn.microsoft.com/azure/event-grid/event-filtering) |
| Key Vault | [Soft-delete overview](https://learn.microsoft.com/azure/key-vault/general/soft-delete-overview)、[Recovery management](https://learn.microsoft.com/azure/key-vault/general/key-vault-recovery)、[Secret rotation tutorial](https://learn.microsoft.com/azure/key-vault/secrets/tutorial-rotation) |
| App Configuration | [Dynamic configuration in Python](https://learn.microsoft.com/azure/azure-app-configuration/enable-dynamic-configuration-python)、[Key Vault references](https://learn.microsoft.com/azure/azure-app-configuration/use-key-vault-references-dotnet-core)、[Feature management](https://learn.microsoft.com/azure/azure-app-configuration/concept-feature-management) |
| OpenTelemetry | [Enable OpenTelemetry](https://learn.microsoft.com/azure/azure-monitor/app/opentelemetry-enable)、[Configure OpenTelemetry（sampling）](https://learn.microsoft.com/azure/azure-monitor/app/opentelemetry-configuration)、[azure-monitor-opentelemetry（Python）](https://learn.microsoft.com/python/api/overview/azure/monitor-opentelemetry-readme) |

## 第三者の学習資料（参考）

公式ではないため、内容は一次情報と照合して使ってください。

- [Suralmk/learn-AI-200](https://github.com/Suralmk/learn-AI-200)（出題範囲とラーニングパスの整理）
- [MO2k4/azure-developer-associate](https://github.com/MO2k4/azure-developer-associate)（AZ-204 から AI-200 への移行の分析。AZ-204 の廃止日を 8/31 としている点は誤り）
- [DEV Community: Bye AZ-204, hello AI-200](https://dev.to/lovelacecoding/bye-az-204-hello-ai-200-what-you-need-to-know-about-the-new-azure-developer-certification-2lo)
- [DEV Community: AZ-204 Retired: AI-200 Study Guide](https://dev.to/epifive/az-204-retired-ai-200-study-guide-for-azure-ai-cloud-developers-1aa0)
- [mscertquiz: AI-103 vs AI-200](https://mscertquiz.com/blog/ai-103-vs-ai-200-beta-to-ga-explained)

### 日本語の合格体験記

- [note: [Pass Experience] AI-200 Microsoft Azure AI Cloud Developer (August 2026)](https://note.com/ghost_choisuke/n/nffd1d6c53de0)（2026 年 8 月、854 点、約 20 時間）
- [Qiita: 【AI-200】Azure AI Cloud Developer Associate って、どんな試験？](https://qiita.com/ai-chan-2315/items/a69dced29940d17b009e)（2026 年 8 月、850 点、約 50 時間。コードを読む問題が多い、AZ-204 範囲の復習を優先）

## 使わなかったもの

- 「実際の試験問題」をうたう問題集（いわゆる dump）サイト。規約違反であり、内容の正確性も保証されないため参照していません。
