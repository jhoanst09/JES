defmodule JesRealtime.RedisBus do
  @moduledoc """
  GenServer that subscribes to Redis Pub/Sub channels published by the Rust core.
  Forwards events to Phoenix channels for real-time client delivery.

  Channels:
    jes:balance_update  → Notify affected users of balance changes
    jes:escrow_event    → Notify buyer/seller of escrow state changes
  """
  use GenServer
  require Logger

  @channels ["jes:balance_update", "jes:escrow_event"]

  def start_link(_opts) do
    GenServer.start_link(__MODULE__, [], name: __MODULE__)
  end

  @impl true
  def init(_state) do
    redis_url = System.get_env("REDIS_URL") || "redis://localhost:6379"

    case Redix.PubSub.start_link(redis_url, name: :redix_pubsub) do
      {:ok, pubsub} ->
        # Subscribe to all channels
        for channel <- @channels do
          {:ok, _ref} = Redix.PubSub.subscribe(pubsub, channel, self())
        end

        Logger.info("[RedisBus] Subscribed to: #{inspect(@channels)}")
        {:ok, %{pubsub: pubsub}}

      {:error, reason} ->
        Logger.error("[RedisBus] Failed to connect: #{inspect(reason)}")
        {:ok, %{pubsub: nil}}
    end
  end

  @impl true
  def handle_info({:redix_pubsub, _pubsub, _ref, :subscribed, %{channel: channel}}, state) do
    Logger.debug("[RedisBus] Confirmed subscription: #{channel}")
    {:noreply, state}
  end

  @impl true
  def handle_info(
        {:redix_pubsub, _pubsub, _ref, :message, %{channel: channel, payload: payload}},
        state
      ) do
    case Jason.decode(payload) do
      {:ok, data} ->
        handle_event(channel, data)

      {:error, _} ->
        Logger.warn("[RedisBus] Invalid JSON on #{channel}: #{payload}")
    end

    {:noreply, state}
  end

  # Balance update from Rust core
  defp handle_event("jes:balance_update", %{"users" => user_ids}) do
    for user_id <- user_ids do
      Phoenix.PubSub.broadcast(
        JesRealtime.PubSub,
        "user:#{user_id}",
        {:balance_update, %{user_id: user_id}}
      )
    end
  end

  # Escrow event from Rust core
  defp handle_event("jes:escrow_event", %{"event" => event_type} = data) do
    buyer_id = data["buyer_id"]
    seller_id = data["seller_id"]

    for user_id <- [buyer_id, seller_id], user_id != nil do
      Phoenix.PubSub.broadcast(
        JesRealtime.PubSub,
        "user:#{user_id}",
        {:escrow_event, %{type: event_type, data: data}}
      )
    end
  end

  defp handle_event(channel, data) do
    Logger.debug("[RedisBus] Unhandled event on #{channel}: #{inspect(data)}")
  end
end
