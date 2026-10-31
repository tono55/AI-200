# 分野 2-a: Develop AI solutions by using Azure Cosmos DB for NoSQL

> 分野 2 全体の配点: 30–35%（詳細見出しは 25–30%）
> 対応する公式項目: 2.1〜2.4 / Learn ラーニングパス: #4 Develop AI solutions with Azure Cosmos DB for NoSQL

## 0. 出題範囲

| ID | 原文 | 和訳 |
|---|---|---|
| 2.1 | Connect to Azure Cosmos DB for NoSQL by using the SDK and run queries | SDK で接続しクエリを実行する |
| 2.2 | Optimize query performance and Request Units (RUs) consumption by using indexing policies and consistency levels | インデックスポリシーと整合性レベルで性能と RU 消費を最適化する |
| 2.3 | Store and retrieve embeddings and execute vector similarity search for semantic retrieval | 埋め込みを保存・取得し、ベクトル類似検索を実行する |
| 2.4 | Implement a change feed processor to detect and handle new or updated items | 変更フィードプロセッサで新規・更新アイテムを処理する |

## 1. 全体像

Cosmos DB は RAG の**ドキュメントストア兼ベクトルストア**として使います。文書（チャンク）と埋め込みベクトルとメタデータを
**同じ JSON アイテム**に入れ、1 回のクエリで「メタデータで絞り込み＋ベクトルで並べ替え」ができます。

```
文書の追加・更新 ─▶ Cosmos DB コンテナ ─(変更フィード)─▶ 変更フィードプロセッサ / Functions
                         ▲                                  │ 埋め込みを生成して書き戻す
                         └──────────────────────────────────┘
ユーザーの質問 ─▶ 埋め込み ─▶ SELECT TOP k ... ORDER BY VectorDistance(...) ─▶ LLM へ
```

**Cosmos DB を選ぶ場面**: グローバル分散、無制限に近いスケール、スキーマレスな JSON、ミリ秒単位の読み書き、
運用データと埋め込みを同じ場所で扱いたいとき。

---

## 2. 重要概念

### 2.1 リソースモデルとパーティション

| 用語 | 内容 |
|---|---|
| アカウント → データベース → **コンテナ** → アイテム | コンテナがスケールと課金の単位 |
| **パーティションキー** | アイテムを論理パーティションに分けるプロパティ（例: `/tenantId`）。**作成後は変更不可** |
| 論理パーティション | 同じキー値のアイテムの集まり。**最大 20 GB** |
| アイテムの最大サイズ | **2 MB** |
| 良いパーティションキー | 値の種類が多く（高カーディナリティ）、読み書きが均等に分散し、よく使うクエリのフィルターに含まれるもの |
| **ポイント読み取り** | `id` ＋パーティションキーでの読み取り。**最も安い**（1 KB のアイテムで **1 RU**） |
| クロスパーティションクエリ | フィルターにパーティションキーがないクエリ。全パーティションに分散するので RU と遅延が増える |

### 2.2 スループットと RU

| 方式 | 特徴 | 向いている場面 |
|---|---|---|
| プロビジョニング（手動） | RU/s を固定で確保 | 負荷が安定している |
| **プロビジョニング（自動スケール）** | 最大 RU/s を決めると、**最大値の 10%〜100%** の範囲で自動調整 | 負荷の変動が大きい |
| **サーバーレス** | 使った RU だけ課金 | 開発・テスト、断続的なトラフィック |
| Free Tier | アカウントあたり 1000 RU/s と 25 GB まで無料 | 学習 |

- スループットは**データベース単位（共有）**か**コンテナ単位（専用）**で設定する。
- 上限を超えると **HTTP 429（Too Many Requests）**。SDK は `x-ms-retry-after-ms` に従って自動で再試行する。
- 各レスポンスの **`x-ms-request-charge`** ヘッダーで消費 RU を確認できる（SDK: .NET は `response.RequestCharge`）。
- RU を増やす要因: アイテムのサイズ、インデックス対象のプロパティ数、整合性レベル（強い整合性ほど読み取りが高い）、クロスパーティション、クエリの複雑さ。

### 2.3 SDK での接続と認証（2.1）

