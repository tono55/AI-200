# 分野 2-c: Integrate Azure Managed Redis in AI solutions

> 分野 2 全体の配点: 30–35%（詳細見出しは 25–30%）
> 対応する公式項目: 2.11、2.12 / Learn ラーニングパス: #6 Enhance AI solutions with Azure Managed Redis

## 0. 出題範囲

| ID | 原文 | 和訳 |
|---|---|---|
| 2.11 | Implement Azure Managed Redis data operations, including caching, expiration, and invalidation | データ操作（キャッシュ、有効期限、無効化）を実装する |
| 2.12 | Implement vector indexing to enable similarity search | 類似検索のためのベクトルインデックスを実装する |

ラーニングパスには「**イベントメッセージング（pub/sub と Redis Streams）**」のモジュールもあるので、あわせて押さえます。

## 1. 全体像

Redis は**メモリ上**で動くため、AI アプリでは次の用途で使われます。

| 用途 | 内容 |
|---|---|
| キャッシュ | DB や LLM 応答の結果を短時間保存し、遅延とコストを下げる |
| **セマンティックキャッシュ** | 質問の埋め込みで「似た質問」を探し、過去の LLM 応答を返す（LLM 呼び出しを減らす） |
| セッション / 会話履歴 | チャットの直近の履歴を TTL 付きで保持 |
| ベクトルストア（ホットインデックス） | 低遅延の類似検索。永続的な元データは Cosmos DB / PostgreSQL に置き、Redis を高速な検索層にする構成が多い |
| メッセージング | pub/sub（通知のブロードキャスト）、Streams（タスクキュー） |
| レート制限・カウンター | `INCR` + `EXPIRE` |

---

## 2. 重要概念

### 2.1 Azure Managed Redis（AMR）とは

| | **Azure Managed Redis** | Azure Cache for Redis（Basic / Standard / Premium） |
|---|---|---|
| エンジン | **Redis Enterprise**（1 ノードで複数シャード＋プロキシ） | コミュニティ版 Redis（シングルスレッド） |
| ホスト名 | `<name>.<region>.redis.azure.net` | `<name>.redis.cache.windows.net` |
| TLS ポート | **10000** | 6380 |
| CLI | `az redisenterprise` | `az redis` |
| Entra ID 認証 | **既定で有効** | 有効化が必要 |
| モジュール（RediSearch、RedisJSON など） | **使える（作成時のみ選択）** | 使えない |
| 今後 | 新規はこちらが推奨 | 既存サービスは廃止予定が発表済み（移行先が AMR） |

**レベル（SKU）**

| レベル | メモリ : vCPU | 用途 |
|---|---|---|
| Memory Optimized（M） | 8 : 1 | メモリ量が多く処理は少ない、開発・テスト |
| **Balanced**（B） | 4 : 1 | **標準的な選択** |
| Compute Optimized（X） | 2 : 1 | 最高のスループット・最低遅延 |
| Flash Optimized（A） | RAM + NVMe | 非常に大きく読み取り中心のデータを安く。**RediSearch 非対応** |

覚え方: **M8・B4・X2**。

**クラスタリングポリシー**

| ポリシー | 接続 | 特徴 |
|---|---|---|
| OSS | クライアントが各シャードに直接接続（クラスター対応クライアントが必要） | 最高スループット。**RediSearch と併用できない** |
| **Enterprise** | 1 つのエンドポイント。プロキシがコマンドを振り分ける | どのクライアントでも使える。**RediSearch に必要** |
| 非クラスター | シャーディングなし | **25 GB まで**。既存の非クラスターキャッシュからの移行用 |

**作成時に決めること（後から変えられない）**

- **モジュール**（RediSearch / RedisJSON / RedisBloom / RedisTimeSeries）は**作成時にしか追加できない**。
- RediSearch を使うなら **Enterprise クラスタリングポリシー** と **NoEviction** の追い出しポリシー。
- 高可用性（レプリカ）は後から無効化できない。無効にすると SLA がない（開発用）。
- **スケールダウンはできない**。

### 2.2 データ操作（2.11）

**主なデータ型とコマンド**

