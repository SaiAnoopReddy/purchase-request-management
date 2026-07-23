using PurchaseService as service from './purchase-service';

annotate service.PurchaseRequests with @(
    UI.HeaderInfo: {
        TypeName: 'Purchase Request',
        TypeNamePlural: 'Purchase Requests',
        Title : {
            Value: requestNumber
        },
        Description: {
            Value: requesterName
        }
    },

    UI.SelectionFields: [
        requestNumber,
        requesterName,
        department_code,
        status
    ],

    UI.LineItem: [
        {
            Value: requestNumber,
            Label: 'Request Number'
        },
        {
            Value: requesterName,
            Label: 'Requester'
        },
        {
            Value: department_code,
            Label: 'Department'
        },
        {
            Value: requestDate,
            Label: 'Request Date'
        },
        {
            Value: totalAmount,
            Label: 'Total Amount'
        },
        {
            $Type : 'UI.DataField',
            Value: status,
            Label: 'Status',
            Criticality: criticality
        }
    ],


    UI.Identification: [
        {
            $Type: 'UI.DataFieldForAction',
            Action : 'PurchaseService.submitForApproval',
            Label: 'Submit',
            ![@Core.OperationAvailable] : canSubmit
        },
        {
        $Type : 'UI.DataFieldForAction',
        Action : 'PurchaseService.approve',
        Label : 'Approve',
        ![@Core.OperationAvailable] : canApprove
        },
        {
        $Type : 'UI.DataFieldForAction',
        Action : 'PurchaseService.rejectRequest',
        Label : 'Reject',
        ![@Core.OperationAvailable] : canReject
        },
        {
            $Type : 'UI.DataFieldForAction',
            Action : 'PurchaseService.cancelRequest',
            Label : 'Cancel',
            ![@Core.OperationAvailable] : canCancel
        }
    ],

    UI.Facets : [
        {
            $Type: 'UI.ReferenceFacet',
            Label: 'General Information',
            Target: '@UI.FieldGroup#General'
        },
        {
            $Type: 'UI.ReferenceFacet',
            Label: 'Purchase Items',
            Target: 'items/@UI.LineItem'
        },
        {
            $Type : 'UI.ReferenceFacet',
            Label : 'Attachments',
            Target : 'attachments/@UI.LineItem'
        },
        {
            $Type : 'UI.ReferenceFacet',
            Label : 'Comments',
            Target : '@UI.FieldGroup#Comments'
        },
        {
            $Type : 'UI.ReferenceFacet',
            Label : 'Status History',
            Target : 'history/@UI.LineItem'
        },
        {
            $Type : 'UI.ReferenceFacet',
            Label : 'Notifications',
            Target : 'notifications/@UI.LineItem'
        }
    ],

    UI.FieldGroup#General : {
        Data: [
            {Value: requestNumber},
            {Value: requesterName},
            {Value: department_code},
            {Value: requestDate},
            {Value: currency},
            {Value: status},
            {Value: totalAmount},
            {
                Value: approver,
                Label: 'Approver'
            }
            
        ]
    },
    
    UI.FieldGroup#Comments : {
        Data : [
            {
                Value : approvalComments,
                Label : 'Approval Comments'
            },
            {
                Value : rejectionComments,
                Label : 'Rejection Comments'
            }
        ]
    },
    
    Capabilities.UpdateRestrictions : {
        Updatable : {
            $edmJson : {
                $Not : {
                    $Or : [
                        { $Eq : [ { $Path : 'status' }, 'Approved' ] },
                        { $Eq : [ { $Path : 'status' }, 'Rejected' ] },
                        { $Eq : [ { $Path : 'status' }, 'Cancelled' ] }
                    ]
                }
            }
        }
    },

    Capabilities.DeleteRestrictions : {
        Deletable : {
            $edmJson : {
                $Not : {
                    $Or : [
                        { $Eq : [ { $Path : 'status' }, 'Approved' ] },
                        { $Eq : [ { $Path : 'status' }, 'Rejected' ] },
                        { $Eq : [ { $Path : 'status' }, 'Cancelled' ] }
                    ]
                }
            }
        }
    }

    // UI.Identification : [
    //     requestNumber,
    //     requesterName,
    //     department,
    //     requestDate,
    //     currency,
    //     totalAmount,
    //     status
    // ]

    
);

