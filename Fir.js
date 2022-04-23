'use strict';

const { Contract } = require('fabric-contract-api');
const uuid         = require('uuid/v1');
const _            = require('lodash');

class Fir extends Contract {

    /** 
     * This function is used to register FIR by User
     * @param {*} ctx 
     * @param {String} aadharNumber - User aadhar card number.
     * @param {String} name  - User Name (hex required)
     * @param {String} emailId - User email
     * @param {String} description  -- hex needed
     * @param {String} state - Incident State
     * @param {String} city  - Incident city
     * @param {String} incidentDate - Incident Date
     * @param {String} suspects - suspects, if any (hex required)
     */
    async createFIRRequest(ctx, aadharNumber, name, mobileNum, incidentType, emailId, description, state, city, incidentDate, suspects) {
        console.info('============= START : createFIRRequest ===========');
        let generateUuid = uuid();
        const FIR = {
            uuid: generateUuid,
            aadharNumber,
            name: Buffer.from(name, "hex").toString('utf8'),
            mobileNum,
            typeOfRequest: 'FIR',
            incidentType,
            emailId,
            description: Buffer.from(description, "hex").toString('utf8'),
            state,
            city,
            incidentDate,
            registerDate: new Date(),
            suspects: JSON.parse(Buffer.from(suspects, "hex").toString('utf8')),
            FIRStatus: 'pending',
            policeStatement: '',
            finalCulprit: [],
            caseCloseDate: 'pending'
        };
        await ctx.stub.putState(generateUuid, Buffer.from(JSON.stringify(FIR)));
        console.info('============= END : Create FIR ===========');
    }

    /** 
     * This function returns all the FIRs registerd by user.
     * @param {*} ctx 
     * @param {String} aadharNumber - User aadhar card number.
     * @returns 
     */
    async getAllFIRRegisteredByUser(ctx, aadharNumber) {
        const startKey = '';
        const endKey = '';
        const allResults = [];
        for await (const { key, value } of ctx.stub.getStateByRange(startKey, endKey)) {
            const strValue = Buffer.from(value).toString('utf8');
            let record;
            try {
                record = JSON.parse(strValue);
            } catch (err) {
                console.log(err);
                record = strValue;
            }
            if (aadharNumber == record.aadharNumber && record.typeOfRequest == 'FIR')
                allResults.push({ Key: key, Record: record });
        }
        console.info(allResults);
        return JSON.stringify(allResults);
    }

    /** 
     * This function returns all FIRs registerd against user.
     * @param {*} ctx 
     * @param {String} aadharNumber - User aadhar card number.
     * @returns 
     */
    async getAllFIRRegisteredAgainstUser(ctx, aadharNumber) {
        const startKey = '';
        const endKey = '';
        const allResults = [];
        for await (const { key, value } of ctx.stub.getStateByRange(startKey, endKey)) {
            const strValue = Buffer.from(value).toString('utf8');
            let record;
            try {
                record = JSON.parse(strValue);
            } catch (err) {
                console.log(err);
                record = strValue;
            }
            if (record.typeOfRequest == 'FIR' && (_.includes(record.suspects, aadharNumber) || _.includes(record.finalCulprit, aadharNumber)))
                allResults.push({ Key: key, Record: record });
        }
        console.info(allResults);
        return JSON.stringify(allResults);
    }

    /**
     * Get FIR details if user register FIR or someone register against the user,
     * email is just extra security check otherwise frontend should not allow to user to view FIR details of user.
     * @param {*} ctx 
     * @param {*} uuid - FIR Id.
     * @param {*} aadharNumber - User aadhar card number.
     * @returns 
     */
    async getFIRDetailsByUser(ctx, uuid, aadharNumber) {
        const FIRAsBytes = await ctx.stub.getState(uuid);
        if (!FIRAsBytes || FIRAsBytes.length === 0) {
            throw new Error(`${uuid} does not exist`);
        }
        console.log(FIRAsBytes.toString());
        let record = JSON.parse(FIRAsBytes.toString());
        if (record.typeOfRequest == 'FIR' && (aadharNumber == record.aadharNumber || _.includes(record.suspects, aadharNumber) || _.includes(record.finalCulprit, aadharNumber)))
            return FIRAsBytes.toString();
        else
            return "Unauthorized request";
    }

