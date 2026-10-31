# 04. 知識チェック問題集（GitHub Pages）

公式の出題範囲 27 項目をすべて網羅する、オリジナルの知識チェック問題集です。
問題は YAML で管理し、GitHub Actions で検証して GitHub Pages に公開します。

- 公開先（Pages を有効にした後）: `https://tono55.github.io/AI-200/`
- 問題データ: [`questions/`](../questions/)
- サイト: [`site/`](../site/)
- ビルド / 検証スクリプト: [`scripts/build_questions.py`](../scripts/build_questions.py)
- ワークフロー: [`.github/workflows/quiz-site.yml`](../.github/workflows/quiz-site.yml)

## 1. プラットフォームの検討

| 候補 | 長所 | 短所 | 判定 |
|---|---|---|---|
| **GitHub Pages ＋ 自作の静的アプリ** | 無料（公開リポジトリ）。問題をリポジトリで版管理・レビューできる。本番の問題形式（並べ替え・対応付け・コード穴埋め・ケーススタディ）を自由に再現できる。サーバー不要 | 画面を自作する必要がある | **採用** |
| MkDocs Material / Docusaurus ＋ クイズ プラグイン | 学習ノートと同じサイトにできる | プラグインは単一 / 複数選択が中心で、並べ替えやコード穴埋め、模擬試験（タイマー・分野別採点）が難しい。ビルドの依存が増える | 見送り |
| Quarto / Jupyter Book | ノートとコードを一緒に書ける | 対話的な採点には追加の JavaScript が必要 | 見送り |
| Google フォーム / Microsoft Forms のテスト | 作成が簡単、採点機能あり | 問題を Git で管理できない。コード表示や形式の自由度が低い。網羅チェックを自動化できない | 見送り |
| Anki などのフラッシュカード | 間隔反復に強い | シナリオ問題やコード穴埋めに不向き | 補助として併用可 |

**採用理由**: 「出題範囲を網羅しているか」を CI で機械的にチェックでき、問題の追加・修正を Pull Request でレビューできるためです。
リポジトリは公開設定なので、GitHub Pages を無料で使えます。

## 2. 全体の仕組み

```
questions/objectives.yml   出題範囲 27 項目（id 1.1〜4.4）と配点、最低問題数
questions/cases.yml        ケーススタディのシナリオ
questions/domain-*.yml     問題（分野ごと）
        │
        ▼  scripts/build_questions.py（形式・正解・網羅を検証）
site/data/questions.json   （生成物。Git には入れない）
        │
        ▼  GitHub Actions（.github/workflows/quiz-site.yml）
GitHub Pages               site/ をそのまま公開（index.html + assets/）
```

- 学習記録（回答履歴・ブックマーク・模擬試験の結果）は**閲覧者のブラウザー（localStorage）にだけ**保存されます。サーバーやアカウントはありません。
- 外部ライブラリは使っていません（CDN も不要）。

## 3. サイトの機能

| 画面 | 内容 |
|---|---|
| ホーム | 問題数、回答済み数、直近の正答率、前回の模擬試験の結果 |
| 学習モード | 分野・出題範囲・問題形式・対象（未回答 / 直近で不正解 / ブックマーク）で絞り込み、1 問ずつ回答して**すぐに正誤・解説・公式ドキュメント・学習ノートへのリンク**を表示 |
| 模擬試験 | 分野の配点（中央値）に比例して出題。100 分を基準に問題数に比例したタイマー、見直しマーク、問題一覧。最後にまとめて採点し、分野別の得点率と 80% 未満の出題範囲を表示 |
| 網羅状況 | 27 項目ごとの問題数・問題形式・自分の正答率。項目ごとに練習へ移動 |

採点は**部分点あり**です（複数選択は「正解の選択数 − 誤りの選択数」、はい / いいえ・並べ替え・対応付け・穴埋めは項目ごと）。
「正解」と表示されるのは満点のときだけです。

## 4. 問題形式（スキーマ）

本番の試験の問題形式に対応する 6 種類＋ケーススタディです。

| `type` | 表示名 | 本番の形式 | 主な用途 |
|---|---|---|---|
| `single` | 単一選択 | Multiple choice | サービス・設定の選択 |
| `multiple` | 複数選択 | Multiple choice（複数） | 「2 つ選べ」 |
| `yesno` | はい / いいえ | 問題と解決策のセット、Hot area | 仕様・既定値の正誤 |
| `order` | 並べ替え | Build list | 手順の順序、KQL の組み立て |
| `match` | 対応付け | Drag and drop | 要件 ↔ 機能、状態 ↔ 原因 |
| `dropdown` | 穴埋め（コード） | Hot area（コード） | CLI / SDK / YAML / SQL / KQL を読む問題 |
| （`case` 属性） | ケーススタディ | Case study | 複数分野にまたがる設計判断 |

### 共通フィールド

```yaml
- id: d-pg-opclass            # 一意。英小文字・数字・ハイフン。接頭辞: c(分野1) d(分野2) s(分野3) m(分野4) x(ケース)
  objective: "2.7"            # questions/objectives.yml の id（必須）
  type: single                # 上の表のいずれか（必須）
  difficulty: 2               # 1=基本 2=標準 3=応用（省略時 2）
  tags: [postgresql, pgvector]
  case: fabrikam-agent-backend   # 任意。questions/cases.yml の id
  question: |                 # Markdown（コード ブロック、`code`、**太字**、箇条書き、リンク）
    ...
  explanation: |              # Markdown。なぜ正しいか / なぜ他が違うかを書く（必須）
    ...
  refs:                       # 公式ドキュメントなどの https URL（1 つ以上必須）
    - https://learn.microsoft.com/...
```

