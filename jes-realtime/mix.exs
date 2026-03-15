defmodule JesRealtime.MixProject do
  use Mix.Project

  def project do
    [
      app: :jes_realtime,
      version: "0.1.0",
      elixir: "~> 1.16",
      start_permanent: Mix.env() == :prod,
      deps: deps()
    ]
  end

  def application do
    [
      extra_applications: [:logger, :runtime_tools]
    ]
  end

  defp deps do
    [
      {:phoenix, "~> 1.7"},
      {:phoenix_pubsub, "~> 2.1"},
      {:jason, "~> 1.4"},
      {:plug_cowboy, "~> 2.7"},
      {:corsica, "~> 2.1"},
      {:redix, "~> 1.5"},
      {:xandra, "~> 0.19"},
      {:elixir_uuid, "~> 1.2"},
      {:decimal, "~> 2.0"},
      {:joken, "~> 2.6"},
      {:jose, "~> 1.11"}
    ]
  end
end
