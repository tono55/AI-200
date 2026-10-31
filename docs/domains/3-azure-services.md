# 分野 3: Connect to and consume Azure services（20–25%）

> 対応する公式項目: 3.1〜3.4 / Learn ラーニングパス: #7 Integrate backend services for AI solutions
> AZ-204 から引き継いだ内容が多い分野です。経験者は**2026 年時点の仕様**（Flex Consumption、isolated worker、CloudEvents、Entra 認証）に更新しておきましょう。

## 0. 出題範囲

| ID | 原文 | 和訳 |
|---|---|---|
| 3.1 | Queue and process back-end operations by using Azure Service Bus, including dead-letter queue handling, messages, topics, and subscriptions | Service Bus でバックエンド処理をキューイング・処理する（配信不能キュー、メッセージ、トピック、サブスクリプション） |
| 3.2 | Implement event-driven workflows by using Azure Event Grid, including filters, custom events, and retries | Event Grid でイベント駆動ワークフロー（フィルター、カスタムイベント、再試行） |
| 3.3 | Build serverless APIs, including implementing triggers and bindings | サーバーレス API（トリガーとバインド） |
| 3.4 | Configure and deploy function apps | 関数アプリの構成とデプロイ |

## 1. 全体像

```
              ┌─ 推論リクエスト（重い・時間がかかる・失敗したら再試行）──▶ Service Bus キュー ──▶ ワーカー（Functions / Container Apps）
クライアント ─┤
              └─ 「文書がアップロードされた」などの事実の通知 ──▶ Event Grid ──▶ 複数のハンドラー（埋め込み生成、監査、通知）
```

**メッセージ（Service Bus）とイベント（Event Grid）の違い（最頻出）**

| | **メッセージ**（Service Bus） | **イベント**（Event Grid） |
|---|---|---|
| 意味 | 「これを処理して」という**命令・データ** | 「これが起きた」という**通知**（軽量） |
| 送り手の期待 | 受け手が処理することを期待する | 誰が受けるかを気にしない |
| 配信 | プル（受信者が取りに行く）。ロック・決済 | プッシュ（Event Grid が配信）。名前空間トピックではプルも可 |
| 機能 | 順序（セッション）、重複検出、トランザクション、配信不能キュー、遅延配信 | フィルター、ファンアウト、再試行、配信不能（ストレージ） |
| 例 | 推論ジョブ、注文処理 | Blob 作成、リソース変更、カスタムイベント |

> 大量のストリーム（テレメトリ、ログ）を取り込むのは Event Hubs ですが、AI-200 の範囲からは外れました。選択肢の比較で出ることはあります。

---

## 2. 重要概念

### 2.1 Azure Service Bus（3.1）

**層（Tier）**

| | Basic | Standard | Premium |
|---|---|---|---|
| キュー | ✅ | ✅ | ✅ |
| トピック / サブスクリプション | ❌ | ✅ | ✅ |
| 最大メッセージサイズ | 256 KB | 256 KB | **100 MB**（AMQP） |
| リソース | 共有 | 共有（1 秒あたりの操作数に制限） | **専用（メッセージングユニット）**、予測可能な性能 |
| ネットワーク分離（プライベートエンドポイント） | ❌ | ❌ | ✅ |

**エンティティ**

| エンティティ | 動き |
|---|---|
| **キュー** | 1 対 1。複数の受信者がいても**各メッセージは 1 人だけ**が処理（競合コンシューマー） |
| **トピック ＋ サブスクリプション** | 1 対多（pub/sub）。**サブスクリプションごとにメッセージのコピー**が届く。サブスクリプションは仮想的なキュー |
| **ルール（フィルター）** | サブスクリプションに届くメッセージを選ぶ。**SQL フィルター**（`priority > 5 AND model = 'gpt'`）/ **相関フィルター**（`CorrelationId`、`Subject`、ユーザープロパティの完全一致。**SQL より高速**）/ ブールフィルター。新しいサブスクリプションには既定で **`$Default` ルール（True フィルター＝全件）** がある |
| アクション | SQL ルールのアクションでプロパティを追加・変更できる |

**メッセージの主なプロパティ**

