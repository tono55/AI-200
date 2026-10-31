# 分野 2-b: Develop AI solutions by using Azure Database for PostgreSQL

> 分野 2 全体の配点: 30–35%（詳細見出しは 25–30%）
> 対応する公式項目: 2.5〜2.10 / Learn ラーニングパス: #5 Develop AI solutions with Azure Database for PostgreSQL
> **項目数が 6 つと最も多いトピック**です。AZ-204 にはなかった新範囲なので重点的に。

## 0. 出題範囲

| ID | 原文 | 和訳 |
|---|---|---|
| 2.5 | Connect and query Azure Database for PostgreSQL by using SDKs | SDK で接続しクエリを実行する |
| 2.6 | Model schemas and implement indexing strategies, including designing tables and choosing appropriate data types | スキーマを設計しインデックス戦略を実装する（テーブル設計とデータ型の選択） |
| 2.7 | Implement indexing strategies, including optimizing query latency and reducing pgvector compute overhead | インデックス戦略（クエリ遅延の最適化、pgvector の計算負荷の削減） |
| 2.8 | Configure compute, memory, and storage resources to support vector workloads | ベクトルワークロード向けのコンピューティング・メモリ・ストレージ構成 |
| 2.9 | Run vector similarity search, including storing embeddings, semantic retrieval, and implementing retrieval-augmented generation (RAG) patterns by using metadata filter | ベクトル類似検索（埋め込みの保存、セマンティック検索、メタデータフィルターを使った RAG） |
| 2.10 | Implement connection optimization to improve throughput and minimize latency | 接続の最適化（スループット向上・遅延削減） |

## 1. 全体像

PostgreSQL は**リレーショナルデータとベクトルを同じ DB で SQL から扱える**のが強みです。
業務データ（顧客・注文・権限）と結合しながらベクトル検索したい、トランザクションが必要、SQL に慣れている、という場面で選びます。
エージェントの「ツール」のバックエンド（SQL で業務データを引く）としても使われます。

```
アプリ（psycopg + プール）──▶ PgBouncer :6432 ──▶ Azure Database for PostgreSQL フレキシブルサーバー
                                                    ├─ 拡張機能 vector（pgvector）: vector 型、<=> 演算子、HNSW / IVFFlat
                                                    ├─ 拡張機能 pg_diskann: DiskANN インデックス
                                                    └─ 拡張機能 azure_ai: SQL から Azure OpenAI で埋め込み生成
```

---

## 2. 重要概念

### 2.1 Azure Database for PostgreSQL フレキシブルサーバー

| 項目 | 内容 |
|---|---|
| デプロイ形態 | **フレキシブルサーバー**（単一サーバーは廃止済み） |
| コンピューティング層 | **Burstable**（B シリーズ、開発・小規模）/ **General Purpose**（D シリーズ、多くの本番）/ **Memory Optimized**（E シリーズ、メモリ比が高い） |
| ストレージ | Premium SSD（IOPS がディスクサイズに比例）/ **Premium SSD v2**（容量と別に IOPS・スループットを設定できる） |
| 読み取りスケール | **読み取りレプリカ**（検索などの読み取りを逃がす） |
| 水平スケール | エラスティッククラスター（Citus ベースのシャーディング） |
| 高可用性 | ゾーン冗長 / 同一ゾーンのスタンバイ |
| 拡張機能の有効化 | ① サーバーパラメーター **`azure.extensions`** の許可リストに追加 → ② DB で **`CREATE EXTENSION`**（一部は `shared_preload_libraries` と再起動も必要） |
| 認証 | PostgreSQL 認証（ユーザー / パスワード）と **Microsoft Entra 認証**（推奨）。両方有効にもできる |
| ネットワーク | パブリックアクセス（ファイアウォール規則）またはプライベートアクセス（VNet 統合）/ プライベートエンドポイント。TLS 必須 |

### 2.2 SDK での接続（2.5）

| 項目 | 内容 |
|---|---|
| Python ドライバー | **psycopg**（v3）/ psycopg2。pgvector 用に `pgvector` パッケージの `register_vector()` で `vector` 型を numpy 配列と相互変換 |
| .NET | **Npgsql**（`UseVector()` で pgvector 対応） |
| **Entra 認証** | `DefaultAzureCredential().get_token("https://ossrdbms-aad.database.windows.net/.default")` で取ったアクセストークンを**パスワードとして**渡す。ユーザー名は Entra のユーザー / グループ / マネージド ID の名前 |
| トークンの期限 | 約 1 時間。**新しい接続を作るたびに有効なトークンを使う**（プールの接続作成時にトークンを取得し直す） |
| SSL | `sslmode=require`（以上） |
| SQL インジェクション対策 | **パラメーター化クエリ**（psycopg は `%s`） |

