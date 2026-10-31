# 分野 4: Secure, monitor, and troubleshoot Azure solutions（20–25%）

> 対応する公式項目: 4.1〜4.4 / Learn ラーニングパス: #8 Manage application secrets and configuration、#9 Observe and troubleshoot apps on Azure
> AZ-204 から**計装が Application Insights SDK → OpenTelemetry に変わり**、**KQL を自分で書く**比重が上がりました。

## 0. 出題範囲

| ID | 原文 | 和訳 |
|---|---|---|
| 4.1 | Secure secrets by using Azure Key Vault, including rotation and retrieval | Key Vault でシークレットを保護する（ローテーションと取得） |
| 4.2 | Store and retrieve app configuration information by using Azure App Configuration | App Configuration で構成情報を保存・取得する |
| 4.3 | Trace distributed systems by using OpenTelemetry SDKs | OpenTelemetry SDK で分散システムをトレースする |
| 4.4 | Write KQL queries to analyze logs and metrics | ログとメトリックを分析する KQL を書く |

## 1. 全体像

```
アプリ（マネージド ID）
  ├─ 構成値・機能フラグ ──▶ App Configuration ──(Key Vault 参照)──▶ Key Vault
  ├─ シークレット ────────────────────────────────────────────────▶ Key Vault
  └─ OpenTelemetry SDK（トレース / メトリック / ログ）──▶ Azure Monitor（Application Insights ＋ Log Analytics）
                                                           └─ KQL で分析 → ブック / ダッシュボード / アラート
```

**共通の前提: マネージド ID ＋ `DefaultAzureCredential` ＋ Azure RBAC**

| | システム割り当てマネージド ID | ユーザー割り当てマネージド ID |
|---|---|---|
| ライフサイクル | リソースと一緒に作成・削除 | 独立したリソース |
| 共有 | 1 つのリソース専用 | **複数のリソースで共有できる** |
| 向いている場面 | 単一のアプリ | 複数アプリで同じ権限、リソース作成前に権限を準備したい、スケールで頻繁に作り直す |

`DefaultAzureCredential` は、環境変数・ワークロード ID・**マネージド ID**・Azure CLI などを順に試すので、
**同じコードがローカル（開発者のサインイン）でも Azure（マネージド ID）でも動く**。本番で明示したいなら `ManagedIdentityCredential`。
ユーザー割り当て ID を使う場合はクライアント ID を指定する（`AZURE_CLIENT_ID` など）。

---

## 2. 重要概念

### 2.1 Azure Key Vault（4.1）

| 項目 | 内容 |
|---|---|
| 保存するもの | **シークレット**（接続文字列、API キー、パスワード）、**キー**（暗号鍵）、**証明書** |
| 層 | Standard / Premium（HSM で保護されたキー）。さらに厳格な要件は Managed HSM |
| URI | `https://<vault>.vault.azure.net/secrets/<name>/<version>`。**バージョンを省略すると最新版** |
| バージョン管理 | `set` するたびに新しいバージョンができる。古いバージョンも残る |
| 属性 | `enabled`、`expires`（有効期限）、`not_before`、`content_type`、`tags` |
| アクセス制御（推奨） | **Azure RBAC**（従来のアクセスポリシーより推奨） |
| **論理的な削除（Soft delete）** | 新しいボールトでは**既定で有効**で、**一度有効にすると無効にできない**。保持期間は **7〜90 日（既定 90 日）**で、**ボールトの作成時にだけ設定でき、後から変更できない**。期間内は復元できる。削除済みのボールト名は保持期間が終わるまで再利用できない |
| **消去保護（Purge protection）** | **既定では無効**（論理的な削除が有効な場合だけ有効にできる）。有効にすると保持期間中は**誰も完全消去（purge）できない**（Microsoft も含む）。**一度有効にすると無効にできない**。暗号化キーを使う Storage などの連携では必須 |
| 完全消去（purge） | 消去保護が無効なら、サブスクリプションの所有者か **Key Vault Purge Operator** ロールで実行できる |
| ネットワーク | ファイアウォール、プライベートエンドポイント |
| 制限 | ボールトあたり・リージョンあたりの**トランザクション上限**がある → 超えると **429**。**シークレットはアプリ側でキャッシュ**する |

