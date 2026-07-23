sap.ui.define([
    "sap/fe/test/JourneyRunner",
	"purchase-ui/test/integration/pages/PurchaseRequestsList",
	"purchase-ui/test/integration/pages/PurchaseRequestsObjectPage"
], function (JourneyRunner, PurchaseRequestsList, PurchaseRequestsObjectPage) {
    'use strict';

    var runner = new JourneyRunner({
        launchUrl: sap.ui.require.toUrl('purchase-ui') + '/test/flp.html#app-preview',
        pages: {
			onThePurchaseRequestsList: PurchaseRequestsList,
			onThePurchaseRequestsObjectPage: PurchaseRequestsObjectPage
        },
        async: true
    });

    return runner;
});

