# 分野 1: Develop containerized solutions on Azure（20–25%）

> 対応する公式項目: 1.1〜1.7 / Learn ラーニングパス: #1 App Service コンテナ、#2 Container Apps、#3 AKS

## 0. 出題範囲

| ID | 原文 | 和訳 |
|---|---|---|
| 1.1 | Build, store, version, and manage container images by using Azure Container Registry | ACR でイメージをビルド・保存・バージョン管理・管理する |
| 1.2 | Build and run images by using Azure Container Registry Tasks | ACR Tasks でイメージをビルド・実行する |
| 1.3 | Deploy containers to Azure App Service, including configuring App Service to supply environment variables and secrets | App Service にコンテナをデプロイする（環境変数・シークレットの受け渡しを含む） |
| 1.4 | Deploy applications to Azure Container Apps, including environment configuration and revision management | Container Apps にデプロイする（環境構成・リビジョン管理を含む） |
| 1.5 | Implement event-driven scaling by using Kubernetes Event‑driven Autoscaling (KEDA) in Container Apps | Container Apps で KEDA によるイベント駆動スケーリングを実装する |
| 1.6 | Deploy and manage applications to Azure Kubernetes Service (AKS) by using manifest files | マニフェストで AKS にデプロイ・管理する |
| 1.7 | Monitor and troubleshoot solutions on AKS and Container Apps by inspecting logs, events, and end-to-end connectivity | ログ・イベント・接続性から AKS と Container Apps を監視・トラブルシュートする |

## 1. 全体像

```
ソースコード ──(az acr build / ACR Tasks)──▶ Azure Container Registry
                                              │  マネージド ID + AcrPull でプル
              ┌───────────────────────────────┼──────────────────────────────┐
              ▼                               ▼                              ▼
     App Service（単体の Web/API）   Container Apps（サーバーレス、      AKS（Kubernetes API を
     環境変数 = アプリ設定            KEDA、リビジョン、Dapr）           直接使う。GPU・細かな制御）
```

**ホスティング先の選び方（最頻出）**

| 要件 | 選ぶもの |
|---|---|
| 1 つの Web アプリ / API をコンテナで動かしたい。デプロイスロット・Easy Auth など App Service の機能を使いたい | **App Service（Linux コンテナ）** |
| マイクロサービス、キューの長さに応じた自動スケール、0 までスケールイン、Kubernetes を意識したくない | **Container Apps** |
| Kubernetes API・マニフェスト・カスタムオペレーター・GPU ノードプール・ノードレベルの制御が必要 | **AKS** |
| 短時間で終わるバッチ処理・イベントで起動するジョブ | **Container Apps Jobs** |

---

## 2. 重要概念

### 2.1 Azure Container Registry（1.1）

| 項目 | 内容 |
|---|---|
| ログインサーバー | `<registry>.azurecr.io`（レジストリ名は 5〜50 文字の英数字） |
| SKU | **Basic**（学習・小規模）/ **Standard**（多くの本番）/ **Premium**（ストレージとスループット最大、**geo レプリケーション**、**Private Link（プライベートエンドポイント）**）。API と機能の基本は同じ |
| SKU 変更 | ダウンタイムなし。Premium から下げると Premium 専用機能は無効になる |
| リポジトリ / タグ / ダイジェスト | `myreg.azurecr.io/app:1.4.2`。タグは付け替え可能、**ダイジェスト（`@sha256:...`）は不変** |
| タグ戦略 | **安定タグ**（`latest`, `1.4`）は更新され続ける。**一意タグ**（ビルド ID や Git SHA）は本番デプロイ向け。デプロイ後に中身が変わらない |
| ロック | `az acr repository update --image app:1.4.2 --write-enabled false` で上書き・削除を禁止 |
| インポート | `az acr import` で Docker Hub や他の ACR から Docker なしで取り込み |
| マルチアーキテクチャ | 1 つのタグで linux/amd64 と linux/arm64 を含むマニフェストリストを扱える |
| OCI アーティファクト | Helm チャート、署名、SBOM なども保存できる |

**認証方式**

| 方式 | 用途 | メモ |
|---|---|---|
| `az acr login`（個人の Entra ID） | 開発者の手元 | Docker が必要。トークンは約 3 時間 |
| **マネージド ID + `AcrPull` ロール** | App Service / Container Apps / AKS からのプル | **推奨**。シークレット不要 |
| サービスプリンシパル | CI/CD（GitHub Actions など） | `AcrPush` を付与 |
| 管理者ユーザー | テスト用 | **既定で無効**。1 つの資格情報を共有するため本番では非推奨 |
| リポジトリスコープのトークン | 特定リポジトリだけに権限を出す | スコープマップで pull/push を指定 |

