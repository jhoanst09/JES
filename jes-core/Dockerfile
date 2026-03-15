FROM rustlang/rust:nightly-slim AS builder
RUN apt-get update && apt-get install -y pkg-config libssl-dev git && rm -rf /var/lib/apt/lists/*
WORKDIR /app
# Copiamos todo de una vez para evitar problemas de cach?
COPY . .
# Forzamos la compilaci?n del binario real
RUN cargo build --release

FROM debian:bookworm-slim
RUN apt-get update && apt-get install -y ca-certificates && rm -rf /var/lib/apt/lists/*
WORKDIR /app
# Buscamos el binario generado (aseg?rate que el nombre en Cargo.toml sea jes-core)
COPY --from=builder /app/target/release/jes-core .
RUN chmod +x ./jes-core
EXPOSE 4000
CMD ["./jes-core"]
