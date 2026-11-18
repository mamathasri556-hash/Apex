import { LightningElement, api, wire } from 'lwc';

import doSomething from '@salesforce/apex/OpportunityStageName.doSomething';

import HEALTH_FIELD from '@salesforce/schema/Opportunity.Health__c';
import HEALTH_ISSUES_FIELD from '@salesforce/schema/Opportunity.healthissues__c';

import { getPicklistValues } from 'lightning/uiObjectInfoApi';


export default class Opportunity extends LightningElement {

    @api recordId;
    @api selectedHealth;
    @api selectedHealthIssue;

    stageName;
    recordTypeId;

    healthOptions = [];
    healthIssueOptions = [];

    healthPickListData;
    healthIssuesPickListData;


    // Get Stage Name and Record Type from current Opportunity
    connectedCallback() {

        doSomething({
            recordId: this.recordId
        })
        .then((result) => {

            if (result) {

                this.stageName = result.stageName;
                this.recordTypeId = result.recordTypeId;

                console.log('Stage:', this.stageName);
                console.log('Record Type:', this.recordTypeId);
            }
        })
        .catch((error) => {
            console.log('Apex Error:', error);
        });
    }


    // StageName → Health__c
    @wire(getPicklistValues, {
        recordTypeId: '$recordTypeId',
        fieldApiName: HEALTH_FIELD
    })
    wiredHealthPicklist({ data, error }) {

        if (data) {

            this.healthPickListData = data;

            console.log('FULL HEALTH DATA:', data);
            console.log('STAGE NAME:', this.stageName);
            console.log(
                'CONTROLLER VALUES:',
                data.controllerValues
            );

            const controllerIndex =
                data.controllerValues[this.stageName];

            console.log(
                'CONTROLLER INDEX:',
                controllerIndex
            );

            if (controllerIndex !== undefined) {

                this.healthOptions = data.values
                    .filter(value =>
                        value.validFor.includes(controllerIndex)
                    )
                    .map(value => ({
                        label: value.label,
                        value: value.value
                    }));

                console.log(
                    'HEALTH OPTIONS:',
                    this.healthOptions
                );

            } else {

                this.healthOptions = [];

                console.log(
                    'No Health values found for Stage:',
                    this.stageName
                );
            }
        }

        if (error) {

            console.log(
                'Health Picklist Error:',
                error
            );

            this.healthOptions = [];
        }
    }


    // Health__c → healthissues__c
    @wire(getPicklistValues, {
        recordTypeId: '$recordTypeId',
        fieldApiName: HEALTH_ISSUES_FIELD
    })
    wiredHealthIssuesPicklist({ data, error }) {

        if (data) {

            this.healthIssuesPickListData = data;

            console.log(
                'HEALTH ISSUE FULL DATA:',
                data
            );

            console.log(
                'HEALTH ISSUE CONTROLLER VALUES:',
                data.controllerValues
            );

            this.updateHealthIssuesOptions();
        }

        if (error) {

            console.log(
                'Health Issues Picklist Error:',
                error
            );

            this.healthIssueOptions = [];
        }
    }


    // Get Health Issues based on selected Health
    updateHealthIssuesOptions() {

        if (
            !this.healthIssuesPickListData ||
            !this.selectedHealth
        ) {

            this.healthIssueOptions = [];

            return;
        }


        const controllerIndex =
            this.healthIssuesPickListData.controllerValues[
                this.selectedHealth
            ];

        console.log(
            'SELECTED HEALTH:',
            this.selectedHealth
        );

        console.log(
            'HEALTH ISSUE CONTROLLER INDEX:',
            controllerIndex
        );


        if (controllerIndex === undefined) {

            this.healthIssueOptions = [];

            console.log(
                'No Health Issues found for Health:',
                this.selectedHealth
            );

            return;
        }


        this.healthIssueOptions =
            this.healthIssuesPickListData.values
                .filter(value =>
                    value.validFor.includes(controllerIndex)
                )
                .map(value => ({
                    label: value.label,
                    value: value.value
                }));


        console.log(
            'HEALTH ISSUE OPTIONS:',
            this.healthIssueOptions
        );
    }


    // Health selected
    handleHealthChange(event) {

        this.selectedHealth =
            event.detail.value;

        // Reset Health Issue
        this.selectedHealthIssue = null;

        // Load dependent Health Issues
        this.updateHealthIssuesOptions();
    }


    // Health Issue selected
    handleHealthIssueChange(event) {

        this.selectedHealthIssue =
            event.detail.value;
    }

}