主な組み込みロール: `AcrPull`（プル）、`AcrPush`（プル＋プッシュ）、`AcrDelete`（削除）。

### 2.2 ACR Tasks（1.2）

| 種類 | コマンド | 用途 |
|---|---|---|
| **クイックタスク** | `az acr build` | ローカルに Docker がなくても、Azure 上でビルドしてプッシュ（`docker build` と同じ書式） |
| コンテナを 1 回実行 | `az acr run --cmd` | レジストリ上のイメージを Azure 上で実行 |
| **自動トリガータスク** | `az acr task create` | ソースのコミット、ベースイメージ更新、タイマーで自動ビルド |
| **マルチステップタスク** | `az acr run -f acr-task.yaml` / `az acr task create --file acr-task.yaml` | ビルド → テスト → プッシュなどを YAML で定義 |

**トリガー**

| トリガー | 既定 | メモ |
|---|---|---|
| ソースコードのコミット | 有効 | GitHub / Azure DevOps。Webhook 設定に PAT が必要 |
| プルリクエスト | **無効** | |
| ベースイメージの更新 | 有効 | OS / フレームワークのパッチを自動で取り込む（例: `python:3.12-slim` が更新されたら再ビルド） |
| タイマー | — | `--schedule "0 21 * * *"`（cron、UTC） |

変数: `az acr build` / タスクでは `{{.Run.ID}}`、`{{.Run.Registry}}`。YAML では `$ID`、`$Registry`。

### 2.3 App Service でのコンテナ（1.3）

| 項目 | 内容 |
|---|---|
| プラン | Linux の App Service プラン（Basic 以上。本番は Premium v3 など） |
| イメージのプル | システム割り当てまたはユーザー割り当て**マネージド ID に `AcrPull`** を付与し、`acrUseManagedIdentityCreds=true` を設定 |
| **アプリ設定 → 環境変数** | アプリ設定はコンテナに**環境変数として渡される** |
| 接続文字列 | 種類に応じたプレフィックス付きの環境変数になる（例: `CUSTOMCONNSTR_`, `SQLAZURECONNSTR_`, `POSTGRESQLCONNSTR_`） |
| スロット設定 | 「デプロイ スロットの設定」にチェックした設定はスロットに固定され、スワップで入れ替わらない |
| **Key Vault 参照** | 値を `@Microsoft.KeyVault(SecretUri=https://<kv>.vault.azure.net/secrets/<name>)` または `@Microsoft.KeyVault(VaultName=<kv>;SecretName=<name>)` にする。アプリのマネージド ID に `Key Vault Secrets User` が必要（ユーザー割り当て ID を使うなら `keyVaultReferenceIdentity` を設定）。**バージョンを省略すると 24 時間以内に最新版へ自動更新**（App Service が値を 24 時間キャッシュするため）。アプリの構成を変更すると再起動して即座に再取得。すぐ反映したいときは `config/configreferences/appsettings/refresh` API を POST。解決できないと参照文字列そのものが値になる |
| ポート | 80 / 8080 以外で待ち受ける場合は `WEBSITES_PORT` を設定 |
| 永続ストレージ | `WEBSITES_ENABLE_APP_SERVICE_STORAGE=true` で `/home` を永続化（カスタムコンテナでは既定 false） |
| 起動待ち時間 | `WEBSITES_CONTAINER_START_TIME_LIMIT`（既定 230 秒、最大 1800 秒） |
| 継続的デプロイ | `az webapp deployment container config --enable-cd true` で ACR の Webhook を受けて新しいイメージを自動プル |
| Always On | アイドル時にアンロードされないようにする（Basic 以上） |
| 正常性チェック | ヘルスチェックパスを設定すると、異常なインスタンスをロードバランサーから外す |
| ログ | `az webapp log config --docker-container-logging filesystem` → `az webapp log tail`。Kudu（`https://<app>.scm.azurewebsites.net`）で診断 |

### 2.4 Azure Container Apps（1.4）

**構成要素**

| 用語 | 説明 |
|---|---|
| **環境（Environment）** | 複数のコンテナアプリが共有する境界。同じ VNet・同じ Log Analytics ワークスペースを使う。**ワークロードプロファイル**（Consumption / Dedicated / GPU）を選ぶ |
| コンテナアプリ | 1 つ以上のコンテナ（サイドカー可）からなるアプリ |
| **リビジョン** | アプリの不変のスナップショット。リビジョンスコープの変更で新しいリビジョンが作られる |
| レプリカ | リビジョンのインスタンス。スケールで増減する |
| イングレス | `external`（インターネット公開）/ `internal`（環境内のみ）。`--target-port` でコンテナのポートを指定 |
| Dapr | サービス呼び出し、pub/sub、状態管理などのサイドカー |
| ジョブ | 手動 / スケジュール / イベント駆動で起動し、終了するコンテナ |

