defmodule JesRealtimeWeb.Auth.JwtVerify do
  @moduledoc """
  JWT verification for WebSocket connections.
  Validates tokens issued by the Rust core (jes-core).
  """

  @doc """
  Verify a JWT token and return the user_id.
  """
  def verify(token) when is_binary(token) do
    secret = System.get_env("JWT_SECRET") || "jes-dev-secret-change-in-prod"

    signer = Joken.Signer.create("HS256", secret)

    case Joken.verify(token, signer) do
      {:ok, claims} ->
        case claims do
          %{"sub" => user_id, "iss" => "jes"} ->
            {:ok, user_id}

          _ ->
            {:error, :invalid_claims}
        end

      {:error, reason} ->
        {:error, reason}
    end
  end

  def verify(_), do: {:error, :missing_token}
end
