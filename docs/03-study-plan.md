# 03. 学習計画

## 1. 1 トピックの学習サイクル（毎回この型で回す）

各分野ノートは同じテンプレートなので、どのトピックも次の 5 ステップで進めます。

| ステップ | やること | 使うもの | 目安 |
|---|---|---|---|
| ① 範囲確認 | Skills measured の原文を読み、何を「できる」ようになるかを確認 | ノートの「出題範囲」 | 5 分 |
| ② インプット | 重要概念を読み、Microsoft Learn の該当モジュールを読む | ノートの「重要概念」＋ Learn | 60〜90 分 |
| ③ ハンズオン | CLI と SDK のコードを実際に動かす（無料枠・最小 SKU で） | ノートの「実装パターン」 | 60 分 |
| ④ 判断練習 | 「判断ポイント」「ひっかけポイント」を読み、理由を自分の言葉で説明 | ノートの判断表 | 20 分 |
| ⑤ 自己テスト | 「確認問題」を解き、間違えた問題は ② に戻る。チェックリストに印をつける | ノートの確認問題 | 20 分 |

> コツ: ③ のハンズオンは「小さな Python API を 1 つ作り、ACR でビルド → Container Apps / AKS にデプロイ → Cosmos DB / PostgreSQL / Redis に接続 → Service Bus で非同期処理 → OpenTelemetry で計装 → KQL で調べる」という **1 本のストーリー**でつなげると、知識が分野をまたいでつながります。

## 2. 8 週間プラン（週 8〜10 時間想定）

| 週 | テーマ | ノート | Learn ラーニングパス | ゴール |
|---|---|---|---|---|
| 1 | ACR / ACR Tasks / App Service コンテナ | [1-containers](domains/1-containers.md) §1〜3 | #1 | `az acr build` でビルドし、App Service にマネージド ID でプルさせられる |
| 2 | Container Apps / KEDA / AKS / トラブルシュート | [1-containers](domains/1-containers.md) §4〜7 | #2, #3 | リビジョンとトラフィック分割、KEDA ルール、Deployment / Service の YAML を書ける |
| 3 | Cosmos DB for NoSQL | [2a-cosmos-db](domains/2a-cosmos-db.md) | #4 | ベクトルポリシーとインデックスを定義し、`VectorDistance` で検索、変更フィードで埋め込みを更新できる |
| 4 | PostgreSQL + pgvector | [2b-postgresql-pgvector](domains/2b-postgresql-pgvector.md) | #5 | HNSW / IVFFlat を使い分け、フィルター付き検索と PgBouncer 接続ができる |
| 5 | Azure Managed Redis + データ分野のまとめ | [2c-managed-redis](domains/2c-managed-redis.md), [service-selection](cheatsheets/service-selection.md) | #6 | キャッシュアサイド、TTL、RediSearch のベクトルインデックスを実装。3 つの DB を使い分けられる |
| 6 | Service Bus / Event Grid / Functions | [3-azure-services](domains/3-azure-services.md) | #7 | DLQ 処理、Event Grid のフィルターと再試行、Functions のトリガー / バインドとプラン選択 |
| 7 | Key Vault / App Configuration / OpenTelemetry / KQL | [4-secure-monitor](domains/4-secure-monitor.md) | #8, #9 | シークレットのローテーション、センチネルキー、スパンの作成、KQL で p95 を出せる |
| 8 | 総復習・模擬試験 | [cheatsheets/](cheatsheets/) | — | 模擬試験で 80% 以上を 2 回連続。弱点ノートを再読 |

### 短期プラン（AZ-204 合格者向け・4 週間）

| 週 | 内容 |
|---|---|
| 1 | AKS（マニフェスト、kubectl）、Container Apps の KEDA とリビジョン |
| 2 | PostgreSQL + pgvector、Cosmos DB のベクトル検索・インデックスポリシー |
| 3 | Azure Managed Redis、OpenTelemetry、KQL |
| 4 | 引き継ぎ範囲（Functions / Service Bus / Event Grid / Key Vault / App Config）の 2026 年仕様の確認と模擬試験 |

## 3. ハンズオン環境

- Azure の無料アカウントまたは従量課金サブスクリプション。**終わったらリソースグループごと削除**する（`az group delete -n <rg> --yes --no-wait`）。
- ローカル: Azure CLI、Python 3.11 以降、Docker、kubectl（`az aks install-cli`）、VS Code。
- コストに注意が必要なもの: AKS のノード、Azure Managed Redis（最小でも時間課金）、PostgreSQL Flexible Server、Cosmos DB のプロビジョニング スループット。
  - Cosmos DB は **Free Tier**（アカウントあたり 1000 RU/s・25 GB まで無料）か**サーバーレス**を使う。
  - PostgreSQL は Burstable（B1ms など）で十分。
  - Microsoft Learn の演習（Exercise）はサンドボックスや手順つきなので、まずはそれを使う。

## 4. 直前期（試験 1 週間前〜当日）

- [ ] [numbers.md](cheatsheets/numbers.md) の数値を白紙に書き出せる
- [ ] [service-selection.md](cheatsheets/service-selection.md) の判断表を、理由つきで説明できる
- [ ] [cli-sdk.md](cheatsheets/cli-sdk.md) のコマンドを見て、何をするコマンドか即答できる
- [ ] 各ノートの「チェックリスト」がすべて埋まっている
- [ ] 模擬試験・Practice Assessment で 80% 以上
- [ ] 試験当日: 本人確認書類、オンラインならシステムチェック（OnVUE）と机の上の片づけ

## 5. 試験中の時間配分

- 120 分・50 問前後なら、**1 問 2 分**が目安。ケーススタディは別に時間を取っておく。
- 迷った問題は「後で見直す」マークをつけて先に進む。ケーススタディの前後で戻れない区切りがあるので、画面の注意書きを読む。
- Microsoft Learn の参照機能は**確認に使う**もので、ゼロから調べる時間はない。数値・パラメーター名の最終確認に限って使う。
- コード問題は、まず**問われている部分（空欄・誤り）だけ**を読む。全体を読み込まない。
