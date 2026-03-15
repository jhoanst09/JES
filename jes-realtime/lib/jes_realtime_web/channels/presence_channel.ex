defmodule JesRealtimeWeb.PresenceChannel do
  @moduledoc """
  Presence channel for real-time online status tracking.
  Uses Phoenix.Presence to handle millions of concurrent lightweight processes.

  Join: "presence:global"
  """
  use Phoenix.Channel
  alias JesRealtime.Presence

  @impl true
  def join("presence:global", _params, socket) do
    send(self(), :after_join)
    {:ok, socket}
  end

  @impl true
  def handle_info(:after_join, socket) do
    user_id = socket.assigns.user_id

    # Track this user's presence
    {:ok, _} = Presence.track(socket, user_id, %{
      online_at: System.system_time(:second),
      device: socket.assigns[:device] || "web",
    })

    # Push current presence list to the joining user
    push(socket, "presence_state", Presence.list(socket))

    {:noreply, socket}
  end
end

defmodule JesRealtime.Presence do
  @moduledoc """
  Phoenix Presence implementation.
  Tracks user online status across all connected sockets.
  Automatically handles presence_diff broadcasts.
  """
  use Phoenix.Presence,
    otp_app: :jes_realtime,
    pubsub_server: JesRealtime.PubSub
end
