import { LightningElement, api } from 'lwc';

export default class Createopportunity extends LightningElement {

    @api recordId;

    handleClick() {
        console.log('Account ID:', this.recordId);
    }
}