| 項目 | 内容 |
|---|---|
| Python パッケージ | `azure-cosmos`（`CosmosClient`）＋ `azure-identity`（`DefaultAzureCredential`） |
| .NET パッケージ | `Microsoft.Azure.Cosmos`（`CosmosClient`） |
| **クライアントは使い回す** | `CosmosClient` は**アプリ全体でシングルトン**にする（接続やメタデータのキャッシュを再利用） |
| 認証（推奨） | **Microsoft Entra ID**。データプレーン RBAC の組み込みロール **Cosmos DB Built-in Data Contributor**（読み書き）/ **Built-in Data Reader**（読み取り）を `az cosmosdb sql role assignment create` で割り当てる |
| 注意 | データプレーン RBAC では**データベースやコンテナの作成はできない**（管理操作は ARM / コントロールプレーン側の権限） |
| キー認証 | 主キー / 読み取り専用キー。ローカル認証を無効化（`disableLocalAuth`）して Entra ID のみにできる |
| 接続モード（.NET） | **Direct**（既定・高速、TCP）/ Gateway（HTTPS 443 のみ通るファイアウォール環境向け） |
| 優先リージョン | `preferred_locations` / `ApplicationPreferredRegions` で近いリージョンから読む |

**クエリ（NoSQL の SQL 構文）**

```sql
SELECT c.id, c.title, c.category
FROM c
WHERE c.tenantId = @tenant AND ARRAY_CONTAINS(c.tags, @tag)
ORDER BY c.updatedAt DESC
OFFSET 0 LIMIT 20
```

- **パラメーター化クエリ**（`@name`）を使う（インジェクション対策とクエリプランの再利用）。
- 結果は**ページング**（継続トークン）で返る。
- アイテム内の配列を展開するのは `JOIN`（アイテムをまたぐ結合ではない）。

### 2.4 インデックスポリシーと整合性レベル（2.2）

**インデックスポリシー**

| 要素 | 内容 |
|---|---|
| 既定 | **すべてのプロパティを自動でインデックス**（`includedPaths: [{"path": "/*"}]`）、`indexingMode: consistent` |
| `excludedPaths` | クエリで使わないパス（大きな本文、**埋め込みベクトルの配列**など）を除外すると、**書き込み RU とストレージが下がる** |
| 範囲インデックス | 等価・範囲・`ORDER BY`（単一プロパティ）に使う既定のインデックス |
| **複合インデックス** | **複数プロパティの `ORDER BY`**、およびフィルター＋並べ替えの組み合わせに必要。順序（ASC / DESC）も一致させる |
| 空間インデックス | 地理情報 |
| **ベクトルインデックス** | `vectorIndexes`（後述） |
| フルテキストインデックス | `fullTextIndexes`（ハイブリッド検索用） |
| `indexingMode: none` | インデックスなし（キーバリューとしてだけ使う場合） |

**整合性レベル（強い → 弱い）**

| レベル | 保証 | 読み取りコスト | 用途 |
|---|---|---|---|
| Strong | 常に最新（線形化可能） | **2 倍**（クォーラム読み取り） | 金融など。複数リージョン書き込みでは不可 |
| Bounded staleness | 遅れは最大 K バージョン / T 秒まで | **2 倍** | グローバルで順序と鮮度の上限が必要 |
| **Session**（**既定**） | 同じセッション内で **自分の書き込みが読める**（read-your-writes） | 1 倍 | ほとんどのアプリ。チャット履歴など |
| Consistent prefix | 順序は保証（飛ばし読みなし）、遅れはありうる | 1 倍 | |
| Eventual | 順序も保証しない | 1 倍（最安） | いいね数など |

- アカウントの既定を、**リクエスト単位で弱める**ことはできる（**強めることはできない**）。
- Session 整合性は**セッショントークン**に依存する。別のクライアントインスタンスで読むなら、トークンを引き継ぐ必要がある。

### 2.5 ベクトル検索（2.3）

**2 つのポリシーをコンテナ作成時に定義する**

1. **コンテナのベクトル埋め込みポリシー**（`vectorEmbeddingPolicy`）