| プロパティ | 用途 |
|---|---|
| `body` | 本文（JSON などのバイト列） |
| `message_id` | **重複検出**のキー |
| `session_id` | **セッション**（同じ ID のメッセージを順番どおり 1 つの受信者が処理。FIFO） |
| `correlation_id` / `reply_to` | 要求と応答の対応 |
| `subject` | ラベル（相関フィルターで使う） |
| `application_properties` | 任意のユーザープロパティ（フィルターで使う） |
| `time_to_live` | 有効期限（期限切れは DLQ へ移せる） |
| `scheduled_enqueue_time_utc` | **遅延配信**（指定時刻まで見えない） |
| `content_type` | `application/json` など |

**受信モードと決済（settle）**

| 受信モード | 動き |
|---|---|
| **Peek-Lock**（既定・推奨） | メッセージをロックして渡す。処理後に決済する。**ロック期間の既定は 1 分、最大 5 分**（それ以上は `RenewLock` で延長） |
| Receive-and-Delete | 受け取った時点で削除（**最も 1 回**。処理に失敗すると失われる） |

| 決済操作 | 結果 |
|---|---|
| `complete` | 削除（処理成功） |
| `abandon` | ロックを解除し、再びキューへ（**配信回数 +1**） |
| `defer` | 後で `sequence_number` を指定して受信するために保留 |
| `dead_letter` | 配信不能キューへ（理由と説明を付ける） |

**配信不能キュー（DLQ）**

| 項目 | 内容 |
|---|---|
| パス | `<queue>/$deadletterqueue`、`<topic>/Subscriptions/<sub>/$deadletterqueue`。SDK では `sub_queue=ServiceBusSubQueue.DEAD_LETTER`（.NET は `SubQueue.DeadLetter`） |
| **自動で入る主な理由** | **`MaxDeliveryCountExceeded`**（配信回数が**既定 10 回**を超えた）、**`TTLExpiredException`**（期限切れ。**キュー / サブスクリプションで「期限切れで配信不能にする」を有効にした場合**）、`HeaderSizeExceeded`、セッション ID がない、自動転送のホップ数超過（4 ホップまで）、フィルター評価の例外（有効にした場合） |
| アプリから入れる | `dead_letter_message(reason=..., error_description=...)`（不正なメッセージ＝**ポイズンメッセージ**など） |
| 自動削除 | **されない**。DLQ のメッセージは TTL も適用されない。**明示的に受信して complete する**まで残る |
| 対処 | DLQ を監視（メトリック `DeadletteredMessages`）→ 原因を直して元のキューへ再送 |

**その他の機能**

- **重複検出**: 指定期間内（既定 **10 分**）に同じ `MessageId` が来たら破棄。作成時に有効化。
- **セッション**: 順序保証と、同じ ID のメッセージを 1 つの受信者にまとめる。会話単位の処理に。
- **トランザクション**: 受信と送信をまとめて原子的に（1 トランザクション最大 100 メッセージ）。
- **自動転送**: キュー / サブスクリプションから別のエンティティへ自動で転送。
- **認証**: Entra ID（ロール **Azure Service Bus Data Sender / Data Receiver / Data Owner**）＋マネージド ID が推奨。SAS（共有アクセス ポリシー）も可。

### 2.2 Azure Event Grid（3.2）

**用語**

| 用語 | 説明 |
|---|---|
| イベントソース | イベントを出すもの（Blob Storage、リソースグループ、自分のアプリ） |
| **システムトピック** | Azure サービスが出すイベント用のトピック |
| **カスタムトピック** | 自分のアプリがイベントを発行するエンドポイント |
| 名前空間トピック | Event Grid 名前空間のトピック（**プル配信**、MQTT にも対応） |
| **イベントサブスクリプション** | どのイベントをどのハンドラーへ送るか（フィルター、再試行、配信不能、バッチの設定） |
| イベントハンドラー | Azure Functions、Webhook、Service Bus キュー / トピック、Storage キュー、Event Hubs、Logic Apps など |

**イベントスキーマ**