| 型 | 主なコマンド | AI での用途 |
|---|---|---|
| String | `SET key val EX 300`、`GET`、`SET key val NX PX 5000`、`INCR` | 応答キャッシュ、ロック、カウンター |
| Hash | `HSET`、`HGET`、`HGETALL` | オブジェクト、**ベクトル（バイナリ）を含むドキュメント** |
| List | `LPUSH`、`LRANGE`、`LTRIM` | 直近 N 件の会話履歴 |
| Set / Sorted Set | `SADD`、`ZADD`、`ZRANGE` | タグ、ランキング |
| JSON（RedisJSON） | `JSON.SET`、`JSON.GET` | 入れ子のドキュメント |
| Stream | `XADD`、`XREADGROUP`、`XACK` | タスクキュー |

**有効期限（Expiration）**

| コマンド | 内容 |
|---|---|
| `SET k v EX <秒>` / `PX <ミリ秒>` | 書き込みと同時に TTL を設定 |
| `EXPIRE k <秒>` / `PEXPIRE` / `EXPIREAT` | 既存キーに TTL を設定 |
| `TTL k` | 残り秒数。**-1 = TTL なし**、**-2 = キーが存在しない** |
| `PERSIST k` | TTL を外す |

- `SET` で値を上書きすると**TTL は消える**（`KEEPTTL` オプションを付けない限り）。
- TTL に**ランダムなばらつき（ジッター）**を足すと、大量のキーが同時に期限切れになる問題（キャッシュの一斉失効）を避けられる。

**キャッシュのパターン**

| パターン | 動き | 長所 / 短所 |
|---|---|---|
| **キャッシュアサイド**（Lazy loading） | 読み取り時にキャッシュを見て、なければ DB から取ってキャッシュに入れる（TTL 付き） | 最も一般的。初回はミス。古いデータは TTL か無効化で対処 |
| ライトスルー | 書き込み時に DB とキャッシュの両方を更新 | キャッシュが常に新しい。書き込みが遅くなる |
| ライトビハインド | キャッシュに書いて後で非同期に DB へ | 書き込みが速い。データ損失のリスク |

**無効化（Invalidation）**

| 方法 | 内容 |
|---|---|
| TTL | 一定時間で自然に消える（最も簡単） |
| **書き込み時に削除** | DB を更新したら `DEL` / `UNLINK`（次の読み取りで再読み込み） |
| バージョン付きキー | `product:42:v7` のようにキーを変え、古いキーは TTL で消える |
| イベント駆動 | 変更フィードや Event Grid / Service Bus のイベントでキーを削除。複数インスタンスのローカルキャッシュには pub/sub で通知 |
| キャッシュの殺到（stampede）対策 | `SET lock NX PX` で 1 つのリクエストだけが再計算する |

**追い出しポリシー（メモリが一杯になったとき）**

| ポリシー | 対象 |
|---|---|
| `volatile-lru` | **TTL が設定されたキー**から LRU で追い出す（TTL がないキーは追い出されない） |
| `allkeys-lru` / `allkeys-lfu` | すべてのキーから追い出す（純粋なキャッシュ向け） |
| `volatile-ttl` | 残り TTL が短いものから |
| **`noeviction`** | 追い出さず、書き込みをエラーにする（**RediSearch 使用時**、データを失いたくない場合） |

**クライアントのベストプラクティス**

- **接続を使い回す**（.NET は `ConnectionMultiplexer` をシングルトン、redis-py は接続プール）。
- TLS（ポート 10000）、タイムアウトと**指数バックオフ付きの再試行**。
- **`KEYS *` は本番で使わない**（全キーを走査してブロックする）。`SCAN` を使う。
- 大きな値（数百 KB 以上）を避ける。複数のコマンドは**パイプライン**でまとめる。
- 認証は **Microsoft Entra ID**（`redis-entraid` パッケージ、スコープ `https://redis.azure.com/.default`）。アクセスキーは無効化できる。

### 2.3 イベントメッセージング（ラーニングパスの範囲）