### 2.3 スキーマ設計とデータ型（2.6）

| データ | 型 | メモ |
|---|---|---|
| 埋め込み | **`vector(n)`** | 単精度。**インデックスは 2,000 次元まで** |
| 埋め込み（省メモリ） | **`halfvec(n)`** | 半精度。サイズ半分、**インデックスは 4,000 次元まで**。リコールの低下はわずか |
| 2 値量子化 | `bit(n)` | ハミング距離。粗い候補抽出→再ランク付け |
| 疎ベクトル | `sparsevec(n)` | 非ゼロ要素 1,000 個まで（インデックス時） |
| 柔軟なメタデータ | **`jsonb`** | **GIN インデックス**で `@>` 検索 |
| よく絞り込む属性 | 通常の列（`text`, `int`, `timestamptz`, `uuid`） | **B-tree インデックス**。JSON に入れるより速い |
| 全文検索 | `tsvector`（生成列）＋ GIN | `to_tsvector` / `ts_rank`。ハイブリッド検索に |

設計のポイント:

- **文書（documents）とチャンク（chunks）を分ける**。チャンク側に `document_id` の外部キー、`chunk_index`、本文、埋め込み、フィルター用の列を持つ。
- フィルターに使う属性（テナント、文書種別、言語、日付）は**正規の列**にして B-tree を張る。
- 埋め込みの次元は**モデルと一致**させる（例: `text-embedding-3-small` = 1536）。`text-embedding-3-large`（3072）をそのまま `vector` で索引化はできない → `halfvec` にキャストした式インデックス、`dimensions` パラメーターで次元を減らす、または DiskANN を使う。
- 大きなテーブルは**宣言的パーティショニング**（テナント・期間など）で分割すると、フィルターとメンテナンスが楽になる。

### 2.4 pgvector の演算子とインデックス（2.7）

**距離演算子と演算子クラス（必ず対応させる）**

| 演算子 | 距離 | インデックスの演算子クラス | メモ |
|---|---|---|---|
| `<->` | L2（ユークリッド） | `vector_l2_ops` | |
| `<#>` | **負の**内積 | `vector_ip_ops` | 値が小さいほど近い。内積は `(a <#> b) * -1` |
| **`<=>`** | **コサイン距離** | **`vector_cosine_ops`** | コサイン類似度は `1 - (a <=> b)` |
| `<+>` | L1 | `vector_l1_ops` | |

> **クエリの演算子とインデックスの演算子クラスが違うと、インデックスは使われず全件スキャンになる。**
> OpenAI の埋め込みのように**正規化済み**のベクトルなら、内積・コサイン・L2 の順位は同じで、内積（`<#>`）が最も計算が軽い。

**インデックスはインデックスを使える形のクエリでだけ効く**: `ORDER BY embedding <=> $1 LIMIT k`（`ORDER BY` と `LIMIT` が必要）。

**HNSW と IVFFlat と DiskANN**

| | **HNSW** | **IVFFlat** | **DiskANN**（`pg_diskann`） |
|---|---|---|---|
| 仕組み | 多層グラフ | クラスタ（リスト）に分割し、近いリストだけ探す | グラフ（Microsoft Research）。ディスク上でも高速 |
| 速度とリコール | **最も良い** | HNSW より劣る | 大規模で高性能 |
| ビルド時間・メモリ | **遅い・多い** | **速い・少ない** | |
| 空のテーブルに作れるか | **作れる**（学習不要） | **データ投入後に作る**（リストをデータから学習するため） | 作れる |
| 作成時パラメーター | `m`（既定 16）、`ef_construction`（既定 64） | `lists`（目安: 100 万行まで `行数/1000`、それ以上 `sqrt(行数)`） | |
| 検索時パラメーター | **`hnsw.ef_search`**（既定 **40**。上げるとリコール↑速度↓） | **`ivfflat.probes`**（既定 **1**。目安 `sqrt(lists)`） | |
| 更新 | 追加に強い | データ分布が変わったら**再作成**が必要 | 追加に強い |