**主な組み込みロール**

| ロール | できること |
|---|---|
| **Key Vault Secrets User** | **シークレットの値を読む**（アプリに付けるのはこれ） |
| Key Vault Secrets Officer | シークレットの作成・更新・削除 |
| Key Vault Reader | メタデータを読む（**シークレットの値は読めない**） |
| Key Vault Crypto User | キーで暗号化・署名などの操作 |
| Key Vault Certificates Officer | 証明書の管理 |
| Key Vault Administrator | すべてのデータ操作 |

**ローテーション**

| 対象 | 方法 |
|---|---|
| **シークレット** | Key Vault は自分ではシークレットの値を変えられない（相手先のパスワードを知らないため）。**Event Grid のイベント `Microsoft.KeyVault.SecretNearExpiry`（期限の 30 日前）** などで **Azure Functions** を起動し、新しい資格情報を作って新バージョンとして保存し、相手先（DB など）も更新する。新バージョンの保存と相手先の更新の間にずれが生じうる点に注意。1 組の資格情報を使うパターンと、2 組を交互に使うパターン（下記）がある |
| 2 組の資格情報（デュアル資格情報） | 2 つのキー（例: Storage の key1 / key2）を交互に再生成し、切り替え中も止まらないようにする |
| **キー** | **ローテーションポリシー**で自動ローテーション（例: 期限の 30 日前に新バージョン） |
| 証明書 | 統合された CA（DigiCert など）なら自動更新 |
| アプリ側 | **バージョンなしの URI** で参照し、**キャッシュの TTL ごとに再取得**すれば新バージョンを拾える。App Service / Functions の Key Vault 参照はバージョンなしなら 24 時間以内に更新 |

**Key Vault のイベント（Event Grid）**: `SecretNewVersionCreated`、`SecretNearExpiry`、`SecretExpired`（キー・証明書にも同様のイベント）。

### 2.2 Azure App Configuration（4.2）

| 項目 | 内容 |
|---|---|
| キーと値 | 階層は `:` や `/` で表現（例: `RagApi:Search:TopK`） |
| **ラベル** | 同じキーに環境（`dev` / `prod`）やバージョンごとの値を持たせる。ラベルなし（null ラベル）もある |
| **機能フラグ** | `.appconfig.featureflag/<名前>` というキーで保存。**機能フィルター**（ターゲット（ユーザー・グループ・割合）、時間枠、カスタム）で段階的に公開 |
| **Key Vault 参照** | App Configuration にはシークレットの**URI だけ**を保存。**アプリが自分の ID で Key Vault から値を読む**（App Configuration は値を読まない）→ アプリに `Key Vault Secrets User` が必要 |
| **動的リフレッシュ** | **センチネルキー**（他の値をすべて更新した後に最後に変更するキー）を監視し、変化したら全体を再読み込み。**リフレッシュ間隔の既定は 30 秒** |
| **スナップショット** | ある時点のキーと値の組み合わせを**変更不可**で保存。リリースごとに固定した構成を使い、ロールバックも簡単 |
| 認証 | Entra ID（ロール **App Configuration Data Reader** / **Data Owner**）推奨。アクセスキーも可（無効化できる） |
| 層 | Free / Developer / Standard / Premium（Free は 1 日のリクエスト数やストレージに制限があり SLA なし） |
| 変更の通知 | Event Grid イベント（`KeyValueModified` など）で push 型の更新も可能 |
| ほかの統合 | App Service / Functions のアプリ設定から `@Microsoft.AppConfiguration(Endpoint=...; Key=...)` で参照 |

**App Configuration と Key Vault の使い分け**