| | **pub/sub** | **Redis Streams** |
|---|---|---|
| 配信 | **ブロードキャスト**: 購読中の全員に届く | **コンシューマーグループ**内で 1 メッセージは 1 コンシューマーに（**協調的な分配**） |
| 永続性 | **なし**（購読していないと失われる） | **あり**（ストリームに残る。`MAXLEN` で切り詰め） |
| 確認応答 | なし | `XACK`。未確認は保留リスト（PEL）に残り、`XAUTOCLAIM` / `XCLAIM` で他のコンシューマーが引き取れる |
| 用途 | キャッシュ無効化の通知、リアルタイム通知 | 埋め込み生成などの**非同期タスクキュー** |
| コマンド | `PUBLISH`、`SUBSCRIBE`、`PSUBSCRIBE` | `XADD`、`XGROUP CREATE`、`XREADGROUP`、`XACK`、`XPENDING` |

> 厳密な配信保証・配信不能キュー・トランザクションが必要なら **Service Bus** を選ぶ（分野 3）。Redis Streams は低遅延・軽量なキュー。

### 2.4 ベクトルインデックス（2.12）

RediSearch モジュールの `FT.CREATE` でインデックスを作り、`FT.SEARCH` の **KNN** で検索します。

| 項目 | 値 |
|---|---|
| 保存先 | **HASH**（ベクトルは**バイナリ**: `np.float32` の `tobytes()`）または **JSON**（RedisJSON、ベクトルは数値の配列） |
| アルゴリズム | **`FLAT`**（総当たり・正確。小規模）/ **`HNSW`**（近似・高速。大規模） |
| 型 | `FLOAT32`（一般的）、`FLOAT64` など |
| 次元 | `DIM`（モデルと一致） |
| 距離 | `COSINE` / `L2` / `IP`（内積） |
| HNSW のパラメーター | `M`、`EF_CONSTRUCTION`、検索時の `EF_RUNTIME` |
| フィルター | `TAG`（カテゴリ、テナント）、`NUMERIC`（日付・価格）、`TEXT`（全文）フィールドと組み合わせたハイブリッドクエリ |
| 範囲検索 | `VECTOR_RANGE`（一定距離以内） |
| クエリの構文 | **`DIALECT 2`** が必要。ベクトルは `PARAMS` でバイト列として渡す |

**HASH と JSON の選び方**: メモリ効率と速度なら HASH（ベクトルをバイナリで保存）。入れ子のドキュメントや配列のフィルターが必要なら JSON。

**セマンティックキャッシュ**: 質問の埋め込みで KNN 検索 → 距離がしきい値以下なら保存済みの回答を返す → なければ LLM を呼び、質問の埋め込みと回答を TTL 付きで保存。

---

## 3. 実装パターン

### 3.1 作成

```bash
az extension add --upgrade --name redisenterprise
az redisenterprise create -g rg-ai200 -n redis-ai200 -l japaneast \
  --sku Balanced_B1 \
  --clustering-policy EnterpriseCluster \
  --eviction-policy NoEviction \
  --modules name=RediSearch --modules name=RedisJSON
```

### 3.2 接続とキャッシュアサイド（Python）

```python
import json, random
import redis
from redis_entraid.cred_provider import create_from_default_azure_credential

provider = create_from_default_azure_credential(("https://redis.azure.com/.default",))
r = redis.Redis(host="redis-ai200.japaneast.redis.azure.net", port=10000, ssl=True,
                credential_provider=provider, decode_responses=True)   # アプリで使い回す

def get_product(product_id: int) -> dict:
    key = f"product:{product_id}"
    cached = r.get(key)
    if cached:                                   # ヒット
        return json.loads(cached)
    product = load_product_from_db(product_id)   # ミス → DB
    r.set(key, json.dumps(product), ex=300 + random.randint(0, 60))   # TTL + ジッター
    return product

def update_product(product_id: int, data: dict) -> None:
    save_product_to_db(product_id, data)
    r.unlink(f"product:{product_id}")            # 書き込み時に無効化
```

### 3.3 Streams によるタスクキュー

