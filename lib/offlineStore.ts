'use client';

interface QueuedRequest {
    id: string;
    url: string;
    method: string;
    body: any;
    timestamp: number;
}

const QUEUE_KEY = 'offline_request_queue';

export const queueRequest = (url: string, method: string, body: any) => {
    if (typeof window === 'undefined') return;

    const queue: QueuedRequest[] = JSON.parse(localStorage.getItem(QUEUE_KEY) || '[]');
    const newRequest: QueuedRequest = {
        id: Math.random().toString(36).substr(2, 9),
        url,
        method,
        body,
        timestamp: Date.now()
    };

    queue.push(newRequest);
    localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));

    if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('offline-queue-updated'));
    }
};

export const getQueuedRequests = (): QueuedRequest[] => {
    if (typeof window === 'undefined') return [];
    return JSON.parse(localStorage.getItem(QUEUE_KEY) || '[]');
};

export const clearQueuedRequest = (id: string) => {
    if (typeof window === 'undefined') return;
    const queue: QueuedRequest[] = JSON.parse(localStorage.getItem(QUEUE_KEY) || '[]');
    const filtered = queue.filter(req => req.id !== id);
    localStorage.setItem(QUEUE_KEY, JSON.stringify(filtered));
    window.dispatchEvent(new Event('offline-queue-updated'));
};

export const syncOfflineRequests = async () => {
    const queue = getQueuedRequests();
    if (queue.length === 0) return;

    console.log(`[OfflineSync] Attempting to sync ${queue.length} requests...`);

    for (const req of queue) {
        try {
            const response = await fetch(req.url, {
                method: req.method,
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(req.body)
            });

            if (response.ok) {
                clearQueuedRequest(req.id);
                console.log(`[OfflineSync] Successfully synced request ${req.id}`);
            }
        } catch (error) {
            console.error(`[OfflineSync] Sync failed for ${req.id}:`, error);
            // Keep in queue for next attempt
        }
    }
};