| 置くもの | 場所 |
|---|---|
| 機密でない設定（エンドポイント URL、モデル名、TopK、タイムアウト） | App Configuration |
| 機能フラグ・段階的な公開 | App Configuration |
| シークレット（キー、パスワード、接続文字列） | **Key Vault**（App Configuration からは Key Vault 参照で一元的に見せる） |
| 暗号鍵・証明書 | Key Vault |

### 2.3 OpenTelemetry による分散トレース（4.3）

**基本用語**

| 用語 | 説明 |
|---|---|
| シグナル | **トレース**（スパン）、**メトリック**、**ログ** |
| トレース | 1 つの処理（リクエスト）の全体。**トレース ID** でつながる |
| **スパン** | トレース内の 1 つの作業単位。名前、開始・終了時刻、**親スパン**、**属性**（キーと値）、**イベント**（時刻付きの出来事）、**ステータス**（Unset / Ok / Error）、リンク |
| スパンの種類（SpanKind） | `SERVER`（受信したリクエスト）、`CLIENT`（外部呼び出し）、`PRODUCER` / `CONSUMER`（メッセージの送受信）、`INTERNAL`（内部処理） |
| **コンテキスト伝搬** | サービス間でトレース ID を引き継ぐ。HTTP では **W3C Trace Context の `traceparent` ヘッダー**（`00-<trace-id>-<span-id>-<flags>`）。メッセージではアプリケーションプロパティに入れる（Azure SDK が自動で行う） |
| リソース属性 | `service.name`（→ Application Insights の **`cloud_RoleName`**、アプリケーションマップのノード名）、`service.instance.id`（→ `cloud_RoleInstance`） |
| 計装ライブラリ | HTTP サーバー（Flask / FastAPI / ASP.NET Core）、HTTP クライアント（requests / HttpClient）、DB ドライバー、Azure SDK などを**自動で計装** |
| エクスポーター | テレメトリの送り先（Azure Monitor エクスポーター、OTLP） |
| サンプリング | 送信量とコストを減らすためにトレースの一部だけ送る。Azure Monitor のディストロ（Python など）の**既定はレート制限サンプリングで 1 秒あたり 5 トレース**。固定割合（例: 0.1 = 約 10%）かレート制限を選ぶ。Python は環境変数 **`OTEL_TRACES_SAMPLER`**（`microsoft.fixed_percentage` / `microsoft.rate_limited` など）と **`OTEL_TRACES_SAMPLER_ARG`** で設定（旧ディストロの `sampling_ratio` / `traces_per_second` 引数より環境変数が優先）。**メトリックはサンプリングされない**ので、アラートはメトリックに設定するのが確実。**サンプリングでトレースが欠けることがある** |

**Azure Monitor への送信**

| 言語 | パッケージ / 初期化 |
|---|---|
| Python | **Azure Monitor OpenTelemetry Distro**: `pip install azure-monitor-opentelemetry` → `configure_azure_monitor()`（2026 年にはさらに新しい **Microsoft OpenTelemetry Distro**: `microsoft-opentelemetry` / `use_microsoft_opentelemetry(enable_azure_monitor=True)` も登場。同じアプリで両方を初期化しない） |
| .NET | `Azure.Monitor.OpenTelemetry.AspNetCore` → `builder.Services.AddOpenTelemetry().UseAzureMonitor()`（新ディストロ: `Microsoft.OpenTelemetry` → `UseMicrosoftOpenTelemetry()`）。.NET ではスパン = **`Activity`**、トレーサー = **`ActivitySource`** |
| Java | Application Insights Java エージェント（`-javaagent`）でコード変更なし |
| 接続先の指定 | **接続文字列**（環境変数 **`APPLICATIONINSIGHTS_CONNECTION_STRING`**、またはコードで指定）。インストルメンテーションキー単独での指定は非推奨 |

**OpenTelemetry → Application Insights のテーブル対応**

| OpenTelemetry | Application Insights（クラシック名） | Log Analytics ワークスペースのテーブル |
|---|---|---|
| スパン（`SERVER` / `CONSUMER`） | `requests` | `AppRequests` |
| スパン（`CLIENT` / `PRODUCER` / `INTERNAL`） | `dependencies` | `AppDependencies` |
| スパンの例外（`record_exception`） | `exceptions` | `AppExceptions` |
| ログ | `traces` | `AppTraces` |
| メトリック | `customMetrics` | `AppMetrics` |

