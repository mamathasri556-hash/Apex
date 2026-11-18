import { LightningElement, api } from 'lwc';
import { CloseActionScreenEvent } from 'lightning/actions';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import { notifyRecordUpdateAvailable } from 'lightning/uiRecordApi';
import uploadPdf from '@salesforce/apex/PdfController.uploadPdf';
import saveExtractedText from '@salesforce/apex/PdfController.saveExtractedText';

export default class PdfGeneration extends LightningElement {
    @api recordId;

    isProcessing = false;
    vfUrl = '';
    progressMessage = '';

    selectedFiles = [];
    fileItems = [];
    extractedParts = [];
    currentFileIndex = 0;

    connectedCallback() {
        window.addEventListener('message', this.handleWindowMessage);
    }

    disconnectedCallback() {
        window.removeEventListener('message', this.handleWindowMessage);
    }

    openFilePicker() {
        if (this.isProcessing) return;

        const input = this.template.querySelector(
            'input[type="file"]'
        );

        if (input) {
            input.click();
        }
    }

    async handleFileSelected(event) {
        const input = event.target;
        const files = Array.from(input.files || []);

        if (!files.length) return;

        if (this.isProcessing) {
            input.value = '';
            return;
        }

        if (!this.recordId || !this.recordId.startsWith('006')) {
            this.showError(
                'Please open this component from an Opportunity record.'
            );
            input.value = '';
            return;
        }

        for (const file of files) {
            if (
                file.type !== 'application/pdf' &&
                !file.name.toLowerCase().endsWith('.pdf')
            ) {
                this.showError(`${file.name} is not a PDF file.`);
                input.value = '';
                return;
            }

            if (file.size > 1500000) {
                this.showError(
                    `${file.name} exceeds the 1.5 MB limit.`
                );
                input.value = '';
                return;
            }
        }

        const existingKeys = new Set(
            this.selectedFiles.map(
                file =>
                    `${file.name}_${file.size}_${file.lastModified}`
            )
        );

        const newFiles = files.filter(
            file =>
                !existingKeys.has(
                    `${file.name}_${file.size}_${file.lastModified}`
                )
        );

        if (!newFiles.length) {
            this.showError(
                'These PDF files have already been selected.'
            );
            input.value = '';
            return;
        }

        // Keep files in browser memory only.
        // Do not upload until Save is clicked.
        this.selectedFiles = [
            ...this.selectedFiles,
            ...newFiles
        ];

        this.fileItems = this.selectedFiles.map(file => ({
            name: file.name,
            status: 'Waiting'
        }));

        this.progressMessage =
            `${this.selectedFiles.length} PDF file(s) selected.`;

        input.value = '';
    }

    // CANCEL: clear pending files and close the modal.
    handleCancel() {
        // Prevent closing while upload/extraction is running.
        if (this.isProcessing) {
            return;
        }

        const input = this.template.querySelector(
            'input[type="file"]'
        );

        if (input) {
            input.value = '';
        }

        this.selectedFiles = [];
        this.fileItems = [];
        this.extractedParts = [];
        this.currentFileIndex = 0;
        this.progressMessage = '';
        this.vfUrl = '';

        this.dispatchEvent(
            new CloseActionScreenEvent()
        );
    }

    // SAVE: begin upload and extraction.
    async handleUploadAll() {
        if (this.isProcessing) return;

        if (!this.selectedFiles.length) {
            this.showError('Please select at least one PDF file.');
            return;
        }

        if (!this.recordId || !this.recordId.startsWith('006')) {
            this.showError(
                'Please open this component from an Opportunity record.'
            );
            return;
        }

        this.currentFileIndex = 0;
        this.extractedParts = [];
        this.vfUrl = '';
        this.isProcessing = true;

        await this.processNextFile();
    }

    async processNextFile() {
        if (this.currentFileIndex >= this.selectedFiles.length) {
            await this.saveAllExtractedText();
            return;
        }

        const file = this.selectedFiles[this.currentFileIndex];
        this.vfUrl = '';

        this.progressMessage =
            `Processing PDF ${this.currentFileIndex + 1} of ` +
            `${this.selectedFiles.length}: ${file.name}`;

        this.updateFileStatus(file.name, 'Uploading');

        try {
            const base64Data = await this.readFileAsBase64(file);

            const contentVersionId = await uploadPdf({
                opportunityId: this.recordId,
                fileName: file.name,
                base64Data
            });

            if (
                !contentVersionId ||
                !contentVersionId.startsWith('068')
            ) {
                throw new Error(`Upload failed for ${file.name}.`);
            }

            this.updateFileStatus(file.name, 'Extracting text');

            const url = new URL(
                '/apex/PdfTextExtractor',
                window.location.origin
            );

            url.searchParams.set(
                'contentVersionId',
                contentVersionId
            );
            url.searchParams.set(
                'opportunityId',
                this.recordId
            );
            url.searchParams.set('fileName', file.name);

            await new Promise(resolve => setTimeout(resolve, 100));

            this.vfUrl = url.href;
        } catch (error) {
            this.failProcessing(
                error?.body?.message ||
                error?.message ||
                `Failed to process ${file.name}.`
            );
        }
    }

