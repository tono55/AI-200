# 01. 公式出題範囲（Skills measured, 2026-10-07 版）

公式スタディガイドの Skills measured を、**英語の原文**と**公式の日本語版スタディガイドの表記**で並べています。
日本語で受験する場合は、問題文もこの公式訳に近い用語で書かれると考えられるので、右の列の言い回しに慣れておきましょう。
**ID** はこのリポジトリ内での呼び名で、各分野ノートの見出しと対応しています。

> 出典（2026-10-31 に Microsoft Learn から取得して照合済み）:
> - 英語版: [Study guide for Exam AI-200: Developing AI Cloud Solutions on Azure](https://learn.microsoft.com/en-us/credentials/certifications/resources/study-guides/ai-200)
> - 日本語版: [試験 AI-200 の学習ガイド: Azureでの AI クラウド ソリューションの開発](https://learn.microsoft.com/ja-jp/credentials/certifications/resources/study-guides/ai-200)
>
> 公式の注記: 各スキルの箇条書きは「そのスキルをどのように評価するか」を示すもので、関連するトピックも出題されることがある。ほとんどは一般提供（GA）の機能だが、よく使われるプレビュー機能も出ることがある。
>
> 日本語版は機械翻訳を含むため、語順が分かりにくい項目があります。意味が取りにくい項目は「補足」に要点を書きました。

## 日本語での正式名称

| | 英語 | 日本語（公式） |
|---|---|---|
| 試験 | Exam AI-200: Developing AI Cloud Solutions on Azure | 試験 AI-200: Azureでの AI クラウド ソリューションの開発 |
| 認定資格 | Microsoft Certified: Azure AI Cloud Developer Associate | Microsoft 認定: Azure AI クラウド 開発者アソシエイト |
| レベル / 役割 | Intermediate / Developer | 中級 / 開発者 |

### スキルの概要（Skills at a glance）

| 英語 | 日本語（公式） | 配点 |
|---|---|---|
| Develop containerized solutions on Azure | Azureでコンテナー化されたソリューションを開発する | 20–25% |
| Develop AI solutions by using Azure data management services | Azure データ管理サービスを使用して AI ソリューションを開発する | 25–30% |
| Connect to and consume Azure services | Azure サービスに接続して使用する | 20–25% |
| Secure, monitor, and troubleshoot Azure solutions | Azure ソリューションのセキュリティ保護、監視、トラブルシューティング | 20–25% |

---

## 分野 1: Develop containerized solutions on Azure（20–25%）

→ 学習ノート: [domains/1-containers.md](domains/1-containers.md)

### Implement container application hosting（コンテナー アプリケーションホスティングを実装する）

| ID | 原文 | 公式日本語訳 |
|---|---|---|
| 1.1 `acr-images` | Build, store, version, and manage container images by using Azure Container Registry | Azure Container Registryを使用してコンテナー イメージをビルド、保存、バージョン管理する |
| 1.2 `acr-tasks` | Build and run images by using Azure Container Registry Tasks | Azure Container Registry タスクを使用してイメージをビルドして実行する |
| 1.3 `app-service-containers` | Deploy containers to Azure App Service, including configuring App Service to supply environment variables and secrets | 環境変数とシークレットを提供するように App Service を構成するなど、コンテナーをAzure App Serviceにデプロイする |

補足: 1.1 の日本語訳では "manage（管理）" が抜けていますが、原文どおりイメージの管理（タグ、削除、ロックなど）も範囲です。

### Implement container-orchestrated solutions（コンテナーで調整されたソリューションを実装する）

| ID | 原文 | 公式日本語訳 |
|---|---|---|
| 1.4 `aca-deploy` | Deploy applications to Azure Container Apps, including environment configuration and revision management | 環境の構成やリビジョン管理など、アプリケーションをAzure Container Appsにデプロイする |
| 1.5 `aca-keda` | Implement event-driven scaling by using Kubernetes Event-driven Autoscaling (KEDA) in Container Apps | Container Apps で Kubernetes イベント ドリブン自動スケーリング (KEDA) を使用してイベントドリブン スケーリングを実装する |
| 1.6 `aks-manifests` | Deploy and manage applications to Azure Kubernetes Service (AKS) by using manifest files | マニフェスト ファイルを使用してアプリケーションをAzure Kubernetes Service (AKS)にデプロイおよび管理する |
| 1.7 `containers-troubleshoot` | Monitor and troubleshoot solutions on AKS and Container Apps by inspecting logs, events, and end-to-end connectivity | ログ、イベント、エンド ツー エンド接続を検査して、AKS と Container Apps のソリューションを監視およびトラブルシューティングする |

補足: 「コンテナーで調整された」は "container-orchestrated（コンテナーオーケストレーション）" の訳です。

---

## 分野 2: Develop AI solutions by using Azure data management services（25–30%）

→ 学習ノート: [2a-cosmos-db.md](domains/2a-cosmos-db.md) / [2b-postgresql-pgvector.md](domains/2b-postgresql-pgvector.md) / [2c-managed-redis.md](domains/2c-managed-redis.md)

> 2026-10-07 の改訂の変更履歴は「% of exam increased」（3 つのサブグループの項目自体は変更なし）。改訂直後は Skills at a glance が 30–35% と表記されていましたが、2026-10-31 時点では英語版・日本語版とも 25–30% です。

### Develop AI solutions by using Azure Cosmos DB for NoSQL（NoSQLのAzure Cosmos DBを使用して AI ソリューションを開発する）

| ID | 原文 | 公式日本語訳 |
|---|---|---|
| 2.1 `cosmos-sdk-queries` | Connect to Azure Cosmos DB for NoSQL by using the SDK and run queries | SDK を使用してNoSQLのAzure Cosmos DBに接続し、クエリを実行する |
| 2.2 `cosmos-ru-indexing` | Optimize query performance and Request Units (RUs) consumption by using indexing policies and consistency levels | インデックス作成ポリシーと整合性レベルを使用してクエリのパフォーマンスと要求ユニット (RU) の使用量を最適化する |
| 2.3 `cosmos-vector-search` | Store and retrieve embeddings and execute vector similarity search for semantic retrieval | 埋め込みを格納および取得し、セマンティック取得のためのベクター類似性検索を実行する |
| 2.4 `cosmos-change-feed` | Implement a change feed processor to detect and handle new or updated items | 新しい項目または更新された項目を検出して処理する変更フィード プロセッサを実装する |

### Develop AI solutions by using Azure Database for PostgreSQL（Azure Database for PostgreSQLを使用して AI ソリューションを開発する）

| ID | 原文 | 公式日本語訳 |
|---|---|---|
| 2.5 `pg-connect-query` | Connect and query Azure Database for PostgreSQL by using SDKs | SDK を使用してAzure Database for PostgreSQLに接続してクエリを実行する |
| 2.6 `pg-schema` | Model schemas and implement indexing strategies, including designing tables and choosing appropriate data types | スキーマをモデル化し、テーブルの設計や適切なデータ型の選択など、インデックス作成戦略を実装する |
| 2.7 `pg-indexing` | Implement indexing strategies, including optimizing query latency and reducing pgvector compute overhead | クエリ待機時間の最適化や pgvector コンピューティングオーバーヘッドの削減など、インデックス作成戦略を実装する |
| 2.8 `pg-compute` | Configure compute, memory, and storage resources to support vector workloads | ベクター ワークロードをサポートするようにコンピューティング、メモリ、ストレージ リソースを構成する |
| 2.9 `pg-vector-rag` | Run vector similarity search, including storing embeddings, semantic retrieval, and implementing retrieval-augmented generation (RAG) patterns by using metadata filter | 埋め込みの格納、セマンティック取得、メタデータ フィルターを使用した取得拡張生成 (RAG) パターンの実装など、ベクターの類似性検索を実行する |
| 2.10 `pg-connections` | Implement connection optimization to improve throughput and minimize latency | 接続の最適化を実装してスループットを向上させ、待機時間を最小限に抑える |

補足: 2.6 は「スキーマをモデル化する（テーブル設計とデータ型の選択を含む）」と「インデックス戦略を実装する」の 2 つを含みます。日本語訳の「待機時間」は latency（遅延）の訳です。

### Integrate Azure Managed Redis in AI solutions（AI ソリューションAzure Managed Redis を統合する）

| ID | 原文 | 公式日本語訳 |
|---|---|---|
| 2.11 `redis-data-ops` | Implement Azure Managed Redis data operations, including caching, expiration, and invalidation | キャッシュ、有効期限、無効化など、Azureマネージド Redis データ操作を実装する |
| 2.12 `redis-vector` | Implement vector indexing to enable similarity search | ベクトル インデックス作成を実装して類似性検索を有効にする |

補足: サブグループ名は「AI ソリューションに Azure Managed Redis を統合する」の意味です。日本語版では「Azure Managed Redis」と「Azureマネージド Redis」の表記が混在していますが同じサービスです。

---

## 分野 3: Connect to and consume Azure services（20–25%）

→ 学習ノート: [domains/3-azure-services.md](domains/3-azure-services.md)

### Develop event- and message-based AI solutions（イベントベースおよびメッセージベースの AI ソリューションを開発する）

| ID | 原文 | 公式日本語訳 |
|---|---|---|
| 3.1 `service-bus` | Queue and process back-end operations by using Azure Service Bus, including dead-letter queue handling, messages, topics, and subscriptions | Azure Service Bus を使用して、メッセージ、トピック、サブスクリプションのキューイングと処理、およびデッドレターキューの処理を含むバックエンド操作を実行する。 |
| 3.2 `event-grid` | Implement event-driven workflows by using Azure Event Grid, including filters, custom events, and retries | フィルター、カスタム イベント、再試行など、Azure Event Gridを使用してイベント ドリブン ワークフローを実装する |

補足: 3.1 の原文は「Service Bus でバックエンドの処理をキューに入れて処理する（配信不能キュー（デッドレターキュー）の扱い、メッセージ、トピック、サブスクリプションを含む）」です。日本語のドキュメントでは dead-letter queue を「配信不能キュー」とも訳します。

### Develop and implement Azure Functions（Azure Functionsの開発と実装）

| ID | 原文 | 公式日本語訳 |
|---|---|---|
| 3.3 `functions-triggers-bindings` | Build serverless APIs, including implementing triggers and bindings | トリガーとバインドの実装を含むサーバーレス API を構築する |
| 3.4 `functions-deploy` | Configure and deploy function apps | 関数アプリの構成とデプロイ |

---

## 分野 4: Secure, monitor, and troubleshoot Azure solutions（20–25%）

→ 学習ノート: [domains/4-secure-monitor.md](domains/4-secure-monitor.md)

### Implement secure Azure solutions（セキュリティで保護された Azure ソリューションを実装する）

| ID | 原文 | 公式日本語訳 |
|---|---|---|
| 4.1 `key-vault` | Secure secrets by using Azure Key Vault, including rotation and retrieval | ローテーションや取得など、Azure Key Vaultを使用してシークレットをセキュリティで保護する |
| 4.2 `app-configuration` | Store and retrieve app configuration information by using Azure App Configuration | Azure App Configurationを使用してアプリ構成情報を格納および取得する |

### Monitor and troubleshoot Azure solutions（Azure ソリューションの監視とトラブルシューティング）

| ID | 原文 | 公式日本語訳 |
|---|---|---|
| 4.3 `opentelemetry` | Trace distributed systems by using OpenTelemetry SDKs | OpenTelemetry SDK を使用して分散システムをトレースする |
| 4.4 `kql` | Write KQL queries to analyze logs and metrics | ログとメトリックを分析する KQL クエリを記述する |

---

## 日本語版ドキュメントの用語対応

日本語の Microsoft Learn や日本語の試験で見かける表記と、本リポジトリのノートでの表記の対応です。

| 英語 | 公式日本語版での主な表記 | ノートでの表記 |
|---|---|---|
| container | コンテナー | コンテナ |
| Container Registry Tasks | Container Registry タスク | ACR Tasks |
| revision | リビジョン | リビジョン |
| event-driven | イベント ドリブン / イベントドリブン | イベント駆動 |
| Request Units (RUs) | 要求ユニット (RU) | RU |
| indexing policy | インデックス作成ポリシー | インデックスポリシー |
| consistency level | 整合性レベル | 整合性レベル |
| item | 項目 | アイテム |
| change feed processor | 変更フィード プロセッサ | 変更フィードプロセッサ |
| embedding | 埋め込み | 埋め込み |
| vector | ベクター / ベクトル | ベクトル |
| semantic retrieval | セマンティック取得 | セマンティック検索 |
| retrieval-augmented generation (RAG) | 取得拡張生成 (RAG) | 検索拡張生成（RAG） |
| latency | 待機時間 | 遅延 |
| dead-letter queue | デッドレターキュー / 配信不能キュー | 配信不能キュー（DLQ） |
| binding | バインド | バインド |
| function app | 関数アプリ | 関数アプリ |
| secret | シークレット | シークレット |
| managed identity | マネージド ID | マネージド ID |
| soft delete / purge protection | 論理的な削除 / 消去保護 | 論理的な削除 / 消去保護 |
| Practice Assessment | プラクティス評価 | Practice Assessment |

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
