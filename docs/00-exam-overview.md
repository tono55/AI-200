# 00. 試験概要

> 調査日: 2026-10-31。確度の表記: **[公式]** Microsoft Learn の公式ページで確認したもの / **[複数]** 複数の第三者資料で一致するもの / **[要確認]** 資料間で食い違うもの・未確認のもの。

## 1. 基本情報

| 項目 | 内容 | 確度 |
|---|---|---|
| 試験コード | AI-200 | [公式] |
| 試験名 | Developing AI Cloud Solutions on Azure | [公式] |
| 認定資格 | Microsoft Certified: Azure AI Cloud Developer Associate | [公式] |
| レベル / 役割 | Intermediate / Developer（分野: Application development、Artificial intelligence） | [公式] |
| 認定ページの最終更新 | 2026-10-07 | [公式] |
| 合格点 | 700 以上（1〜1000 のスケールスコア） | [公式] |
| 試験時間 | ラボなしのアソシエイト試験は **試験時間 100 分・着席時間 120 分**、ラボが含まれうる試験は **120 分・着席 140 分**。Microsoft はラボのある試験を公表しておらず、**申し込み時に試験時間が表示される** | [公式] |
| 問題数 | 非公開。Microsoft の試験は通常 40〜60 問 | [公式] |
| 問題形式 | 公式には非公表。Exam Sandbox で体験できる形式: 単一 / 複数選択、ドラッグ＆ドロップ、ビルドリスト（並べ替え）、ホットエリア、アクティブスクリーン、ケーススタディ、ラボ。受験者の報告では**コードや CLI を読む問題が多い** | [公式]＋[複数] |
| 受験料 | 米国 USD 165。国・地域で異なる | [複数] |
| 言語 | ローカライズされる試験は英語版の更新から約 8 週間後に更新される。希望の言語がない場合は **+30 分の延長を申請できる**。日本語化は受験者の報告（2026 年 8 月）があるが、申し込み画面で確認 | [公式]＋[要確認] |
| **公式模擬試験（Practice Assessment）** | **あり**。AI Skills Navigator で提供（<http://aka.ms/AI200-PA>）。本番により近い新しい形式 | [公式] |
| 試験対策動画 | Exam Readiness Zone（<https://aka.ms/AI200-ExamPrep>） | [公式] |
| 公式コース | **AI-200T00: Develop AI cloud solutions on Microsoft Azure**（講師主導）。AZ-204T00 は 2026-05-29 に廃止され、後継が AI-200T00 | [公式] |
| 有効期限 | 毎年失効。期限前に Microsoft Learn 上の**無料のオンライン更新評価**に合格すると延長 | [公式] |
| 出題対象の機能 | ほとんどは一般提供（GA）の機能。よく使われていればプレビュー機能も出ることがある | [公式] |

## 2. タイムライン

| 時期 | 出来事 | 確度 |
|---|---|---|
| 2026 年初め | Microsoft が AZ-204 を含む複数の試験の廃止と、後継試験を発表 | [複数] |
| 2026-01-14 | AZ-204 の最後の出題範囲改訂 | [公式] |
| 2026 年 5 月 | AI-200 のベータ試験が開始（先着で 80% 割引のキャンペーンがあった） | [複数] |
| 2026-05-29 | 公式コース AZ-204T00 が廃止。後継は AI-200T00 | [公式] |
| 2026-06-30 | AI-102（Azure AI Engineer Associate）が廃止。後継は AI-103 | [複数] |
| 2026 年 7 月（7/9 とする資料あり） | AI-200 が正式版（GA）に | [複数] |
| **2026-07-31** | **AZ-204 が廃止**（23:59 CST） | [公式] |
| 2026 年 8 月 | 日本からの合格体験記が出始める（スコア 850 点前後、学習時間 20〜50 時間） | [複数] |
| **2026-10-07** | 出題範囲を改訂。分野 2（データ管理）の配点が増加（変更履歴: "% of exam increased"） | [公式] |

## 3. 出題分野と配点

| 分野 | 配点 | 公式の Skills measured の項目数 |
|---|---|---|
| 1. Develop containerized solutions on Azure | 20–25% | 7 |
| 2. Develop AI solutions by using Azure data management services | **25–30%** | 12 |
| 3. Connect to and consume Azure services | 20–25% | 4 |
| 4. Secure, monitor, and troubleshoot Azure solutions | 20–25% | 4 |
| **合計** | | **27** |

27 項目の原文・和訳は [01-skills-outline.md](01-skills-outline.md) を参照してください。