| Event Grid スキーマ | **CloudEvents 1.0**（CNCF の標準。新規はこちらが推奨） |
|---|---|
| `id`, `topic`, `subject`, `eventType`, `eventTime`, `data`, `dataVersion`, `metadataVersion` | `id`, `source`, `specversion`, `type`, `subject`, `time`, `data`（`datacontenttype`） |

イベントの最大サイズは **1 MB**（64 KB 単位で課金）。

**フィルター（イベントサブスクリプション）**

| 種類 | 例 |
|---|---|
| イベントの種類 | `Microsoft.Storage.BlobCreated` のみ |
| **件名（subject）** | `subjectBeginsWith: /blobServices/default/containers/docs/`、`subjectEndsWith: .pdf`（大文字小文字の区別はオプション） |
| **高度なフィルター** | データのフィールドに演算子: `NumberGreaterThan`、`NumberIn`、`StringContains`、`StringBeginsWith`、`StringIn`、`BoolEquals`、`IsNullOrUndefined` など。キーは `data.category` のように指定 |

**カスタムイベントの発行**

- カスタムトピックのエンドポイントに HTTP POST（SDK: `EventGridPublisherClient`）。
- 認証: **Entra ID（ロール `EventGrid Data Sender`）** ＋マネージド ID が推奨。アクセスキー（ヘッダー `aeg-sas-key`）や SAS トークンも可。

**再試行と配信不能（数値は頻出）**

| 項目 | 内容 |
|---|---|
| 配信の保証 | **少なくとも 1 回**（重複がありうる → ハンドラーは**冪等**に） |
| 応答の待ち時間 | 配信後 **30 秒**応答がなければ再試行の対象 |
| 再試行のスケジュール | **指数バックオフ**（10 秒、30 秒、1 分、5 分、10 分、30 分、1 時間、3 時間、6 時間、以降 12 時間ごと…） |
| 再試行ポリシー（変更可） | **最大配信試行回数: 1〜30（既定 30）**、**イベントの有効期間（TTL）: 1〜1440 分（既定 1440 分＝24 時間）**。**どちらか先に達した方**で終了 |
| **再試行しないエラー** | Azure リソース宛: **400、413、403**。Webhook 宛: **400、413、401、403** |
| **配信不能（dead-letter）** | **既定では無効**。有効にするとストレージアカウントの**Blob コンテナ**に保存。無効のままだと上限に達したイベントは**破棄** |
| 400 / 413 を受けたとき | すぐに配信不能へ（再試行しても成功しないため） |
| バッチ配信 | 既定は 1 件ずつ（配列に 1 件）。サブスクリプションごとに有効化（最大イベント数 1〜5,000、推奨バッチサイズ 1〜1,024 KB）。**全部成功か全部失敗** |
| 異常なエンドポイント | 失敗が続くと Event Grid が配信を遅らせる（最大数時間） |

**Webhook のエンドポイント検証**

- Event Grid スキーマ: `SubscriptionValidationEvent` を受け、`validationCode` を `{"validationResponse": "<code>"}` で返す（またはイベント内の `validationUrl` に GET）。
- CloudEvents: HTTP **OPTIONS** の不正利用防止ハンドシェイク（`WebHook-Request-Origin` に `WebHook-Allowed-Origin` で応答）。
- Azure Functions の Event Grid トリガーは検証を自動で処理する。

### 2.3 Azure Functions: トリガーとバインド（3.3）

| 用語 | 説明 |
|---|---|
| **トリガー** | 関数を起動するもの。**関数につき 1 つだけ** |
| **入力バインド** | 実行時にデータを読み込んで引数として渡す |
| **出力バインド** | 戻り値・引数に書いたデータを外部へ送る |
| Python v2 プログラミングモデル | **デコレーター**（`@app.route`、`@app.service_bus_queue_trigger` など）で定義。`function.json` は不要 |
| .NET | **isolated worker モデル**（in-process モデルは **2026-11-10 にサポート終了**） |

**よく使うトリガー / バインド**