**リビジョンスコープとアプリケーションスコープ（頻出）**

| 変更 | スコープ | 新しいリビジョン |
|---|---|---|
| イメージ、環境変数、CPU / メモリ、スケールルール、プローブ、コンテナの追加 | **リビジョンスコープ**（`properties.template`） | **作られる** |
| **シークレット**、イングレス、レジストリの資格情報、リビジョンモード、Dapr の設定 | **アプリケーションスコープ**（`properties.configuration`） | **作られない** |

> **アプリのシークレットを直接変更しても、既存のリビジョンには反映されない。** 反映するには**新しいリビジョンをデプロイする**か、**既存リビジョンを再起動**する。
> 例外: **バージョンなしの Key Vault 参照**のシークレットは、Key Vault に新しいバージョンができると **30 分以内に自動で取得され、そのシークレットを環境変数で参照しているアクティブなリビジョンが自動で再起動**される。

**リビジョンモード**

| モード | 動作 | 用途 |
|---|---|---|
| **Single**（既定） | 新しいリビジョンが準備できるまで旧リビジョンが 100% のトラフィックを受け、準備後に切り替える（ダウンタイムなし） | 普通のデプロイ |
| **Multiple** | 複数のリビジョンを同時にアクティブにでき、**トラフィックを % で分割**できる | ブルーグリーン、カナリア、A/B テスト |
| Labels（プレビュー） | `dev` / `staging` / `prod` などのラベルでリビジョンを管理 | ステージング昇格、ロールバック |

- **ラベル**: リビジョンに固有の URL を付ける。ラベルを別のリビジョンに移しても URL は変わらない。1 つのラベルは 1 リビジョンだけ。
- 非アクティブなリビジョンは既定で **100 個**まで保持（`--max-inactive-revisions` で変更）。

**シークレット**

- アプリケーションスコープで定義し、環境変数から `secretref:<名前>` で参照。
- 本番では値を直接書かず **Key Vault 参照**: `--secrets "db-pass=keyvaultref:<シークレットURI>,identityref:<ID または system>"`。マネージド ID に `Key Vault Secrets User` が必要。URI にバージョンを付けなければ最新版を使い（30 分以内に更新を検知）、付ければそのバージョンに固定される。
- `secretRef` の名前は**大文字小文字を区別して**シークレット名と完全一致させる（一致しないと環境変数が空になる）。
- RBAC の割り当てが反映されるまで最大 10 分ほどかかることがある。
- シークレットをボリュームとしてマウントすることもできる。

### 2.5 KEDA によるスケーリング（1.5）

| 設定 | 既定値 | 範囲 |
|---|---|---|
| 最小レプリカ数 | **0** | 0〜 |
| 最大レプリカ数 | **10** | 1〜**1,000** |
| HTTP ルール `concurrentRequests` | **10** | 1〜 |
| TCP ルール `concurrentConnections` | **10** | 1〜 |
| カスタム（KEDA）ルールのポーリング間隔 | **30 秒** | |
| カスタム（KEDA）ルールのクールダウン | **300 秒** | **最後の 1 レプリカから 0 にするときだけ**適用 |

- ルールの種類: **HTTP**、**TCP**、**カスタム**（KEDA の ScaledObject ベースのスケーラー: `azure-servicebus`、`azure-queue`、`azure-eventhub`、`redis`、`cron`、CPU / メモリなど）。
- HTTP の同時リクエスト数は 15 秒ごとに「直近 15 秒のリクエスト数 ÷ 15」で計算。
- **複数のルールがある場合、どれか 1 つの条件を満たせばスケールアウト**する。
- スケーラーの認証は **シークレット参照（`auth` / `secretRef`）** か **マネージド ID（`identity`）**。
- `minReplicas: 0` なら HTTP ルールやイベント駆動（KEDA）ルールで **0 までスケールイン**できる。ただし **CPU / メモリのルールだけでは 0 にできない**（0 レプリカでは CPU 使用率を測れないため）。常に 1 つは動かしたい（コールドスタートを避けたい）なら `minReplicas >= 1`。
- Container Apps Jobs は HTTP / TCP のスケールルールに**対応しない**（イベント駆動ジョブは KEDA スケーラーで起動）。
- Functions を Container Apps でホストした場合は、トリガーから自動でスケールルールが作られる。

