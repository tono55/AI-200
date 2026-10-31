# 覚えるべき数値・既定値

試験直前に白紙に書き出して確認する用です。数値は 2026-10 時点の公式ドキュメントで確認したもの（出典は各分野ノート）。

## 試験

| 項目 | 値 |
|---|---|
| 合格点 | 700 / 1000 |
| 試験時間 | 120 分（100 分とする資料もある） |
| 配点 | コンテナ 20–25 / **データ 30–35** / サービス接続 20–25 / セキュリティ・監視 20–25 |
| 公式項目数 | 27 |

## コンテナ

| 項目 | 値 |
|---|---|
| Container Apps 最小レプリカ（既定） | **0** |
| Container Apps 最大レプリカ（既定 / 上限） | **10 / 1,000** |
| HTTP `concurrentRequests`（既定） | **10** |
| TCP `concurrentConnections`（既定） | **10** |
| KEDA カスタムルールのポーリング間隔 | **30 秒** |
| KEDA クールダウン | **300 秒**（最後の 1 → 0 のときだけ） |
| 非アクティブなリビジョンの保持数（既定） | **100** |
| AKS ローリング更新の既定 | `maxSurge 25%` / `maxUnavailable 25%` |
| App Service コンテナの起動待ち（既定 / 最大） | 230 秒 / 1800 秒 |
| App Service の Key Vault 参照（バージョンなし）の更新 | 24 時間以内 |
| ACR のトリガー既定 | コミット: 有効 / PR: **無効** / ベースイメージ: 有効 |
| OOMKilled の終了コード | 137 |

## Cosmos DB

| 項目 | 値 |
|---|---|
| ポイント読み取り（1 KB） | **1 RU** |
| 論理パーティションの上限 | **20 GB** |
| アイテムの最大サイズ | **2 MB** |
| 自動スケールの範囲 | 最大 RU/s の **10%〜100%** |
| Free Tier | 1000 RU/s・25 GB |
| 整合性の既定 | **Session** |
| 読み取り RU が 2 倍 | Strong / Bounded staleness |
| `flat` の最大次元 | **505** |
| `quantizedFlat` / `diskANN` の最大次元 | **4,096** |
| `quantizedFlat` と `diskANN` の目安の境界 | 物理パーティションあたり約 **5 万**ベクトル |
| 距離関数の既定 | `cosine` |
| データ型の既定 | `float32` |

## PostgreSQL / pgvector

| 項目 | 値 |
|---|---|
| `vector` のインデックス上限 | **2,000 次元** |
| `halfvec` のインデックス上限 | **4,000 次元** |
| `bit` のインデックス上限 | 64,000 次元 |
| `sparsevec` のインデックス上限 | 非ゼロ要素 1,000 |
| HNSW `m`（既定） | **16** |
| HNSW `ef_construction`（既定） | **64** |
| `hnsw.ef_search`（既定） | **40** |
| `ivfflat.probes`（既定） | **1** |
| IVFFlat `lists` の目安 | 100 万行まで `行数/1000`、それ以上 `sqrt(行数)` |
| `probes` の目安 | `sqrt(lists)` |
| PostgreSQL のポート | **5432** |
| 組み込み PgBouncer のポート | **6432** |
| Entra トークンの有効期間 | 約 1 時間 |

## Azure Managed Redis

| 項目 | 値 |
|---|---|
| TLS ポート | **10000**（Azure Cache for Redis は 6380） |
| メモリ : vCPU | Memory Optimized **8:1** / Balanced **4:1** / Compute Optimized **2:1** |
| 非クラスターの上限 | **25 GB** |
| `TTL` の戻り値 | -1 = 期限なし / -2 = キーなし |

## Service Bus

| 項目 | 値 |
|---|---|
| 最大メッセージサイズ | Basic / Standard **256 KB**、Premium **100 MB**（AMQP） |
| ロック期間（既定 / 最大） | **1 分 / 5 分** |
| 最大配信回数（既定） | **10** |
| 重複検出の期間（既定） | **10 分** |
| トランザクションあたりのメッセージ数 | 100 |
| トピックあたりのサブスクリプション | 2,000 |
| 自動転送の最大ホップ | 4 |
| メッセージプロパティ | 1 つ 32 KB、合計 64 KB |

## Event Grid

| 項目 | 値 |
|---|---|
| 応答の待ち時間 | **30 秒** |
| 最大配信試行回数 | **1〜30（既定 30）** |
| イベントの TTL | **1〜1440 分（既定 1440 = 24 時間）** |
| 再試行しないコード（Azure リソース） | 400 / 413 / 403 |
| 再試行しないコード（Webhook） | 400 / 413 / 401 / 403 |
| 配信不能 | **既定は無効**（ストレージの Blob コンテナを指定） |
| 配信不能へ移るまでの遅延 | 約 5 分 |
| バッチの最大イベント数 / 推奨サイズ | 1〜5,000 / 1〜1,024 KB |
| イベントの最大サイズ | 1 MB（64 KB 単位で課金） |

## Azure Functions

| プラン | タイムアウト既定 | 最大 | 最大インスタンス |
|---|---|---|---|
| Flex Consumption | 30 分 | 無制限 | 1,000 |
| Premium | 30 分 | 無制限 | Windows 100 / Linux 20〜100 |
| Dedicated | 30 分 | 無制限（Always On） | 10〜30 |
| Container Apps | 30 分 | 無制限 | 300〜1,000 |
| Consumption（レガシー・Windows） | **5 分** | **10 分** | 200 |

| 項目 | 値 |
|---|---|
| HTTP トリガーの応答上限 | **約 230 秒** |
| Timer の CRON | **6 フィールド**（秒 分 時 日 月 曜日） |
| Service Bus トリガー `maxAutoLockRenewalDuration`（既定） | 5 分 |
| .NET in-process モデルのサポート終了 | 2026-11-10 |

## Key Vault / App Configuration / 監視

| 項目 | 値 |
|---|---|
| 論理的な削除の保持期間 | **7〜90 日（既定 90）** |
| 消去保護 | 一度有効にすると**無効にできない** |
| `SecretNearExpiry` イベント | 期限の **30 日前** |
| App Configuration のリフレッシュ間隔（既定） | **30 秒** |
| 機能フラグのキーのプレフィックス | `.appconfig.featureflag/` |
| Application Insights の接続文字列の環境変数 | `APPLICATIONINSIGHTS_CONNECTION_STRING` |
| W3C Trace Context のヘッダー | `traceparent` |