| トリガー / バインド | 用途 | メモ |
|---|---|---|
| HTTP トリガー | REST API | 認証レベル `ANONYMOUS` / `FUNCTION`（関数キー: `x-functions-key` ヘッダーか `?code=`）/ `ADMIN`。**応答は約 230 秒まで**（ロードバランサーのアイドルタイムアウト） |
| Timer トリガー | 定期実行 | **NCRONTAB の 6 フィールド**（`{秒} {分} {時} {日} {月} {曜日}`）。例: `0 */5 * * * *` = 5 分ごと |
| Service Bus トリガー / 出力 | キューの処理 | 例外が出るとメッセージは abandon され、配信回数を超えると DLQ。`host.json` で `maxConcurrentCalls`、`autoCompleteMessages` など |
| Event Grid トリガー | イベント処理 | 検証を自動処理 |
| Cosmos DB トリガー / 入力 / 出力 | 変更フィード、読み書き | トリガーは**リースコンテナ**が必要 |
| Blob トリガー | ファイル処理 | Flex Consumption では **Event Grid ベースの Blob トリガー**を使う |
| Durable Functions | 長時間・状態を持つワークフロー | オーケストレーター / アクティビティ / クライアント。パターン: 関数チェーン、**ファンアウト / ファンイン**、非同期 HTTP API、監視、人による承認 |

**接続設定とマネージド ID（ID ベースの接続）**

- バインドの `connection` には**アプリ設定の名前**を書く。
- シークレット（接続文字列）を使わない場合は、アプリ設定 `<接続名>__fullyQualifiedNamespace`（Service Bus / Event Hubs）、`<接続名>__accountEndpoint`（Cosmos DB）、`<接続名>__serviceUri` / `__accountName`（Storage）を設定し、関数アプリのマネージド ID にデータプレーンのロールを付与する。
- `AzureWebJobsStorage` も `AzureWebJobsStorage__accountName` で ID ベースにできる。

### 2.4 関数アプリの構成とデプロイ（3.4）

**ホスティングプラン（2026 年時点）**

| プラン | 特徴 | タイムアウト（既定 / 最大） | 最大インスタンス |
|---|---|---|---|
| **Flex Consumption**（**新規のサーバーレスの推奨**） | 高速なスケール、**関数ごとのスケール**、**VNet 統合**、**常時準備インスタンス**（コールドスタート対策）、インスタンスメモリを選べる。**Linux のみ・コンテナ不可** | **30 分 / 無制限** | 1,000 |
| Premium（Elastic Premium） | 事前ウォーム済みインスタンスで**コールドスタートなし**、VNet、**Linux コンテナ可** | 30 分 / 無制限 | Windows 100、Linux 20〜100 |
| Dedicated（App Service プラン） | 既存のプランで実行。**Always On が必要**（HTTP 以外のトリガー） | 30 分 / 無制限 | 10〜30（ASE 100） |
| Container Apps | Functions をコンテナで Container Apps 上に。KEDA で自動スケール | 30 分 / 無制限 | 300〜1,000 |
| Consumption（レガシー） | **Windows のみ**（Linux の Consumption は廃止） | **5 分 / 10 分** | Windows 200 |

> HTTP トリガーはプランにかかわらず**約 230 秒**で応答しないとタイムアウトする。長い処理は **Durable Functions の非同期 HTTP API パターン**か、キューに入れて 202 を返す。

**ファイル**

| ファイル | 内容 |
|---|---|
| `host.json` | ランタイム全体の設定（ログ、拡張機能の設定、`functionTimeout`、Service Bus の同時実行数など）。**デプロイされる** |
| `local.settings.json` | ローカル実行用のアプリ設定・接続文字列。**デプロイされない**（Azure ではアプリ設定に入れる） |
| `requirements.txt` | Python の依存関係 |

**デプロイ方法**

| 方法 | コマンド / 内容 |
|---|---|
| Core Tools | `func azure functionapp publish <app>` |
| ZIP デプロイ | `az functionapp deployment source config-zip`（Flex Consumption は「One Deploy」） |
| パッケージから実行 | `WEBSITE_RUN_FROM_PACKAGE=1`（読み取り専用でパッケージからそのまま実行） |
| CI/CD | GitHub Actions（`Azure/functions-action`）、Azure Pipelines |
| デプロイスロット | Premium / Dedicated で利用（ステージング → スワップ） |