| プロパティ | 値 |
|---|---|
| `path` | 埋め込みを入れるプロパティ（例: `/embedding`） |
| `dataType` | `float32`（既定）/ `int8` / `uint8` など |
| `dimensions` | ベクトルの次元数（例: `text-embedding-3-small` なら 1536） |
| `distanceFunction` | `cosine`（既定）/ `dotproduct` / `euclidean` |

2. **インデックスポリシーのベクトルインデックス**（`indexingPolicy.vectorIndexes`）

| 種類 | 探索方法 | 最大次元 | 向いている規模 |
|---|---|---|---|
| `flat` | 総当たり（**正確**、リコール 100%） | **505** | ごく小規模 |
| `quantizedFlat` | 圧縮したベクトルを総当たり（ほぼ正確） | **4,096** | 物理パーティションあたり**約 5 万ベクトル以下** |
| **`diskANN`** | DiskANN による近似最近傍（**高速・低 RU**） | **4,096** | 物理パーティションあたり **5 万ベクトル超** |

- 埋め込みのパスは**通常のインデックスから除外**（`excludedPaths` に `/embedding/*`）する。除外しないと書き込み RU が大きく増える。
- ベクトルポリシーとベクトルインデックスは**作成後に変更できない**とされている（変えるなら新しいコンテナを作って移行）。
- アカウント側でベクトル検索の機能（`EnableNoSQLVectorSearch`）を有効にしておく必要がある。
- `quantizedFlat` / `diskANN` は一定数（約 1,000 件）のベクトルが入るまでは量子化されず、総当たりで動く。

**クエリ: `VectorDistance()`**

```sql
SELECT TOP 5 c.id, c.chunk, VectorDistance(c.embedding, @queryVector) AS score
FROM c
WHERE c.tenantId = @tenant AND c.docType = 'manual'      -- メタデータで絞り込み
ORDER BY VectorDistance(c.embedding, @queryVector)        -- 類似度順
```

- **必ず `TOP n` を付ける**（付けないと全件を評価して RU が非常に大きくなる）。
- `ORDER BY VectorDistance(...)` は**似ている順**に並ぶ（cosine / dotproduct は値が大きいほど似ている、euclidean は小さいほど似ている。並び順は自動で正しくなる）。
- `WHERE` でパーティションキーを指定すると、検索が 1 パーティションに絞られ RU が下がる。
- 総当たりを強制したい場合は `VectorDistance(c.embedding, @q, true)`。
- **ハイブリッド検索**: フルテキストポリシーとインデックスを定義し、`ORDER BY RANK RRF(VectorDistance(c.embedding, @q), FullTextScore(c.text, @keywords))` で、ベクトルとキーワードの順位を **RRF（Reciprocal Rank Fusion）** で統合する。

### 2.6 変更フィード（2.4）

| 項目 | 内容 |
|---|---|
| 何が流れるか | コンテナへの**挿入と更新**（既定の「最新バージョン」モード）。同じアイテムの途中の更新は**最新の状態だけ**になることがある |
| **削除は流れない**（最新バージョンモード） | 論理削除フラグ（`isDeleted: true`）を立てて更新し、**TTL** で後から物理削除するのが定番 |
| 全バージョンと削除モード | 中間の変更と削除も取れる。**継続的バックアップ**が必要 |
| 順序 | **論理パーティション内**では順序が保証される。パーティションをまたぐ順序は保証されない |
| **変更フィードプロセッサ** | 監視対象コンテナ（monitored）の変更を、**リースコンテナ**（lease）で進捗を記録しながら処理するライブラリ（.NET / Java） |
| スケールアウト | 同じプロセッサ名で**インスタンス名だけ変えて**複数起動すると、リースが自動で分配され並列処理される |
| 少なくとも 1 回 | 処理が失敗するとリースは進まず、同じ変更が再配信される。**処理は冪等**にする |
| 開始位置 | 既定は「今から」。`WithStartTime` / 最初から（beginning）を指定可能 |
| Azure Functions | **Cosmos DB トリガー**が内部で変更フィードプロセッサを使う。`leases` コンテナを使う（`CreateLeaseContainerIfNotExists`） |
| プル型 | Python SDK などは `query_items_change_feed` で自分で継続トークンを管理して読む |

