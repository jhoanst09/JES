defmodule JesRealtimeWeb.UserSocket do
  @moduledoc """
  WebSocket handler. Authenticates users via JWT token
  and routes to appropriate channels.
  """
  use Phoenix.Socket

  channel "conv:*", JesRealtimeWeb.ChatChannel
  channel "presence:*", JesRealtimeWeb.PresenceChannel
  channel "user:*", JesRealtimeWeb.NotificationChannel

  @impl true
  def connect(%{"token" => token}, socket, _connect_info) do
    case JesRealtimeWeb.Auth.JwtVerify.verify(token) do
      {:ok, user_id} ->
        {:ok, assign(socket, :user_id, user_id)}

      {:error, _reason} ->
        :error
    end
  end

  def connect(_params, _socket, _connect_info), do: :error

  @impl true
  def id(socket), do: "user_socket:#{socket.assigns.user_id}"
end