**構成**: アプリ設定（環境変数として渡る）、Key Vault 参照（`@Microsoft.KeyVault(...)`）、App Configuration、マネージド ID、CORS、`FUNCTIONS_WORKER_RUNTIME`、`FUNCTIONS_EXTENSION_VERSION=~4`。

---

## 3. 実装パターン

### 3.1 Service Bus（Python、Entra 認証）

```python
from azure.identity import DefaultAzureCredential
from azure.servicebus import ServiceBusClient, ServiceBusMessage, ServiceBusSubQueue

ns = "sb-ai200.servicebus.windows.net"
client = ServiceBusClient(ns, credential=DefaultAzureCredential())

# 送信（バッチ）
with client.get_queue_sender("inference") as sender:
    batch = sender.create_message_batch()
    batch.add_message(ServiceBusMessage(
        '{"prompt": "summarize doc 42"}',
        message_id="job-42",                # 重複検出
        content_type="application/json",
        application_properties={"model": "gpt", "priority": 7},
    ))
    sender.send_messages(batch)

# 受信（Peek-Lock）と決済
with client.get_queue_receiver("inference", max_wait_time=5) as receiver:
    for msg in receiver:
        try:
            process(msg)
            receiver.complete_message(msg)
        except ValueError as e:              # 何度やっても失敗する不正メッセージ
            receiver.dead_letter_message(msg, reason="InvalidPayload", error_description=str(e))
        except Exception:
            receiver.abandon_message(msg)    # 一時的な失敗 → 再配信（配信回数 +1）

# 配信不能キューの確認
with client.get_queue_receiver("inference", sub_queue=ServiceBusSubQueue.DEAD_LETTER) as dlq:
    for msg in dlq.receive_messages(max_message_count=10, max_wait_time=5):
        print(msg.dead_letter_reason, msg.dead_letter_error_description)
        dlq.complete_message(msg)            # 取り出して削除（必要なら元のキューへ再送）
```

```bash
# トピック・サブスクリプション・SQL フィルター
az servicebus topic create -g rg-ai200 --namespace-name sb-ai200 -n events
az servicebus topic subscription create -g rg-ai200 --namespace-name sb-ai200 --topic-name events -n high-priority
az servicebus topic subscription rule create -g rg-ai200 --namespace-name sb-ai200 \
  --topic-name events --subscription-name high-priority -n prio --filter-sql-expression "priority > 5"
az servicebus topic subscription rule delete -g rg-ai200 --namespace-name sb-ai200 \
  --topic-name events --subscription-name high-priority -n '$Default'   # 全件ルールを消す

# キュー: 重複検出・期限切れの DLQ・最大配信回数
az servicebus queue create -g rg-ai200 --namespace-name sb-ai200 -n inference \
  --enable-duplicate-detection true --duplicate-detection-history-time-window PT10M \
  --enable-dead-lettering-on-message-expiration true --max-delivery-count 5 --lock-duration PT2M
```

### 3.2 Event Grid: カスタムイベントの発行とサブスクリプション

```python
from azure.identity import DefaultAzureCredential
from azure.eventgrid import EventGridPublisherClient
from azure.core.messaging import CloudEvent

client = EventGridPublisherClient("https://egt-ai200.japaneast-1.eventgrid.azure.net/api/events",
                                  DefaultAzureCredential())   # EventGrid Data Sender ロール
client.send(CloudEvent(
    source="/apps/rag-ingest",
    type="Contoso.Documents.Indexed",
    subject="/tenants/contoso/docs/42",
    data={"docId": 42, "chunks": 18, "category": "manual"},
))
```

```bash
az eventgrid topic create -g rg-ai200 -n egt-ai200 -l japaneast --input-schema cloudeventschemav1_0

az eventgrid event-subscription create -n to-func \
  --source-resource-id $(az eventgrid topic show -g rg-ai200 -n egt-ai200 --query id -o tsv) \
  --endpoint-type azurefunction --endpoint <関数のリソースID> \
  --event-delivery-schema cloudeventschemav1_0 \
  --included-event-types Contoso.Documents.Indexed \
  --subject-begins-with /tenants/contoso/ \
  --advanced-filter data.category StringIn manual faq \
  --max-delivery-attempts 10 --event-ttl 120 \
  --deadletter-endpoint <ストレージアカウントID>/blobServices/default/containers/deadletter
```

