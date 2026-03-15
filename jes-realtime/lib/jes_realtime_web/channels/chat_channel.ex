defmodule JesRealtimeWeb.ChatChannel do
  @moduledoc """
  WebSocket channel for real-time messaging.
  Handles message sending, typing indicators, and read receipts.
  Messages are persisted to ScyllaDB for history.

  Join: "conv:{conversation_id}"
  """
  use Phoenix.Channel
  require Logger

  @impl true
  def join("conv:" <> conv_id, _params, socket) do
    # Load last 50 messages from ScyllaDB
    messages = load_recent_messages(conv_id, 50)

    socket =
      socket
      |> assign(:conv_id, conv_id)

    send(self(), :after_join)
    {:ok, %{messages: messages}, socket}
  end

  @impl true
  def handle_info(:after_join, socket) do
    # Track presence in this conversation
    Phoenix.PubSub.subscribe(JesRealtime.PubSub, "conv:#{socket.assigns.conv_id}")
    {:noreply, socket}
  end

  # Client sends a new message
  @impl true
  def handle_in("message", %{"content" => content} = payload, socket) do
    user_id = socket.assigns.user_id
    conv_id = socket.assigns.conv_id
    message_id = UUID.uuid4()
    now = DateTime.utc_now()

    # Build metadata map (includes media_id if present)
    metadata = case payload["media_id"] do
      nil -> %{}
      media_id -> %{"media_id" => media_id}
    end

    message = %{
      id: message_id,
      conversation_id: conv_id,
      sender_id: user_id,
      content: content,
      media_id: payload["media_id"],
      created_at: DateTime.to_iso8601(now),
    }

    # Persist to ScyllaDB (async, non-blocking)
    Task.start(fn -> persist_message(message, metadata) end)

    # Increment unread in Redis for other participants
    Task.start(fn -> increment_unread(conv_id, user_id) end)

    # Broadcast to all subscribers in this conversation
    broadcast!(socket, "message", message)

    # Notify offline participants via jes-core notification service
    Task.start(fn -> notify_offline_participants(conv_id, user_id, content) end)

    {:reply, {:ok, %{id: message_id}}, socket}
  end

  # Client typing indicator
  @impl true
  def handle_in("typing", _payload, socket) do
    broadcast_from!(socket, "typing", %{
      user_id: socket.assigns.user_id,
      is_typing: true,
    })
    {:noreply, socket}
  end

  # Client marks messages as read
  @impl true
  def handle_in("read", %{"message_id" => message_id}, socket) do
    user_id = socket.assigns.user_id
    conv_id = socket.assigns.conv_id

    # Update read state in Redis
    Task.start(fn ->
      Redix.command(:redix, [
        "SET",
        "readstate:#{user_id}:#{conv_id}",
        message_id,
        "EX",
        "604800"  # 7 days TTL
      ])
    end)

    # Clear unread count
    Task.start(fn ->
      Redix.command(:redix, ["HDEL", "unread:#{user_id}", conv_id])
    end)

    broadcast_from!(socket, "read", %{
      user_id: user_id,
      message_id: message_id,
    })

    {:noreply, socket}
  end

  # ==========================================
  # ScyllaDB Operations
  # ==========================================

  defp load_recent_messages(conv_id, limit) do
    query = """
    SELECT id, conversation_id, sender_id, content, metadata, created_at
    FROM messaging.messages
    WHERE conversation_id = ?
    ORDER BY created_at DESC
    LIMIT ?
    """

    case Xandra.Cluster.execute(:xandra_cluster, query, [
           {"uuid", conv_id},
           {"int", limit}
         ]) do
      {:ok, %Xandra.Page{} = page} ->
        Enum.map(page, fn row ->
          metadata = row["metadata"] || %{}
          %{
            id: row["id"],
            conversation_id: row["conversation_id"],
            sender_id: row["sender_id"],
            content: row["content"],
            media_id: metadata["media_id"],
            created_at: row["created_at"],
          }
        end)
        |> Enum.reverse()

      {:error, reason} ->
        Logger.error("[Chat] ScyllaDB query failed: #{inspect(reason)}")
        []
    end
  end

  defp persist_message(message, metadata \\ %{}) do
    query = """
    INSERT INTO messaging.messages (id, conversation_id, sender_id, content, metadata, created_at)
    VALUES (?, ?, ?, ?, ?, ?)
    """

    Xandra.Cluster.execute(:xandra_cluster, query, [
      {"uuid", message.id},
      {"uuid", message.conversation_id},
      {"uuid", message.sender_id},
      {"text", message.content},
      {"map<text, text>", metadata},
      {"timestamp", message.created_at},
    ])
  end

  defp increment_unread(conv_id, sender_id) do
    # Get participants from Redis or DB, increment unread for all except sender
    case Redix.command(:redix, ["SMEMBERS", "conv_members:#{conv_id}"]) do
      {:ok, member_ids} ->
        for member_id <- member_ids, member_id != sender_id do
          Redix.command(:redix, ["HINCRBY", "unread:#{member_id}", conv_id, 1])
        end

      {:error, _} ->
        Logger.warn("[Chat] Could not get conversation members for unread increment")
    end
  end

  # Send notification to offline participants via jes-core
  defp notify_offline_participants(conv_id, sender_id, content) do
    jes_core_url = System.get_env("JES_CORE_URL") || "http://localhost:4000"

    case Redix.command(:redix, ["SMEMBERS", "conv_members:#{conv_id}"]) do
      {:ok, member_ids} ->
        for member_id <- member_ids, member_id != sender_id do
          # Check if user is currently connected (has active presence)
          presence_key = "presence:#{member_id}"
          case Redix.command(:redix, ["EXISTS", presence_key]) do
            {:ok, 0} ->
              # User is offline — fire notification via jes-core
              truncated = String.slice(content || "", 0..80)
              body = Jason.encode!(%{
                "user_id" => member_id,
                "type" => "message",
                "message" => truncated,
                "actor_id" => sender_id,
                "action_url" => "/chat"
              })

              case :httpc.request(
                :post,
                {~c"#{jes_core_url}/api/notifications", [], ~c"application/json", body},
                [{:timeout, 5000}],
                []
              ) do
                {:ok, _} -> :ok
                {:error, reason} ->
                  Logger.warn("[Chat] Failed to notify offline user #{member_id}: #{inspect(reason)}")
              end

            _ ->
              # User is online, broadcast handles it
              :ok
          end
        end

      {:error, _} ->
        Logger.warn("[Chat] Could not get members for offline notification")
    end
  end
end
