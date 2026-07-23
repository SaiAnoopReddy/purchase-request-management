using { purchase.request.management as db } from '../db/schema';

service PurchaseService {

    entity PurchaseRequests as projection on db.PurchaseRequests
    actions {
        @Core.OperationAvailable: {$edmJson: {$Eq: [{$Path: 'status'}, 'Draft']}}
        action submitForApproval();

        @Core.OperationAvailable: {$edmJson: {$Eq: [{$Path: 'status'}, 'Submitted']}}
        action approve();

        @Core.OperationAvailable: {$edmJson: {$Eq: [{$Path: 'status'}, 'Submitted']}}
        action rejectRequest(comments : String);

        action cancelRequest();
    };

    // @requires: 'Requester'
    entity PurchaseRequestItems as projection on db.PurchaseRequestItems;

    // entity Attachments as projection on db.Attachments;

    entity Departments as projection on db.Departments;

    
    entity Notifications as projection on db.Notifications;

   
    entity StatusHistory as projection on db.StatusHistory;

    // action submitForApproval(ID : UUID);
    // action approve(ID : UUID);
    // action reject(
    //     ID : UUID,
    //     comments : String
    // );

}



// annotate PurchaseService.PurchaseRequests with @UI.LineItem: [
//     {Value: requestNumber},
//     {Value: requesterName},
//     {Value: department},
//     {Value: requestDate},
//     {Value: totalAmount},
//     {Value: status}
// ];