    /**
     * This functions returns all FIRs list to police based on requestType(police get only FIR registered in its state and city).
     * @param {*} ctx 
     * @param {*} emailId - User email Id.
     * @param {*} requestType - request type (FIR/ backgroundCheck)
     * @returns 
     */
    async getAllFIRByPolice(ctx, emailId, requestType) {
        let checkPolice = emailId.split(".")[0];
        if (checkPolice != "police")
            return "Unauthorized request";
        let state = emailId.split(".")[1];
        let city = emailId.split(".")[2].split('@')[0];
        const startKey = '';
        const endKey = '';
        const allResults = [];
        for await (const { key, value } of ctx.stub.getStateByRange(startKey, endKey)) {
            const strValue = Buffer.from(value).toString('utf8');
            let record;
            try {
                record = JSON.parse(strValue);
            } catch (err) {
                console.log(err);
                record = strValue;
            }
            if (state == record.state && city == record.city && record.typeOfRequest == requestType)
                allResults.push({ Key: key, Record: record });
        }
        console.info(allResults);
        return JSON.stringify(allResults);
    }

    /**
     * This function returns FIR details to police by FIR unique id
     * and police will only get FIR details if that FIR is registered in it's state and city
     * @param {*} ctx 
     * @param {*} uuid - FIR request Id
     * @param {*} emailId - Police email Id.
     * @returns 
     */
    async getFIRDetailsByPolice(ctx, uuid, emailId) {
        let checkPolice = emailId.split(".")[0];
        if (checkPolice != "police")
            return "Unauthorized request";
        let state = emailId.split(".")[1];
        let city = emailId.split(".")[2].split('@')[0];
        const FIRAsBytes = await ctx.stub.getState(uuid);
        if (!FIRAsBytes || FIRAsBytes.length === 0) {
            throw new Error(`${uuid} does not exist`);
        }
        console.log(FIRAsBytes.toString());
        let record = JSON.parse(FIRAsBytes.toString());
        if (state == record.state || city == record.city)
            return FIRAsBytes.toString();
        else
            return "Unauthorized request";
    }

    /**
     * By this function police can update the FIR details.
     * @param {*} ctx 
     * @param {*} emailId - user email id.
     * @param {*} uuid - FIR request Id
     * @param {*} suspects - suspects (hex required)
     * @param {*} FIRStatus - FIR Status
     * @param {*} policeStatement - Police statement - (hex required)
     * @param {*} finalCulprit  - final culprit - (hex required)
     * @returns 
     */
    async updateFIRByPolice(ctx, emailId, uuid, suspects, FIRStatus, policeStatement, finalCulprit) {
        console.info('============= START : update FIR details by police ===========');
        let checkPolice = emailId.split(".")[0];
        if (checkPolice != "police")
            return "Unauthorized request";
        let state = emailId.split(".")[1];
        let city = emailId.split(".")[2].split('@')[0];
        const FIRAsBytes = await ctx.stub.getState(uuid); // get the FIR from chaincode state
        if (!FIRAsBytes || FIRAsBytes.length === 0) {
            throw new Error(`${uuid} does not exist`);
        }
        let FIR = JSON.parse(FIRAsBytes.toString());
        if (state != FIR.state || city != FIR.city)
            return "Unauthorized request";
        if (FIR.FIRStatus === 'closed')
            return 'Invalid! Case already closed.'
        if (FIR.FIRStatus === 'declined')
            return 'Invalid! Case already declined.'
        if (FIR.FIRStatus === 'approved') {
            if (FIRStatus == 'pending')
                return 'Invalid! Case is in progress.'
            if (FIRStatus == 'declined')
                return 'Invalid! Case already approved. Cannot dissaproved now'
        }
        if (FIR.FIRStatus === 'processing') {
            if (FIRStatus == 'approved' || FIRStatus == 'pending')
                return 'Invalid! Case is in progress.'
            if (FIRStatus == 'declined')
                return 'Invalid! Case is in progress. Cannot dissaproved now'
        }
        FIR.suspects = JSON.parse(Buffer.from(suspects, "hex").toString('utf8'));
        FIR.FIRStatus = FIRStatus;
        let updatedPoliceStatement = FIR.policeStatement;
        updatedPoliceStatement = updatedPoliceStatement +'\n' + new Date() + '\n' + Buffer.from(policeStatement, "hex").toString('utf8');
        FIR.policeStatement = updatedPoliceStatement;
        FIR.finalCulprit = JSON.parse(Buffer.from(finalCulprit, "hex").toString('utf8'));
        if (FIRStatus === 'closed')
            FIR.caseCloseDate = new Date();
        if (FIRStatus === 'approved')
            FIR.FIRStatus = 'processing'
        await ctx.stub.putState(uuid, Buffer.from(JSON.stringify(FIR)));
        console.info('============= END : FIR updated ===========');
    }