annotate service.PurchaseRequests with {
    requestNumber @Common.FieldControl : #ReadOnly;
    status        @Common.FieldControl : #ReadOnly;
    totalAmount   @Common.FieldControl : #ReadOnly;
    approver      @Common.FieldControl : #ReadOnly;
};


annotate service.PurchaseRequests with {

    department @Common.ValueList : {
        CollectionPath : 'Departments',
        Parameters : [
            {
                $Type : 'Common.ValueListParameterInOut',
                LocalDataProperty : department_code,
                ValueListProperty : 'code'
            },
            {
                $Type : 'Common.ValueListParameterDisplayOnly',
                ValueListProperty : 'name'
            }
        ]
    };


};



annotate service.PurchaseRequestItems with @(
    UI.HeaderInfo : {
        TypeName : 'Purchase Item',
        TypeNamePlural : 'Purchase Items',
        Title : {
            Value : materialNumber
        },
        Description : {
            Value : description
        }
    },

    UI.Facets : [
        {
            $Type : 'UI.ReferenceFacet',
            Label : 'General Information',
            Target : '@UI.FieldGroup#General'
        }
    ],

    UI.FieldGroup#General : {
        Data : [
            {
                Value : materialNumber,
                Label : 'Material'
            },
            {
                Value : description,
                Label : 'Description'
            },
            {
                Value : quantity,
                Label : 'Quantity'
            },
            {
                Value : unitPrice,
                Label : 'Unit Price'
                },
            {
                Value : netAmount,
                Label : 'Net Amount'
            },
            {
                Value : tax,
                Label : 'Tax'
            },
            {
                Value : grossAmount,
                Label : 'Gross Amount'
            }
        ]
    },


    UI.LineItem: [
        {
            Value: materialNumber,
            Label: 'Material'
        },
        {
            Value: description,
            Label: 'Description'
        },
        {
            Value: quantity,
            Label: 'Quantity'
        },
        {
            Value: unitPrice,
            Label: 'Unit Price'
        },
        {
            Value: netAmount,
            Label: 'Net Amount'
        },
        {
            Value: tax,
            Label: 'Tax'
        },
        {
            Value: grossAmount,
            Label: 'Gross Amount'
        }
    ],

);


annotate service.PurchaseRequestItems with {
    netAmount   @Common.FieldControl : #ReadOnly;
    tax         @Common.FieldControl : #ReadOnly;
    grossAmount @Common.FieldControl : #ReadOnly;
};


annotate service.Notifications with @(
    UI.HeaderInfo : {
        TypeName : 'Notification',
        TypeNamePlural : 'Notifications',
        Title : {
            Value : message
        }
    },

    UI.LineItem : [
        {
            Value : purchaseRequest.requestNumber,
            Label : 'Request Number'
        },
        {
            Value : message,
            Label : 'Message'
        },
        {
            Value : notificationDate,
            Label : 'Notification Date'
        }
    ],

    UI.SelectionFields : [
        notificationDate
    ]
);


annotate service.StatusHistory with @(
    UI.HeaderInfo : {
        TypeName : 'Status History',
        TypeNamePlural : 'Status History',
        Title : {
            Value : purchaseRequest.requestNumber
        }
    },

    UI.LineItem : [
        {
            Value : purchaseRequest.requestNumber,
            Label : 'Request Number'
        },
        {
            Value : oldStatus,
            Label : 'Old Status'
        },
        {
            Value : newStatus,
            Label : 'New Status'
        },
        {
            Value : changedBy,
            Label : 'Changed By'
        },
        {
            Value : changedAt,
            Label : 'Changed At'
        }
    ]
);


annotate service.StatusHistory with @(
    Capabilities.InsertRestrictions.Insertable : false,
    Capabilities.UpdateRestrictions.Updatable : false,
    Capabilities.DeleteRestrictions.Deletable : false
);

annotate service.Notifications with @(
    Capabilities.InsertRestrictions.Insertable : false,
    Capabilities.UpdateRestrictions.Updatable : false,
    Capabilities.DeleteRestrictions.Deletable : false
);

// annotate service.Attachments with @(

//     UI.HeaderInfo : {
//         TypeName : 'Attachment',
//         TypeNamePlural : 'Attachments',
//         Title : {
//             Value : fileName
//         }
//     },

//     UI.LineItem : [

//         {
//             Value : fileName,
//             Label : 'File Name'
//         },

//         {
//             Value : mediaType,
//             Label : 'Type'
//         },

//         {
//             Value : fileSize,
//             Label : 'Size'
//         }

//     ]
// );