**Application Insights の画面**: アプリケーションマップ（サービス間の依存関係）、トランザクションの検索 / エンドツーエンドのトランザクションの詳細（1 つのトレースをウォーターフォールで表示）、失敗、パフォーマンス、ライブメトリック。

**AI アプリのトレースで記録したい属性の例**: 検索した件数（top_k）、使ったインデックス、モデル名、トークン数、キャッシュのヒット / ミス。生成 AI 用の標準属性（`gen_ai.*` のセマンティック規約）もある。

### 2.4 KQL でログとメトリックを分析（4.4）

**ログとメトリック**

| | メトリック | ログ |
|---|---|---|
| 形 | 数値の時系列 | 構造化されたレコード |
| 速さ・コスト | ほぼリアルタイム、軽い | 詳細、柔軟 |
| 分析 | メトリックエクスプローラー、メトリックアラート | **KQL**（Log Analytics）、ログ検索アラート |

**よく使う演算子・関数**

| 目的 | KQL |
|---|---|
| 絞り込み | `where`、`ago(1h)`、`between`、`in`、`has`（単語一致・高速）、`contains`（部分一致・遅い）、`startswith` |
| 列の選択・追加 | `project`、`project-away`、`extend` |
| 集計 | `summarize count(), avg(duration), percentile(duration, 95), dcount(user_Id) by bin(timestamp, 5m), name`、`countif()` |
| 並べ替え・上位 | `order by` / `sort by`、`top 10 by`、`take` |
| 結合 | `join kind=inner`（既定は `innerunique`）/ `leftouter`、`union` |
| 時系列・グラフ | `make-series`、`render timechart` / `barchart` / `piechart` |
| JSON・文字列 | `parse_json()`（`todynamic()`）、`tostring()`、`extract()`、`parse`、`mv-expand` |
| 変数 | `let` |
| 条件 | `iff()`、`case()` |

**列名の違いに注意**: Application Insights のクラシック名（`requests` / `timestamp` / `duration` / `success` / `resultCode` / `operation_Id` / `cloud_RoleName`）と、
ワークスペースのテーブル（`AppRequests` / `TimeGenerated` / `DurationMs` / `Success` / `ResultCode` / `OperationId` / `AppRoleName`）で名前が違う。

**ほかのよく使うテーブル**

| テーブル | 中身 |
|---|---|
| `ContainerAppConsoleLogs_CL` / `ContainerAppSystemLogs_CL` | Container Apps のアプリのログ / システムのログ |
| `ContainerLogV2`、`KubePodInventory`、`KubeEvents` | AKS（Container Insights） |
| `AzureDiagnostics` / リソース固有のテーブル | 各サービスの診断ログ（Key Vault の `AuditEvent` など） |
| `AzureMetrics` | 診断設定で送ったプラットフォームメトリック |

**監視の仕上げ**: ブック（対話的なレポート）、ダッシュボード、**アラート**（ログ検索アラート＝ KQL の結果で発火 / メトリックアラート）＋ **アクショングループ**（メール、Webhook、Functions など）。

---

## 3. 実装パターン

### 3.1 Key Vault

```bash
az keyvault create -g rg-ai200 -n kv-ai200 --enable-rbac-authorization true --enable-purge-protection true
az role assignment create --assignee <アプリのprincipalId> --role "Key Vault Secrets User" \
  --scope $(az keyvault show -n kv-ai200 --query id -o tsv)
az keyvault secret set --vault-name kv-ai200 -n openai-key --value "<value>" --expires "2027-01-31T00:00:00Z"
az keyvault secret show --vault-name kv-ai200 -n openai-key --query value -o tsv
az keyvault secret list-versions --vault-name kv-ai200 -n openai-key

# 削除と復元
az keyvault secret delete --vault-name kv-ai200 -n openai-key
az keyvault secret recover --vault-name kv-ai200 -n openai-key

# キーの自動ローテーション（ポリシー）
az keyvault key rotation-policy update --vault-name kv-ai200 -n data-key --value @policy.json
```