### 2.6 AKS とマニフェスト（1.6）

**よく使うリソース**

| リソース | 役割 | 試験で問われる点 |
|---|---|---|
| **Deployment** | Pod のレプリカ数とローリング更新を管理 | `selector.matchLabels` と `template.metadata.labels` の一致、`resources`、`env` / `envFrom`、プローブ |
| **Service** | Pod へ安定した宛先を提供 | `ClusterIP`（既定・クラスター内のみ）/ `NodePort` / **`LoadBalancer`（Azure のパブリック IP を払い出す）**。`selector` が Pod のラベルと一致しないとエンドポイントが空 |
| Ingress | HTTP(S) のルーティング | AKS のアプリケーションルーティングアドオン（マネージド NGINX）など |
| **ConfigMap** | 機密でない設定 | 環境変数（`configMapKeyRef` / `envFrom`）またはファイルとしてマウント |
| **Secret** | 機密情報 | 値は **base64 エンコードされているだけ**（暗号化ではない）。Key Vault と連携するなら **Secrets Store CSI Driver（Key Vault プロバイダー）** |
| **PersistentVolumeClaim** | 永続ストレージ | `managed-csi`（Azure Disk、**ReadWriteOnce**、1 ノードから）/ `azurefile-csi`（Azure Files、**ReadWriteMany**、複数 Pod で共有） |
| HorizontalPodAutoscaler | CPU などで Pod 数を自動調整 | AKS では KEDA アドオンも使える |

**プローブ**

| プローブ | 失敗したとき | 用途 |
|---|---|---|
| `livenessProbe` | **コンテナを再起動** | デッドロックからの回復 |
| `readinessProbe` | **Service のエンドポイントから外す**（再起動はしない） | 起動直後やモデル読み込み中にトラフィックを受けない |
| `startupProbe` | 成功するまで他のプローブを止める | 起動が遅いアプリ（大きなモデルの読み込み） |

**ローリング更新**: `strategy.type: RollingUpdate`、既定は `maxSurge: 25%` / `maxUnavailable: 25%`。`kubectl rollout undo` で戻せる。

**AKS と ACR の連携**: `az aks create/update --attach-acr <acr>` で、kubelet のマネージド ID に `AcrPull` を付与する。

**Pod から Azure リソースへのアクセス**: **Microsoft Entra Workload ID**（サービスアカウントに `azure.workload.identity/client-id` 注釈、Pod に `azure.workload.identity/use: "true"` ラベル、フェデレーション資格情報）。

### 2.7 監視とトラブルシュート（1.7）

**AKS: 症状 → 原因 → 調べ方**

| 症状（Pod の状態など） | よくある原因 | 調べ方 / 対処 |
|---|---|---|
| `ImagePullBackOff` / `ErrImagePull` | イメージ名・タグの誤り、**ACR へのプル権限がない** | `kubectl describe pod` の Events。`az aks update --attach-acr`、`az aks check-acr` |
| `CrashLoopBackOff` | アプリが起動直後に落ちる（設定漏れ、例外） | **`kubectl logs <pod> --previous`** で前回のコンテナのログを見る |
| `Pending` | リソース（CPU / メモリ）不足、PVC がバインドされない、ノードセレクターに合うノードがない | `kubectl describe pod` の Events（`FailedScheduling`）、`kubectl get pvc` |
| `OOMKilled`（終了コード 137） | メモリ limit 超過 | `resources.limits.memory` を見直す |
| `CreateContainerConfigError` | 参照している ConfigMap / Secret（のキー）がない | `kubectl describe pod` |
| Service に繋がらない | **Service の `selector` と Pod のラベルが一致しない**、readiness が失敗している、`targetPort` の誤り | `kubectl get endpoints <svc>`（空なら selector か readiness を疑う）、`kubectl port-forward`、`kubectl exec` で curl |
| LoadBalancer の外部 IP が `<pending>` | パブリック IP の払い出し中・失敗 | `kubectl describe svc` の Events |

**Azure Monitor（AKS）**: Container Insights を有効にすると Log Analytics に **`ContainerLogV2`**（コンテナの stdout/stderr）、`KubePodInventory`、`KubeEvents`、`KubeNodeInventory`、`InsightsMetrics` などが入る。メトリックは Azure Monitor managed service for Prometheus と Managed Grafana。

**Container Apps**