**AI での典型パターン**: 文書が更新されたら変更フィードで検知 → 埋め込みを再計算 → アイテムに書き戻す（または別のベクトルストアへ反映）。
書き戻しでまた変更フィードが発火するので、**本文のハッシュを持たせて変化がなければスキップ**するなど、無限ループを防ぐ。

---

## 3. 実装パターン

### 3.1 アカウントの準備（CLI）

```bash
az cosmosdb create -g rg-ai200 -n cosmos-ai200 --capabilities EnableNoSQLVectorSearch
az cosmosdb sql database create -g rg-ai200 -a cosmos-ai200 -n ragdb

# アプリのマネージド ID にデータプレーンの読み書きロールを付与
az cosmosdb sql role assignment create -g rg-ai200 -a cosmos-ai200 \
  --role-definition-name "Cosmos DB Built-in Data Contributor" \
  --principal-id <principalId> --scope "/"
```

### 3.2 Python: コンテナ作成（ベクトルポリシー付き）・書き込み・検索

```python
from azure.cosmos import CosmosClient, PartitionKey
from azure.identity import DefaultAzureCredential

client = CosmosClient("https://cosmos-ai200.documents.azure.com:443/",
                      credential=DefaultAzureCredential())   # アプリ全体で 1 つ
db = client.get_database_client("ragdb")

vector_embedding_policy = {
    "vectorEmbeddings": [{
        "path": "/embedding",
        "dataType": "float32",
        "distanceFunction": "cosine",
        "dimensions": 1536,
    }]
}
indexing_policy = {
    "indexingMode": "consistent",
    "includedPaths": [{"path": "/*"}],
    "excludedPaths": [{"path": "/embedding/*"}, {"path": "/\"_etag\"/?"}],
    "vectorIndexes": [{"path": "/embedding", "type": "diskANN"}],
    "compositeIndexes": [[
        {"path": "/category", "order": "ascending"},
        {"path": "/updatedAt", "order": "descending"},
    ]],
}
# コンテナ作成は管理操作。データプレーン RBAC だけでは実行できない点に注意
container = db.create_container_if_not_exists(
    id="chunks",
    partition_key=PartitionKey(path="/tenantId"),
    indexing_policy=indexing_policy,
    vector_embedding_policy=vector_embedding_policy,
)

container.upsert_item({
    "id": "doc1-chunk3",
    "tenantId": "contoso",
    "category": "manual",
    "chunk": "Reset the device by holding the power button for 10 seconds.",
    "embedding": embedding,          # 1536 個の float
})

# ポイント読み取り（最も安い）
item = container.read_item(item="doc1-chunk3", partition_key="contoso")

# ベクトル検索 + メタデータフィルター
results = container.query_items(
    query="""
        SELECT TOP @k c.id, c.chunk, VectorDistance(c.embedding, @q) AS score
        FROM c
        WHERE c.category = @category
        ORDER BY VectorDistance(c.embedding, @q)
    """,
    parameters=[
        {"name": "@k", "value": 5},
        {"name": "@q", "value": query_embedding},
        {"name": "@category", "value": "manual"},
    ],
    partition_key="contoso",          # パーティションを指定してクロスパーティションを避ける
)
for r in results:
    print(r["id"], r["score"])
```

### 3.3 .NET: 変更フィードプロセッサ

```csharp
Container monitored = client.GetContainer("ragdb", "chunks");
Container leases    = client.GetContainer("ragdb", "leases");   // パーティションキー /id

ChangeFeedProcessor processor = monitored
    .GetChangeFeedProcessorBuilder<Chunk>(
        processorName: "embedding-refresh",
        onChangesDelegate: HandleChangesAsync)
    .WithInstanceName(Environment.MachineName)   // インスタンスごとに変える
    .WithLeaseContainer(leases)
    .Build();

await processor.StartAsync();

static async Task HandleChangesAsync(
    ChangeFeedProcessorContext context,
    IReadOnlyCollection<Chunk> changes,
    CancellationToken ct)
{
    foreach (var chunk in changes)
    {
        if (chunk.ContentHash == chunk.EmbeddedHash) continue;   // 書き戻しによる再発火を無視
        // 埋め込みを再計算して upsert（冪等に）
    }
}
```