```python
# 生産者
r.xadd("embed-jobs", {"doc_id": "42"}, maxlen=100_000, approximate=True)

# 消費者（グループ "workers" の "worker-1"）
try:
    r.xgroup_create("embed-jobs", "workers", id="0", mkstream=True)
except redis.ResponseError:
    pass  # 既に存在

while True:
    for stream, messages in r.xreadgroup("workers", "worker-1", {"embed-jobs": ">"}, count=10, block=5000) or []:
        for msg_id, fields in messages:
            embed_document(fields["doc_id"])
            r.xack("embed-jobs", "workers", msg_id)   # 処理後に確認応答
```

### 3.4 ベクトルインデックスと KNN 検索

```text
FT.CREATE idx:chunks ON HASH PREFIX 1 chunk:
  SCHEMA
    content   TEXT
    category  TAG
    tenant    TAG
    embedding VECTOR HNSW 6 TYPE FLOAT32 DIM 1536 DISTANCE_METRIC COSINE
```

```python
import numpy as np
from redis.commands.search.query import Query

r_bin = redis.Redis(host=..., port=10000, ssl=True, credential_provider=provider)  # バイナリを扱うので decode しない

r_bin.hset("chunk:doc1:3", mapping={
    "content": "Reset the device by holding the power button for 10 seconds.",
    "category": "manual",
    "tenant": "contoso",
    "embedding": np.array(embedding, dtype=np.float32).tobytes(),
})

q = (Query("(@tenant:{contoso} @category:{manual})=>[KNN 5 @embedding $vec AS score]")
     .sort_by("score")
     .return_fields("content", "score")
     .dialect(2))
res = r_bin.ft("idx:chunks").search(
    q, query_params={"vec": np.array(query_embedding, dtype=np.float32).tobytes()})
for doc in res.docs:
    print(doc.id, doc.score)       # COSINE の score は距離（小さいほど似ている）
```

> Python では RedisVL（`redisvl`）ライブラリでインデックス定義とセマンティックキャッシュを簡単に書くこともできます。

---

## 4. 判断ポイント（要件 → 選択）

| 要件 | 選ぶもの |
|---|---|
| ベクトル検索・全文検索を Redis で | In-memory のレベル（M / B / X）＋ **RediSearch** ＋ **Enterprise** ポリシー ＋ NoEviction |
| 検索は不要で最大スループット、クラスター対応クライアントあり | OSS ポリシー |
| 非常に大きく読み取り中心のキャッシュを安く | Flash Optimized（RediSearch 不可） |
| 既存インスタンスに RediSearch を追加したい | **できない** → 新しく作って移行 |
| 似た質問への LLM 呼び出しを減らしたい | セマンティックキャッシュ（ベクトル KNN ＋ しきい値 ＋ TTL） |
| DB の更新後に古いキャッシュを返さない | 書き込み時に `DEL` / `UNLINK`、または TTL を短く |
| 複数のアプリインスタンスにキャッシュ無効化を一斉通知 | pub/sub |
| 埋め込み生成ジョブを複数ワーカーで分担、処理済みを確認 | Streams ＋ コンシューマーグループ ＋ `XACK` |
| 配信不能キュー・重複検出・トランザクションが必要なキュー | Service Bus（Redis ではない） |
| 小規模で正確な類似検索 | `FLAT` |
| 大規模・低遅延の類似検索 | `HNSW` |
| ベクトルを省メモリで保存 | HASH ＋ バイナリ（`FLOAT32`） |
| 永続的な元データも含めて 1 か所で管理したい | Cosmos DB / PostgreSQL（Redis はキャッシュ・ホットインデックス） |

## 5. ひっかけポイント

- `az redis create` は **Azure Cache for Redis** を作る。AMR は **`az redisenterprise create`**。
- AMR の TLS ポートは **10000**（Azure Cache for Redis は 6380）。
- **モジュールは作成時のみ**。RediSearch は **Enterprise ポリシー必須**、OSS ポリシーとは併用不可、Flash Optimized では使えない。
- `SET` で上書きすると TTL が消える。
- `TTL` の戻り値 -1 は「期限なし」、-2 は「キーなし」。
- `volatile-lru` では **TTL のないキーは追い出されない**（メモリ不足でエラーになりうる）。
- pub/sub は**永続化されない**。オフラインの購読者は取りこぼす。
- KNN クエリには **`DIALECT 2`** と `PARAMS` が必要。ベクトルは**バイト列**で渡す（HASH の場合）。
- COSINE の `score` は**距離**（小さいほど似ている）。
- 本番で `KEYS` を使わない。