| やりたいこと | 方法 |
|---|---|
| アプリのログをリアルタイムで見る | `az containerapp logs show -n <app> -g <rg> --follow`（`--type console` が既定。`--type system` でシステムログ） |
| コンテナ内でコマンドを実行 | `az containerapp exec -n <app> -g <rg> --command sh` |
| Log Analytics で調べる | **`ContainerAppConsoleLogs_CL`**（アプリの出力）/ **`ContainerAppSystemLogs_CL`**（イメージのプル失敗、プローブ失敗、スケールなどのシステムイベント）。診断設定経由の場合は `ContainerAppConsoleLogs` / `ContainerAppSystemLogs` |
| リビジョンの状態 | `az containerapp revision list`（`Provisioning` / `Running` / `Failed` / `Degraded`） |
| よくある失敗 | イメージのプル失敗（レジストリの資格情報・ID）、`--target-port` とアプリの待ち受けポートの不一致、プローブの失敗、環境変数・シークレットの不足 |

---

## 3. 実装パターン

### 3.1 ACR と ACR Tasks

```bash
# レジストリを作成
az acr create -g rg-ai200 -n myreg --sku Standard

# クイックタスク: Azure 上でビルドしてプッシュ（ローカルに Docker 不要）
az acr build -r myreg -t api:{{.Run.ID}} -t api:latest .

# 別のレジストリ（Docker Hub など）からインポート
az acr import -n myreg --source docker.io/library/python:3.12-slim --image base/python:3.12-slim

# GitHub へのコミットとベースイメージ更新で自動ビルド
az acr task create -r myreg -n build-api \
  --image api:{{.Run.ID}} \
  --context https://github.com/<org>/<repo>.git#main \
  --file Dockerfile \
  --git-access-token $GITHUB_PAT

# 毎日 21:00 UTC に実行するタイマー
az acr task timer add -r myreg -n build-api --timer-name nightly --schedule "0 21 * * *"

# 手動実行とログ
az acr task run -r myreg -n build-api
az acr task logs -r myreg

# タグとマニフェストの一覧
az acr repository show-tags -n myreg --repository api --orderby time_desc
az acr manifest list-metadata -r myreg -n api
```

マルチステップタスク（`acr-task.yaml`）:

```yaml
version: v1.1.0
steps:
  - build: -t $Registry/api:$ID -f Dockerfile .
  - cmd: $Registry/api:$ID python -m pytest   # ビルドしたイメージでテスト
  - push:
    - $Registry/api:$ID
```

```bash
az acr run -r myreg -f acr-task.yaml .
```

### 3.2 App Service（コンテナ）

```bash
az appservice plan create -g rg-ai200 -n plan-ai200 --is-linux --sku P1v3
az webapp create -g rg-ai200 -p plan-ai200 -n app-ai200 \
  --container-image-name myreg.azurecr.io/api:42

# マネージド ID で ACR からプル
az webapp identity assign -g rg-ai200 -n app-ai200
az role assignment create --assignee <principalId> --role AcrPull --scope <acrのリソースID>
az webapp config set -g rg-ai200 -n app-ai200 --generic-configurations '{"acrUseManagedIdentityCreds": true}'

# 環境変数（アプリ設定）と Key Vault 参照
az webapp config appsettings set -g rg-ai200 -n app-ai200 --settings \
  WEBSITES_PORT=8000 \
  OPENAI_ENDPOINT=https://example.openai.azure.com/ \
  DB_PASSWORD="@Microsoft.KeyVault(SecretUri=https://kv-ai200.vault.azure.net/secrets/db-password)"

# ログ
az webapp log config -g rg-ai200 -n app-ai200 --docker-container-logging filesystem
az webapp log tail -g rg-ai200 -n app-ai200
```

### 3.3 Container Apps

```bash
az containerapp env create -g rg-ai200 -n env-ai200 -l japaneast

az containerapp create -g rg-ai200 -n api --environment env-ai200 \
  --image myreg.azurecr.io/api:42 \
  --registry-server myreg.azurecr.io --registry-identity system \
  --ingress external --target-port 8000 \
  --min-replicas 0 --max-replicas 20 \
  --secrets "sb-conn=keyvaultref:https://kv-ai200.vault.azure.net/secrets/sb-conn,identityref:system" \
  --env-vars "SB_CONNECTION=secretref:sb-conn" "LOG_LEVEL=info"

# Service Bus キューのメッセージ数でスケール（KEDA）
az containerapp update -g rg-ai200 -n worker \
  --scale-rule-name sb-queue \
  --scale-rule-type azure-servicebus \
  --scale-rule-metadata "queueName=inference" "namespace=sb-ai200" "messageCount=5" \
  --scale-rule-auth "connection=sb-conn"

# 複数リビジョンでカナリア
az containerapp revision set-mode -g rg-ai200 -n api --mode multiple
az containerapp update -g rg-ai200 -n api --image myreg.azurecr.io/api:43 --revision-suffix v43
az containerapp ingress traffic set -g rg-ai200 -n api --revision-weight api--v42=90 api--v43=10
az containerapp revision label add -g rg-ai200 -n api --label canary --revision api--v43

# シークレット変更を反映するために再起動
az containerapp revision restart -g rg-ai200 -n api --revision api--v43

# ログ
az containerapp logs show -g rg-ai200 -n api --follow
az containerapp logs show -g rg-ai200 -n api --type system
```

