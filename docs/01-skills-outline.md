# 01. 公式出題範囲（Skills measured, 2026-10-07 版）

公式スタディガイドの Skills measured を、原文（英語）と和訳で並べています。
**ID** はこのリポジトリ内での呼び名で、各分野ノートの見出しと対応しています。

> 出典: [Study guide for Exam AI-200](https://learn.microsoft.com/credentials/certifications/resources/study-guides/ai-200)（Skills measured as of October 7, 2026）。
> 2026-10-31 に Microsoft Learn から公式ページを取得し、原文が一致することを確認済み。
>
> 公式の注記: 各項目の箇条書きは「どう評価するか」を示す例で、関連するトピックも出題されることがある。ほとんどは GA の機能だが、よく使われるプレビュー機能も出ることがある。

---

## 分野 1: Develop containerized solutions on Azure（20–25%）

→ 学習ノート: [domains/1-containers.md](domains/1-containers.md)

### Implement container application hosting（コンテナアプリのホスティング）

| ID | 原文 | 和訳 |
|---|---|---|
| 1.1 `acr-images` | Build, store, version, and manage container images by using Azure Container Registry | ACR でコンテナイメージをビルド・保存・バージョン管理・管理する |
| 1.2 `acr-tasks` | Build and run images by using Azure Container Registry Tasks | ACR Tasks でイメージをビルド・実行する |
| 1.3 `app-service-containers` | Deploy containers to Azure App Service, including configuring App Service to supply environment variables and secrets | App Service にコンテナをデプロイする（環境変数とシークレットの受け渡し設定を含む） |

### Implement container-orchestrated solutions（コンテナオーケストレーション）

| ID | 原文 | 和訳 |
|---|---|---|
| 1.4 `aca-deploy` | Deploy applications to Azure Container Apps, including environment configuration and revision management | Container Apps にアプリをデプロイする（環境の構成とリビジョン管理を含む） |
| 1.5 `aca-keda` | Implement event-driven scaling by using Kubernetes Event-driven Autoscaling (KEDA) in Container Apps | Container Apps で KEDA によるイベント駆動スケーリングを実装する |
| 1.6 `aks-manifests` | Deploy and manage applications to Azure Kubernetes Service (AKS) by using manifest files | マニフェストファイルで AKS にアプリをデプロイ・管理する |
| 1.7 `containers-troubleshoot` | Monitor and troubleshoot solutions on AKS and Container Apps by inspecting logs, events, and end-to-end connectivity | ログ・イベント・エンドツーエンドの接続性を確認して、AKS と Container Apps 上のソリューションを監視・トラブルシュートする |

---

## 分野 2: Develop AI solutions by using Azure data management services（25–30%）

→ 学習ノート: [2a-cosmos-db.md](domains/2a-cosmos-db.md) / [2b-postgresql-pgvector.md](domains/2b-postgresql-pgvector.md) / [2c-managed-redis.md](domains/2c-managed-redis.md)

> 2026-10-07 の改訂の変更履歴は「% of exam increased」（3 つのサブグループの項目自体は変更なし）。改訂直後は Skills at a glance が 30–35% と表記されていましたが、2026-10-31 時点ではどちらも 25–30% です。

### Develop AI solutions by using Azure Cosmos DB for NoSQL

| ID | 原文 | 和訳 |
|---|---|---|
| 2.1 `cosmos-sdk-queries` | Connect to Azure Cosmos DB for NoSQL by using the SDK and run queries | SDK で Cosmos DB for NoSQL に接続しクエリを実行する |
| 2.2 `cosmos-ru-indexing` | Optimize query performance and Request Units (RUs) consumption by using indexing policies and consistency levels | インデックスポリシーと整合性レベルで、クエリ性能と RU 消費を最適化する |
| 2.3 `cosmos-vector-search` | Store and retrieve embeddings and execute vector similarity search for semantic retrieval | 埋め込みを保存・取得し、セマンティック検索のためのベクトル類似検索を実行する |
| 2.4 `cosmos-change-feed` | Implement a change feed processor to detect and handle new or updated items | 変更フィードプロセッサで新規・更新アイテムを検出して処理する |

### Develop AI solutions by using Azure Database for PostgreSQL

| ID | 原文 | 和訳 |
|---|---|---|
| 2.5 `pg-connect-query` | Connect and query Azure Database for PostgreSQL by using SDKs | SDK で Azure Database for PostgreSQL に接続しクエリを実行する |
| 2.6 `pg-schema` | Model schemas and implement indexing strategies, including designing tables and choosing appropriate data types | スキーマを設計しインデックス戦略を実装する（テーブル設計と適切なデータ型の選択を含む） |
| 2.7 `pg-indexing` | Implement indexing strategies, including optimizing query latency and reducing pgvector compute overhead | インデックス戦略を実装する（クエリ遅延の最適化と pgvector の計算負荷の削減を含む） |
| 2.8 `pg-compute` | Configure compute, memory, and storage resources to support vector workloads | ベクトルワークロード向けにコンピューティング・メモリ・ストレージを構成する |
| 2.9 `pg-vector-rag` | Run vector similarity search, including storing embeddings, semantic retrieval, and implementing retrieval-augmented generation (RAG) patterns by using metadata filter | ベクトル類似検索を実行する（埋め込みの保存、セマンティック検索、メタデータフィルターを使った RAG パターンの実装を含む） |
| 2.10 `pg-connections` | Implement connection optimization to improve throughput and minimize latency | 接続を最適化してスループットを上げ遅延を減らす |

### Integrate Azure Managed Redis in AI solutions

| ID | 原文 | 和訳 |
|---|---|---|
| 2.11 `redis-data-ops` | Implement Azure Managed Redis data operations, including caching, expiration, and invalidation | Azure Managed Redis のデータ操作を実装する（キャッシュ、有効期限、無効化を含む） |
| 2.12 `redis-vector` | Implement vector indexing to enable similarity search | 類似検索のためのベクトルインデックスを実装する |

---

## 分野 3: Connect to and consume Azure services（20–25%）

→ 学習ノート: [domains/3-azure-services.md](domains/3-azure-services.md)

### Develop event- and message-based AI solutions

| ID | 原文 | 和訳 |
|---|---|---|
| 3.1 `service-bus` | Queue and process back-end operations by using Azure Service Bus, including dead-letter queue handling, messages, topics, and subscriptions | Service Bus でバックエンド処理をキューイング・処理する（配信不能キュー、メッセージ、トピック、サブスクリプションを含む） |
| 3.2 `event-grid` | Implement event-driven workflows by using Azure Event Grid, including filters, custom events, and retries | Event Grid でイベント駆動ワークフローを実装する（フィルター、カスタムイベント、再試行を含む） |

### Develop and implement Azure Functions

| ID | 原文 | 和訳 |
|---|---|---|
| 3.3 `functions-triggers-bindings` | Build serverless APIs, including implementing triggers and bindings | サーバーレス API を構築する（トリガーとバインドの実装を含む） |
| 3.4 `functions-deploy` | Configure and deploy function apps | 関数アプリを構成・デプロイする |

---

## 分野 4: Secure, monitor, and troubleshoot Azure solutions（20–25%）

→ 学習ノート: [domains/4-secure-monitor.md](domains/4-secure-monitor.md)

### Implement secure Azure solutions

| ID | 原文 | 和訳 |
|---|---|---|
| 4.1 `key-vault` | Secure secrets by using Azure Key Vault, including rotation and retrieval | Key Vault でシークレットを保護する（ローテーションと取得を含む） |
| 4.2 `app-configuration` | Store and retrieve app configuration information by using Azure App Configuration | App Configuration でアプリの構成情報を保存・取得する |

### Monitor and troubleshoot Azure solutions

| ID | 原文 | 和訳 |
|---|---|---|
| 4.3 `opentelemetry` | Trace distributed systems by using OpenTelemetry SDKs | OpenTelemetry SDK で分散システムをトレースする |
| 4.4 `kql` | Write KQL queries to analyze logs and metrics | ログとメトリックを分析する KQL クエリを書く |

---

## 公式ラーニングパス（AI-200T00）との対応

AI-200T00 に対応する Microsoft Learn のラーニングパス 9 本と、その中のモジュールです。
**Skills measured の文言とモジュール名がほぼ一致している**ので、Learn のモジュールを順に読めば範囲を一通りカバーできます。

> この表は第三者の学習サイト（AI-200 Learn）の整理に基づきます。Microsoft Learn の検索ではこれらのパス名をまだ確認できなかったため、名前が変わっている可能性があります。
> 公式のスタディガイドの「Get trained」リンクから最新のラーニングパスを確認してください。

| # | ラーニングパス | モジュール | 対応 ID |
|---|---|---|---|
| 1 | Deploy and operate containers on Azure App Service（Implement container application hosting on Azure） | Deploy containers to Azure App Service / Configure app settings for Azure container environments / Manage containers / Troubleshoot container apps | 1.1–1.3 |
| 2 | Deploy and manage apps on Azure Container Apps | Deploy a container to Container Apps / Manage containers in Azure Container Apps / Scale containers in Azure Container Apps | 1.4, 1.5, 1.7 |
| 3 | Deploy and monitor applications on Azure Kubernetes Service | Deploy applications to AKS / Configure applications on AKS / Monitor and troubleshoot applications on AKS | 1.6, 1.7 |
| 4 | Develop AI solutions with Azure Cosmos DB for NoSQL | Build queries for Azure Cosmos DB for NoSQL / Implement vector search on Azure Cosmos DB for NoSQL / Optimize query performance for Azure Cosmos DB for NoSQL | 2.1–2.4 |
| 5 | Develop AI solutions with Azure Database for PostgreSQL | Build and query with Azure Database for PostgreSQL / Implement vector search with Azure Database for PostgreSQL / Optimize vector search in Azure Database for PostgreSQL | 2.5–2.10 |
| 6 | Enhance AI solutions with Azure Managed Redis | Implement data operations in Azure Managed Redis / Implement event messaging with Azure Managed Redis / Implement vector storage in Azure Managed Redis | 2.11, 2.12 |
| 7 | Integrate backend services for AI solutions | Queue and process AI operations with Azure Service Bus / Develop event-driven AI workflows with Azure Event Grid / Create serverless AI backends with Azure Functions | 3.1–3.4 |
| 8 | Manage application secrets and configuration for AI solutions | Manage application secrets with Azure Key Vault / Manage application settings with Azure App Configuration | 4.1, 4.2 |
| 9 | Observe and troubleshoot apps on Azure | Instrument an app with OpenTelemetry / Analyze app telemetry with logs and metrics | 4.3, 4.4 |

> モジュール 6 の「event messaging（Redis pub/sub と Redis Streams）」は Skills measured に明記されていませんが、ラーニングパスに含まれているので押さえておきます。

---

## 範囲に「含まれない」もの（AZ-204 から外れたもの）

Skills measured に出てこないので、深追いしないでよいものです（詳細は [02-az204-to-ai200.md](02-az204-to-ai200.md)）。

- Azure Blob Storage の SDK 操作、アクセス層、ライフサイクル管理、SAS
- Microsoft Identity Platform / MSAL / Microsoft Graph
- API Management
- Event Hubs
- Azure Container Instances（ACI）
- App Service の「コード」デプロイ（デプロイスロット、自動スケールなど）。App Service は**コンテナのデプロイ**に絞られた
- Application Insights SDK（クラシック）。OpenTelemetry に置き換わった

ただし、これらの知識が**選択肢の比較**（例: 「Event Hubs ではなく Event Grid を選ぶ理由」）で役立つことはあります。
