defmodule JesRealtime.Application do
  @moduledoc """
  OTP Application Supervisor.
  Starts: Phoenix Endpoint, Redis subscribers, ScyllaDB pool.
  """
  use Application

  @impl true
  def start(_type, _args) do
    children = [
      # PubSub for internal channel broadcasting
      {Phoenix.PubSub, name: JesRealtime.PubSub},

      # Redis connection for caching
      {Redix, {redis_url(), [name: :redix]}},

      # Redis Pub/Sub subscriber (listens for Rust events)
      {JesRealtime.RedisBus, []},

      # ScyllaDB connection pool
      {Xandra.Cluster, scylla_config()},

      # Phoenix HTTP/WebSocket endpoint
      JesRealtimeWeb.Endpoint,
    ]

    opts = [strategy: :one_for_one, name: JesRealtime.Supervisor]
    Supervisor.start_link(children, opts)
  end

  defp redis_url do
    System.get_env("REDIS_URL") || "redis://localhost:6379"
  end

  defp scylla_config do
    [
      name: :xandra_cluster,
      nodes: [System.get_env("SCYLLA_HOST") || "localhost:9042"],
      pool_size: 10,
      authentication: {
        Xandra.Authenticator.Password,
        [
          username: System.get_env("SCYLLA_USER") || "cassandra",
          password: System.get_env("SCYLLA_PASS") || "cassandra",
        ]
      }
    ]
  end
end
