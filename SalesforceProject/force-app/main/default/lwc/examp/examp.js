import { LightningElement } from 'lwc';

export default class Exampl extends LightningElement {

    sendData() {

        const evt = new CustomEvent('showname', {
            detail: {
                name: 'Mamatha'
            }
        });

        this.dispatchEvent(evt);
    }
}