    handleWindowMessage = async event => {
        const iframe = this.template.querySelector('iframe');

        if (!iframe || event.source !== iframe.contentWindow) {
            return;
        }

        const message = event.data;

        if (
            !message ||
            message.type !== 'PDF_TEXT_EXTRACTION_COMPLETE' ||
            !this.isProcessing
        ) {
            return;
        }

        if (message.status !== 'success') {
            this.failProcessing(
                message.error || 'PDF text extraction failed.'
            );
            return;
        }

        const file = this.selectedFiles[this.currentFileIndex];

        if (!file) {
            this.failProcessing(
                'Unable to identify the current PDF.'
            );
            return;
        }

        const extractedText = (message.extractedText || '').trim();

        if (!extractedText) {
            this.failProcessing(
                `No selectable text found in ${file.name}.`
            );
            return;
        }

        const formattedText =
            this.formatExtractedText(extractedText);

        this.extractedParts.push(
            `<h2>${this.escapeHtml(file.name)}</h2>${formattedText}`
        );

        this.updateFileStatus(file.name, 'Text extracted');

        this.currentFileIndex++;
        this.vfUrl = '';

        await new Promise(resolve => setTimeout(resolve, 100));

        await this.processNextFile();
    };

    async saveAllExtractedText() {
        try {
            this.progressMessage =
                'Saving all extracted text to Opportunity...';

            const combinedText = this.extractedParts.join('');

            if (!combinedText.trim()) {
                throw new Error(
                    'No extracted PDF text is available.'
                );
            }

            await saveExtractedText({
                opportunityId: this.recordId,
                extractedText: combinedText
            });

            await notifyRecordUpdateAvailable([
                { recordId: this.recordId }
            ]);

            this.isProcessing = false;
            this.vfUrl = '';
            this.progressMessage = '';

            this.dispatchEvent(
                new ShowToastEvent({
                    title: 'Success',
                    message: 'Files uploaded successfully',
                    variant: 'success'
                })
            );

            this.dispatchEvent(
                new CloseActionScreenEvent()
            );
        } catch (error) {
            this.failProcessing(
                error?.body?.message ||
                error?.message ||
                'Failed to save extracted text.'
            );
        }
    }

    formatExtractedText(text) {
        if (!text) return '';

        const normalizedText = String(text)
            .replace(/\r\n/g, '\n')
            .replace(/\r/g, '\n');

        const escapedText = this.escapeHtml(normalizedText);

        return escapedText
            .split(/\n[ \t]*\n+/)
            .map(paragraph => paragraph.trim())
            .filter(paragraph => paragraph.length > 0)
            .map(paragraph =>
                `<p>${paragraph.replace(/\n/g, '<br/>')}</p>`
            )
            .join('');
    }

    escapeHtml(text) {
        return String(text)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    readFileAsBase64(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();

            reader.onload = () => {
                const result = reader.result;

                if (typeof result !== 'string') {
                    reject(
                        new Error(`Unable to read ${file.name}.`)
                    );
                    return;
                }

                const commaIndex = result.indexOf(',');

                if (commaIndex < 0) {
                    reject(
                        new Error(`Invalid PDF data for ${file.name}.`)
                    );
                    return;
                }

                const base64 = result.substring(commaIndex + 1);

                if (!base64) {
                    reject(
                        new Error(`Empty PDF data for ${file.name}.`)
                    );
                    return;
                }

                resolve(base64);
            };

            reader.onerror = () => {
                reject(
                    new Error(`Unable to read ${file.name}.`)
                );
            };

            reader.onabort = () => {
                reject(
                    new Error(`Reading ${file.name} was cancelled.`)
                );
            };

            reader.readAsDataURL(file);
        });
    }

    updateFileStatus(fileName, status) {
        this.fileItems = this.fileItems.map(item => ({
            ...item,
            status: item.name === fileName
                ? status
                : item.status
        }));
    }

    failProcessing(message) {
        this.isProcessing = false;
        this.vfUrl = '';
        this.progressMessage = '';
        this.showError(message);
    }

    showError(message) {
        this.dispatchEvent(
            new ShowToastEvent({
                title: 'PDF Processing Failed',
                message,
                variant: 'error'
            })
        );
    }
}