**pgvector の計算負荷を下げる方法（2.7）**

1. 総当たりをやめて**近似インデックス**（HNSW / IVFFlat / DiskANN）を作る。
2. **`halfvec`** や次元削減で**ベクトルを小さく**する（メモリ・I/O・計算が減る）。
3. インデックスが**メモリに収まる**ようにする（`shared_buffers`、メモリ最適化 SKU）。
4. ビルドを速くする: **`maintenance_work_mem`** を増やす（グラフが収まると高速）、`max_parallel_maintenance_workers` を増やす。
5. 稼働中のテーブルには **`CREATE INDEX CONCURRENTLY`**（書き込みをブロックしない）。
6. 検索パラメーター（`ef_search` / `probes`）を**必要なリコールの最小値**に。
7. `EXPLAIN ANALYZE` で **Index Scan using ...hnsw** になっているか確認する。

### 2.5 メタデータフィルターと RAG（2.9）

```sql
SELECT id, content, 1 - (embedding <=> %(q)s) AS similarity
FROM chunks
WHERE tenant_id = %(tenant)s AND doc_type = 'manual'
ORDER BY embedding <=> %(q)s
LIMIT 5;
```

**近似インデックスとフィルターの問題**: 近似インデックスでは**インデックス走査の後にフィルターが適用される**ため、条件に合う行が少ないと
`LIMIT 5` より少ない件数しか返らないことがある（`hnsw.ef_search` = 40 で条件に合うのが 10% なら平均 4 件）。

| 対策 | 内容 |
|---|---|
| **反復インデックススキャン**（pgvector 0.8 以降） | `SET hnsw.iterative_scan = strict_order;`（または `relaxed_order`）で、足りない分を自動で追加走査 |
| `ef_search` / `probes` を上げる | 候補を増やす（遅くなる） |
| **部分インデックス** | 条件ごとにインデックス: `CREATE INDEX ... WHERE doc_type = 'manual'` |
| **パーティショニング** | テナント単位などで分割し、各パーティションにインデックス |
| フィルター列の B-tree | 条件で大きく絞れる場合はプランナーが B-tree ＋ 正確な距離計算を選ぶ |

**RAG の流れ**: 質問を埋め込み → メタデータで絞って上位 k 件を取得 → 必要なら全文検索の結果と統合（ハイブリッド、RRF）→ プロンプトに入れて LLM へ。
`azure_ai` 拡張を使うと、SQL から直接 `azure_openai.create_embeddings('<deployment>', '<text>')` で埋め込みを作れる。

### 2.6 コンピューティング・メモリ・ストレージ（2.8）

| ボトルネック | 兆候 | 対処 |
|---|---|---|
| メモリ | インデックスが `shared_buffers` / OS キャッシュに収まらず、ディスク読み取りが多い | **Memory Optimized** 層へ、またはスケールアップ。`halfvec` でインデックスを小さく |
| CPU | 距離計算で CPU が張り付く、インデックスが使われていない | インデックスを確認、vCore を増やす、`ef_search` を下げる |
| ストレージ I/O | IOPS が上限 | Premium SSD の容量を増やす（IOPS が増える）か **Premium SSD v2** で IOPS を個別に増やす |
| インデックス作成 | ビルドが遅い | `maintenance_work_mem`、並列ワーカー |
| 読み取りが多い | 主サーバーの負荷 | **読み取りレプリカ**に検索を逃がす |
| 1 台では足りない | データ量・書き込みが極端に多い | エラスティッククラスター（シャーディング） |

主なサーバーパラメーター: `shared_buffers`、`work_mem`、`maintenance_work_mem`、`effective_cache_size`、`max_connections`。
監視: Azure Monitor のメトリック（CPU / メモリ / IOPS / 接続数）、**Query Store**、`pg_stat_statements`。

### 2.7 接続の最適化（2.10）