```python
import time
from azure.identity import DefaultAzureCredential
from azure.keyvault.secrets import SecretClient

client = SecretClient("https://kv-ai200.vault.azure.net/", DefaultAzureCredential())

_cache: dict[str, tuple[str, float]] = {}

def get_secret(name: str, ttl: int = 300) -> str:
    """バージョンなしで最新を取得し、TTL の間はキャッシュ（スロットリングとローテーション対策）"""
    value, fetched = _cache.get(name, (None, 0.0))
    if value is None or time.time() - fetched > ttl:
        value = client.get_secret(name).value
        _cache[name] = (value, time.time())
    return value
```

### 3.2 App Configuration（Python プロバイダー）

```python
from azure.identity import DefaultAzureCredential
from azure.appconfiguration.provider import load, SettingSelector, WatchKey

credential = DefaultAzureCredential()
config = load(
    endpoint="https://appcs-ai200.azconfig.io",
    credential=credential,
    selects=[SettingSelector(key_filter="RagApi:*", label_filter="prod")],
    trim_prefixes=["RagApi:"],
    keyvault_credential=credential,        # Key Vault 参照をアプリの ID で解決
    refresh_on=[WatchKey("sentinel")],     # センチネルキーの変更で全体を再読み込み
    refresh_interval=30,                   # 既定 30 秒
    feature_flag_enabled=True,
)

def handle_request():
    config.refresh()                       # 間隔が過ぎていればセンチネルを確認
    top_k = int(config["Search:TopK"])
    api_key = config["OpenAI:ApiKey"]      # 実体は Key Vault のシークレット
```

```bash
az appconfig kv set -n appcs-ai200 --key RagApi:Search:TopK --value 5 --label prod
az appconfig kv set-keyvault -n appcs-ai200 --key RagApi:OpenAI:ApiKey --label prod \
  --secret-identifier https://kv-ai200.vault.azure.net/secrets/openai-key
az appconfig feature set -n appcs-ai200 --feature HybridSearch --label prod
az appconfig kv set -n appcs-ai200 --key sentinel --value 2   # 最後に更新
az appconfig snapshot create -n appcs-ai200 --snapshot-name release-2026-10 \
  --filters '{"key":"RagApi:*","label":"prod"}'
```

### 3.3 OpenTelemetry（Python）

```python
import logging
from azure.monitor.opentelemetry import configure_azure_monitor
from opentelemetry import trace
from opentelemetry.trace import SpanKind, Status, StatusCode

# APPLICATIONINSIGHTS_CONNECTION_STRING を環境変数で渡す。service.name は OTEL_SERVICE_NAME でも可
configure_azure_monitor(logger_name="rag-api")

tracer = trace.get_tracer(__name__)
logger = logging.getLogger("rag-api")

def answer(question: str) -> str:
    with tracer.start_as_current_span("rag.answer", kind=SpanKind.INTERNAL) as span:
        span.set_attribute("rag.question_length", len(question))
        with tracer.start_as_current_span("rag.retrieve") as retrieve:
            docs = search(question)                       # DB 呼び出しは自動計装で dependencies に
            retrieve.set_attribute("rag.top_k", len(docs))
        try:
            result = call_llm(question, docs)
            span.add_event("llm.completed", {"tokens": result.tokens})
            return result.text
        except Exception as ex:
            span.record_exception(ex)                     # exceptions テーブルへ
            span.set_status(Status(StatusCode.ERROR))
            logger.error("LLM call failed")               # traces テーブルへ
            raise
```

.NET の場合:

```csharp
builder.Services.AddOpenTelemetry().UseAzureMonitor();
private static readonly ActivitySource Source = new("RagApi");
using var activity = Source.StartActivity("rag.retrieve");   // スパン = Activity
activity?.SetTag("rag.top_k", 5);
```

