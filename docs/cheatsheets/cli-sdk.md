# Azure CLI / SDK 早見表

「このコマンド（コード）は何をするか」を即答できるようにするための一覧です。

## Azure CLI

### コンテナ

| コマンド | 何をするか |
|---|---|
| `az acr create --sku Basic\|Standard\|Premium` | レジストリ作成 |
| `az acr login -n <acr>` | Docker で ACR にサインイン（Docker が必要。なければ `--expose-token`） |
| `az acr build -r <acr> -t app:{{.Run.ID}} .` | クイックタスク: Azure 上でビルドしてプッシュ |
| `az acr run -r <acr> -f acr-task.yaml .` | マルチステップタスクを 1 回実行 |
| `az acr run -r <acr> --cmd '$Registry/app:v1' /dev/null` | レジストリのイメージを Azure 上で実行 |
| `az acr task create ... --context <git-url> --git-access-token` | コミット / ベースイメージ更新トリガー付きのタスク |
| `az acr task timer add --schedule "<cron>"` | タイマートリガーを追加 |
| `az acr import --source docker.io/...` | 外部レジストリからイメージを取り込み |
| `az acr repository show-tags` / `az acr manifest list-metadata` | タグ / マニフェスト一覧 |
| `az acr repository update --write-enabled false` | タグ・イメージをロック |
| `az webapp create --container-image-name <image>` | コンテナの Web アプリを作成 |
| `az webapp config set --generic-configurations '{"acrUseManagedIdentityCreds": true}'` | ACR からマネージド ID でプル |
| `az webapp config appsettings set --settings K=V` | アプリ設定（＝環境変数） |
| `az webapp deployment container config --enable-cd true` | ACR からの継続的デプロイ |
| `az webapp log tail` | ログストリーム |
| `az containerapp env create` | Container Apps 環境 |
| `az containerapp create --ingress external --target-port 8000 --registry-identity system` | コンテナアプリ作成 |
| `az containerapp update --image ... --revision-suffix v2` | 新しいリビジョン |
| `az containerapp revision set-mode --mode multiple` | 複数リビジョンモード |
| `az containerapp ingress traffic set --revision-weight a=80 b=20` | トラフィック分割 |
| `az containerapp revision label add --label canary --revision <rev>` | ラベル付け |
| `az containerapp revision restart` | リビジョン再起動（シークレット変更の反映） |
| `az containerapp secret set --secrets k=v` | シークレット設定（新しいリビジョンは作られない） |
| `--scale-rule-type azure-servicebus --scale-rule-metadata ... --scale-rule-auth ...` | KEDA スケールルール |
| `az containerapp logs show --follow [--type system]` | ログのストリーム |
| `az containerapp exec --command sh` | コンテナ内でコマンド実行 |
| `az aks create --attach-acr <acr>` / `az aks update --attach-acr` | AKS に ACR のプル権限 |
| `az aks get-credentials` | kubeconfig を取得 |
| `az aks check-acr --acr <acr>.azurecr.io` | AKS から ACR への接続確認 |

### データ

| コマンド | 何をするか |
|---|---|
| `az cosmosdb create --capabilities EnableNoSQLVectorSearch` | ベクトル検索を有効にしたアカウント |
| `az cosmosdb sql role assignment create --role-definition-name "Cosmos DB Built-in Data Contributor"` | データプレーンの RBAC |
| `az postgres flexible-server parameter set --name azure.extensions --value VECTOR,...` | 拡張機能を許可リストへ |
| `az postgres flexible-server parameter set --name pgbouncer.enabled --value true` | 組み込み PgBouncer を有効化（6432） |
| `az redisenterprise create --sku Balanced_B1 --clustering-policy EnterpriseCluster --modules name=RediSearch` | AMR を RediSearch 付きで作成 |

### サービス接続

| コマンド | 何をするか |
|---|---|
| `az servicebus queue create --max-delivery-count --lock-duration --enable-duplicate-detection --enable-dead-lettering-on-message-expiration` | キューの作成と主要設定 |
| `az servicebus topic subscription rule create --filter-sql-expression "..."` | SQL フィルター |
| `az eventgrid topic create --input-schema cloudeventschemav1_0` | カスタムトピック（CloudEvents） |
| `az eventgrid event-subscription create --included-event-types --subject-begins-with --advanced-filter --max-delivery-attempts --event-ttl --deadletter-endpoint` | サブスクリプションのフィルター・再試行・配信不能 |
| `az functionapp create --flexconsumption-location <region>` | Flex Consumption の関数アプリ |
| `func azure functionapp publish <app>` | Core Tools でデプロイ |
| `az functionapp deployment source config-zip` | ZIP デプロイ |

### セキュリティ・監視