    /**
     * By this function police can update the FIR status
     * @param {*} ctx 
     * @param {*} emailId - user email id.
     * @param {*} uuid  - FIR request Id
     * @param {*} FIRStatus - FIR Status
     * @returns 
     */
    async updateFIRStatusByPolice(ctx, emailId, uuid, FIRStatus) {
        console.info('============= START : Update FIR statue by police ===========');
        let checkPolice = emailId.split(".")[0];
        if (checkPolice != "police")
            return "Unauthorized request";
        let state = emailId.split(".")[1];
        let city = emailId.split(".")[2].split('@')[0];
        const FIRAsBytes = await ctx.stub.getState(uuid); // get the FIR from chaincode state
        if (!FIRAsBytes || FIRAsBytes.length === 0) {
            throw new Error(`${uuid} does not exist`);
        }
        let FIR = JSON.parse(FIRAsBytes.toString());
        if (state != FIR.state || city != FIR.city)
            return "Unauthorized request";
        if (FIR.FIRStatus === 'closed')
            return 'Invalid! Case already closed.'
        if (FIR.FIRStatus === 'declined')
            return 'Invalid! Case already declined.'
        if (FIR.FIRStatus === 'approved') {
            if (FIRStatus == 'pending')
                return 'Invalid! Case is in progress.'
            if (FIRStatus == 'declined')
                return 'Invalid! Case already approved. Cannot dissaproved now'
        }
        if (FIR.FIRStatus === 'processing') {
            if (FIRStatus == 'approved' || FIRStatus == 'pending')
                return 'Invalid! Case is in progress.'
            if (FIRStatus == 'declined')
                return 'Invalid! Case is in progress. Cannot dissaproved now'
        }
        FIR.FIRStatus = FIRStatus;
        if (FIRStatus === 'approved')
            FIR.FIRStatus = 'processing'
        await ctx.stub.putState(uuid, Buffer.from(JSON.stringify(FIR)));
        console.info('============= END : FIR status updated ===========');
    }


    /**
     * By this function police can update backgroundcheck request
     * @param {*} ctx 
     * @param {*} emailId - user email id.
     * @param {*} uuid  - FIR request Id
     * @param {*} requestStatus - FIR Status
     * @param {*} policeComments - policeComments (hex required)
     * @returns 
     */

    async updateBackgroundCheckRequestByPolice(ctx, emailId, uuid, requestStatus, policeComments) {
        console.info('============= START : Update request statue by police ===========');
        let checkPolice = emailId.split(".")[0];
        if (checkPolice != "police")
            return "Unauthorized request";
        let state = emailId.split(".")[1];
        let city = emailId.split(".")[2].split('@')[0];
        const RequestAsBytes = await ctx.stub.getState(uuid); // get the FIR from chaincode state
        if (!RequestAsBytes || RequestAsBytes.length === 0) {
            throw new Error(`${uuid} does not exist`);
        }
        let requestDetails = JSON.parse(RequestAsBytes.toString());
        if (state != requestDetails.state || city != requestDetails.city)
            return "Unauthorized request";
        if (requestDetails.backgroundCheckStatus != 'pending')
            return 'Status already updated';
        requestDetails.backgroundCheckStatus = requestStatus;
        requestDetails.backgroundCheckStatusUpdateDate = new Date();
        requestDetails.policeComments = Buffer.from(policeComments, "hex").toString('utf8');
        await ctx.stub.putState(uuid, Buffer.from(JSON.stringify(requestDetails)));
        console.info('============= END : Request status updated ===========');
    }

    
    /**
     * This function return all FIRs of user to police.
     * @param {*} ctx 
     * @param {*} emailId - user email id.
     * @param {*} uuid  - FIR request Id
     * @returns 
     */

    async getAllFIRsOfUserByPolice(ctx, uuid, emailId) {
        const requestAsBytes = await ctx.stub.getState(uuid);
        if (!requestAsBytes || requestAsBytes.length === 0) {
            throw new Error(`${uuid} does not exist`);
        }
        let requestDetails = JSON.parse(requestAsBytes.toString());
        if (emailId != requestDetails.emailId)
            return "Unauthorized request";
        if (requestDetails.typeOfRequest != 'viewFIRs')
            return "Not allowed to view FIRs"
        if (requestDetails.backgroundCheckStatus == 'pending')
            return 'Request already pending';
        if (requestDetails.backgroundCheckStatus == 'declined')
            return 'View FIRs request declined';
        const startKey = '';
        const endKey = '';
        const allResults = [];
        for await (const { key, value } of ctx.stub.getStateByRange(startKey, endKey)) {
            const strValue = Buffer.from(value).toString('utf8');
            let record;
            try {
                record = JSON.parse(strValue);
            } catch (err) {
                console.log(err);
                record = strValue;
            }
            if (requestDetails.candidateAadharNumber == record.aadharNumber)
                allResults.push({ Key: key, Record: record });
        }
        console.info(allResults);
        return JSON.stringify(allResults);
    }