### 3.4 Azure Functions の Cosmos DB トリガー（Python v2）

```python
import azure.functions as func
app = func.FunctionApp()

@app.cosmos_db_trigger(arg_name="docs", connection="CosmosConn",
                       database_name="ragdb", container_name="chunks",
                       lease_container_name="leases",
                       create_lease_container_if_not_exists=True)
def refresh_embeddings(docs: func.DocumentList):
    for d in docs:
        ...
```

---

## 4. 判断ポイント（要件 → 選択）

| 要件 | 選ぶもの |
|---|---|
| 1 件を最小 RU で取得 | `id` ＋パーティションキーでのポイント読み取り |
| `ORDER BY c.category, c.updatedAt DESC` がエラーになる / 遅い | **複合インデックス**を追加 |
| 書き込み RU が高い。埋め込みや長い本文は検索条件に使わない | `excludedPaths` で除外 |
| ユーザーが自分の書き込み直後に読めればよい。コストは最小に | **Session**（既定） |
| 世界中で常に最新値が必要（単一書き込みリージョン） | Strong（読み取り RU は 2 倍） |
| 数百万ベクトル、低遅延・低 RU の近似検索 | `diskANN` |
| 数千〜数万ベクトルで正確に近い結果が欲しい | `quantizedFlat`（ごく少数・低次元なら `flat`） |
| 3072 次元の埋め込みを使いたい | `quantizedFlat` か `diskANN`（`flat` は 505 次元まで） |
| キーワード一致と意味の近さを両方使う | フルテキスト＋ベクトルのハイブリッド検索（`RRF`） |
| テナントごとに検索範囲を限定 | パーティションキーをテナント ID にし、`WHERE` で指定 |
| 文書の更新をトリガーに埋め込みを更新 | 変更フィード（Functions の Cosmos DB トリガー、または変更フィードプロセッサ） |
| 削除も検知したい | 論理削除＋TTL、または全バージョンと削除モード（継続的バックアップが必要） |
| 変更処理を複数インスタンスで並列化 | 変更フィードプロセッサを**同じプロセッサ名・異なるインスタンス名**で複数起動 |
| 負荷の波が大きく、ピークに合わせた固定 RU は無駄 | 自動スケール |
| 開発環境で使った分だけ払いたい | サーバーレス |

## 5. ひっかけポイント

- **パーティションキーは後から変更できない。**
- `VectorDistance` の検索に **`TOP` を付け忘れると高コスト**。
- 埋め込みのパスを `excludedPaths` に入れ忘れると、書き込みのたびに巨大な配列がインデックスされる。
- `flat` の最大次元は **505**。1536 次元の埋め込みには使えない。
- Strong / Bounded staleness は**読み取り RU が 2 倍**。
- 整合性はリクエスト単位で**弱めることはできるが強めることはできない**。
- 変更フィードは**削除を流さない**（最新バージョンモード）。
- 変更フィードは**少なくとも 1 回**配信。処理は冪等に。
- リースコンテナを複数のプロセッサで共有する場合は**プロセッサ名を分ける**。
- 書き戻しで変更フィードが再発火する無限ループに注意。
- データプレーン RBAC（Built-in Data Contributor）では**データベース / コンテナを作れない**。
- `CosmosClient` を**リクエストごとに作らない**（シングルトン）。

## 6. 確認問題

<details><summary>Q1. 1 KB のアイテムを id とパーティションキーで読み取るときの RU は？</summary>

**答え**: 約 1 RU（ポイント読み取り）。クエリで同じアイテムを取るより安い。
</details>

<details><summary>Q2. 1536 次元の埋め込みを 1000 万件保存し、低遅延で上位 10 件を検索したい。ベクトルインデックスの種類は？</summary>

**答え**: `diskANN`。`flat` は 505 次元まで、`quantizedFlat` は総当たりなので大規模では RU と遅延が増える。
</details>

