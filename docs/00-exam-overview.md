# 00. 試験概要

> 調査日: 2026-10-31。確度の表記: **[公式]** Microsoft の公式ページ（または公式ページの記載を引用した複数の資料）で確認できたもの / **[複数]** 複数の第三者資料で一致するもの / **[要確認]** 資料間で食い違うもの・未確認のもの。

## 1. 基本情報

| 項目 | 内容 | 確度 |
|---|---|---|
| 試験コード | AI-200 | [公式] |
| 試験名 | Developing AI Cloud Solutions on Azure | [公式] |
| 認定資格 | Microsoft Certified: Azure AI Cloud Developer Associate | [公式] |
| レベル | Associate（Intermediate） | [公式] |
| 役割 | Developer | [公式] |
| 合格点 | 700 以上（1〜1000 のスケールスコア） | [公式] |
| 試験時間 | **120 分**（公式の認定ページの記載とされる）。100 分とする資料もある | [要確認] |
| 問題数 | 非公開。40〜60 問程度という報告が多い | [複数] |
| 問題形式 | 単一選択、複数選択、ドラッグ＆ドロップ（並べ替え）、ケーススタディなど。コードや CLI を読む問題が多い | [複数] |
| ハンズオンラボ | 採点対象のラボがあるという報告は見つからない | [要確認] |
| 受験料 | 米国 USD 165。国・地域で異なる | [複数] |
| 言語 | 当初は英語のみ。2026 年 8 月以降に日本語化されたという受験者の報告がある | [要確認] |
| 公式模擬試験（Practice Assessment） | 「まだ提供されていない」とする資料と「ある」とする資料がある | [要確認] |
| 公式コース | AI-200T00: Develop AI Cloud Solutions on Azure（講師主導）と、同じ内容の Microsoft Learn ラーニングパス 9 本 | [複数] |
| 有効期限 | 取得から 1 年。期限前 180 日以内に Microsoft Learn 上の無料の更新評価（オンライン、約 45 分、オープンブック）に合格すると 1 年延長 | [公式]（Microsoft 共通ポリシー） |

## 2. タイムライン

| 時期 | 出来事 | 確度 |
|---|---|---|
| 2026 年初め | Microsoft が AZ-204 を含む複数の Azure 試験の廃止と、後継試験を発表 | [複数] |
| 2026 年 5 月 | AI-200 のベータ試験が開始（先着で 80% 割引のキャンペーンがあった） | [複数] |
| 2026-06-30 | AI-102（Azure AI Engineer Associate）が廃止。後継は AI-103 | [複数] |
| 2026 年 7 月（7/9 とする資料あり） | AI-200 が正式版（GA）に | [複数] |
| **2026-07-31** | **AZ-204 が廃止**（23:59 CST）。AZ-204 の公式スタディガイドに記載 | [公式] |
| 2026 年 8 月 | 日本からの合格体験記が出始める（スコア 850 点前後、学習時間 20〜50 時間） | [複数] |
| **2026-10-07** | 出題範囲を改訂。分野 2（データ管理）の配点を引き上げ | [公式] |

> ある第三者リポジトリは AZ-204 の廃止日を「2026-08-31」と書いていますが、これは同時期に発表された別の試験（AZ-500 など）の日付と混同していると思われます。公式スタディガイドの記載は **2026-07-31** です。

## 3. 出題分野と配点

| 分野 | 配点 | 公式の Skills measured の項目数 |
|---|---|---|
| 1. Develop containerized solutions on Azure | 20–25% | 7 |
| 2. Develop AI solutions by using Azure data management services | 30–35%（詳細見出しは 25–30%） | 12 |
| 3. Connect to and consume Azure services | 20–25% | 4 |
| 4. Secure, monitor, and troubleshoot Azure solutions | 20–25% | 4 |
| **合計** | | **27** |

27 項目の原文・和訳は [01-skills-outline.md](01-skills-outline.md) を参照してください。

### 配点の読み方

- 分野 2 は Cosmos DB、PostgreSQL、Redis の **3 サービス**にまたがり、それぞれ SDK・クエリ言語・ベクトル検索の実装が違います。量が最も多い分野です。
- 分野 3 と 4 は項目数こそ 4 つずつですが、AZ-204 から引き継いだ内容が多く、経験者は得点源にしやすい分野です。
- 分野 1 は AKS（Kubernetes マニフェスト、kubectl）が新しく入りました。Kubernetes の経験がない人には大きな山です。