## 6. 確認問題

<details><summary>Q1. AMR を作成後、ベクトル検索を使いたくなった。RediSearch を有効にするには？</summary>

**答え**: 既存インスタンスには追加できない。RediSearch（Enterprise クラスタリングポリシー、NoEviction）を指定して新しいインスタンスを作り、データを移行する。
</details>

<details><summary>Q2. 商品情報を Redis にキャッシュしている。DB で価格を更新した直後に古い価格が表示される問題を最小限の遅延で解決したい。</summary>

**答え**: 更新処理の中で該当キャッシュキーを削除する（`DEL` / `UNLINK`）。次の読み取りでキャッシュアサイドにより最新値が読み込まれる。
</details>

<details><summary>Q3. 埋め込み生成のタスクを 5 台のワーカーで分担し、ワーカーが落ちても未処理のタスクを他が引き継げるようにしたい（Redis で）。</summary>

**答え**: Redis Streams とコンシューマーグループ。`XREADGROUP` で受け取り、処理後に `XACK`。未確認のメッセージは保留リストに残り、`XAUTOCLAIM` で他のワーカーが引き取る。
</details>

<details><summary>Q4. 同じ意味の質問（言い回し違い）への LLM の呼び出しを減らしたい。</summary>

**答え**: セマンティックキャッシュ。質問の埋め込みで KNN 検索し、距離がしきい値以下なら保存済みの回答を返す。なければ LLM を呼び、埋め込みと回答を TTL 付きで保存。
</details>

<details><summary>Q5. 1000 万件の 1536 次元ベクトルで低遅延の検索をしたい。`FT.CREATE` のアルゴリズムは？</summary>

**答え**: `HNSW`（近似）。`FLAT` は総当たりで大規模では遅い。
</details>

<details><summary>Q6. メモリが一杯になり書き込みがエラーになった。キーには TTL を付けていない。追い出しポリシーは `volatile-lru`。なぜか。</summary>

**答え**: `volatile-lru` は TTL が設定されたキーだけを追い出すため、追い出せるキーがなかった。キャッシュ用途ならキーに TTL を付けるか、（RediSearch を使わないなら）`allkeys-lru` を検討。
</details>

## 7. チェックリスト

- [ ] AMR と Azure Cache for Redis の違い（エンジン、ポート、CLI、モジュール）を言える
- [ ] 4 つのレベルとメモリ : vCPU 比を言える
- [ ] 3 つのクラスタリングポリシーと RediSearch の条件を言える
- [ ] 作成時にしか決められない設定を言える
- [ ] キャッシュアサイドを TTL と無効化つきで書ける
- [ ] `TTL` の戻り値、`SET` での TTL リセットを説明できる
- [ ] 追い出しポリシーの違いを説明できる
- [ ] pub/sub と Streams の違い（ブロードキャスト vs 協調分配、永続性、確認応答）を説明できる
- [ ] `FT.CREATE` の VECTOR フィールド（アルゴリズム、型、次元、距離）を書ける
- [ ] `FT.SEARCH` の KNN ＋ TAG フィルターのクエリを書ける
- [ ] セマンティックキャッシュの流れを説明できる

## 8. 公式リファレンス

- [What is Azure Managed Redis?](https://learn.microsoft.com/azure/redis/overview)
- [Azure Managed Redis architecture](https://learn.microsoft.com/azure/redis/architecture)
- [Use Redis modules with Azure Managed Redis](https://learn.microsoft.com/azure/redis/redis-modules)
- [About vector embeddings and vector search in Azure Managed Redis](https://learn.microsoft.com/azure/redis/overview-vector-similarity)
- [Tutorial: Use Azure Managed Redis as a semantic cache](https://learn.microsoft.com/azure/redis/tutorial-semantic-cache)
- [Redis: Vector search / Streams / Pub/Sub（redis.io）](https://redis.io/docs/latest/develop/)
- Learn モジュール: Implement data operations / event messaging / vector storage in Azure Managed Redis
