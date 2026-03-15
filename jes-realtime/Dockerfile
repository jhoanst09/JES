# ==========================================
# Stage 1: Build
# ==========================================
FROM elixir:1.16-slim AS builder

RUN apt-get update && apt-get install -y git build-essential && rm -rf /var/lib/apt/lists/*

WORKDIR /app

ENV MIX_ENV=prod

# Install hex + rebar
RUN mix local.hex --force && mix local.rebar --force

# Cache dependencies
COPY mix.exs mix.lock* ./
RUN mix deps.get --only prod && mix deps.compile

# Build release
COPY config ./config
COPY lib ./lib
RUN mix release

# ==========================================
# Stage 2: Runtime
# ==========================================
FROM debian:bookworm-slim

RUN apt-get update && apt-get install -y libstdc++6 openssl libncurses5 locales ca-certificates \
    && rm -rf /var/lib/apt/lists/* \
    && sed -i '/en_US.UTF-8/s/^# //g' /etc/locale.gen \
    && locale-gen

ENV LANG=en_US.UTF-8
ENV LANGUAGE=en_US:en
ENV LC_ALL=en_US.UTF-8

COPY --from=builder /app/_build/prod/rel/jes_realtime ./app

ENV PORT=4001
EXPOSE 4001

HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
    CMD curl -f http://localhost:4001/health || exit 1

CMD ["/app/bin/jes_realtime", "start"]
