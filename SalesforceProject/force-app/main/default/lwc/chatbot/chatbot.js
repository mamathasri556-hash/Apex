import { LightningElement, api, wire } from 'lwc';
import getMessages from '@salesforce/apex/MessageController.doSomething';
import { getRecord } from 'lightning/uiRecordApi';
import whatsappIcon from '@salesforce/resourceUrl/WhatsappIcon';

const FIELDS = ['Account.Name'];

export default class Chatbot extends LightningElement {
    whatsappIcon = whatsappIcon;

    @api recordId;

    recordName;
    message = [];
    messageId = 0; 

    showModal = false;
    openModal(){
        this.showModal = true;

    } 
    closeModal(){
        this.showModal = false; 
    } 
    handleModalClick(event){
        event.stopPropagation();
    }
 
    @wire(getRecord, {
        recordId: '$recordId',
        fields: FIELDS
    })
    wiredAccount({ data, error }) {

        if (data) {
            this.recordName = data.fields.Name.value;

            // Load messages only after Account record is available
            this.loadMessages();

        } else if (error) {
            console.error('Account Error:', error);
        }
    }

    loadMessages() {

        if (!this.recordId) {
            return;
        }

        getMessages({
            accountId: this.recordId
        })
        .then(result => {

            this.message = [];
            this.messageId = 0;

            if (result && result.length > 0) {

                result.forEach(msg => {

                    const css =
                        msg.Direction__c === 'Inbound'
                            ? 'left-message'
                            : 'right-message';

                    this.message.push({
                        id: ++this.messageId,
                        text: msg.Message__c,
                        time: new Date(msg.CreatedDate).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit'
                        }),
                        cssClass: css
                    });
                });

            } else {

                this.message = [
                    {
                        id: ++this.messageId,
                        text: 'No Record Found',
                        time: '',
                        cssClass: 'left-message'
                    }
                ];
            }
        })
        .catch(error => {

            console.error('Apex Error:', error);

            this.message = [
                {
                    id: ++this.messageId,
                    text: error.body?.message || 'Error occurred',
                    time: '',
                    cssClass: 'left-message'
                }
            ];
        });
    }
}