### 3.4 KQL の定番クエリ

```kusto
// 1. 操作ごとの件数・平均・p95（直近 1 時間）
requests
| where timestamp > ago(1h)
| summarize count(), avg(duration), p95 = percentile(duration, 95) by name
| order by p95 desc
```

```kusto
// 2. 失敗率の推移（5 分ごと）
requests
| where timestamp > ago(24h)
| summarize total = count(), failed = countif(success == false) by bin(timestamp, 5m)
| extend failureRate = round(100.0 * failed / total, 2)
| render timechart
```

```kusto
// 3. 遅い外部呼び出し（DB・LLM）のトップ
dependencies
| where timestamp > ago(1h)
| summarize p95 = percentile(duration, 95), calls = count() by target, type
| top 10 by p95 desc
```

```kusto
// 4. 失敗したリクエストと例外を operation_Id で結合
requests
| where timestamp > ago(1h) and success == false
| join kind=inner (exceptions | where timestamp > ago(1h)) on operation_Id
| project timestamp, name, resultCode, type, outerMessage, operation_Id
```

```kusto
// 5. 1 つのトレースをサービスをまたいで追う
union requests, dependencies, exceptions, traces
| where operation_Id == "<trace-id>"
| project timestamp, itemType, cloud_RoleName, name, duration, success, message
| order by timestamp asc
```

```kusto
// 6. カスタム属性（customDimensions）で集計
dependencies
| where name == "rag.retrieve"
| extend topK = toint(customDimensions["rag.top_k"])
| summarize avg(topK), avg(duration) by bin(timestamp, 1h)
```

```kusto
// 7. ワークスペースのテーブル名で書く場合
AppRequests
| where TimeGenerated > ago(1h)
| summarize p95 = percentile(DurationMs, 95) by AppRoleName, Name
```

```kusto
// 8. Container Apps: 直近のエラーログ
ContainerAppConsoleLogs_CL
| where TimeGenerated > ago(30m) and Log_s has "error"
| project TimeGenerated, ContainerAppName_s, RevisionName_s, Log_s
| order by TimeGenerated desc
```

```kusto
// 9. AKS: 再起動が多い Pod
KubePodInventory
| where TimeGenerated > ago(1h)
| summarize restarts = max(ContainerRestartCount) by Name, Namespace
| where restarts > 3
```

---

## 4. 判断ポイント（要件 → 選択）

| 要件 | 選ぶもの |
|---|---|
| アプリがシークレットを読むだけ | `Key Vault Secrets User`（Reader では値を読めない） |
| 誤って削除されたシークレットを確実に復元できるようにし、悪意ある完全消去も防ぎたい | 論理的な削除（常に有効）＋**消去保護** |
| シークレットの期限前に自動でローテーション | Event Grid（`SecretNearExpiry`）→ Azure Functions で新バージョンを作成 |
| 暗号鍵を定期的に自動ローテーション | キーのローテーションポリシー |
| ローテーション後も再起動せずに新しい値を使う | バージョンなしの URI ＋ キャッシュの TTL で再取得 |
| Key Vault の 429 が出る | アプリ側でシークレットをキャッシュ、指数バックオフ |
| 複数のアプリで同じ権限の ID を使いたい | ユーザー割り当てマネージド ID |
| 環境ごとに設定値を切り替えたい | App Configuration のラベル |
| 新機能を 10% のユーザーにだけ公開 | 機能フラグ＋ターゲットフィルター |
| 複数の設定を一貫性を保って更新し、アプリに反映 | センチネルキー＋動的リフレッシュ |
| リリース時点の構成を固定して再現・ロールバック | スナップショット |
| 設定とシークレットを 1 か所から読みたい | App Configuration の Key Vault 参照（値はアプリが Key Vault から読む） |
| ベンダーに依存しない計装で Azure Monitor に送りたい | OpenTelemetry ＋ Azure Monitor Distro |
| サービス間で 1 つのトレースとしてつなげたい | コンテキスト伝搬（`traceparent`）。計装ライブラリ / Azure SDK が自動で行う |
| アプリケーションマップでサービス名がわかりにくい | `service.name`（→ `cloud_RoleName`）を設定 |
| 独自の処理（検索・再ランク付け）の時間を測りたい | カスタムスパン（`start_as_current_span`）と属性 |
| p95 の遅延を 5 分ごとにグラフ化 | `summarize percentile(duration, 95) by bin(timestamp, 5m) | render timechart` |
| 失敗が一定数を超えたら通知 | ログ検索アラート（KQL）＋ アクショングループ |

