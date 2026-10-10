import { Environment } from '@Bootstrap/Environment';
import { DbNumber } from '@Model/BeatmapsetModel';

export class WebhookService {
    static async sendRequestCreated(batchId: DbNumber): Promise<void> {
        const url = Environment.env.DISCORD_REQUEST_WEBHOOK_URL;
        if (!url) {
            return;
        }

        const description =
            `Request ID: ${batchId}\n` +
            `Status: pending\n` +
            `View: https://${Environment.env.DOMAIN}/request/status/${batchId}`;

        await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                embeds: [
                    {
                        title: 'New Beatmap Request',
                        description,
                        color: 0xFF0000,
                    },
                ],
            }),
        });
    }
}