| 項目 | 内容 |
|---|---|
| なぜ必要か | PostgreSQL は**1 接続 = 1 プロセス**。接続の確立は重く、接続数が多いとメモリを圧迫する。`max_connections` は SKU で上限がある |
| **組み込み PgBouncer** | サーバーパラメーター **`pgbouncer.enabled = true`** で有効化。アプリは**ポート 6432** に接続（直接接続は 5432）。プールモードの既定は **transaction** |
| トランザクションプーリングの注意 | 接続がトランザクションごとに使い回されるので、**セッション単位の `SET`（例: `SET hnsw.ef_search`）や一時テーブル、名前付きプリペアドステートメントが引き継がれない**。`SET LOCAL` をトランザクション内で使う |
| アプリ側のプール | `psycopg_pool.ConnectionPool`、SQLAlchemy のプールなど。**接続をリクエストごとに作らない** |
| 遅延を減らす | アプリと DB を**同じリージョン**（可能なら同じゾーン）に。プライベートネットワーク。往復回数を減らす（バッチ挿入、`COPY`、`executemany`） |
| 読み書きの分離 | 読み取りレプリカへ検索を振り分ける |
| 再試行 | 一時的なエラー（フェールオーバー、接続断）に指数バックオフで再試行 |

---

## 3. 実装パターン

### 3.1 サーバーと拡張機能の準備

```bash
az postgres flexible-server create -g rg-ai200 -n pg-ai200 \
  --tier GeneralPurpose --sku-name Standard_D4ds_v5 --version 16 \
  --microsoft-entra-auth Enabled --password-auth Disabled

# 拡張機能を許可リストへ
az postgres flexible-server parameter set -g rg-ai200 -s pg-ai200 \
  --name azure.extensions --value VECTOR,PG_DISKANN,AZURE_AI

# 組み込み PgBouncer を有効化（アプリは 6432 に接続）
az postgres flexible-server parameter set -g rg-ai200 -s pg-ai200 \
  --name pgbouncer.enabled --value true
```

### 3.2 テーブルとインデックス

```sql
CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE documents (
  id          bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  tenant_id   text        NOT NULL,
  title       text        NOT NULL,
  doc_type    text        NOT NULL,
  metadata    jsonb       NOT NULL DEFAULT '{}',
  updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE chunks (
  id           bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  document_id  bigint NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  tenant_id    text   NOT NULL,
  doc_type     text   NOT NULL,
  chunk_index  int    NOT NULL,
  content      text   NOT NULL,
  content_tsv  tsvector GENERATED ALWAYS AS (to_tsvector('english', content)) STORED,
  embedding    vector(1536) NOT NULL
);

-- フィルター用
CREATE INDEX ON chunks (tenant_id, doc_type);
CREATE INDEX ON documents USING gin (metadata);
CREATE INDEX ON chunks USING gin (content_tsv);

-- ベクトル（クエリで <=> を使うので cosine）
SET maintenance_work_mem = '2GB';
CREATE INDEX CONCURRENTLY chunks_embedding_hnsw
  ON chunks USING hnsw (embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);

-- 3072 次元を半精度で索引化する例
-- CREATE INDEX ON chunks_large USING hnsw ((embedding::halfvec(3072)) halfvec_cosine_ops);
```

### 3.3 Python: Entra 認証＋プール＋ベクトル検索

```python
import numpy as np
import psycopg
from azure.identity import DefaultAzureCredential
from pgvector.psycopg import register_vector
from psycopg_pool import ConnectionPool

credential = DefaultAzureCredential()

class EntraConnection(psycopg.Connection):
    """接続を作るたびに新しいトークンをパスワードとして使う"""
    @classmethod
    def connect(cls, *args, **kwargs):
        kwargs["password"] = credential.get_token(
            "https://ossrdbms-aad.database.windows.net/.default").token
        return super().connect(*args, **kwargs)

pool = ConnectionPool(
    conninfo="host=pg-ai200.postgres.database.azure.com port=6432 dbname=rag "
             "user=app-identity sslmode=require",
    connection_class=EntraConnection,
    min_size=2, max_size=10,
    configure=register_vector,
)

def search(query_embedding: np.ndarray, tenant: str, k: int = 5):
    with pool.connection() as conn, conn.transaction():
        # トランザクションプーリングでも効くように SET LOCAL
        conn.execute("SET LOCAL hnsw.ef_search = 100")
        conn.execute("SET LOCAL hnsw.iterative_scan = strict_order")
        return conn.execute(
            """
            SELECT id, content, 1 - (embedding <=> %(q)s) AS similarity
            FROM chunks
            WHERE tenant_id = %(t)s AND doc_type = 'manual'
            ORDER BY embedding <=> %(q)s
            LIMIT %(k)s
            """,
            {"q": query_embedding, "t": tenant, "k": k},
        ).fetchall()
```