### 形式ごとのフィールド

**single / multiple**: 選択肢は A から順に並べ、`answer` は文字で指定します（表示時はシャッフル。`shuffle: false` で固定）。

```yaml
  type: multiple
  options:
    - "Enterprise クラスタリング ポリシー"
    - "NoEviction 追い出しポリシー"
    - "OSS クラスタリング ポリシー"
  answer: [A, B]          # single なら answer: B
```

**yesno**:

```yaml
  type: yesno
  statements:
    - text: "Basic 層ではトピックを使える。"
      answer: false
    - text: "ロック期間の最大値は 5 分である。"
      answer: true
```

**order**（`items` は正しい順序で書く。表示時にシャッフル。`distractors` は紛らわしい不要な項目）:

```yaml
  type: order
  items:
    - "サーバー パラメーター azure.extensions に VECTOR を追加する"
    - "CREATE EXTENSION vector; を実行する"
    - "vector(1536) 列を持つテーブルを作る"
  distractors:
    - "サーバーを Burstable 層に変更する"
```

**match**（右側の選択肢は `pairs` の right と `distractors` から作られる。同じ right を複数の left に使ってもよい）:

```yaml
  type: match
  pairs:
    - left: "livenessProbe"
      right: "コンテナーを再起動する"
    - left: "readinessProbe"
      right: "Service のエンドポイントから外す"
  distractors:
    - "Pod を別のノードに移動する"
```

**dropdown**（`template` の `{{キー}}` がドロップダウンになる）:

```yaml
  type: dropdown
  language: kusto
  template: |
    requests
    | where timestamp > {{1}}(24h)
    | summarize p95 = {{2}}(duration, 95) by bin(timestamp, 5m)
  blanks:
    "1": {options: [ago, now, datetime], answer: ago}
    "2": {options: [percentile, avg, max], answer: percentile}
```

**ケーススタディ**: `questions/cases.yml` にシナリオ（概要・現在の構成・要件）を書き、問題側で `case: <id>` を指定します。模擬試験では同じケースの問題がまとめて出題されます。

## 5. 検証ルール（CI で失敗するもの）

`scripts/build_questions.py` が次をチェックし、1 つでも違反があれば CI が失敗します。

- 必須フィールド（`id` / `objective` / `type` / `question` / `explanation` / `refs`）がある
- `id` が一意で形式が正しい
- `objective` が `objectives.yml` に存在する、`case` が `cases.yml` に存在する
- 形式ごとの整合性（正解の文字が選択肢の範囲内、single は正解 1 つ、multiple は 2 つ以上、穴埋めの `{{キー}}` と `blanks` が一致し、正解が選択肢に含まれる、など）
- `refs` が https の URL
- **網羅**: 27 項目すべてに `min_questions`（現在 15）問以上ある

## 6. 問題の作り方（ガイドライン）

1. **出題範囲から作る**: [01-skills-outline.md](01-skills-outline.md) の項目と、分野ノートの「判断ポイント」「ひっかけポイント」を元にする。
2. **事実は公式ドキュメントで確認する**: 数値・既定値・制限は Microsoft Learn で確認し、`refs` に URL を入れる。
3. **オリジナルで作る**: 実際の試験問題（いわゆる dump）を転載・再現しない。
4. **解説で「なぜ他が違うか」も書く**: 誤答の選択肢も、よくある誤解をもとに作る。
5. **形式を混ぜる**: 1 つの項目に、選択問題だけでなく yesno / match / dropdown などを混ぜると理解が深まる。
6. **公式の日本語表記に合わせる**: 用語は [01-skills-outline.md の用語対応表](01-skills-outline.md#日本語版ドキュメントの用語対応) を参考にする。

## 7. ローカルでの確認

```bash
pip install pyyaml
```

```bash
python3 scripts/build_questions.py
```

```bash
python3 -m http.server -d site 8000
```

ブラウザーで <http://localhost:8000/> を開きます（`file://` で直接開くとデータを読み込めません）。検証だけなら `python3 scripts/build_questions.py --check` です。

## 8. 公開（GitHub Pages）

1. GitHub のリポジトリで **Settings → Pages → Build and deployment → Source** を **GitHub Actions** にする（初回のみ）。
2. デフォルト ブランチに push すると、ワークフロー **Quiz site** が検証 → ビルド → デプロイを行う。Pull Request では検証とビルドだけ行う。
3. 手動で再デプロイする場合は Actions タブから **Quiz site** を **Run workflow**。

## 9. 現在の収録状況

`python3 scripts/build_questions.py` の出力で確認できます（2026-10-31 時点）。

| 項目 | 数 |
|---|---|
| 問題数 | 500 |
| 出題範囲の網羅 | 27 / 27 項目（各 15 問以上） |
| 分野別 | 分野 1: 125 / 分野 2: 208 / 分野 3: 83 / 分野 4: 84（ケーススタディ 21 問を含む） |
| 形式 | 単一選択 352 / 複数選択 13 / はい・いいえ 60 / 並べ替え 13 / 対応付け 30 / 穴埋め 32 |
| 難易度 | 1（基本）16 / 2（標準）224 / 3（応用）260 |
| ケーススタディ | 3 シナリオ・21 問 |

問題は、用語の暗記ではなく「なぜその選択になるのか」を問う形にしています（症状から原因を特定する、要件から構成を選ぶ、設定値から結果を計算する、など）。解説では正解の理由に加えて、誤答の選択肢がなぜ違うのかも説明しています。

今後の拡充の目安: 複数選択・並べ替えの問題と、分野 3・4 の応用問題を増やす。
