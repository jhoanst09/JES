defmodule JesRealtimeWeb.NotificationChannel do
  @moduledoc """
  Per-user notification channel.
  Receives events forwarded from the Redis bus (Rust core events)
  and delivers them to the connected user's WebSocket.

  Join: "user:{user_id}"
  """
  use Phoenix.Channel
  require Logger

  @impl true
  def join("user:" <> user_id, _params, socket) do
    # Verify the user is joining their own channel
    if socket.assigns.user_id == user_id do
      # Subscribe to PubSub for this user
      Phoenix.PubSub.subscribe(JesRealtime.PubSub, "user:#{user_id}")
      {:ok, socket}
    else
      {:error, %{reason: "unauthorized"}}
    end
  end

  # Handle balance_update from Redis bus
  @impl true
  def handle_info({:balance_update, data}, socket) do
    push(socket, "balance_update", data)
    {:noreply, socket}
  end

  # Handle escrow events from Redis bus
  @impl true
  def handle_info({:escrow_event, data}, socket) do
    push(socket, "escrow_event", data)
    {:noreply, socket}
  end

  # Handle friend requests, generic notifications
  @impl true
  def handle_info({:notification, data}, socket) do
    push(socket, "notification", data)
    {:noreply, socket}
  end

  # Catch-all for unhandled messages
  @impl true
  def handle_info(msg, socket) do
    Logger.debug("[NotificationChannel] Unhandled: #{inspect(msg)}")
    {:noreply, socket}
  end
end
