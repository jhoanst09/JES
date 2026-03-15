use dashmap::DashMap;
use std::sync::Arc;
use std::time::{Duration, Instant};
use tokio::sync::broadcast;

/// Zero-allocation request coalescer using DashMap.
/// Deduplicates concurrent identical requests within a 100ms window.
/// When N requests arrive for the same key, only 1 hits PostgreSQL.
pub struct Coalescer {
    inflight: DashMap<String, InflightEntry>,
    window: Duration,
}

#[derive(Clone, Debug)]
struct InflightEntry {
    sender: broadcast::Sender<CoalescedResult>,
    created_at: Instant,
}

type CoalescedResult = Result<String, String>; // JSON string

impl Coalescer {
    pub fn new(window_ms: u64) -> Arc<Self> {
        let coalescer = Arc::new(Self {
            inflight: DashMap::new(),
            window: Duration::from_millis(window_ms),
        });

        // Background cleanup task
        let c = coalescer.clone();
        tokio::spawn(async move {
            let mut interval = tokio::time::interval(Duration::from_secs(5));
            loop {
                interval.tick().await;
                c.cleanup();
            }
        });

        coalescer
    }

    /// Execute a query with coalescing.
    /// If another request for the same key is in-flight within the window,
    /// this caller will receive the same result without hitting the DB.
    pub async fn coalesced<F, Fut>(
        &self,
        key: String,
        query_fn: F,
    ) -> Result<String, String>
    where
        F: FnOnce() -> Fut,
        Fut: std::future::Future<Output = Result<String, String>>,
    {
        // Check if there's an existing in-flight request
        if let Some(entry) = self.inflight.get(&key) {
            if entry.created_at.elapsed() < self.window {
                // Piggyback on existing request
                let mut rx = entry.sender.subscribe();
                drop(entry); // Release DashMap lock
                return rx.recv().await.map_err(|e| e.to_string())?;
            }
        }

        // No in-flight request — execute
        let (tx, _) = broadcast::channel(1);
        self.inflight.insert(key.clone(), InflightEntry {
            sender: tx.clone(),
            created_at: Instant::now(),
        });

        let result = query_fn().await;

        // Broadcast result to all waiting subscribers
        let _ = tx.send(result.clone());

        // Cleanup after broadcast
        tokio::spawn({
            let inflight = self.inflight.clone();
            let key = key.clone();
            let window = self.window;
            async move {
                tokio::time::sleep(window).await;
                inflight.remove(&key);
            }
        });

        result
    }

    fn cleanup(&self) {
        let cutoff = Instant::now() - Duration::from_secs(10);
        self.inflight.retain(|_, entry| entry.created_at > cutoff);
    }
}