### 3.3 Azure Functions（Python v2）

```python
import json, logging
import azure.functions as func

app = func.FunctionApp(http_auth_level=func.AuthLevel.FUNCTION)

# HTTP → Service Bus に入れて 202 を返す（長い推論は非同期に）
@app.route(route="summarize", methods=["POST"])
@app.service_bus_queue_output(arg_name="out", queue_name="inference", connection="ServiceBusConnection")
def summarize(req: func.HttpRequest, out: func.Out[str]) -> func.HttpResponse:
    out.set(req.get_body().decode())
    return func.HttpResponse(status_code=202)

# Service Bus トリガー → Cosmos DB 出力
@app.service_bus_queue_trigger(arg_name="msg", queue_name="inference", connection="ServiceBusConnection")
@app.cosmos_db_output(arg_name="doc", database_name="ragdb", container_name="results",
                      connection="CosmosConnection")
def worker(msg: func.ServiceBusMessage, doc: func.Out[func.Document]):
    job = json.loads(msg.get_body())
    doc.set(func.Document.from_dict({"id": msg.message_id, "summary": run_llm(job)}))

# Event Grid トリガー
@app.event_grid_trigger(arg_name="event")
def on_indexed(event: func.EventGridEvent):
    logging.info("type=%s subject=%s", event.event_type, event.subject)

# 5 分ごと（NCRONTAB 6 フィールド）
@app.timer_trigger(schedule="0 */5 * * * *", arg_name="timer")
def refresh_cache(timer: func.TimerRequest):
    ...
```

ID ベースの接続のアプリ設定（シークレットなし）:

```text
ServiceBusConnection__fullyQualifiedNamespace = sb-ai200.servicebus.windows.net
CosmosConnection__accountEndpoint             = https://cosmos-ai200.documents.azure.com:443/
AzureWebJobsStorage__accountName              = stai200
```

`host.json`（Service Bus の同時実行数など）:

```json
{
  "version": "2.0",
  "extensions": {
    "serviceBus": {
      "maxConcurrentCalls": 16,
      "autoCompleteMessages": true,
      "maxAutoLockRenewalDuration": "00:10:00"
    }
  }
}
```

作成とデプロイ:

```bash
az functionapp create -g rg-ai200 -n func-ai200 --storage-account stai200 \
  --flexconsumption-location japaneast --runtime python --runtime-version 3.12
az functionapp identity assign -g rg-ai200 -n func-ai200
func azure functionapp publish func-ai200
```

---

## 4. 判断ポイント（要件 → 選択）

| 要件 | 選ぶもの |
|---|---|
| 推論ジョブを確実に 1 回処理し、失敗時は再試行・隔離 | Service Bus キュー（Peek-Lock、DLQ） |
| 1 つのメッセージを複数のシステム（課金・監査・通知）に配る | Service Bus トピック＋サブスクリプション（またはイベントなら Event Grid） |
| 優先度の高いメッセージだけを別のサブスクリプションへ | SQL フィルター（完全一致だけなら相関フィルターの方が高速） |
| 同じ会話のメッセージを順番に処理 | セッション（`session_id`） |
| クライアントの再送で同じジョブが 2 回入るのを防ぐ | 重複検出（`message_id`） |
| 処理できないメッセージを残して後で調査 | `dead_letter_message`（理由つき）→ DLQ を監視 |
| 1 時間後に処理させたい | `scheduled_enqueue_time_utc` |
| 256 KB を超えるメッセージ | Premium（最大 100 MB）、または本体を Blob に置いて参照を送る（Claim Check パターン） |
| Blob に PDF が置かれたら埋め込み生成を起動 | Event Grid（`BlobCreated`、`subjectEndsWith: .pdf`）→ Functions |
| 自分のアプリから「インデックス完了」を複数の購読者に通知 | Event Grid のカスタムトピック（CloudEvents） |
| イベントの `data` の値で配信先を分ける | Event Grid の高度なフィルター |
| 配信できなかったイベントを失いたくない | Event Grid の配信不能（ストレージの Blob コンテナ）を設定 |
| 一時的な障害時に 1 時間だけ再試行し、その後は諦める | `--event-ttl 60`（または最大試行回数） |
| サーバーレス、VNet 統合、コールドスタートを減らしたい（新規） | **Flex Consumption**（常時準備インスタンス） |
| 関数をカスタムコンテナで動かしたい | Premium / Dedicated / Container Apps（Flex Consumption はコンテナ不可） |
| 10 分を超える処理（HTTP 以外のトリガー） | Flex / Premium / Dedicated（レガシー Consumption は最大 10 分） |
| HTTP で数分かかる処理を受け付けたい | Durable Functions の非同期 HTTP API、またはキュー＋ 202 |
| 複数の LLM 呼び出しを並列に行い結果を集約 | Durable Functions のファンアウト / ファンイン |
| 接続文字列を使わずにバインドを接続 | ID ベースの接続（`__fullyQualifiedNamespace` など）＋マネージド ID＋データプレーンロール |