YAML のスケール部分（`properties.template.scale`）:

```yaml
scale:
  minReplicas: 0
  maxReplicas: 20
  rules:
    - name: http-rule
      http:
        metadata:
          concurrentRequests: "50"
    - name: sb-queue
      custom:
        type: azure-servicebus
        metadata:
          queueName: inference
          namespace: sb-ai200
          messageCount: "5"
        identity: system        # または auth: [{secretRef: sb-conn, triggerParameter: connection}]
```

### 3.4 AKS

```bash
az aks create -g rg-ai200 -n aks-ai200 --node-count 2 --attach-acr myreg --generate-ssh-keys
az aks get-credentials -g rg-ai200 -n aks-ai200
kubectl apply -f k8s/
```

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: api-config
data:
  LOG_LEVEL: "info"
  EMBEDDING_MODEL: "text-embedding-3-small"
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: api
spec:
  replicas: 3
  selector:
    matchLabels:
      app: api              # ← template のラベルと一致させる
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxSurge: 1
      maxUnavailable: 0
  template:
    metadata:
      labels:
        app: api
    spec:
      containers:
        - name: api
          image: myreg.azurecr.io/api:42
          ports:
            - containerPort: 8000
          envFrom:
            - configMapRef:
                name: api-config
          env:
            - name: DB_PASSWORD
              valueFrom:
                secretKeyRef:
                  name: api-secrets
                  key: db-password
          resources:
            requests: { cpu: "250m", memory: "512Mi" }
            limits:   { cpu: "1",    memory: "1Gi" }
          readinessProbe:
            httpGet: { path: /ready, port: 8000 }
            periodSeconds: 5
          livenessProbe:
            httpGet: { path: /healthz, port: 8000 }
            initialDelaySeconds: 10
---
apiVersion: v1
kind: Service
metadata:
  name: api
spec:
  type: LoadBalancer        # 外部公開。クラスター内だけなら ClusterIP
  selector:
    app: api                # ← Pod のラベルと一致させる
  ports:
    - port: 80              # Service のポート
      targetPort: 8000      # コンテナのポート
---
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: model-cache
spec:
  accessModes: ["ReadWriteMany"]
  storageClassName: azurefile-csi
  resources:
    requests:
      storage: 50Gi
