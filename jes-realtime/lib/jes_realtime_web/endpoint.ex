defmodule JesRealtimeWeb.Endpoint do
  use Phoenix.Endpoint, otp_app: :jes_realtime

  socket "/socket", JesRealtimeWeb.UserSocket,
    websocket: [
      timeout: 45_000,
      compress: true,
      check_origin: false,
    ],
    longpoll: false

  plug Plug.RequestId
  plug Plug.Logger

  plug Corsica,
    origins: "*",
    allow_headers: ["content-type", "authorization"],
    allow_methods: ["GET", "POST", "OPTIONS"]

  plug Plug.Parsers,
    parsers: [:json],
    pass: ["application/json"],
    json_decoder: Jason

  # Health check
  plug :health_check

  defp health_check(%Plug.Conn{request_path: "/health"} = conn, _) do
    conn
    |> Plug.Conn.put_resp_content_type("application/json")
    |> Plug.Conn.send_resp(200, Jason.encode!(%{
      service: "jes-realtime",
      status: "healthy",
      channels: Phoenix.PubSub.node_name(JesRealtime.PubSub),
    }))
    |> Plug.Conn.halt()
  end

  defp health_check(conn, _), do: conn
end