## 5. ひっかけポイント

- **`Key Vault Reader` ではシークレットの値を読めない**（読むのは `Key Vault Secrets User`）。
- 消去保護は**既定では無効**で、**一度有効にすると無効にできない**。論理的な削除は既定で有効・無効化不可（7〜90 日、既定 90 日。保持期間は作成時にしか決められない）。
- OpenTelemetry のディストロの既定サンプリングは**1 秒あたり 5 トレース**。トレースが少ししか見えないときはサンプリングを疑う。
- **Key Vault はシークレットを自動ローテーションしない**（キーはポリシーで自動化できる）。
- App Configuration の Key Vault 参照では、**App Configuration ではなくアプリの ID** に Key Vault の権限が必要。
- 動的リフレッシュは、**センチネルキーを最後に更新**しないと一部だけ反映された状態になりうる。
- `refresh()` を呼ばないと（Python など）、リフレッシュ間隔が過ぎても更新されない。
- OpenTelemetry の **SERVER スパンは `requests`、CLIENT スパンは `dependencies`** になる。
- 接続文字列は **`APPLICATIONINSIGHTS_CONNECTION_STRING`**。
- 同じアプリで 2 つのディストロ（Azure Monitor Distro と Microsoft OpenTelemetry Distro）を**同時に初期化しない**。
- KQL の `has` は単語単位で高速、`contains` は部分文字列で遅い。
- `requests`（`timestamp`、`duration`）と `AppRequests`（`TimeGenerated`、`DurationMs`）で列名が違う。
- `join` の既定は `innerunique`（左側の重複を除く）。

## 6. 確認問題

<details><summary>Q1. Container Apps のアプリがマネージド ID で Key Vault のシークレットを読む。最小権限のロールは？</summary>

**答え**: Key Vault Secrets User（ボールトまたは個々のシークレットのスコープ）。
</details>

<details><summary>Q2. データベースのパスワードを 90 日ごとに自動でローテーションしたい。</summary>

**答え**: シークレットに有効期限を設定し、Event Grid の `Microsoft.KeyVault.SecretNearExpiry` イベントで Azure Functions を起動。関数が DB 側でパスワードを変更し、Key Vault に新しいバージョンとして保存する。アプリはバージョンなしで参照し、キャッシュの TTL ごとに再取得。
</details>

<details><summary>Q3. App Configuration の値を 3 つ変更したら、アプリが一部だけ新しい値を使っている時間帯があった。どうすべきか。</summary>

**答え**: センチネルキーだけを監視（`refresh_on=[WatchKey("sentinel")]`）し、他のキーをすべて更新した後に最後にセンチネルを更新する。センチネルの変化で全体を一度に再読み込みするので一貫性が保てる。
</details>

<details><summary>Q4. App Configuration の Key Vault 参照を使ったら、アプリで「403 Forbidden」になる。App Configuration の Data Reader は付与済み。</summary>

**答え**: Key Vault の値はアプリが自分の ID で読むので、アプリの ID に Key Vault の `Key Vault Secrets User` が必要。
</details>

<details><summary>Q5. フロントエンド（Container Apps）→ API（Functions）→ Service Bus → ワーカーの処理を 1 つのトレースとして見たい。何が必要か。</summary>

**答え**: 各サービスを OpenTelemetry（Azure Monitor Distro）で計装し、同じ Application Insights（またはワークスペース）に送る。コンテキスト（`traceparent`）は HTTP と Azure SDK（Service Bus のメッセージプロパティ）で自動伝搬される。各サービスに `service.name` を設定。
</details>

