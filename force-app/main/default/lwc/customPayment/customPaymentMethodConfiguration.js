/**
 * Payment method configuration for the customPayment component.
 *
 * Run the following script in Developer Console → Execute Anonymous to discover
 * what payment methods, processors, targets and parameters are available in your org:
 *
 *   RestRequest req = new RestRequest();
 *   RestResponse res = new RestResponse();
 *   RestContext.request = req;
 *   RestContext.response = res;
 *   req.requestURI = '/services/apexrest/cpm/v2/PaymentMethods';
 *   req.httpMethod = 'GET';
 *   req.headers.put('verbose', 'true');
 *   cpm.API_PaymentMethod_V2.getPaymentMethods();
 *   System.debug(JSON.serializePretty(JSON.deserializeUntyped(res.responseBody.toString())));
 *
 * Fields:
 *   name            — PaymentMethods[].Name from the API response
 *   processor       — Processors[].Name from the API response
 *   merchantAccount — Processors[].Targets[].Name from the API response
 *                     (for 3rd-party PSPs where Targets is empty, check FinDock Setup UI)
 *   enabledOneTime  — whether to offer one-time payments with this method
 *   enabledRecurring — whether to offer recurring payments (must be false if SupportsRecurring is false in the API)
 *   isDefaultOneTime / isDefaultRecurring — which method is pre-selected (one true per config)
 *   displayLabel    — optional label override shown in the UI (defaults to name)
 *   redirectInstruction — optional message shown before the payer is redirected
 *   parameters      — optional array of parameter overrides (see below)
 *
 * Parameter fields:
 *   name              — Parameters[].Name from the API response
 *   value             — pre-filled value sent to the processor (use for hidden parameters)
 *   visibleToCustomer — true: render as input field | false: send value silently
 *   displayLabel      — label shown in the UI when visibleToCustomer is true (defaults to name)
 *   required          — whether the payer must fill in the field
 */
export const PAYMENT_METHOD_CONFIG = [
    {
        name: 'CreditCard',
        processor: 'PaymentHub-Stripe',
        merchantAccount: 'My Stripe Test Account',
        enabledOneTime: true,
        enabledRecurring: true,
        isDefaultOneTime: true,
        isDefaultRecurring: true,
        displayLabel: 'Credit Card',
        parameters: [
            {
                name: 'locale',
                value: 'nl-NL',
                visibleToCustomer: false
            },
            {
                name: 'description',
                value: '',
                visibleToCustomer: true,
                displayLabel: 'Description of the payment for the payer’s bank',
                required: false
            }
        ]
    },
    {
        name: 'Ideal',
        processor: 'PaymentHub-Stripe',
        merchantAccount: 'My Stripe Test Account',
        enabledOneTime: true,
        enabledRecurring: false,
        isDefaultOneTime: false,
        displayLabel: 'iDEAL',
        redirectInstruction: 'You will be redirected to your bank to complete the payment.'
    }
];
