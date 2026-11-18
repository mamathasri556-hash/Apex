import { LightningElement, api} from 'lwc';
import extractPdfText from '@salesforce/apex/PdfController.extractpdfText';
export default class Pdftext extends LightningElement {
    @api recordId; 
    showUploader = false; 
    openFileUpload(){
        this.showUploader =true;

    }  
    closeFileUpload(){
        this.showUploader = false;
    }
    handleUploadFinished(event) {
    alert('handleUploadFinished called'); 
      console.log('UPLOAD EVENT:', JSON.stringify(event.detail));

    const documentId = event.detail.files[0].documentId;
    alert('Document Id: ' + documentId);

    extractPdfText({
        contentDocumentId: documentId,
        recordId: this.recordId
    })
    .then(() => {
        alert('Apex Success');
    })
    .catch(error => {
    alert(
        'Status: ' +
        error?.body?.message
    );
    console.error('Full Error:', JSON.stringify(error));
});
    
}
}