```

トラブルシュートの定番コマンド:

```bash
kubectl get pods -o wide
kubectl describe pod <pod>                    # Events に原因が出る
kubectl logs <pod> -c api --previous          # 落ちる前のログ
kubectl get events --sort-by=.metadata.creationTimestamp
kubectl get endpoints api                     # 空なら selector / readiness を疑う
kubectl exec -it <pod> -- sh                  # コンテナ内から curl などで疎通確認
kubectl port-forward svc/api 8080:80          # 手元から Service を叩く
kubectl rollout status deployment/api
kubectl rollout undo deployment/api
kubectl top pod                               # CPU / メモリ（metrics-server）
```

---

## 4. 判断ポイント（要件 → 選択）

| 要件 | 選ぶもの | 理由 |
|---|---|---|
| CI サーバーに Docker がないがイメージを作りたい | `az acr build` | Azure 上でビルドする |
| ベースイメージのセキュリティパッチを自動で取り込みたい | ACR Task（ベースイメージ更新トリガー） | 既定で有効 |
| 本番デプロイのイメージを後から変わらないようにしたい | 一意タグ（ビルド ID）またはダイジェスト指定 ＋ タグのロック | 安定タグは上書きされる |
| 複数リージョンから低遅延でプルしたい | ACR **Premium** の geo レプリケーション | Premium 限定 |
| レジストリをインターネットから遮断したい | ACR **Premium** + プライベートエンドポイント | Premium 限定 |
| App Service / Container Apps が資格情報なしで ACR からプル | マネージド ID + `AcrPull` | 管理者ユーザーは非推奨 |
| コンテナアプリにパスワードを渡したい（Key Vault で管理） | App Service: Key Vault 参照 / Container Apps: `keyvaultref:` シークレット | どちらもマネージド ID と `Key Vault Secrets User` が必要 |
| 新バージョンに 10% だけ流したい | Container Apps の **Multiple** リビジョンモード + トラフィック分割 | Single では分割できない |
| Service Bus のキューが溜まったらワーカーを増やし、空なら 0 に | Container Apps の KEDA `azure-servicebus` ルール、`minReplicas: 0` | |
| 起動に 2 分かかる推論コンテナが再起動ループする | `startupProbe` を追加（または liveness の初期遅延を延ばす） | liveness が早すぎる |
| 起動中の Pod にトラフィックを送りたくない | `readinessProbe` | 再起動ではなくエンドポイントから外す |
| 複数 Pod で同じファイル（モデルキャッシュ）を共有 | PVC `azurefile-csi`（ReadWriteMany） | Azure Disk は 1 ノードのみ |
| AKS の Pod から Key Vault をシークレットなしで読みたい | Workload ID（＋ Secrets Store CSI Driver） | |

## 5. ひっかけポイント

- **Container Apps でシークレットを更新しても新しいリビジョンは作られない。** 直接値を入れたシークレットを既存リビジョンに反映するには再起動か新リビジョンのデプロイが必要（バージョンなしの Key Vault 参照は 30 分以内に自動更新＋自動再起動）。
- 環境変数の変更は**リビジョンスコープ**なので新しいリビジョンが作られる（シークレットとの違い）。
- KEDA のクールダウン（300 秒）は**最後の 1 つから 0 にするときだけ**。
- Container Apps の最大レプリカの既定は 10。高負荷シナリオで「10 で頭打ち」になっていたら `maxReplicas` を上げる。
- `az acr login` は Docker が必要。Docker がない環境では `--expose-token`。
- ACR の**管理者ユーザーは既定で無効**。有効化は最後の手段。
- ACR Task のプルリクエストトリガーは**既定で無効**。
- Kubernetes の Secret は暗号化ではなく base64。
- `kubectl logs` で何も出ないクラッシュは `--previous` を付ける。
- Service の `port` はクライアントが使うポート、`targetPort` はコンテナが待ち受けるポート。
- App Service の Key Vault 参照で**バージョンを指定すると自動更新されない**。
- Basic SKU の ACR でも Entra 認証やマネージド ID は使える。geo レプリケーションとプライベートエンドポイントが Premium 限定。

## 6. 確認問題

<details><summary>Q1. GitHub Actions のランナーで Docker デーモンが使えない。リポジトリの Dockerfile からイメージを作って ACR に入れるコマンドは？</summary>

**答え**: `az acr build -r <registry> -t <image>:<tag> .`
**解説**: クイックタスクはソースをアップロードし、Azure 上でビルドしてプッシュする。`docker build` + `docker push` は Docker が必要。
</details>

<details><summary>Q2. Container Apps で `az containerapp secret set` によりシークレットの値（直接入力）を更新した。アプリの環境変数に反映されない。なぜか、どうするか。</summary>

**答え**: シークレットはアプリケーションスコープで、更新しても新しいリビジョンは作られず、既存のリビジョンにも自動では反映されないため。リビジョンを再起動（`az containerapp revision restart`）するか、新しいリビジョンをデプロイする。
**補足**: バージョンなしの Key Vault 参照なら、Key Vault 側の更新は 30 分以内に自動で取り込まれ、参照しているリビジョンは自動で再起動される。すぐに反映したい場合は手動で再起動する。
</details>

<details><summary>Q3. Container Apps のワーカーを、Service Bus キューにメッセージが 10 件たまるごとに 1 レプリカ増やし、キューが空なら 0 にしたい。設定は？</summary>

**答え**: カスタムスケールルール `type: azure-servicebus`、`metadata: queueName=<q>, messageCount=10`、認証はシークレット参照かマネージド ID、`minReplicas: 0`。
**解説**: HTTP ルールではキューの長さを見られない。KEDA のスケーラーを使う。
</details>

<details><summary>Q4. 新しいバージョンを 20% のユーザーにだけ公開し、問題がなければ 100% にしたい（Container Apps）。</summary>

**答え**: リビジョンモードを Multiple にし、`az containerapp ingress traffic set --revision-weight <旧>=80 <新>=20`。問題がなければ新を 100 に。
</details>

<details><summary>Q5. AKS の Pod が `ImagePullBackOff`。イメージ名は正しい。最も可能性の高い原因と対処は？</summary>

**答え**: AKS（kubelet の ID）に ACR のプル権限がない。`az aks update -n <aks> -g <rg> --attach-acr <acr>`（`AcrPull` を付与）。
</details>

<details><summary>Q6. Service を作ったが `kubectl get endpoints api` が空。考えられる原因を 2 つ。</summary>

**答え**: ① Service の `selector` が Pod のラベルと一致していない。② Pod の readinessProbe が失敗していて Ready になっていない。
</details>

<details><summary>Q7. Pod が `CrashLoopBackOff` を繰り返す。`kubectl logs <pod>` では何も分からない。次に打つコマンドは？</summary>

**答え**: `kubectl logs <pod> --previous`（クラッシュする前のコンテナのログ）と `kubectl describe pod <pod>`（終了コード、Events）。
</details>

<details><summary>Q8. App Service のコンテナアプリが Key Vault のシークレットを参照している。シークレットをローテーションしたら、自動的に最新値を使ってほしい。参照の書き方は？ すぐに反映したい場合は？</summary>

**答え**: バージョンを含めない URI を使う: `@Microsoft.KeyVault(SecretUri=https://<kv>.vault.azure.net/secrets/<name>)`。最新版が 24 時間以内に取り込まれる。すぐに反映したいなら、アプリの構成を変更して再起動させるか、参照のリフレッシュ API（`.../config/configreferences/appsettings/refresh`）を呼ぶ。
</details>

<details><summary>Q9. 毎晩、ベースイメージの更新がなくてもイメージを再ビルドしてスキャンしたい。</summary>

**答え**: ACR Task にタイマートリガーを追加（`az acr task timer add --schedule "<cron>"`、UTC）。
</details>

<details><summary>Q10. 大きなモデルを読み込むため起動に 3 分かかるコンテナが、AKS で liveness の失敗により再起動され続ける。</summary>

**答え**: `startupProbe` を設定する（`failureThreshold × periodSeconds` を 3 分以上に）。startup が成功するまで liveness は実行されない。
</details>

## 7. チェックリスト

- [ ] ACR の SKU ごとの違い（Premium 限定機能）を説明できる
- [ ] 安定タグと一意タグの違い、ダイジェストの意味を説明できる
- [ ] ACR への 5 種類の認証方式と推奨を説明できる
- [ ] `az acr build` / `az acr run` / `az acr task create` の違いと、3 種類のトリガーと既定値を言える
- [ ] マルチステップタスクの YAML（build / cmd / push）を読める
- [ ] App Service でアプリ設定が環境変数になること、Key Vault 参照の書式と必要な権限を説明できる
- [ ] Container Apps のリビジョンスコープとアプリケーションスコープの変更を区別できる
- [ ] Single / Multiple リビジョンモード、トラフィック分割、ラベルを説明できる
- [ ] スケールの既定値（min 0 / max 10 / 同時要求 10 / ポーリング 30 秒 / クールダウン 300 秒）を言える
- [ ] KEDA のカスタムルール（Service Bus）を YAML と CLI で書ける
- [ ] Deployment / Service / ConfigMap / Secret / PVC のマニフェストを読み書きできる
- [ ] 3 種類のプローブの違いを説明できる
- [ ] Pod の異常状態（ImagePullBackOff、CrashLoopBackOff、Pending、OOMKilled）の原因と調べ方を言える
- [ ] Container Apps のログテーブル（Console / System）と `az containerapp logs show` を使い分けられる

## 8. 公式リファレンス

- [Azure Container Registry service tiers](https://learn.microsoft.com/azure/container-registry/container-registry-skus)
- [Automate container image builds with ACR Tasks](https://learn.microsoft.com/azure/container-registry/container-registry-tasks-overview)
- [ACR Tasks YAML reference](https://learn.microsoft.com/azure/container-registry/container-registry-tasks-reference-yaml)
- [Configure a custom container for Azure App Service](https://learn.microsoft.com/azure/app-service/configure-custom-container)
- [Use Key Vault references in App Service](https://learn.microsoft.com/azure/app-service/app-service-key-vault-references)
- [Container Apps: revisions](https://learn.microsoft.com/azure/container-apps/revisions) / [scale rules](https://learn.microsoft.com/azure/container-apps/scale-app) / [secrets](https://learn.microsoft.com/azure/container-apps/manage-secrets)
- [AKS: Kubernetes core concepts](https://learn.microsoft.com/azure/aks/concepts-clusters-workloads) / [storage](https://learn.microsoft.com/azure/aks/concepts-storage) / [Workload ID](https://learn.microsoft.com/azure/aks/workload-identity-overview)
- [Container insights overview](https://learn.microsoft.com/azure/azure-monitor/containers/container-insights-overview)
