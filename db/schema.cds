namespace purchase.request.management;

using { managed, cuid } from '@sap/cds/common';

using { Attachments } from '@cap-js/attachments';


type RequestStatus : String enum {
    Draft;
    Submitted;
    Approved;
    Rejected;
    Cancelled;
    Expired;
}

// type Department : String enum {
//     Finance;
//     HR;
//     Procurement;
//     IT;
//     Manufacturing;
// }


entity Departments {

    key code : String(20);

    name : String(100);

}

/*
 * Purchase Request Header
 */

@odata.draft.enabled
entity PurchaseRequests : cuid, managed {

    @title : 'Request Number'
    requestNumber : String(20);

    @title : 'Requester'
    requesterName : String(100);

    @title: 'Department'
    department : Association to Departments;

    @title : 'Request Date'
    requestDate : Date;

    @title : 'Currency'
    currency : String(3);

    @title : 'Total Amount'
    totalAmount : Decimal(15, 2);

    @title : 'Status'
    status : RequestStatus;

    criticality : Integer;

    virtual canEdit : Boolean;

    // virtual canSubmit  : Boolean;
    // virtual canApprove : Boolean;
    // virtual canReject  : Boolean;

    @title : 'Approver'
    approver : String(100);

    @title : 'Approved By'
    approvedBy : String(100);

    @title : 'Approved At'
    approvedAt : Timestamp;

    @title : 'Rejected By'
    rejectedBy : String(100);

    @title : 'Rejected At'
    rejectedAt : Timestamp;

    @title : 'Cancelled By'
    cancelledBy : String(100);

    @title : 'Cancelled At'
    cancelledAt : Timestamp;

    @title : 'Approval Comments'
    approvalComments : String(500);

    @title : 'Rejection Comments'
    rejectionComments : String(500);

    items : Composition of many PurchaseRequestItems on items.parent = $self;

    notifications : Composition of many Notifications
    on notifications.purchaseRequest = $self;
    
    history : Composition of many StatusHistory
    on history.purchaseRequest = $self;

    attachments : Composition of many Attachments;
}


/*
 * Purchase Request Items
 */
 entity PurchaseRequestItems : cuid{

    parent : Association to PurchaseRequests;
    materialNumber : String(30);
    description : String(255);
    quantity : Integer;
    unitPrice : Decimal(15, 2);
    tax : Decimal(15, 2);
    netAmount : Decimal(15, 2);
    grossAmount : Decimal(15, 2);
 }



 /*
 * Notifications
 */
 entity Notifications : cuid, managed {
    purchaseRequest : Association to PurchaseRequests;

    @title : 'Message'
    message : String(500);

    @title : 'Notification Date'
    notificationDate : Timestamp;
 }

 /*
 * Status History
 */
entity StatusHistory : cuid{
    
    purchaseRequest : Association to PurchaseRequests;

    @title : 'Old Status'
    oldStatus : RequestStatus;

    @title : 'New Status'
    newStatus : RequestStatus;

    @title : 'Changed By'
    changedBy : String(100);

    @title : 'Changed At'
    changedAt : Timestamp;
}


// entity Attachments : cuid, managed {

//     parent : Association to PurchaseRequests;

//     @Core.MediaType : mediaType
//     content   : LargeBinary;

//     mediaType : String;

//     fileName : String(255);

//     fileSize : Integer;
// }