> 分野 2 の配点: 2026-10-07 の改訂直後は「Skills at a glance」が 30–35%、詳細見出しが 25–30% と食い違っていました。2026-10-31 時点の公式ガイドでは**どちらも 25–30%** です。いずれにしても最大配点の分野です。

### 配点の読み方

- 分野 2 は Cosmos DB、PostgreSQL、Redis の **3 サービス**にまたがり、それぞれ SDK・クエリ言語・ベクトル検索の実装が違います。項目数も 12 と最も多い分野です。
- 分野 3 と 4 は項目数こそ 4 つずつですが、AZ-204 から引き継いだ内容が多く、経験者は得点源にしやすい分野です。
- 分野 1 は AKS（Kubernetes マニフェスト、kubectl）が新しく入りました。Kubernetes の経験がない人には大きな山です。

## 4. 想定受験者（公式の Audience profile）

- Azure 上で AI ソリューションを実装するすべての段階に関わり、**バックエンドのサービスとコンポーネントに重点を置く**開発者。
- 要件定義・設計・開発・デプロイ・セキュリティ・監視まで、開発ライフサイクル全体を支える。
- 求められる習熟（公式の列挙どおり）:
  - Azure SDK と、Azure で使われるサードパーティの SDK
  - Azure のデータ管理サービス
  - Azure の監視とトラブルシューティング
  - Azure のメッセージングとイベント
  - ベクトルデータベース
  - **Python プログラミング**
  - Azure でのコンテナ化されたアプリケーションの実装
- AI モデルの学習・評価、プロンプト設計、Foundry でのエージェント構築は**出題範囲外**です（それらは AI-103 の範囲）。

## 5. 受験者の報告から見える出題傾向

日本の合格体験記（2026 年 8 月、850 点前後）や海外の学習ガイドで共通している点です（[複数]）。

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

## 7. 受験時のルール（Microsoft 共通、[公式]）

### 試験中の Microsoft Learn 参照

- アソシエイト / エキスパート試験では、左のナビゲーションの **Microsoft Learn ボタン**で learn.microsoft.com を画面分割で開ける。
- 開けないもの: **Q&A、Practice Assessment、自分のプロフィール**。learn.microsoft.com 以外のドメイン（GitHub など）もブロックされる。
- **時間は追加されず、試験のタイマーは止まらない。** 全問を調べる前提ではなく、調べ物が必要な問題のためのもの。ページ内検索（Ctrl+F / Command+F）は使える。
- 参照できる言語は、その試験が提供されている言語と同じ。

### 休憩

- 試験時間に休憩用の 5 分が組み込まれている（その分の問題が削られている）。何度でも取れるが、**タイマーは止まらない**。
- **休憩を取ると、それまでに見た問題には戻れない**（未回答・見直しマークの問題も含む）。
- ラボの途中、問題と解決策のセット（「この解決策で目的を満たすか」）の途中では休憩できない。ケーススタディの途中では取れるが、前の問題には戻れない。

### 再受験ポリシー

- 1 回目の不合格後は **24 時間**待てば再受験できる。2 回目以降は各回の間に **14 日**の待機。
- 最初の受験から **12 か月で最大 5 回**。
- 合格した試験は、認定が失効しない限り受け直せない。再受験も有料。
- ベータ試験はベータ期間中に 1 回だけ。不合格なら正式版になってから受験できる。

### 更新評価（Renewal assessment）

- 無料・オンライン・Microsoft Learn 上で受ける。**失効前に合格**する必要がある（失効後は本試験からやり直し）。
- 再受験の回数制限はない。2 回目までは続けて受けられ、それ以降は各回 24 時間空ける。

### そのほか

- オンライン（OnVUE、監督付き）またはテストセンターで受験。
- 試験の UI は [Exam Sandbox](https://aka.ms/examdemo) で事前に体験できる。
- 支援機器の使用や時間延長が必要なら、事前に配慮（accommodation）を申請する。

## 8. 申し込み前のチェック

- [ ] [AI-200 公式スタディガイド](https://learn.microsoft.com/credentials/certifications/resources/study-guides/ai-200) の「Skills measured」の日付が 2026-10-07 以降か（改訂されていれば変更履歴を確認）
- [ ] [認定ページ](https://learn.microsoft.com/credentials/certifications/azure-ai-cloud-developer-associate/) から申し込み、表示される試験時間・言語・価格（日本円）を確認
- [ ] [Practice Assessment](http://aka.ms/AI200-PA) を受け、80% 以上を安定して取れるまで繰り返す
- [ ] [Exam Sandbox](https://aka.ms/examdemo) で UI（見直しマーク、休憩、Learn の参照）を確認
- [ ] 学割・Microsoft Learn のチャレンジ・イベントの割引バウチャーがないか確認
