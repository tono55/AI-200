# AI-200 学習ノート（Developing AI Cloud Solutions on Azure）

Microsoft の新しいアソシエイト試験 **AI-200: Developing AI Cloud Solutions on Azure**
（認定資格: **Microsoft Certified: Azure AI Cloud Developer Associate**）の
試験情報と、合格に必要な知識をまとめたリポジトリです。

旧試験 **AZ-204: Developing Solutions for Microsoft Azure**（2026-07-31 に廃止）の後継です。
AZ-204 と重なる範囲は旧試験の知識も引用しています。

> 情報は **2026-10-31 時点** の調査です。公式の出題範囲は **2026-10-07 版** の Skills measured を元にしています（公式スタディガイドを Microsoft Learn から直接取得して確認済み）。
> 受験前に必ず [公式スタディガイド](https://learn.microsoft.com/credentials/certifications/resources/study-guides/ai-200) で最新版を確認してください。
> 情報の出典と確度は [docs/sources.md](docs/sources.md) にまとめています。

---

## 30 秒でわかる AI-200

| 項目 | 内容 |
|---|---|
| 試験コード / 名称 | AI-200: Developing AI Cloud Solutions on Azure |
| 認定資格 | Microsoft Certified: Azure AI Cloud Developer Associate |
| レベル | Associate（中級） |
| 前身 | AZ-204（2026-07-31 廃止） |
| 試験時間 | **100 分**（着席時間 120 分）。ラボが含まれる回は 120 分（着席 140 分）。正確な時間は申し込み時に表示 |
| 合格点 | 700 / 1000（スケールスコア） |
| 問題数 | 非公開（Microsoft の試験は通常 40〜60 問） |
| 価格 | 米国 USD 165。国ごとに異なる |
| 有効期限 | 1 年。Microsoft Learn で無料の更新評価（オンライン）を受けて延長 |
| 公式模擬試験 | **あり**（AI Skills Navigator の Practice Assessment: <http://aka.ms/AI200-PA>） |
| 公式トレーニング | AI-200T00（AZ-204T00 の後継コース） |

### 出題分野（Skills at a glance）

| # | 分野 | 配点 | 主なサービス |
|---|---|---|---|
| 1 | Develop containerized solutions on Azure | 20–25% | ACR / ACR Tasks / App Service（コンテナ）/ Container Apps / KEDA / AKS |
| 2 | Develop AI solutions by using Azure data management services | **25–30%** ※ | Cosmos DB for NoSQL / Azure Database for PostgreSQL + pgvector / Azure Managed Redis |
| 3 | Connect to and consume Azure services | 20–25% | Service Bus / Event Grid / Azure Functions |
| 4 | Secure, monitor, and troubleshoot Azure solutions | 20–25% | Key Vault / App Configuration / OpenTelemetry / KQL |

※ 2026-10-07 の改訂で分野 2 は「% of exam increased（配点増）」とされた、**最大配点の分野**です。現在の公式ガイドの表記は 25–30% です（改訂直後は一時的に 30–35% と表記されていました）。

**名前に「AI」とありますが、モデルやプロンプトを扱う試験ではありません。** AI アプリを支える
**バックエンド開発**（コンテナ、ベクトル DB、メッセージング、監視）の試験です。
生成 AI やエージェントそのものを扱うのは姉妹試験の AI-103 です。

---

## ディレクトリ構成と読む順番

```
README.md                         ← いまここ
docs/
├── 00-exam-overview.md           試験の基本情報・形式・日程・関連試験
├── 01-skills-outline.md          公式出題範囲（27 項目、原文＋和訳）とラーニングパスの対応表
├── 02-az204-to-ai200.md          旧試験 AZ-204 との差分（継続・削除・新規）
├── 03-study-plan.md              8 週間の学習計画・学習サイクル・直前チェック
├── domains/                      分野別の学習ノート（すべて同じテンプレート）
│   ├── 1-containers.md               分野1 コンテナ
│   ├── 2a-cosmos-db.md               分野2 Cosmos DB for NoSQL
│   ├── 2b-postgresql-pgvector.md     分野2 PostgreSQL + pgvector
│   ├── 2c-managed-redis.md           分野2 Azure Managed Redis
│   ├── 3-azure-services.md           分野3 Service Bus / Event Grid / Functions
│   └── 4-secure-monitor.md           分野4 Key Vault / App Configuration / OpenTelemetry / KQL
├── cheatsheets/
│   ├── numbers.md                    覚えるべき数値・既定値
│   ├── service-selection.md          「要件 → 選ぶサービス・設定」の判断表
│   └── cli-sdk.md                    Azure CLI / SDK 早見表
├── templates/
│   └── domain-note-template.md       分野ノートの共通テンプレート
└── sources.md                    出典一覧と情報の確度
```

おすすめの読み方:

1. [00-exam-overview](docs/00-exam-overview.md) と [01-skills-outline](docs/01-skills-outline.md) で全体像をつかむ
2. AZ-204 経験者は [02-az204-to-ai200](docs/02-az204-to-ai200.md) で差分だけ確認する
3. [03-study-plan](docs/03-study-plan.md) に沿って、[domains/](docs/domains/) の各ノートを順に進める
4. 直前期は [cheatsheets/](docs/cheatsheets/) と各ノートの「確認問題」「チェックリスト」を回す

## 分野ノートの共通テンプレート

どのノートも次の順番で書いています（[テンプレート](docs/templates/domain-note-template.md)）。
「範囲を知る → 理解する → 手を動かす → 判断を練習する → 罠を潰す → 自己テスト」を毎回同じ型で回せます。

1. **出題範囲**: 公式 Skills measured の原文と和訳
2. **全体像**: そのサービスが AI アプリのどこで使われるか
3. **重要概念**: 用語・仕様・数値を表で整理
4. **実装パターン**: Azure CLI と SDK（主に Python）のコード
5. **判断ポイント**: 「この要件ならこれ」という選択問題への備え
6. **ひっかけポイント**: 間違えやすい点
7. **確認問題**: 折りたたみの解答つき
8. **チェックリスト**: 本番前の自己評価
9. **公式リファレンス**

## 免責

本リポジトリは個人の学習用まとめで、Microsoft とは関係ありません。試験問題の転載（いわゆる dump）は含みません。
数値や仕様は Azure 側の更新で変わることがあるので、最新の公式ドキュメントを優先してください。