## 4. 想定受験者（公式の説明の要約）

- Azure 上で AI ソリューションを**構築・保守する開発者**。
- 必要な経験として挙げられているもの:
  - Azure SDK と Azure CLI
  - データ管理サービス（Cosmos DB、PostgreSQL、Redis）とベクトルデータベース
  - 監視、メッセージング、イベント
  - **Python**（コード問題の主言語。ただし .NET / Java の SDK コードも出るという報告がある）
  - コンテナ化されたアプリケーション
- AI モデルの学習・評価、プロンプト設計、Foundry でのエージェント構築は**出題範囲外**です（それらは AI-103 の範囲）。

## 5. 受験者の報告から見える出題傾向

日本の合格体験記（2026 年 8 月、850 点前後）や海外の学習ガイドで共通している点です。

- **コードを読む問題が多い。** Python / .NET / Java の SDK コード、Azure CLI、JSON（ARM・ポリシー）、YAML（Kubernetes マニフェスト）、SQL（Cosmos DB / PostgreSQL）、KQL が出題される。
- **「要件に対して最適なサービス・設定はどれか」を選ぶシナリオ問題が中心。** 特に、Cosmos DB / PostgreSQL / Redis の 3 つのうち 2 つがもっともらしく見える問題が多い。
- **AZ-204 の範囲（Functions、Service Bus、Event Grid、Key Vault、App Configuration、Container Apps、Cosmos DB）の復習を優先すべき**という声がある。
- 新しい範囲で重点的に押さえるべきとされたもの: PostgreSQL + pgvector、Azure Managed Redis、OpenTelemetry、KEDA、AKS。
- 学習時間は経験によって 20〜50 時間の報告。AZ-204 や実務経験がない場合はもっと長く見積もる。

## 6. 関連する試験との違い

| 試験 | 認定資格 | 焦点 | AI-200 との関係 |
|---|---|---|---|
| **AI-200** | Azure AI Cloud Developer Associate | AI アプリを動かす**基盤**（コンテナ、ベクトル DB、メッセージング、監視） | 本試験 |
| AI-103 | Azure AI Apps and Agents Developer Associate | Microsoft Foundry 上の生成 AI アプリ・エージェント・RAG・責任ある AI | AI-102 の後継。AI-200 とは補完関係 |
| AZ-204（廃止） | Azure Developer Associate | Azure PaaS 全般の開発（Web Apps、Storage、APIM、Graph、MSAL など） | AI-200 の前身 |
| AI-102（廃止） | Azure AI Engineer Associate | Azure AI サービス・OpenAI | AI-103 の前身 |
| AI-901 | AI 系の Fundamentals | AI の基礎知識 | 前提ではない |

AI アプリ開発を一通りカバーしたい場合は「AI-200（基盤）＋ AI-103（アプリ・エージェント）」の組み合わせになります。

## 7. 受験時の一般的なルール（Microsoft 共通）

AI-200 だけの決まりではなく、Microsoft のロールベース試験に共通する内容です。最新版は公式の試験ポリシーを確認してください。

- オンライン（OnVUE 監督付き）またはテストセンターで受験できる。
- ロールベース試験では、試験中に **Microsoft Learn のドキュメントを参照できる**機能がある（試験時間は止まらない）。調べ物に頼りすぎると時間が足りなくなるので、確認は数問にとどめる。
- 不合格の場合は 24 時間後から再受験でき、2 回目以降は 14 日の待機期間がある。12 か月で最大 5 回まで。
- 試験の UI に慣れるため、Microsoft の Exam Sandbox（試験体験版）を事前に触っておくとよい。
- 英語で受験する場合でも、非英語圏の受験者は時間延長（+30 分）を申請できる場合がある（条件は公式で確認）。

## 8. 申し込み前のチェック

- [ ] [AI-200 公式スタディガイド](https://learn.microsoft.com/credentials/certifications/resources/study-guides/ai-200) の「Skills measured」の日付が 2026-10-07 以降か（改訂されていれば差分を確認）
- [ ] [認定ページ](https://learn.microsoft.com/credentials/certifications/azure-ai-cloud-developer-associate/) で試験時間・言語・価格（日本円）を確認
- [ ] Practice Assessment が公開されているか確認し、あれば 80% 以上取れるまで回す
- [ ] 学割・Microsoft Learn のチャレンジ・イベントの割引バウチャーがないか確認
