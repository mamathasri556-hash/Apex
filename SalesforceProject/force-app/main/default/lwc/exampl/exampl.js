import { LightningElement,api } from 'lwc';
export default class Exampl extends LightningElement {  
    @api name; 
    sendData() {
        const evt = new CustomEvent(
            'showname',
            {
                detail:{
                    name:'SalesForce'
                }
            }
        ); 
        this.dispatchEvent(evt);
    }


}