### 3.4 インデックスが使われているか確認

```sql
EXPLAIN ANALYZE
SELECT id FROM chunks ORDER BY embedding <=> '[0.01, 0.02, ...]' LIMIT 5;
-- "Index Scan using chunks_embedding_hnsw" ならOK。"Seq Scan" + "Sort" なら使われていない
```

### 3.5 azure_ai 拡張で SQL から埋め込みを作る

```sql
CREATE EXTENSION IF NOT EXISTS azure_ai;
SELECT azure_ai.set_setting('azure_openai.endpoint', 'https://<aoai>.openai.azure.com');
-- 認証はキーまたはマネージド ID を設定

UPDATE chunks
SET embedding = azure_openai.create_embeddings('text-embedding-3-small', content)::vector
WHERE embedding IS NULL;
```

---

## 4. 判断ポイント（要件 → 選択）

| 要件 | 選ぶもの |
|---|---|
| 検索の速度とリコールを最優先、メモリに余裕あり | **HNSW** |
| インデックスのビルドを速く、メモリを抑えたい。データはほぼ静的 | **IVFFlat**（データ投入後に作成） |
| テーブルが空の状態でインデックスを先に作りたい | HNSW（IVFFlat は学習のためデータが必要） |
| 非常に大規模でメモリに収まらない | DiskANN（`pg_diskann`） |
| クエリが `<=>` を使っているのにインデックスが使われない | 演算子クラスを **`vector_cosine_ops`** に合わせる |
| 3072 次元の埋め込みを索引化したい | `halfvec` へのキャストで索引化（4,000 次元まで）、次元削減、または DiskANN |
| メモリ使用量を半分にしたい | `halfvec` |
| フィルター付き検索で件数が足りない | `hnsw.iterative_scan`、部分インデックス、パーティショニング、`ef_search` を上げる |
| 検索の精度をもう少し上げたい（HNSW） | `hnsw.ef_search` を上げる |
| 検索の精度をもう少し上げたい（IVFFlat） | `ivfflat.probes` を上げる |
| 稼働中のテーブルに書き込みを止めずにインデックスを追加 | `CREATE INDEX CONCURRENTLY` |
| インデックス作成が遅い | `maintenance_work_mem` を増やす、並列ワーカー |
| 接続数が上限に達する（サーバーレス関数から大量接続） | **組み込み PgBouncer（6432）** ＋アプリ側プール |
| PgBouncer 経由で `SET hnsw.ef_search` が効かない | トランザクション内で `SET LOCAL` |
| パスワードを使わずにアプリから接続 | Microsoft Entra 認証（マネージド ID のトークンをパスワードとして使用） |
| 検索の読み取り負荷を主サーバーから分離 | 読み取りレプリカ |
| IOPS が足りないが容量は増やしたくない | Premium SSD v2 |
| ベクトル検索と業務データの JOIN、トランザクションが必要 | PostgreSQL（Cosmos DB / Redis より向く） |

## 5. ひっかけポイント

- **`vector` 型のインデックスは 2,000 次元まで**（`halfvec` は 4,000）。
- `<#>` は**負の**内積を返す。
- `<=>` は**距離**（小さいほど近い）。類似度は `1 - 距離`。
- IVFFlat は**データを入れてから**作る。空のテーブルで作ると精度が出ない。
- `hnsw.ef_search` の既定は **40**、`ivfflat.probes` の既定は **1**。
- 近似インデックスは**フィルターを後から適用**する。
- 拡張機能は `azure.extensions` の許可リストに入れないと `CREATE EXTENSION` できない。
- PgBouncer のポートは **6432**、PostgreSQL は **5432**。
- Entra のトークンは約 1 時間で切れる。プールの**接続作成時に再取得**する。
- `ORDER BY ... LIMIT` がないとベクトルインデックスは使われない。

## 6. 確認問題

<details><summary>Q1. `ORDER BY embedding <=> $1 LIMIT 10` のクエリが遅い。インデックスは `USING hnsw (embedding vector_l2_ops)`。原因は？</summary>

**答え**: クエリはコサイン距離（`<=>`）だが、インデックスは L2 の演算子クラス。演算子クラスが一致しないためインデックスが使われない。`vector_cosine_ops` で作り直す（またはクエリを `<->` に）。
</details>

