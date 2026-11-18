declare module "@salesforce/apex/PdfController.uploadPdf" {
  export default function uploadPdf(param: {opportunityId: any, fileName: any, base64Data: any}): Promise<any>;
}
declare module "@salesforce/apex/PdfController.saveExtractedText" {
  export default function saveExtractedText(param: {opportunityId: any, extractedText: any}): Promise<any>;
}
