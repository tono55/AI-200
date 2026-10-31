# サービス選択の判断表

AI-200 のシナリオ問題は「要件 → 最適なサービス・設定」を選ばせるものが中心です。
迷いやすい組み合わせを、判断の軸と一緒にまとめます。

## 1. ベクトルストア: Cosmos DB / PostgreSQL / Redis

| 判断の軸 | Cosmos DB for NoSQL | PostgreSQL + pgvector | Azure Managed Redis |
|---|---|---|---|
| データモデル | スキーマレスな JSON ドキュメント | リレーショナル（テーブル、JOIN、トランザクション） | キーと値（HASH / JSON） |
| 永続化の役割 | **主たるデータストア** | **主たるデータストア** | **キャッシュ / ホットインデックス**（メモリ上） |
| ベクトルインデックス | `flat` / `quantizedFlat` / `diskANN` | HNSW / IVFFlat / DiskANN | FLAT / HNSW |
| ベクトル検索の書き方 | `ORDER BY VectorDistance(...)` ＋ `TOP` | `ORDER BY embedding <=> $1 LIMIT k` | `FT.SEARCH ... =>[KNN k @v $vec]` |
| メタデータフィルター | `WHERE`（パーティションキーで範囲を限定） | `WHERE` ＋ B-tree（反復スキャン・部分インデックス） | TAG / NUMERIC / TEXT フィールド |
| ハイブリッド検索 | フルテキスト＋ RRF | `tsvector` ＋ RRF（自前） | TEXT ＋ KNN |
| スケール | グローバル分散、ほぼ無制限、マルチリージョン書き込み | スケールアップ、読み取りレプリカ、エラスティッククラスター | シャード（クラスタリングポリシー） |
| 遅延 | 1 桁ミリ秒 | ミリ秒〜 | **サブミリ秒** |
| 変更の検知 | **変更フィード** | 自前（トリガー、論理レプリケーション） | キースペース通知 |
| 得意な場面 | 運用データと埋め込みを同じアイテムに、グローバルアプリ、マルチテナント | 業務データとの JOIN、SQL に慣れたチーム、エージェントのツールの裏側 | セマンティックキャッシュ、会話履歴、低遅延の検索層 |

**よくある構成**: Cosmos DB / PostgreSQL を**元データ（正）**、Redis を**キャッシュ・ホットインデックス**、Service Bus / Redis Streams を**埋め込み更新の非同期キュー**にする。

### キーワードで選ぶ

| 問題文のキーワード | 選ぶもの |
|---|---|
| 「グローバルに分散」「複数リージョンで書き込み」「スキーマレス」「変更フィード」 | Cosmos DB |
| 「既存のリレーショナルデータと結合」「SQL」「トランザクション」「拡張機能」「pgvector」 | PostgreSQL |
| 「サブミリ秒」「キャッシュ」「LLM の呼び出し回数を減らす」「セッション」「TTL で自動的に消える」 | Redis |

## 2. コンテナのホスティング

| 要件 | App Service | Container Apps | AKS |
|---|---|---|---|
| Kubernetes の知識 | 不要 | 不要 | 必要 |
| 0 までスケール | ✕ | ✅ | ✕（ノードは残る。KEDA で Pod は 0 にできる） |
| イベント駆動スケール（キュー長） | ✕ | ✅ KEDA | ✅ KEDA アドオン / HPA |
| トラフィック分割 | デプロイスロット | ✅ リビジョン | Ingress / サービスメッシュ |
| Kubernetes API・マニフェスト・オペレーター | ✕ | ✕ | ✅ |
| GPU・ノードの細かな制御 | 限定的 | GPU ワークロードプロファイル | ✅ ノードプール |
| Dapr | ✕ | ✅ 組み込み | 拡張機能 |

## 3. メッセージングとイベント

| 要件 | 選ぶもの |
|---|---|
| 確実に処理させたいジョブ（命令）。再試行・DLQ・順序・重複検出 | **Service Bus キュー** |
| 1 つのメッセージを複数の購読者へ、フィルター付き | **Service Bus トピック** |
| 「起きたこと」の通知を複数のハンドラーへプッシュ、Azure サービスのイベント | **Event Grid** |
| 軽量・低遅延のタスクキュー（Redis を既に使っている） | Redis Streams |
| オンライン中のインスタンスへの一斉通知（取りこぼし可） | Redis pub/sub |
| 大量のテレメトリ・ストリームの取り込み | Event Hubs（AI-200 の範囲外） |

## 4. Azure Functions のホスティングプラン

| 要件 | 選ぶもの |
|---|---|
| 新規のサーバーレス、VNet、コールドスタート軽減、コードのみ | **Flex Consumption** |
| カスタムコンテナ、コールドスタートなし、常時稼働に近い | **Premium** |
| 既存の App Service プランの余剰を使う | Dedicated（Always On） |
| ほかのマイクロサービスと同じ環境でコンテナとして | Container Apps |
| Windows 固有の依存（.NET Framework など） | Consumption（レガシー・Windows） / Premium / Dedicated |

## 5. 構成とシークレット

| 置くもの | 選ぶもの |
|---|---|
| シークレット・キー・証明書 | **Key Vault** |
| 機密でない設定・機能フラグ・環境ごとの値 | **App Configuration** |
| 両方を 1 か所から読む | App Configuration ＋ Key Vault 参照 |
| コンテナアプリへの受け渡し | App Service: アプリ設定＋ `@Microsoft.KeyVault(...)` / Container Apps: `secretref:` ＋ `keyvaultref:` / AKS: Secret（＋ Secrets Store CSI Driver） |

## 6. 監視

| 要件 | 選ぶもの |
|---|---|
| アプリの計装（ベンダー非依存） | OpenTelemetry SDK ＋ Azure Monitor Distro |
| 1 つのリクエストの全体像 | トレース（`operation_Id` で追う） |
| 自分の処理の時間を測る | カスタムスパン |
| 数値の推移・リアルタイムに近い監視・安価なアラート | メトリック（メトリックアラート） |
| 柔軟な分析・相関・集計 | ログ＋ KQL（ログ検索アラート） |
| サービス間の依存関係を図で見る | アプリケーションマップ（`service.name` を設定） |
| Container Apps の起動失敗の原因 | `ContainerAppSystemLogs_CL` |
| AKS の Pod のログ | `kubectl logs` / `ContainerLogV2` |
