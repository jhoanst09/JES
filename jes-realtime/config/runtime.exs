import Config

config :jes_realtime, JesRealtimeWeb.Endpoint,
  url: [host: "localhost"],
  http: [port: String.to_integer(System.get_env("PORT") || "4001")],
  server: true,
  secret_key_base: System.get_env("SECRET_KEY_BASE") || "jes-dev-secret-base-change-in-prod-at-least-64-chars-long-please",
  pubsub_server: JesRealtime.PubSub

config :jes_realtime, :json_library, Jason

config :logger, :console,
  format: "$time $metadata[$level] $message\n",
  metadata: [:request_id]