<details><summary>Q2. 新しいテーブルを作り、データ投入前にベクトルインデックスを作っておきたい。HNSW と IVFFlat のどちらか。</summary>

**答え**: HNSW。IVFFlat は既存データからリスト（クラスタ）を学習するため、データ投入後に作る必要がある。
</details>

<details><summary>Q3. テナント ID でフィルターした上位 10 件の検索で、3 件しか返らないことがある。原因と対処は？</summary>

**答え**: 近似インデックスは走査後にフィルターを適用するため、`ef_search` 個の候補のうち条件に合うものが少ない。`SET hnsw.iterative_scan = strict_order`（pgvector 0.8+）、`ef_search` を上げる、テナントでの部分インデックスやパーティショニングで対処。
</details>

<details><summary>Q4. Azure Functions から PostgreSQL に接続しているが、負荷が高いと「too many connections」になる。最小の変更での対処は？</summary>

**答え**: 組み込み PgBouncer を有効にし（`pgbouncer.enabled = true`）、接続先ポートを 6432 に変える。アプリ側でも接続を使い回す。
</details>

<details><summary>Q5. PgBouncer 経由にしたら、`SET hnsw.ef_search = 200` の設定が効いたり効かなかったりする。なぜか。</summary>

**答え**: トランザクションプーリングでは、トランザクションごとに別のサーバー接続が使われるため、セッション単位の `SET` が引き継がれない。トランザクション内で `SET LOCAL` を使う。
</details>

<details><summary>Q6. HNSW インデックスの作成に時間がかかりすぎる。サーバーのメモリには余裕がある。</summary>

**答え**: `maintenance_work_mem` を増やす（グラフがメモリに収まると大幅に速くなる）。`max_parallel_maintenance_workers` も検討。
</details>

<details><summary>Q7. `CREATE EXTENSION vector;` が「not allow-listed」で失敗する。</summary>

**答え**: サーバーパラメーター `azure.extensions` に `VECTOR` を追加してから実行する。
</details>

<details><summary>Q8. 埋め込みのストレージとメモリを減らしたいが、リコールはほとんど落としたくない。</summary>

**答え**: `halfvec`（半精度）で保存・索引化する。サイズはほぼ半分になり、リコールの低下はわずか。
</details>

## 7. チェックリスト

- [ ] 拡張機能を有効にする 2 ステップ（`azure.extensions` → `CREATE EXTENSION`）を言える
- [ ] Entra 認証でトークンをパスワードとして使う接続コードを書ける
- [ ] `vector` / `halfvec` / `bit` / `jsonb` を使い分けられる
- [ ] 4 つの距離演算子と演算子クラスの対応を言える
- [ ] HNSW と IVFFlat の違い（ビルド、メモリ、リコール、空テーブル、パラメーターと既定値）を説明できる
- [ ] フィルター付き近似検索の件数不足の原因と対策を説明できる
- [ ] `EXPLAIN ANALYZE` でインデックスの使用を確認できる
- [ ] ベクトルワークロードのボトルネック（メモリ・CPU・I/O）ごとの対処を言える
- [ ] PgBouncer（6432、transaction モード）とその注意点を説明できる
- [ ] RAG の検索 SQL（フィルター＋ `ORDER BY <=>` ＋ `LIMIT`）を書ける

## 8. 公式リファレンス

- [How to enable and use pgvector on Azure Database for PostgreSQL](https://learn.microsoft.com/azure/postgresql/flexible-server/how-to-use-pgvector)
- [How to optimize performance when using pgvector](https://learn.microsoft.com/azure/postgresql/flexible-server/how-to-optimize-performance-pgvector)
- [DiskANN on Azure Database for PostgreSQL](https://learn.microsoft.com/azure/postgresql/flexible-server/how-to-use-pgdiskann)
- [Azure AI extension (azure_ai)](https://learn.microsoft.com/azure/postgresql/flexible-server/generative-ai-azure-overview)
- [PgBouncer in Azure Database for PostgreSQL](https://learn.microsoft.com/azure/postgresql/flexible-server/concepts-pgbouncer)
- [Microsoft Entra authentication](https://learn.microsoft.com/azure/postgresql/flexible-server/concepts-azure-ad-authentication)
- [pgvector（GitHub）](https://github.com/pgvector/pgvector)
- Learn モジュール: Build and query / Implement vector search / Optimize vector search in Azure Database for PostgreSQL
