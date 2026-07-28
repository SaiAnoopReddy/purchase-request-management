const cds = require('@sap/cds');

const { SELECT, UPDATE, INSERT } = cds.ql;

module.exports = cds.service.impl(async function () {

    console.log(this.entities);

    const { PurchaseRequests, PurchaseRequestItems, StatusHistory, Notifications } = this.entities;
    const PurchaseAttachments = this.entities['PurchaseRequests.attachments'];

    console.log(Object.keys(this.entities));

    async function expireOldDrafts() {

        const expiryDate = new Date();

        expiryDate.setDate(expiryDate.getDate() - 30);

        const oldDrafts = await SELECT
            .from(PurchaseRequests)
            .where({
                status: "Draft"
            });

        for (const pr of oldDrafts) {

            if (new Date(pr.requestDate) <= expiryDate) {

                await UPDATE(PurchaseRequests)
                    .set({
                        status: "Expired",
                        criticality: 5
                    })
                    .where({ ID: pr.ID });

                await INSERT.into(StatusHistory).entries({

                    purchaseRequest_ID: pr.ID,

                    oldStatus: "Draft",

                    newStatus: "Expired",

                    changedBy: "SYSTEM",

                    changedAt: new Date()

                });

                await INSERT.into(Notifications).entries({

                    purchaseRequest_ID: pr.ID,

                    message: `Purchase Request ${pr.requestNumber} expired automatically.`,

                    notificationDate: new Date()

                });

                console.log(`Expired ${pr.requestNumber}`);

            }
        }

    }

    this.before('*', async (req) => {

        if (req.target?.name === 'PurchaseService.PurchaseRequests.attachments') {

            console.log("================================");
            console.log("EVENT :", req.event);
            console.log("TARGET:", req.target.name);
            console.log("DATA  :", req.data);
            console.log("================================");
        }

    });

    this.before('CREATE', PurchaseRequests, async (req) => {

        const year = new Date().getFullYear();

        // Get the latest purchase request
        const lastRequest = await SELECT.one.from(PurchaseRequests).orderBy({ requestNumber: 'desc' });

        let nextNumber = 1; // Default to 1 if no previous requests exist

        if (lastRequest?.requestNumber) {

            const parts = lastRequest.requestNumber.split('-');

            nextNumber = parseInt(parts[2],10) + 1; // Increment the last number by 1
        }


        req.data.requestNumber = `PR-${year}-${String(nextNumber).padStart(6, '0')}`;

        req.data.status = "Draft";
        req.data.criticality = 1;

    });


    this.before('UPDATE', PurchaseRequests, async (req) => {

        const ID = req.data.ID;

        const purchaseRequest = await SELECT.one
            .from(PurchaseRequests)
            .where({ ID });

        if (!purchaseRequest) return;

        if (
            purchaseRequest.status === "Submitted" ||
            purchaseRequest.status === "Approved" ||
            purchaseRequest.status === "Rejected" ||
            purchaseRequest.status === "Cancelled" ||
            purchaseRequest.status === "Expired"
        ) {
            return req.reject(
                400,
                `Purchase Request is already ${purchaseRequest.status} and cannot be modified.`
            );
        }

    });


    this.before('DELETE', PurchaseRequests, async (req) => {

        const ID = req.data.ID;

        const purchaseRequest = await SELECT.one
            .from(PurchaseRequests)
            .where({ ID });

        if (!purchaseRequest) return;

        if (
            purchaseRequest.status === "Submitted" ||
            purchaseRequest.status === "Approved" ||
            purchaseRequest.status === "Expired"
        ) {
            return req.reject(
                400,
                `Purchase Request is already ${purchaseRequest.status} and cannot be deleted.`
            );
        }

    });

    
    this.before('SAVE', PurchaseRequests, async (req) => {

        // Generate Request Number if missing
        if (!req.data.requestNumber) {

            const year = new Date().getFullYear();

            const lastRequest = await SELECT.one
                .from(PurchaseRequests)
                .orderBy({ requestNumber: 'desc' });

            let nextNumber = 1;

            if (lastRequest?.requestNumber) {
                const parts = lastRequest.requestNumber.split('-');
                nextNumber = parseInt(parts[2], 10) + 1;
            }

            req.data.requestNumber =
                `PR-${year}-${String(nextNumber).padStart(6, '0')}`;
        }

        // Default Status
        if (!req.data.status) {
            req.data.status = "Draft";
        }

        // Default Criticality
        if (!req.data.criticality) {
            req.data.criticality = 1;
        }

        // Header Validations
        if (!req.data.requesterName) {
            req.error(400, "Requester Name is mandatory.");
        }

        if (!req.data.department_code) {
            req.error(400, "Department is mandatory.");
        }


        const validDepartments = [
            "Finance",
            "HR",
            "Procurement",
            "IT",
            "Manufacturing"
        ];

        if (!validDepartments.includes(req.data.department_code)) {
            req.error(
                400,
                "Department must be one of: Finance, HR, Procurement, IT, Manufacturing."
            );
        }

        if (!req.data.requestDate) {
            req.error(400, "Request Date is mandatory.");
        }

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const requestDate = new Date(req.data.requestDate);
        requestDate.setHours(0, 0, 0, 0);

        // Future date not allowed
        if (requestDate > today) {
            req.error(400, "Request Date cannot be a future date.");
        }

        // Older than 30 days not allowed
        const thirtyDaysAgo = new Date(today);
        thirtyDaysAgo.setDate(today.getDate() - 30);

        if (requestDate < thirtyDaysAgo) {
            req.error(400, "Request Date cannot be older than 30 days.");
        }

        if (!req.data.currency) {
            req.error(400, "Currency is mandatory.");
        }

        if (!req.data.items || req.data.items.length === 0) {
            req.error(400, "At least one Purchase Item is required.");
        }

        if (req.data.items.length > 20) {
            req.error(
                400,
                "A Purchase Request cannot contain more than 20 items."
            );
        }

        const materials = new Set();

        for (const item of req.data.items) {

            if (!item.materialNumber) {
                req.error(400, "Material Name is mandatory.");
            }

            if (materials.has(item.materialNumber)) {
                req.error(
                    400,
                    `Duplicate Material Number '${item.materialNumber}' is not allowed.`
                );
            }

            materials.add(item.materialNumber);

            if (!item.description) {
                req.error(400, "Material Description is mandatory.");
            }

            if (item.description.trim().length < 10) {
                req.error(
                    400,
                    "Material Description must contain at least 10 characters."
                );
            }

            if (!item.quantity || item.quantity <= 0) {
                req.error(400, "Quantity must be greater than zero.");
            }

            if (item.quantity > 100) {
                req.error(
                    400,
                    "Quantity cannot exceed 100."
                );
            }

            if (!item.unitPrice || item.unitPrice <= 0) {
                req.error(400, "Unit Price must be greater than zero.");
            }

            if (item.unitPrice >= 100000) {
                req.error(
                    400,
                    "Unit Price must be less than ₹100000."
                );
            }
        }


        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

        const oldRequests = await SELECT
            .from(PurchaseRequests)
            .where({
                requesterName: req.data.requesterName,
                department_code: req.data.department_code
            });

        for (const oldReq of oldRequests) {

            if (new Date(oldReq.requestDate) < sevenDaysAgo)
                continue;

            const oldItems = await SELECT
                .from(PurchaseRequestItems)
                .where({
                    parent_ID: oldReq.ID
                });

            for (const newItem of req.data.items) {

                const duplicate = oldItems.find(item =>
                    item.materialNumber === newItem.materialNumber &&
                    Number(item.quantity) === Number(newItem.quantity)
                );

                if (duplicate) {

                    return req.error(
                        400,
                        "Duplicate Purchase Request found within last 7 days."
                    );

                }

            }

        }

        console.log("SAVE Purchase Request");
        console.log(JSON.stringify(req.data, null, 2));
        let totalAmount = 0;

        if (req.data.items) {

            for (const item of req.data.items) {

                const quantity = Number(item.quantity || 0);
                const unitPrice = Number(item.unitPrice || 0);

                item.netAmount = quantity * unitPrice;

                item.tax = Number((item.netAmount * 0.18).toFixed(2));

                item.grossAmount = Number((item.netAmount + item.tax).toFixed(2));

                totalAmount += item.grossAmount;
            }
        }
        req.data.totalAmount = totalAmount;

        // Attachment mandatory if Total Amount > 100000
        if (totalAmount > 100000) {

            // const attachments = await SELECT.from(PurchaseRequests_attachments)
            //     .where({ parent_ID: req.data.ID });

            if (!req.data.attachments || req.data.attachments.length === 0) {
                return req.reject(
                    400,
                    "Supporting document is mandatory for Purchase Requests above ₹100000."
                );
            }
        }

        if (totalAmount <= 10000) {
            req.data.approver = "Manager";
        }
        else if (totalAmount <= 50000) {
            req.data.approver = "Senior Manager";
        }
        else {
            req.data.approver = "Director";
        }


        // if (totalAmount > 50000 && !req.data.approver) {
        //     req.error(
        //         400,
        //         "Approver must be assigned for Purchase Requests above ₹50,000."
        //     );
        // }

        if (totalAmount <= 100) {
            req.error(
                400,
                "Purchase Request Total Amount must be greater than ₹100."
            );
        }
    });


    this.on('submitForApproval', async (req) => {

        // if (!req.user.is('Requester')) {
        // return req.reject(403, "Only Requesters can submit requests.");
        // }

        console.log("Submit for Approval Action Triggered");

        const ID = req.params[0].ID;

        const attachments = await SELECT
            .from('PurchaseService.PurchaseRequests.attachments')
            .where({ up__ID: ID });

        console.log("Attachments:");
        console.log(attachments);

        const allowedTypes = [
            "application/pdf",
            "image/jpeg",
            "image/png"
        ];

        for (const file of attachments) {

            if (!allowedTypes.includes(file.mimeType)) {

                return req.reject(
                    400,
                    `File "${file.filename}" is not allowed. Only PDF, JPG and PNG files are permitted.`
                );
            }
        }

        // Read Purchase Request
        const purchaseRequest = await SELECT.one
            .from(PurchaseRequests)
            .where({ ID });

        if (!purchaseRequest) {
            return req.error(404, "Purchase Request not found.");
        }

        // Allow only Draft requests
        if (purchaseRequest.status !== "Draft") {
            return req.error(400, "Only Draft Purchase Requests can be submitted.");
        }

        // Update Status
        await UPDATE(PurchaseRequests)
            .set({
                status: "Submitted",
                criticality: 2
            })
            .where({ ID });
            

        // Insert Status History
        await INSERT.into(StatusHistory).entries({

            purchaseRequest_ID: ID,

            oldStatus: "Draft",

            newStatus: "Submitted",

            changedBy: req.user.id,

            changedAt: new Date()

        });

        // Insert Notification
        await INSERT.into(Notifications).entries({

            purchaseRequest_ID: ID,

            message: `Purchase Request ${purchaseRequest.requestNumber} submitted for approval.`,

            notificationDate: new Date()

        });


        req.notify({
            message: "Purchase Request submitted successfully.",
            severity: 1
        });

        return await SELECT.one
            .from(PurchaseRequests)
            .where({ ID });

    });

    this.on('approve', async (req) => {

        console.log("Current User");
        console.log(req.user);

        // if (!req.user.is('Approver')) {
        // return req.reject(403, "Only Approvers can approve requests.");
        // }

        console.log("Approve Action Triggered");

        const ID = req.params[0].ID;
        const comments = req.data.approvalComments;

        const purchaseRequest = await SELECT.one
            .from(PurchaseRequests)
            .where({ ID });

        if (!purchaseRequest) {
            return req.error(404, "Purchase Request not found.");
        }

        if (purchaseRequest.status !== "Submitted") {
            return req.error(400, "Only Submitted Purchase Requests can be approved.");
        }

        const result = await UPDATE(PurchaseRequests)
            .set({
                status: "Approved",
                approver: req.user.id,
                approvedBy: req.user.id,
                approvedAt: new Date(),
                approvalComments: comments,
                criticality: 3
            })
            .where({ 
                ID,
                status: "Submitted" // Ensure only Submitted requests are updated
             });

             if (result === 0) {
                return req.reject(
                    400,
                    "Purchase Request already processed by another user."
                );
            }

        await INSERT.into(StatusHistory).entries({
            purchaseRequest_ID: ID,
            oldStatus: "Submitted",
            newStatus: "Approved",
            changedBy: req.user.id,
            changedAt: new Date()
        });

        await INSERT.into(Notifications).entries({
            purchaseRequest_ID: ID,
            message: `Purchase Request ${purchaseRequest.requestNumber} has been Approved.`,
            notificationDate: new Date()
        });

        req.notify({
            message: "Purchase Request approved successfully.",
            severity: 1
        });

        return await SELECT.one
            .from(PurchaseRequests)
            .where({ ID });

    });

    this.on('rejectRequest', async (req) => {

        // if (!req.user.is('Approver')) {
        // return req.reject(403, "Only Approvers can reject requests.");
        // }

        console.log("Reject Action Triggered");

        const ID = req.params[0].ID;
        const comments = req.data.comments;

        const purchaseRequest = await SELECT.one
            .from(PurchaseRequests)
            .where({ ID });

        if (!purchaseRequest) {
            return req.error(404, "Purchase Request not found.");
        }

        if (purchaseRequest.status !== "Submitted") {
            return req.error(400, "Only Submitted Purchase Requests can be rejected.");
        }

        if (!comments || comments.trim() === "") {
            return req.error(400, "Rejection Comments are mandatory.");
        }

        await UPDATE(PurchaseRequests)
            .set({
                status: "Rejected",
                rejectionComments: comments,
                rejectedBy: req.user.id,
                rejectedAt: new Date(),
                criticality: 4
            })
            .where({ ID });

        await INSERT.into(StatusHistory).entries({
            purchaseRequest_ID: ID,
            oldStatus: "Submitted",
            newStatus: "Rejected",
            changedBy: req.user.id,
            changedAt: new Date()
        });

        await INSERT.into(Notifications).entries({
            purchaseRequest_ID: ID,
            message: `Purchase Request ${purchaseRequest.requestNumber} has been Rejected.`,
            notificationDate: new Date()
        });

        req.notify({
            message: "Purchase Request rejected successfully.",
            severity: 1
        });

        return await SELECT.one
            .from(PurchaseRequests)
            .where({ ID });
    });


    this.on('cancelRequest', async (req) => {

        console.log("Cancel Request Triggered");

        const ID = req.params[0].ID;

        const purchaseRequest = await SELECT.one
            .from(PurchaseRequests)
            .where({ ID });

        if (!purchaseRequest) {
            return req.error(404, "Purchase Request not found.");
        }

        if (
            purchaseRequest.status !== "Draft" &&
            purchaseRequest.status !== "Submitted"
        ) {
            return req.error(
                400,
                "Only Draft or Submitted requests can be cancelled."
            );
        }

        await UPDATE(PurchaseRequests)
            .set({
                status: "Cancelled",
                cancelledBy: req.user.id,
                cancelledAt: new Date(),
                criticality: 5
            })
            .where({ ID });

        await INSERT.into(StatusHistory).entries({
            purchaseRequest_ID: ID,
            oldStatus: purchaseRequest.status,
            newStatus: "Cancelled",
            changedBy: req.user.id,
            changedAt: new Date()
        });

        await INSERT.into(Notifications).entries({
            purchaseRequest_ID: ID,
            message: `Purchase Request ${purchaseRequest.requestNumber} has been Cancelled.`,
            notificationDate: new Date()
        });

        req.notify({
            message: "Purchase Request cancelled successfully.",
            severity: 1
        });

        return await SELECT.one
            .from(PurchaseRequests)
            .where({ ID });

    });

    this.after('READ', PurchaseRequests, (data) => {

        const records = Array.isArray(data) ? data : [data];

        for (const pr of records) {

            if (!pr) continue;

            pr.canSubmit  = pr.status === "Draft";
            pr.canApprove = pr.status === "Submitted";
            pr.canReject  = pr.status === "Submitted";
            pr.canCancel  = (
                pr.status === "Draft" ||
                pr.status === "Submitted"
            );

            pr.canEdit =
                pr.status !== "Approved" &&
                pr.status !== "Rejected" &&
                pr.status !== "Cancelled"&&
                pr.status !== "Expired";
        }
    });

    
    this.before(['CREATE', 'UPDATE'], PurchaseRequestItems, async (req) => {

        console.log("Purchase Item Event");
        console.log(req.event);
        console.log(req.data);

        const quantity = Number(req.data.quantity || 0);
        const unitPrice = Number(req.data.unitPrice || 0);

        const netAmount = quantity * unitPrice;

        const tax = netAmount * 0.18;

        const grossAmount = netAmount + tax;

        req.data.netAmount = Number(netAmount.toFixed(2));
        req.data.tax = Number(tax.toFixed(2));
        req.data.grossAmount = Number(grossAmount.toFixed(2));
    });


    this.before('PUT', PurchaseAttachments, async (req) => {

        console.log("PUT Attachment");
        console.log(req.data);

        const allowedTypes = [
            "application/pdf",
            "image/jpeg",
            "image/png"
        ];

        if (req.data.mimeType && !allowedTypes.includes(req.data.mimeType)) {
            return req.reject(
                400,
                "Only PDF, JPG and PNG files are allowed."
            );
        }
    });



    // this.before(['CREATE', 'UPDATE'], PurchaseAttachments, async (req) => {

    //     console.log("Attachment Event");
    //     console.log(req.event);
    //     console.log(req.data);

    //     const allowedTypes = [
    //         "application/pdf",
    //         "image/jpeg",
    //         "image/png"
    //     ];

    //     if (req.data.mimeType && !allowedTypes.includes(req.data.mimeType)) {
    //         req.reject(400, "Only PDF, JPG and PNG files are allowed.");
    //     }

    // });


    this.after(['CREATE', 'UPDATE'], PurchaseRequestItems, async (data, req) => {

    const parentID = req.data.parent_ID;

    if (!parentID) return;

    const items = await SELECT
        .from(PurchaseRequestItems)
        .where({ parent_ID: parentID });

    let total = 0;

    for (const item of items) {
        total += Number(item.grossAmount || 0);
    }

    await UPDATE(PurchaseRequests)
        .set({ totalAmount: total })
        .where({ ID: parentID });
    });

    await expireOldDrafts();

});