<details><summary>Q6. RAG の「検索」と「再ランク付け」にかかる時間を個別に測りたい。</summary>

**答え**: `tracer.start_as_current_span("rag.retrieve")` などでカスタムスパンを作り、属性（件数など）を付ける。Application Insights では依存関係（`dependencies`）として表示される。
</details>

<details><summary>Q7. 直近 24 時間で、操作名ごとの p95 応答時間が 2 秒を超えるものを出す KQL は？</summary>

**答え**:

```kusto
requests
| where timestamp > ago(24h)
| summarize p95 = percentile(duration, 95) by name
| where p95 > 2000
| order by p95 desc
```

（`duration` はミリ秒）
</details>

<details><summary>Q8. 失敗したリクエストに対応する例外のメッセージを一覧したい。結合キーは？</summary>

**答え**: `operation_Id`（トレース ID）。`requests | where success == false | join kind=inner exceptions on operation_Id`。
</details>

## 7. チェックリスト

- [ ] システム割り当てとユーザー割り当てのマネージド ID を使い分けられる
- [ ] `DefaultAzureCredential` の仕組みを説明できる
- [ ] Key Vault の主なロール（Secrets User / Officer / Reader）の違いを言える
- [ ] 論理的な削除（7〜90 日、既定 90、作成時のみ設定）と消去保護（既定で無効、有効化後は無効化不可）を説明できる
- [ ] OpenTelemetry のサンプリングの既定（5 トレース / 秒）と設定方法を言える
- [ ] シークレットのローテーションの仕組み（Event Grid ＋ Functions）とキーのローテーションポリシーを説明できる
- [ ] バージョンなしの URI とキャッシュでローテーションに追従するコードを書ける
- [ ] App Configuration のラベル、機能フラグ、Key Vault 参照、センチネルキー、スナップショットを説明できる
- [ ] App Configuration と Key Vault に何を置くか判断できる
- [ ] スパン、属性、イベント、ステータス、SpanKind、コンテキスト伝搬を説明できる
- [ ] Python の `configure_azure_monitor()` とカスタムスパンのコードを書ける
- [ ] OpenTelemetry のシグナルと Application Insights のテーブルの対応を言える
- [ ] `where` / `summarize` / `bin` / `percentile` / `join` / `render` を使った KQL を書ける
- [ ] クラシック名とワークスペースのテーブル名・列名の違いを説明できる
- [ ] ログ検索アラートとメトリックアラートの違いを言える

## 8. 公式リファレンス

- [Azure Key Vault overview](https://learn.microsoft.com/azure/key-vault/general/overview)
- [Soft-delete overview](https://learn.microsoft.com/azure/key-vault/general/soft-delete-overview)
- [Automate the rotation of a secret](https://learn.microsoft.com/azure/key-vault/secrets/tutorial-rotation)
- [Azure Key Vault RBAC guide](https://learn.microsoft.com/azure/key-vault/general/rbac-guide)
- [Azure App Configuration overview](https://learn.microsoft.com/azure/azure-app-configuration/overview)
- [Dynamic configuration in Python](https://learn.microsoft.com/azure/azure-app-configuration/enable-dynamic-configuration-python)
- [Key Vault references in App Configuration](https://learn.microsoft.com/azure/azure-app-configuration/use-key-vault-references-dotnet-core)
- [Feature management](https://learn.microsoft.com/azure/azure-app-configuration/concept-feature-management) / [Snapshots](https://learn.microsoft.com/azure/azure-app-configuration/concept-snapshots)
- [Enable OpenTelemetry in Application Insights](https://learn.microsoft.com/azure/azure-monitor/app/opentelemetry-enable)
- [Add and modify OpenTelemetry](https://learn.microsoft.com/azure/azure-monitor/app/opentelemetry-add-modify)
- [Kusto Query Language overview](https://learn.microsoft.com/kusto/query/)
- [Application Insights telemetry data model](https://learn.microsoft.com/azure/azure-monitor/app/data-model-complete)