## 5. ひっかけポイント

- **Basic 層にはトピックがない。**
- Peek-Lock のロックは**既定 1 分・最大 5 分**。長い処理はロックを更新する（Functions は `maxAutoLockRenewalDuration`）。
- 最大配信回数の既定は **10**。
- DLQ のメッセージは**自動で消えない**し、**TTL も適用されない**。
- 期限切れメッセージが DLQ に入るのは、**「期限切れで配信不能にする」を有効にした場合だけ**（無効なら消える）。
- 新しいサブスクリプションには `$Default`（全件）ルールがある。フィルターを足しても `$Default` を消さないと全件届く。
- Event Grid の配信不能は**既定で無効**。設定しないと上限に達したイベントは破棄される。
- Event Grid の既定は **30 回 / 24 時間**。どちらか先に達した方で終了。
- Event Grid は 400 / 413 などは**再試行しない**。
- Event Grid も Service Bus も**少なくとも 1 回**。ハンドラーは冪等に。
- Timer トリガーの CRON は **6 フィールド（秒から）**。
- `local.settings.json` は**デプロイされない**。
- **Flex Consumption は Linux のみ・コンテナ不可**。Linux の従来の Consumption プランは廃止。
- HTTP トリガーは**どのプランでも約 230 秒**で打ち切られる。

## 6. 確認問題

<details><summary>Q1. 推論ワーカーがメッセージ処理中に例外で落ち続ける。何が起き、最終的にメッセージはどうなるか（既定設定）。</summary>

**答え**: ロックが切れる / abandon されるたびに配信回数が増え、**10 回**を超えると `MaxDeliveryCountExceeded` で配信不能キューに移る。DLQ は自動で消えないので、監視して原因を直し再送する。
</details>

<details><summary>Q2. トピックに「priority が 5 より大きい」メッセージだけを受け取るサブスクリプションを作ったが、全件届く。</summary>

**答え**: 既定の `$Default` ルール（True フィルター）が残っている。ルールは OR で評価されるので `$Default` を削除する。
</details>

<details><summary>Q3. Event Grid の Webhook ハンドラーが 2 日間ダウンしていた。復旧後にイベントが届かない。既定設定の場合、イベントはどうなったか。どうすべきだったか。</summary>

**答え**: 既定の TTL は 24 時間（1440 分）なので、それを過ぎたイベントは破棄された（配信不能は既定で無効）。配信不能の保存先（ストレージの Blob コンテナ）を設定しておけば、後から取り出して再処理できた。
</details>

<details><summary>Q4. Event Grid のハンドラーが入力の検証エラーで HTTP 400 を返した。Event Grid は再試行するか。</summary>

**答え**: しない。400 / 413 は再試行しても成功しないため、配信不能が設定されていれば即座に配信不能へ、なければ破棄される。
</details>

<details><summary>Q5. 新しいサーバーレスの関数アプリで、VNet 内の PostgreSQL に接続し、コールドスタートを抑えたい。コードのみ（コンテナなし）。プランは？</summary>

**答え**: Flex Consumption（VNet 統合、常時準備インスタンス）。
</details>

