import { LightningElement, api } from 'lwc';
import { subscribe, unsubscribe, onError } from 'lightning/empApi';

export default class OpportunityCelebration extends LightningElement {
    @api recordId;

    channelName = '/data/OpportunityChangeEvent';
    subscription = null;
    showCelebration = false;
    confettiPieces = [];
    hideTimer;

    colors = [
        '#ff1744', '#ff9100', '#ffea00', '#00e676',
        '#00b0ff', '#d500f9', '#f50057', '#00bfa5'
    ];

    connectedCallback() {
        this.registerErrorListener();
        this.subscribeToChanges();
    }

    disconnectedCallback() {
        if (this.subscription) {
            unsubscribe(this.subscription, () => {
                this.subscription = null;
            });
        }

        clearTimeout(this.hideTimer);
    }

    subscribeToChanges() {
        subscribe(this.channelName, -1, (event) => {
            this.handleOpportunityChange(event);
        })
            .then((response) => {
                this.subscription = response;
                console.log('Subscribed to Opportunity Change Events');
                console.log('Current Opportunity ID:', this.recordId);
            })
            .catch((error) => {
                console.error('Subscription failed:', error);
            });
    }

    registerErrorListener() {
        onError((error) => {
            console.error('Change event error:', error);
        });
    }

    handleOpportunityChange(event) {
        const payload = event?.data?.payload;
        const header = payload?.ChangeEventHeader;

        if (!header || !header.recordIds) {
            return;
        }

        console.log('Opportunity event received:', payload);
        console.log('Changed fields:', header.changedFields);

        const currentRecordChanged =
            header.recordIds.includes(this.recordId);

        const changedFields = header.changedFields || [];

        const stageChanged = changedFields.some(
            (field) => field.toLowerCase() === 'stagename'
        );

        if (currentRecordChanged && stageChanged) {
            this.startCelebration();
        }
    }

    startCelebration() {
        clearTimeout(this.hideTimer);

        this.confettiPieces = Array.from({ length: 100 }, (_, index) => {
            const left = Math.random() * 100;
            const drift = Math.random() * 300 - 150;
            const duration = 2 + Math.random() * 3;
            const delay = Math.random() * 0.8;
            const rotation = 360 + Math.random() * 720;
            const color = this.colors[
                Math.floor(Math.random() * this.colors.length)
            ];

            return {
                id: index,
                style: `
                    left: ${left}%;
                    --drift: ${drift}px;
                    --duration: ${duration}s;
                    --delay: ${delay}s;
                    --rotation: ${rotation}deg;
                    --confetti-color: ${color};
                `
            };
        });

        this.showCelebration = true;

        this.hideTimer = setTimeout(() => {
            this.showCelebration = false;
            this.confettiPieces = [];
        }, 5000);
    }
}