    // BACKGROUND CHECK FUNTIONS USER SIDE

    /** 
     * This function is used to create background check request.
     * @param {*} ctx 
     * @param {*} aadharNumber 
     * @param {*} name  - hex needed
     * @param {*} emailId 
     * @param {*} description  -- hex needed
     * @param {*} state 
     * @param {*} city 
     * @param {*} incidentDate 
     * @param {*} suspects --hex needed
     */
    async createBackgroundCheckRequest(ctx, identificationType, identificationNumber, name, emailId, state, city, purpose, purposeDescription, candidateName, candidateAadharNumber) {
        console.info('============= START : create background check Request ===========');

        let generateUuid = uuid();
        const backgroundCheck = {
            uuid: generateUuid,
            typeOfRequest: 'backgroundCheck',
            identificationType: Buffer.from(identificationType, "hex").toString('utf8'),
            identificationNumber,
            name: Buffer.from(name, "hex").toString('utf8'),
            emailId,
            state,
            city,
            purpose : Buffer.from(purpose, "hex").toString('utf8'),
            purposeDescription : Buffer.from(purposeDescription, "hex").toString('utf8'),
            candidateAadharNumber,
            backgroundCheckApplyDate: new Date(),
            backgroundCheckStatus: 'pending',
            backgroundCheckStatusUpdateDate: '',
            policeComments: '',
            candidateName: Buffer.from(candidateName, "hex").toString('utf8')
        };

        await ctx.stub.putState(generateUuid, Buffer.from(JSON.stringify(backgroundCheck)));
        console.info('============= END : Create background check request ===========');
    }

    /** 
     * This function returns all backgroundcheck request to user.
     * @param {*} ctx 
     * @param {*} emailId - User email Id.
     * @returns 
     */
    async getAllbackgroundCheckRequests(ctx, emailId) {
        const startKey = '';
        const endKey = '';
        const allResults = [];
        for await (const { key, value } of ctx.stub.getStateByRange(startKey, endKey)) {
            const strValue = Buffer.from(value).toString('utf8');
            let record;
            try {
                record = JSON.parse(strValue);
            } catch (err) {
                console.log(err);
                record = strValue;
            }
            if (emailId == record.emailId && record.typeOfRequest == 'backgroundCheck')
                allResults.push({ Key: key, Record: record });
        }
        console.info(allResults);
        return JSON.stringify(allResults);
    }

    /**
     * Get FIR details if user register FIR or someone register against the user,
     * email is just extra security check otherwise frontend should not allow to user to view FIR details of user.
     * @param {*} ctx 
     * @param {*} uuid - FIR request Id.
     * @param {*} emailId - User email Id.
     * @returns 
     */
    async getBackgroundCheckRequestDetails(ctx, emailId, uuid) {
        const requestAsBytes = await ctx.stub.getState(uuid);
        if (!requestAsBytes || requestAsBytes.length === 0) {
            throw new Error(`${uuid} does not exist`);
        }
        console.log(requestAsBytes.toString());
        let record = JSON.parse(requestAsBytes.toString());
        if (emailId == record.emailId && record.typeOfRequest == 'backgroundCheck')
            return requestAsBytes.toString();
        else
            return "Unauthorized request";
    }

     /**
     * This function returns total active and closed cases to police by user aadhar number.
     * @param {*} ctx 
     * @param {*} aadharNumber - User aadhar no.
     * @param {*} emailId - User email Id
     * @returns 
     */
    async getFIROfUserByPolice(ctx, aadharNumber, emailId) {
        const startKey = '';
        const endKey = '';
        const suspect = [];
        const culprit = [];
        let result = {};
        let checkPolice = emailId.split(".")[0];
        if (checkPolice != "police")
            return "Unauthorized request";
        for await (const { key, value } of ctx.stub.getStateByRange(startKey, endKey)) {
            const strValue = Buffer.from(value).toString('utf8');
            let record;
            try {
                record = JSON.parse(strValue);
            } catch (err) {
                console.log(err);
                record = strValue;
            }
            if (record.typeOfRequest == 'FIR' && _.includes(record.suspects, aadharNumber) && (record.FIRStatus === 'pending' || record.FIRStatus === 'processing'))
                suspect.push({ Key: key, Record: record });
            if (record.typeOfRequest == 'FIR' && _.includes(record.finalCulprit, aadharNumber))
                culprit.push({ Key: key, Record: record });
        }
        result.activeCases = suspect.length;
        result.suspectCount = suspect.length;
        result.culpritCount = culprit.length;
        result.closedCases = culprit.length;
        return JSON.stringify(result);
    }
}

module.exports = Fir;