<details><summary>Q6. HTTP トリガーで、LLM による長い要約（5〜10 分）を処理したい。</summary>

**答え**: HTTP トリガーは約 230 秒で切れるので、Durable Functions の非同期 HTTP API パターン（202 と状態確認 URL を返す）を使うか、Service Bus にジョブを入れて 202 を返し、別の関数で処理する。
</details>

<details><summary>Q7. Service Bus トリガーの関数で接続文字列を使いたくない。必要な設定は？</summary>

**答え**: アプリ設定 `<接続名>__fullyQualifiedNamespace=<ns>.servicebus.windows.net` を設定し、関数アプリのマネージド ID に `Azure Service Bus Data Receiver`（出力もするなら Data Sender）を割り当てる。
</details>

<details><summary>Q8. 「毎日 2:30（UTC）」に実行する Timer トリガーの式は？</summary>

**答え**: `0 30 2 * * *`（秒 分 時 日 月 曜日）。
</details>

<details><summary>Q9. 1 件のアップロードイベントで、埋め込み生成・ウイルススキャン・監査ログの 3 つの処理を起動したい。</summary>

**答え**: Event Grid のシステムトピック（Blob Storage）に 3 つのイベントサブスクリプションを作る（ファンアウト）。
</details>

## 7. チェックリスト

- [ ] メッセージとイベントの違い、Service Bus と Event Grid の使い分けを説明できる
- [ ] Service Bus の 3 つの層の違い（トピック、メッセージサイズ、ネットワーク）を言える
- [ ] キューとトピック / サブスクリプション、3 種類のフィルター、`$Default` ルールを説明できる
- [ ] Peek-Lock と 4 つの決済操作、ロック期間（1 分 / 最大 5 分）を説明できる
- [ ] DLQ に入る理由、パス、扱い方を説明できる
- [ ] セッション、重複検出（10 分）、遅延配信、TTL の使いどころを言える
- [ ] Event Grid のスキーマ（Event Grid / CloudEvents）の主なフィールドを言える
- [ ] 3 種類のフィルター（イベントの種類・件名・高度）を書ける
- [ ] 再試行ポリシー（30 回 / 1440 分）、再試行しないコード、配信不能の設定を説明できる
- [ ] カスタムトピックへの発行コードを書ける
- [ ] Functions のトリガー / 入力 / 出力バインドを Python v2 で書ける
- [ ] Timer の NCRONTAB を書ける
- [ ] ID ベースの接続（`__fullyQualifiedNamespace` など）を設定できる
- [ ] 5 つのホスティングプランの違い（タイムアウト、コンテナ、VNet、コールドスタート）を説明できる
- [ ] `host.json` と `local.settings.json` の違い、デプロイ方法を言える

## 8. 公式リファレンス

- [Service Bus queues, topics, and subscriptions](https://learn.microsoft.com/azure/service-bus-messaging/service-bus-queues-topics-subscriptions)
- [Service Bus dead-letter queues](https://learn.microsoft.com/azure/service-bus-messaging/service-bus-dead-letter-queues)
- [Message transfers, locks, and settlement](https://learn.microsoft.com/azure/service-bus-messaging/message-transfers-locks-settlement)
- [Topic filters and actions](https://learn.microsoft.com/azure/service-bus-messaging/topic-filters)
- [Service Bus quotas](https://learn.microsoft.com/azure/service-bus-messaging/service-bus-quotas)
- [Event Grid delivery and retry](https://learn.microsoft.com/azure/event-grid/delivery-and-retry)
- [Event Grid event filtering](https://learn.microsoft.com/azure/event-grid/event-filtering)
- [CloudEvents v1.0 schema with Event Grid](https://learn.microsoft.com/azure/event-grid/cloud-event-schema)
- [Azure Functions hosting options](https://learn.microsoft.com/azure/azure-functions/functions-scale)
- [Azure Functions triggers and bindings](https://learn.microsoft.com/azure/azure-functions/functions-triggers-bindings)
- [Python developer guide (v2 model)](https://learn.microsoft.com/azure/azure-functions/functions-reference-python)
- [Identity-based connections](https://learn.microsoft.com/azure/azure-functions/functions-reference#configure-an-identity-based-connection)