| コマンド | 何をするか |
|---|---|
| `az keyvault create --enable-rbac-authorization true --enable-purge-protection true` | RBAC と消去保護付きのボールト |
| `az keyvault secret set --expires` / `show` / `list-versions` / `delete` / `recover` | シークレットの操作 |
| `az keyvault key rotation-policy update` | キーの自動ローテーション |
| `az appconfig kv set --label prod` | ラベル付きのキーと値 |
| `az appconfig kv set-keyvault --secret-identifier <uri>` | Key Vault 参照 |
| `az appconfig feature set` | 機能フラグ |
| `az appconfig snapshot create` | スナップショット |
| `az role assignment create --role "Key Vault Secrets User"` | ロールの割り当て |
| `az webapp identity assign` / `az containerapp identity assign` / `az functionapp identity assign` | マネージド ID の有効化 |

## kubectl

| コマンド | 何をするか |
|---|---|
| `kubectl apply -f <file>` | マニフェストを適用 |
| `kubectl get pods -o wide` / `get svc` / `get endpoints <svc>` | 状態確認（エンドポイントが空なら selector / readiness） |
| `kubectl describe pod <pod>` | Events で原因を見る |
| `kubectl logs <pod> [-c <container>] --previous` | 直前にクラッシュしたコンテナのログ |
| `kubectl get events --sort-by=.metadata.creationTimestamp` | イベントを時系列で |
| `kubectl exec -it <pod> -- sh` | コンテナ内で調査 |
| `kubectl port-forward svc/<svc> 8080:80` | 手元から Service へ |
| `kubectl rollout status / history / undo deployment/<name>` | ロールアウトの確認と巻き戻し |
| `kubectl set image deployment/<name> <container>=<image>` | イメージ更新 |
| `kubectl scale deployment/<name> --replicas=5` | 手動スケール |
| `kubectl top pod` | CPU / メモリ |

## SDK（Python）

| パッケージ / クラス | 主なメソッド |
|---|---|
| `azure-identity`: `DefaultAzureCredential`, `ManagedIdentityCredential` | `get_token(scope)` |
| `azure-cosmos`: `CosmosClient` → `DatabaseProxy` → `ContainerProxy` | `create_container_if_not_exists(..., vector_embedding_policy=...)`, `upsert_item`, `read_item`, `query_items(query, parameters, partition_key)`, `query_items_change_feed` |
| `psycopg` / `psycopg_pool` / `pgvector.psycopg` | `ConnectionPool(..., connection_class=...)`, `register_vector(conn)`, `conn.execute(sql, params)` |
| `redis` / `redis-entraid` | `Redis(host, port=10000, ssl=True, credential_provider=...)`, `set(k, v, ex=)`, `get`, `unlink`, `expire`, `xadd`, `xreadgroup`, `xack`, `ft(index).search(Query(...).dialect(2), query_params=...)` |
| `azure-servicebus`: `ServiceBusClient` | `get_queue_sender` → `send_messages`; `get_queue_receiver(sub_queue=...)` → `complete_message` / `abandon_message` / `defer_message` / `dead_letter_message` |
| `azure-eventgrid`: `EventGridPublisherClient` | `send(CloudEvent(...))` |
| `azure-functions`: `FunctionApp` | `@app.route`, `@app.service_bus_queue_trigger`, `@app.event_grid_trigger`, `@app.timer_trigger`, `@app.cosmos_db_trigger`, `@app.*_output` |
| `azure-keyvault-secrets`: `SecretClient` | `get_secret(name, version=None)`, `set_secret`, `list_properties_of_secret_versions`, `begin_delete_secret`, `begin_recover_deleted_secret` |
| `azure-appconfiguration-provider` | `load(endpoint, credential, selects, trim_prefixes, refresh_on=[WatchKey()], refresh_interval, keyvault_credential, feature_flag_enabled)`, `refresh()` |
| `azure-monitor-opentelemetry` | `configure_azure_monitor()` |
| `opentelemetry` | `trace.get_tracer()`, `start_as_current_span(name, kind=)`, `set_attribute`, `add_event`, `record_exception`, `set_status` |

## SDK（.NET）で名前が違うもの

| 概念 | .NET |
|---|---|
| Cosmos DB のクライアント | `CosmosClient`（シングルトン）、`Container.GetItemQueryIterator<T>(QueryDefinition)`、`ReadItemAsync<T>(id, new PartitionKey(pk))` |
| 変更フィードプロセッサ | `Container.GetChangeFeedProcessorBuilder<T>(name, handler).WithInstanceName().WithLeaseContainer().Build()` |
| Service Bus | `ServiceBusClient`, `ServiceBusSender`, `ServiceBusProcessor`, `ServiceBusReceiverOptions { SubQueue = SubQueue.DeadLetter }` |
| Redis | `ConnectionMultiplexer`（シングルトン）、`IDatabase.StringSetAsync(key, value, TimeSpan)` |
| OpenTelemetry | `AddOpenTelemetry().UseAzureMonitor()`、スパン = `Activity`、`ActivitySource.StartActivity()`、`SetTag()` |
| Key Vault | `SecretClient.GetSecretAsync(name)` |