<details><summary>Q3. 書き込みの RU が想定より高い。アイテムには 3072 次元の埋め込みと長い本文があり、インデックスポリシーは既定のまま。対処は？</summary>

**答え**: 埋め込みのパス（`/embedding/*`）と本文などクエリで使わないパスを `excludedPaths` に追加する（ベクトルはベクトルインデックスで扱う）。
</details>

<details><summary>Q4. チャットアプリで、ユーザーが送信したメッセージを直後に自分の画面で確実に読めればよい。最もコストの低い整合性レベルは？</summary>

**答え**: Session（既定）。read-your-writes を保証し、読み取り RU は 1 倍。
</details>

<details><summary>Q5. `SELECT * FROM c ORDER BY c.category ASC, c.price DESC` が失敗する。対処は？</summary>

**答え**: `category ASC, price DESC` の複合インデックスをインデックスポリシーに追加する。
</details>

<details><summary>Q6. 製品マニュアルの更新時に、自動で埋め込みを再計算したい。サーバーレスで実装するなら？</summary>

**答え**: Azure Functions の Cosmos DB トリガー（内部で変更フィードとリースコンテナを使う）。更新した埋め込みの書き戻しで再発火しないよう、本文のハッシュなどで判定する。
</details>

<details><summary>Q7. 変更フィードプロセッサの処理が追いつかない。どうスケールするか。</summary>

**答え**: 同じプロセッサ名・同じリースコンテナで、インスタンス名だけ変えたプロセッサを追加で起動する。リース（パーティションの範囲）が自動で分配される。
</details>

<details><summary>Q8. 検索結果をテナントのデータだけに限定し、RU も下げたい。</summary>

**答え**: パーティションキーをテナント ID にし、クエリでパーティションキーを指定（`WHERE c.tenantId = @t` または SDK の `partition_key` 引数）して 1 パーティション内で検索する。
</details>

## 7. チェックリスト

- [ ] パーティションキーの選び方と、論理パーティション 20 GB / アイテム 2 MB の上限を言える
- [ ] ポイント読み取りとクエリの RU の違い、429 の扱いを説明できる
- [ ] 手動 / 自動スケール / サーバーレスを使い分けられる
- [ ] Entra ID 認証（Built-in Data Contributor）でクライアントを作れる
- [ ] パラメーター化クエリを書ける
- [ ] `excludedPaths` と複合インデックスの効果を説明できる
- [ ] 5 つの整合性レベルと既定（Session）、2 倍コストのレベルを言える
- [ ] ベクトル埋め込みポリシーの 4 項目（path / dataType / dimensions / distanceFunction）を書ける
- [ ] `flat` / `quantizedFlat` / `diskANN` の違いと次元の上限を言える
- [ ] `TOP` 付きの `VectorDistance` クエリとフィルターを書ける
- [ ] ハイブリッド検索（RRF）の仕組みを説明できる
- [ ] 変更フィードの性質（削除なし・パーティション内順序・少なくとも 1 回）を説明できる
- [ ] 変更フィードプロセッサの 4 要素（監視コンテナ・リースコンテナ・プロセッサ名・インスタンス名）を言える

## 8. 公式リファレンス

- [Vector search in Azure Cosmos DB for NoSQL](https://learn.microsoft.com/azure/cosmos-db/nosql/vector-search)
- [Index vector data](https://learn.microsoft.com/azure/cosmos-db/index-vector-data) / [Vector search performance tips](https://learn.microsoft.com/azure/cosmos-db/gen-ai/vector-search-performance-tips)
- [Hybrid search](https://learn.microsoft.com/azure/cosmos-db/gen-ai/hybrid-search)
- [Indexing policies](https://learn.microsoft.com/azure/cosmos-db/index-policy)
- [Consistency levels](https://learn.microsoft.com/azure/cosmos-db/consistency-levels)
- [Change feed processor](https://learn.microsoft.com/azure/cosmos-db/nosql/change-feed-processor)
- [Role-based access control with Microsoft Entra ID](https://learn.microsoft.com/azure/cosmos-db/nosql/security/how-to-grant-data-plane-role-based-access)
- Learn モジュール: Build queries / Implement vector search / Optimize query performance for Azure Cosmos DB for NoSQL
